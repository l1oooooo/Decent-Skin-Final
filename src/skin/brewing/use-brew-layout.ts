import { useLayoutEffect, useRef } from "react"
import type { RefObject } from "react"

export const BREW_TRANSITION_MS = 500
const easing = "cubic-bezier(0.645, 0.045, 0.355, 1)"

export function useBrewLayout(
  root: RefObject<HTMLDivElement | null>,
  expanded: boolean,
  transitioning: boolean
) {
  const animations = useRef<Animation[]>([])
  const previousExpanded = useRef<boolean | null>(null)
  useLayoutEffect(() => {
    const container = root.current
    if (!container) return
    const surface = container.querySelector<HTMLElement>(".brew-chart-surface")!
    const anchor = container.querySelector<HTMLElement>("[data-chart-anchor]")!
    const header = container.querySelector<HTMLElement>(".candidate-header")!
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
      const home = anchor.getBoundingClientRect()
      const headerHeight = header.getBoundingClientRect().height
      const top = headerHeight + (parent.height <= 650 ? 136 : 160)
      const full = {
        left: 28,
        top,
        width: parent.width - 56,
        height: Math.max(150, parent.height - top - 64),
      }
      const small = {
        left: home.left - parent.left,
        top: home.top - parent.top,
        width: home.width,
        height: home.height,
      }
      const next = expanded ? full : small
      const from = surface.getBoundingClientRect()
      const elements = [leftPanel, rightPanel, heading, preview, live]
      const current = elements.map((element) => {
        const style = getComputedStyle(element)
        return { transform: style.transform, opacity: style.opacity }
      })
      cancel()
      container.style.setProperty("--brew-header-height", `${headerHeight}px`)
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
        { opacity: expanded ? "0" : "1" },
        { opacity: expanded ? "0" : "1" },
        { opacity: expanded ? "1" : "0" },
      ]
      elements.forEach((element, index) =>
        Object.assign(element.style, targets[index])
      )
      body.inert = expanded || transitioning
      body.setAttribute("aria-hidden", String(expanded || transitioning))
      if (!animate || preference.matches || document.hidden || !from.width)
        return
      const startTime = document.timeline.currentTime
      const play = (
        element: HTMLElement,
        frames: Keyframe[],
        duration: number
      ) => {
        const animation = element.animate(frames, { duration, easing })
        animation.startTime = startTime
        animations.current.push(animation)
      }
      play(
        surface,
        [
          {
            transform: `translate(${from.left - parent.left - next.left}px, ${from.top - parent.top - next.top}px) scale(${from.width / next.width}, ${from.height / next.height})`,
          },
          { transform: "none" },
        ],
        BREW_TRANSITION_MS
      )
      elements.forEach((element, index) => {
        const key = index < 2 ? "transform" : "opacity"
        play(
          element,
          [{ [key]: current[index][key] }, targets[index]],
          index < 2 ? BREW_TRANSITION_MS : 200
        )
      })
    }
    const measure = () =>
      [
        container.clientWidth,
        container.clientHeight,
        header.offsetHeight,
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
    observer.observe(header)
    observer.observe(anchor)
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
    },
    []
  )
}
