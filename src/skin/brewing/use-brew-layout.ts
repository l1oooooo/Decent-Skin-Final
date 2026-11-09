import { useLayoutEffect, useRef } from "react"
import type { RefObject } from "react"

export const BREW_TRANSITION_MS = 600
const easing = "cubic-bezier(0.645, 0.045, 0.355, 1)"

export function useBrewLayout(
  root: RefObject<HTMLDivElement | null>,
  expanded: boolean,
  transitioning: boolean
) {
  const animations = useRef<Animation[]>([])
  const sharedHeader = useRef<HTMLElement | null>(null)
  const previousExpanded = useRef<boolean | null>(null)
  useLayoutEffect(() => {
    const container = root.current
    if (!container) return
    const surface = container.querySelector<HTMLElement>(".brew-chart-surface")!
    const anchor = container.querySelector<HTMLElement>("[data-chart-anchor]")!
    const header = (
      container.closest(".focus-app") ?? container
    ).querySelector<HTMLElement>(".candidate-header")!
    sharedHeader.current = header
    const liveContent = container.querySelector<HTMLElement>(".brew-live")!
    const liveAnchor = container.querySelector<HTMLElement>(
      ".brew-live-chart-anchor"
    )!
    const body = container.querySelector<HTMLElement>(".focus-body")!
    const leftPanel = body.querySelector<HTMLElement>(
      ":scope > aside:first-child"
    )!
    const rightPanel = body.querySelector<HTMLElement>(".focus-controls-panel")!
    const preview = surface.querySelector<HTMLElement>(".brew-chart-preview")!
    const live = surface.querySelector<HTMLElement>(".brew-chart-live")!
    const heading = body.querySelector<HTMLElement>(".focus-main")!
    const preference = matchMedia("(prefers-reduced-motion: reduce)")
    let geometry = ""
    const cancel = () => {
      animations.current.forEach((animation) => animation.cancel())
      animations.current = []
    }
    const layout = (animate: boolean) => {
      const parent = container.getBoundingClientRect()
      const headerHeight = header?.offsetHeight ?? 0
      container.style.setProperty("--brew-header-height", `${headerHeight}px`)
      const home = anchor.getBoundingClientRect()
      const full = {
        left: liveContent.offsetLeft + liveAnchor.offsetLeft,
        top: liveContent.offsetTop + liveAnchor.offsetTop,
        width: liveAnchor.offsetWidth,
        height: liveAnchor.offsetHeight,
      }
      const small = {
        left: home.left - parent.left,
        top: home.top - parent.top,
        width: home.width,
        height: home.height,
      }
      const next = expanded ? full : small
      const from = surface.getBoundingClientRect()
      const elements = [leftPanel, rightPanel, header, heading, preview, live]
      const current = elements.map((element) => {
        const style = getComputedStyle(element)
        return { transform: style.transform, opacity: style.opacity }
      })
      cancel()
      Object.assign(surface.style, {
        left: `${next.left}px`,
        top: `${next.top}px`,
        width: `${next.width}px`,
        height: `${next.height}px`,
      })
      for (const [layer, bounds] of [
        [preview, small],
        [live, full],
      ] as const) {
        Object.assign(layer.style, {
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          transform: `scale(${next.width / bounds.width}, ${next.height / bounds.height})`,
        })
      }
      const targets = [
        {
          transform: expanded
            ? `translateX(${-leftPanel.offsetWidth}px)`
            : "none",
        },
        {
          transform: expanded
            ? `translateX(${rightPanel.offsetWidth}px)`
            : "none",
        },
        { transform: expanded ? "translateY(-100%)" : "none" },
        { opacity: expanded ? "0" : "1" },
        { opacity: expanded ? "0" : "1" },
        { opacity: expanded ? "1" : "0" },
      ]
      elements.forEach((element, index) =>
        Object.assign(element.style, targets[index])
      )
      const run =
        animate && !preference.matches && !document.hidden && !!from.width
      const lock = (hidden: boolean) => {
        header.inert = hidden
        header.setAttribute("aria-hidden", String(hidden))
        body.inert = hidden
        body.setAttribute("aria-hidden", String(hidden))
      }
      lock(expanded || run)
      if (!run) return
      const startTime = document.timeline.currentTime
      const play = (
        element: HTMLElement,
        frames: Keyframe[],
        duration: number
      ) => {
        const animation = element.animate(frames, { duration, easing })
        animation.startTime = startTime
        animations.current.push(animation)
        return animation
      }
      const chartAnimation = play(
        surface,
        [
          {
            transform: `translate(${from.left - parent.left - next.left}px, ${from.top - parent.top - next.top}px) scale(${from.width / next.width}, ${from.height / next.height})`,
          },
          { transform: "none" },
        ],
        BREW_TRANSITION_MS
      )
      chartAnimation.onfinish = () => {
        if (!expanded) lock(false)
      }
      elements.forEach((element, index) => {
        const key = index < 3 ? "transform" : "opacity"
        play(
          element,
          [{ [key]: current[index][key] }, targets[index]],
          index < 3 ? BREW_TRANSITION_MS : 200
        )
      })
    }
    const measure = () =>
      [
        container.clientWidth,
        container.clientHeight,
        header?.offsetHeight ?? 0,
        liveAnchor.offsetLeft,
        liveAnchor.offsetTop,
        liveAnchor.offsetWidth,
        liveAnchor.offsetHeight,
        anchor.offsetLeft,
        anchor.offsetTop,
        anchor.offsetWidth,
        anchor.offsetHeight,
      ].join(":")
    layout(
      previousExpanded.current !== null && previousExpanded.current !== expanded
    )
    previousExpanded.current = expanded
    geometry = measure()
    const observer = new ResizeObserver(() => {
      const next = measure()
      if (next === geometry) return
      geometry = next
      layout(false)
    })
    observer.observe(container)
    if (header) observer.observe(header)
    observer.observe(anchor)
    observer.observe(liveAnchor)
    const settle = () => layout(false)
    const hidden = () => {
      if (document.hidden) settle()
    }
    preference.addEventListener("change", settle)
    document.addEventListener("visibilitychange", hidden)
    return () => {
      observer.disconnect()
      preference.removeEventListener("change", settle)
      document.removeEventListener("visibilitychange", hidden)
    }
  }, [root, expanded, transitioning])
  useLayoutEffect(
    () => () => {
      animations.current.forEach((animation) => animation.cancel())
      const header = sharedHeader.current
      if (header) {
        header.style.transform = ""
        header.inert = false
        header.removeAttribute("aria-hidden")
      }
    },
    []
  )
}
