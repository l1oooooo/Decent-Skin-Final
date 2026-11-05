import { useEffect, useRef, useState } from "react"

export type Page = "home" | "settings" | "library" | "favorites" | "profile"
export interface Route {
  page: Page
  id?: string
  category?: string
  slot?: number
}
function readRoute(): Route {
  const query = new URLSearchParams(location.search)
  const page = query.get("page")
  if (!["settings", "library", "favorites", "profile"].includes(page ?? ""))
    return { page: "home" }
  return {
    page: page as Page,
    id: query.get("profile") ?? undefined,
    category: query.get("category") ?? undefined,
    slot:
      page === "library" && /^[0-4]$/.test(query.get("slot") ?? "")
        ? Number(query.get("slot"))
        : undefined,
  }
}
function routeUrl(route: Route) {
  const url = new URL(location.href)
  for (const key of ["page", "profile", "category", "slot"])
    url.searchParams.delete(key)
  if (route.page !== "home") url.searchParams.set("page", route.page)
  if (route.id) url.searchParams.set("profile", route.id)
  if (route.category) url.searchParams.set("category", route.category)
  if (route.page === "library" && route.slot !== undefined)
    url.searchParams.set("slot", String(route.slot))
  return url
}
export function useNavigation(dirty: boolean, discard: () => void) {
  const [route, setRoute] = useState(readRoute)
  const [pending, setPending] = useState<{
    route: Route
    index?: number
  } | null>(null)
  const index = useRef(0)
  const bypass = useRef(false)
  const current = useRef({ dirty, route })
  useEffect(() => {
    current.current = { dirty, route }
  }, [dirty, route])
  useEffect(() => {
    index.current = history.state?.focusIndex ?? 0
    history.replaceState(
      { ...history.state, focusIndex: index.current },
      "",
      routeUrl(readRoute())
    )
    const pop = () => {
      const target = history.state?.focusIndex ?? 0
      if (target === index.current) return
      if (
        current.current.dirty &&
        (current.current.route.page === "favorites" ||
          current.current.route.page === "library" ||
          current.current.route.page === "settings") &&
        readRoute().page !== "favorites" &&
        !(
          current.current.route.page === "settings" &&
          readRoute().page === "settings"
        ) &&
        !bypass.current
      ) {
        setPending({ route: readRoute(), index: target })
        history.go(index.current - target)
        return
      }
      bypass.current = false
      index.current = target
      setRoute(readRoute())
    }
    const unload = (event: BeforeUnloadEvent) => {
      if (current.current.dirty) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("popstate", pop)
    window.addEventListener("beforeunload", unload)
    return () => {
      window.removeEventListener("popstate", pop)
      window.removeEventListener("beforeunload", unload)
    }
  }, [])
  function commit(next: Route, replace = false) {
    if (!replace) index.current++
    history[replace ? "replaceState" : "pushState"](
      { focusIndex: index.current },
      "",
      routeUrl(next)
    )
    setRoute(next)
    setPending(null)
  }
  function navigate(next: Route, preserve = false) {
    if (routeUrl(next).href === location.href) return
    if (
      dirty &&
      (route.page === "favorites" ||
        route.page === "library" ||
        route.page === "settings") &&
      next.page !== "favorites" &&
      !(route.page === "settings" && next.page === "settings") &&
      !preserve
    )
      setPending({ route: next })
    else commit(next)
  }
  return {
    route,
    pending,
    navigate,
    interrupt: () => commit({ page: "home" }, true),
    stay: () => setPending(null),
    leave: () => {
      if (!pending) return
      discard()
      if (pending.index !== undefined) {
        bypass.current = true
        history.go(pending.index - index.current)
        setPending(null)
      } else commit(pending.route)
    },
  }
}
