import { useLayoutEffect, useRef } from "react"
import type { RefObject } from "react"
import { TIME_ZOOM_MS, timeRangeAt } from "./time-range"

type Options = {
  svg: RefObject<SVGSVGElement | null>
  duration: number
  left: number
  right: number
  height: number
  enabled: boolean
  resetKey?: string | null
}

// Only the displayed coordinate system moves. React continues to own raw paths.
export function useChartTimeRange(options: Options) {
  const motion = useRef<{
    current: number
    target: number
    from: number
    started: number
    frame: number
    geometry: string
    resetKey?: string | null
    apply: () => void
  } | null>(null)

  useLayoutEffect(() => {
    const { svg, duration, left, right, height, enabled, resetKey } = options
    const node = svg.current
    if (!node) return
    const geometry = `${left}:${right}:${height}`
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const state = motion.current ?? {
      current: duration,
      target: duration,
      from: duration,
      started: 0,
      frame: 0,
      geometry,
      resetKey,
      apply: () => {},
    }
    motion.current = state
    const groups = [
      ...node.querySelectorAll<SVGGElement>("[data-time-geometry]"),
    ]
    const labels = [...node.querySelectorAll<SVGTextElement>("[data-time]")]
    state.apply = () => {
      const ratio = state.target / state.current
      for (const group of groups) {
        if (ratio === 1) group.removeAttribute("transform")
        else
          group.setAttribute(
            "transform",
            `translate(${left} 0) scale(${ratio} 1) translate(${-left} 0)`
          )
      }
      for (const label of labels) {
        const time = Number(label.dataset.time)
        const offset = Number(label.dataset.timeOffset ?? 0)
        const cap = Number(label.dataset.timeCap ?? Infinity)
        label.setAttribute(
          "x",
          String(
            Math.min(
              left + (time / state.current) * (right - left) + offset,
              cap
            )
          )
        )
        label.style.visibility = time > state.current + 0.000001 ? "hidden" : ""
      }
      node.parentElement?.setAttribute(
        "data-displayed-duration",
        String(state.current)
      )
    }
    if (
      !enabled ||
      reduced ||
      document.hidden ||
      geometry !== state.geometry ||
      resetKey !== state.resetKey ||
      duration < state.target
    ) {
      cancelAnimationFrame(state.frame)
      state.frame = 0
      state.current = state.target = duration
    } else if (duration !== state.target) {
      cancelAnimationFrame(state.frame)
      state.from = state.current
      state.target = duration
      state.started = performance.now()
      const tick = (now: number) => {
        state.current = timeRangeAt(
          state.from,
          state.target,
          now - state.started
        )
        state.apply()
        state.frame =
          now - state.started < TIME_ZOOM_MS ? requestAnimationFrame(tick) : 0
      }
      state.frame = requestAnimationFrame(tick)
    }
    state.geometry = geometry
    state.resetKey = resetKey
    state.apply()
  })

  useLayoutEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)")
    const settle = () => {
      const state = motion.current
      if (!state) return
      cancelAnimationFrame(state.frame)
      state.frame = 0
      state.current = state.target
      state.apply()
    }
    const preferenceChanged = () => {
      if (preference.matches) settle()
    }
    const visibilityChanged = () => {
      if (document.hidden) settle()
    }
    preference.addEventListener("change", preferenceChanged)
    document.addEventListener("visibilitychange", visibilityChanged)
    return () => {
      if (motion.current) cancelAnimationFrame(motion.current.frame)
      preference.removeEventListener("change", preferenceChanged)
      document.removeEventListener("visibilitychange", visibilityChanged)
    }
  }, [])
}
