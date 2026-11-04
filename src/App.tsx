import { useEffect, useEffectEvent, useRef, useState } from "react"
import { DecaidGateway, gatewayUrl } from "@/gateway/client"
import FocusScreen from "@/skin/screen"
import { ProfileDetail, ProfileLibrary } from "@/skin/profile-library"
import { GrindEditor } from "@/skin/grind-editor"
import { History } from "@/skin/history"
import { useSkin } from "@/skin/use-skin"
import { useProfileTransfer } from "@/skin/use-profile-transfer"
import { useFavorites } from "@/skin/use-favorites"
import { useNavigation, type Route } from "@/skin/navigation"
import {
  ConfirmNavigation,
  FavoritesPage,
  PageShell,
  SettingsPage,
} from "@/skin/pages"
import { Action } from "@/skin/primitives"
import "@/skin/skin.css"

export default function App() {
  const [gateway] = useState(() => new DecaidGateway(gatewayUrl()))
  const s = useSkin(gateway)
  const editor = useFavorites(gateway, s.snapshot)
  const transfer = useProfileTransfer(gateway, s.reloadLibrary)
  const saving = editor.saving || transfer.operation === "import"
  const nav = useNavigation(
    editor.dirty || saving || transfer.selection !== null,
    () => {
      editor.cancel()
      transfer.cancel()
    }
  )
  const assignment =
    nav.route.page === "library" ? (nav.route.slot ?? null) : null
  const observedShot = useRef(0)
  const onShot = useEffectEvent(() => {
    nav.interrupt()
    s.setModal(null)
    s.setSettings(null)
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Stop extraction"]')
        ?.focus()
    )
  })
  useEffect(
    () =>
      gateway.subscribe(() => {
        const next = gateway.getSnapshot().observedShot
        if (next === observedShot.current) return
        observedShot.current = next
        onShot()
      }),
    [gateway]
  )
  const previousPage = useRef(nav.route.page)
  useEffect(() => {
    if (nav.route.page === "home" && previousPage.current !== "home") {
      const label = s.active
        ? "Stop extraction"
        : previousPage.current === "settings"
          ? "Settings"
          : "Browse profiles"
      document
        .querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
        ?.focus()
    }
    previousPage.current = nav.route.page
  }, [nav.route.page, s.active])
  function navigate(route: Route) {
    if (
      route.page === "home" &&
      gateway.getSnapshot().machine?.state.state === "espresso"
    )
      nav.interrupt()
    else nav.navigate(route)
  }
  function assign(slot: number) {
    nav.navigate({ page: "library", slot }, true)
  }
  const page = nav.route.page
  const title =
    page === "settings"
      ? "Settings"
      : page === "favorites"
        ? "Manage favorites"
        : page === "profile"
          ? (s.allProfiles.find((p) => p.id === nav.route.id)?.name ??
            "Profile details")
          : assignment === null
            ? "Profile library"
            : `Choose favorite ${assignment + 1}`
  function browse() {
    navigate({ page: "library" })
  }

  useEffect(() => {
    const keyboard = () => {
      document.documentElement.dataset.input = "keyboard"
    }
    const pointer = () => {
      document.documentElement.dataset.input = "pointer"
    }
    window.addEventListener("keydown", keyboard)
    window.addEventListener("pointerdown", pointer)
    return () => {
      window.removeEventListener("keydown", keyboard)
      window.removeEventListener("pointerdown", pointer)
    }
  }, [])
  return (
    <div className="skin-viewport">
      {page === "home" ? (
        <FocusScreen
          s={s}
          onSettings={() => navigate({ page: "settings" })}
          onBrowse={browse}
          onAssign={assign}
        />
      ) : (
        <PageShell
          s={s}
          route={nav.route}
          navigate={navigate}
          title={title}
          description={
            page === "settings" && (editor.dirty || transfer.selection)
              ? "Your unsaved changes are retained. Return to Manage favorites or Profile library to continue."
              : page === "favorites"
                ? "Five stable positions on Home. Replace, reorder or leave a position empty."
                : page === "library" && assignment !== null
                  ? "Choose a visible profile. An existing favorite swaps positions; Save applies your changes."
                  : undefined
          }
          actions={
            page === "favorites" ? (
              <>
                {(editor.error || editor.message) && (
                  <p
                    role={editor.error ? "alert" : "status"}
                    className="max-w-[380px] text-[13px] text-muted-foreground"
                  >
                    {editor.error || editor.message}
                  </p>
                )}
                <Action
                  variant="outline"
                  disabled={editor.saving}
                  onClick={editor.cancel}
                >
                  Cancel changes
                </Action>
                <Action
                  disabled={
                    editor.saving ||
                    s.libraryLoading ||
                    (!s.snapshot.favoritesLoaded && !s.snapshot.favoritesIssue)
                  }
                  onClick={editor.save}
                >
                  {editor.saving ? "Saving…" : "Save favorites"}
                </Action>
              </>
            ) : page === "library" && assignment !== null ? (
              <Action
                variant="outline"
                onClick={() => {
                  nav.navigate({ page: "favorites" }, true)
                }}
              >
                Cancel assignment
              </Action>
            ) : undefined
          }
        >
          {page === "settings" && (
            <SettingsPage category={nav.route.category} navigate={navigate} />
          )}
          {page === "favorites" && (
            <FavoritesPage s={s} editor={editor} assign={assign} />
          )}
          {page === "library" && (
            <ProfileLibrary
              s={s}
              navigate={navigate}
              assignment={assignment}
              transfer={transfer}
              onAssign={(id) => {
                if (assignment !== null) editor.assign(assignment, id)
                nav.navigate({ page: "favorites" }, true)
              }}
            />
          )}
          {page === "profile" && (
            <ProfileDetail
              key={nav.route.id}
              s={s}
              id={nav.route.id}
              navigate={navigate}
            />
          )}
        </PageShell>
      )}
      {nav.pending && (
        <ConfirmNavigation
          stay={nav.stay}
          leave={nav.leave}
          saving={saving}
          onStop={s.active ? s.stop : undefined}
        />
      )}
      {s.modal === "history" && <History s={s} />}
      {s.modal === "grind" && <GrindEditor s={s} />}
    </div>
  )
}
