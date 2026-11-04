import { Check } from "lucide-react"
import { useEffect, useRef } from "react"
import { Action } from "./common"
const stages = [
  { name: "Preinfusion", start: 0, end: 7 },
  { name: "Extraction", start: 7, end: 18 },
  {
    name: "Pressure decline",
    start: 18,
    end: 30,
  },
]
function shotState(s) {
  const current = s.shot.elapsed < 7 ? 0 : s.shot.elapsed < 18 ? 1 : 2
  const finished = s.complete && s.shot.elapsed >= 30
  const stage = stages[current]
  return {
    current,
    finished,
    title: s.complete
      ? finished
        ? "Shot complete"
        : "Shot stopped"
      : stage.name,
  }
}
function StatusPanel({ s, label, children }) {
  return (
    <section
      aria-label={label}
      data-running={s.active && !s.paused ? "true" : "false"}
      className="status-panel flex min-h-0 flex-1 flex-col"
    >
      {children}
    </section>
  )
}
function StageMessage({ s, children, className = "" }) {
  const ref = useRef(null)
  const shot = shotState(s)
  const previous = useRef(shot.title)
  useEffect(() => {
    const changed = previous.current !== shot.title
    previous.current = shot.title
    if (
      !changed ||
      s.paused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      ref.current.closest(
        '[data-input="keyboard"], [data-reduced-motion="true"]'
      )
    )
      return
    const styles = getComputedStyle(ref.current)
    const duration =
      Number.parseFloat(styles.getPropertyValue("--status-duration")) || 0
    const easing = styles.getPropertyValue("--status-ease").trim()
    const animation = ref.current.animate(
      [
        { opacity: 0, transform: "translateY(3px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration, easing }
    )
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const cancel = () => animation.cancel()
    media.addEventListener("change", cancel)
    return () => {
      animation.cancel()
      media.removeEventListener("change", cancel)
    }
  }, [shot.title, s.paused])
  return (
    <div ref={ref} role="status" aria-live="polite" className={className}>
      {children}
    </div>
  )
}
function StatusHeading({ s, label }) {
  const shot = shotState(s)
  return (
    <div className="shrink-0">
      <p className="text-[12px] tracking-[.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <StageMessage s={s} className="mt-6 h-[80px]">
        <h2 className="text-[36px] leading-tight font-medium tracking-[-.04em]">
          {shot.title}
        </h2>
      </StageMessage>
    </div>
  )
}
function StatusFoot({ s, onAdjust }) {
  if (!s.complete) return null
  return (
    <div className="mt-auto flex h-[68px] shrink-0 items-end">
      <Action variant="outline" className="w-full" onClick={onAdjust}>
        Adjust profile settings
      </Action>
    </div>
  )
}
function Track({ fraction, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden bg-border ${className}`}
    >
      <div
        className="status-track h-full origin-left bg-foreground"
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, fraction))})` }}
      />
    </div>
  )
}

export default function Timeline({ s, onAdjust }) {
  const shot = shotState(s)
  return (
    <StatusPanel s={s} label="Brewing timeline">
      <StatusHeading s={s} label="Stage by stage" />
      <ol
        aria-label="Shot stages"
        className="mt-2 flex min-h-0 flex-1 flex-col"
      >
        {stages.map((stage, i) => {
          const duration = stage.end - stage.start
          const elapsed = Math.max(
            0,
            Math.min(duration, s.shot.elapsed - stage.start)
          )
          const done = s.shot.elapsed >= stage.end
          const active = !s.complete && i === shot.current
          const stopped = s.complete && !shot.finished && i === shot.current
          return (
            <li
              key={stage.name}
              aria-current={active ? "step" : undefined}
              aria-label={`${stage.name}: ${done ? "complete" : active ? "current stage" : stopped ? "stopped here" : s.complete ? "not reached" : "upcoming"}`}
              className="relative flex min-h-0 flex-1 gap-4 pt-6"
            >
              {i < 2 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-16 bottom-[-24px] left-[19px] w-px ${done ? "bg-foreground/60" : "bg-border"}`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border text-[13px] tabular-nums ${active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
              >
                {done ? <Check size={18} /> : `0${i + 1}`}
              </span>
              <div className="min-w-0 flex-1 pt-1.5">
                <div
                  className={`flex items-baseline justify-between gap-2 text-[20px] leading-tight tracking-[-.025em] ${active || stopped ? "text-foreground" : "text-muted-foreground"}`}
                >
                  <span>{stage.name}</span>
                </div>
                <Track fraction={elapsed / duration} className="mt-6 h-0.5" />
              </div>
            </li>
          )
        })}
      </ol>
      <StatusFoot s={s} onAdjust={onAdjust} />
    </StatusPanel>
  )
}
