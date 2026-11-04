import { useEffect, useRef } from "react"
import { Action } from "../common"
import "./visualization.css"

export const stages = [
  { name: "Preinfusion", start: 0, end: 7 },
  { name: "Extraction", start: 7, end: 18 },
  { name: "Pressure decline", start: 18, end: 30 },
]
export const clamp = (value) => Math.max(0, Math.min(1, value))
export function progress(s) {
  const index = s.shot.elapsed < 7 ? 0 : s.shot.elapsed < 18 ? 1 : 2
  const stage = stages[index]
  return {
    index,
    fraction: clamp((s.shot.elapsed - stage.start) / (stage.end - stage.start)),
    total: clamp(s.shot.elapsed / 30),
    title: s.complete
      ? s.shot.elapsed >= 30
        ? "Shot complete"
        : "Shot stopped"
      : stage.name,
  }
}
export function Panel({ s, name, children, onAdjust }) {
  return (
    <section
      aria-label={`${name} brewing visualization`}
      className="motion-panel flex min-h-0 flex-1 flex-col"
      data-running={(s.active || s.complete) && !s.paused}
    >
      {children}
      <div className={`mt-5 shrink-0 ${s.complete ? "" : "invisible"}`}>
        <Action className="w-full" variant="outline" onClick={onAdjust}>
          Adjust profile settings
        </Action>
      </div>
    </section>
  )
}
export function Heading({ s, label }) {
  const { title } = progress(s)
  const ref = useRef(null)
  const previous = useRef(title)
  useEffect(() => {
    const changed = previous.current !== title
    previous.current = title
    const element = ref.current
    if (
      !changed ||
      s.paused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      element.closest('[data-input="keyboard"], [data-reduced-motion="true"]')
    )
      return
    const css = getComputedStyle(element)
    const animation = element.animate(
      [
        {
          opacity: 0,
          transform: `translateY(${css.getPropertyValue("--travel")})`,
        },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: parseFloat(css.getPropertyValue("--motion-duration")),
        easing: css.getPropertyValue("--motion-ease").trim(),
      }
    )
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const cancel = () => animation.cancel()
    media.addEventListener("change", cancel)
    return () => {
      animation.cancel()
      media.removeEventListener("change", cancel)
    }
  }, [title, s.paused])
  return (
    <header className="shrink-0">
      <p className="text-[12px] tracking-[.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <div ref={ref} role="status" aria-live="polite" className="mt-6 h-[88px]">
        <h2 className="text-[36px] leading-tight font-medium tracking-[-.04em]">
          {title}
        </h2>
      </div>
    </header>
  )
}
export function stageStatus(s, stage, i, index) {
  return s.shot.elapsed >= stage.end
    ? "complete"
    : i === index
      ? s.complete
        ? "stopped here"
        : "current stage"
      : s.complete
        ? "not reached"
        : "upcoming"
}
export const processDetails = [
  {
    description: "Gently wet the coffee bed.",
    reference: "3 bar · gentle fill",
  },
  {
    description: "Maintain pressure as the cup fills.",
    reference: "9 bar · steady extraction",
  },
  {
    description: "Ease pressure through the finish.",
    reference: "9 → 7.4 bar · gradual decline",
  },
]
