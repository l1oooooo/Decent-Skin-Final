import { useEffect, useState } from "react"
import { progress, stages } from "./shared"

const rollingStages = [...stages, { name: "Shot complete" }]
const dotDelays = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3)
  const column = index % 3
  return (column + Math.abs(row - 1)) * 100
})

export default function Rolling({ s }) {
  const shot = progress(s)
  const finished = s.complete && s.shot.elapsed >= 30
  const activeIndex = finished ? stages.length : shot.index
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
              key={stage.name}
              className="focus-stage motion-opacity relative flex h-[104px] items-center justify-center gap-2.5"
              data-active={i === activeIndex && s.active}
              data-running={
                i === activeIndex && s.active && !s.paused && visible
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
                      style={{ "--dot-delay": `${delay - 900}ms` }}
                    />
                  ))}
                </span>
              )}
              <span className="text-[28px] leading-tight font-medium tracking-[-.025em]">
                {s.complete && !finished && i === activeIndex
                  ? shot.title
                  : stage.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        <h2>{shot.title}</h2>
      </div>
    </>
  )
}
