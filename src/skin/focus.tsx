import { useEffect, useState } from "react"
import type { SkinSession } from "./use-skin"
import { Action } from "./primitives"

const dotDelays = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3)
  const column = index % 3
  return (column + Math.abs(row - 1)) * 100
})

function Rolling({ s }: { s: SkinSession }) {
  const stages = s.steps
  const rollingStages = [...stages, { name: "Shot complete" }]
  const finished = s.complete && !s.stopped
  const activeIndex = finished ? stages.length : s.frame
  const title = s.complete
    ? s.stopped
      ? "Shot stopped"
      : "Shot complete"
    : (stages[s.frame]?.name ?? "Brewing")
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  return (
    <>
      <div
        className="focus-window relative h-[280px] overflow-hidden"
        aria-hidden="true"
      >
        <div className="focus-dividers absolute inset-x-0 top-[88px] h-[104px] border-y border-border" />
        <div
          className="motion-transform absolute inset-x-0 top-[88px]"
          style={{ transform: `translateY(${-activeIndex * 104}px)` }}
        >
          {rollingStages.map((stage, i) => (
            <div
              key={`${i}-${stage.name}`}
              className="focus-stage motion-opacity relative flex h-[104px] items-center justify-center gap-2.5"
              data-active={i === activeIndex && s.active}
              data-running={
                i === activeIndex &&
                s.phase === "brewing" &&
                !s.paused &&
                visible
              }
              style={{ opacity: i === activeIndex ? 1 : 0.5 }}
            >
              {i < stages.length && (
                <span
                  className="motion-opacity grid shrink-0 grid-cols-3 gap-[2px]"
                  style={{ opacity: i === activeIndex ? 1 : 0 }}
                >
                  {dotDelays.map((delay, index) => (
                    <span
                      key={index}
                      className="focus-dot size-[5px] rounded-full bg-foreground"
                      style={{ animationDelay: `${delay - 900}ms` }}
                    />
                  ))}
                </span>
              )}
              <span className="line-clamp-2 min-w-0 text-[28px] leading-tight font-medium tracking-[-.025em] [overflow-wrap:anywhere]">
                {s.complete && !finished && i === activeIndex
                  ? title
                  : stage.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        <h2>{title}</h2>
      </div>
    </>
  )
}

export default function Focus({
  s,
  onAdjust,
}: {
  s: SkinSession
  onAdjust: () => void
}) {
  return (
    <section
      aria-label="Focus brewing visualization"
      className="motion-panel flex min-h-0 flex-1 flex-col"
      data-running={(s.active || s.complete) && !s.paused}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <Rolling s={s} />
      </div>
      <div className={`mt-5 shrink-0 ${s.complete ? "" : "invisible"}`}>
        <Action className="w-full" variant="outline" onClick={onAdjust}>
          Adjust profile settings
        </Action>
      </div>
    </section>
  )
}
