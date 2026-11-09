import { useLayoutEffect, useRef } from "react"
import { conciseNumber } from "./format"

export const PROFILE_NUMBER_MS = 350

function numberText(
  value: number,
  digits: number | undefined,
  concise: boolean
) {
  if (!Number.isFinite(value)) return "—"
  return concise ? conciseNumber(value, digits) : value.toFixed(digits ?? 1)
}

export function ProfileNumber({
  value,
  profileId,
  enabled,
  unit = "",
  digits,
  concise = false,
  text,
}: {
  value: number
  profileId: string
  enabled: boolean
  unit?: string
  digits?: number
  concise?: boolean
  text?: string
}) {
  const node = useRef<HTMLSpanElement>(null)
  const previous = useRef<{
    profileId: string
    enabled: boolean
    unit: string
    text?: string
  } | null>(null)
  const displayed = useRef(value)
  const width = useRef(0)
  const finalText = text ?? numberText(value, digits, concise)

  useLayoutEffect(() => {
    const el = node.current!
    const before = previous.current
    previous.current = { profileId, enabled, unit, text }
    const from = displayed.current
    const target =
      text === undefined && Number.isFinite(value) ? Number(finalText) : NaN
    let frame = 0
    const preference = matchMedia("(prefers-reduced-motion: reduce)")
    const settle = () => {
      cancelAnimationFrame(frame)
      displayed.current = target
      el.textContent = finalText
      el.dataset.counting = "false"
    }
    if (before?.unit !== unit) {
      width.current = 0
      el.style.minWidth = ""
    }
    width.current = Math.max(width.current, el.getBoundingClientRect().width)
    const shouldAnimate =
      before &&
      before.enabled &&
      enabled &&
      before.profileId &&
      profileId &&
      before.profileId !== profileId &&
      before.unit === unit &&
      before.text === undefined &&
      text === undefined &&
      Number.isFinite(from) &&
      Number.isFinite(target) &&
      from !== target &&
      !preference.matches &&
      !document.hidden
    if (!shouldAnimate) {
      settle()
      return
    }
    el.style.minWidth = `${width.current}px`
    el.dataset.counting = "true"
    const precision =
      digits ??
      Math.max(
        String(from).split(".")[1]?.length ?? 0,
        String(target).split(".")[1]?.length ?? 0
      )
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.max(
        0,
        Math.min(1, (now - start) / PROFILE_NUMBER_MS)
      )
      if (progress === 1) return settle()
      const next = from + (target - from) * (1 - Math.pow(1 - progress, 3))
      el.textContent = numberText(next, precision, concise)
      displayed.current = Number(el.textContent)
      frame = requestAnimationFrame(tick)
    }
    tick(start)
    const reduced = () => {
      if (preference.matches) settle()
    }
    const hidden = () => {
      if (document.hidden) settle()
    }
    preference.addEventListener("change", reduced)
    document.addEventListener("visibilitychange", hidden)
    return () => {
      cancelAnimationFrame(frame)
      preference.removeEventListener("change", reduced)
      document.removeEventListener("visibilitychange", hidden)
    }
  }, [value, profileId, enabled, unit, digits, concise, text, finalText])

  return (
    <span
      ref={node}
      className="profile-number"
      data-profile-number=""
      data-target={finalText}
    >
      {finalText}
    </span>
  )
}
