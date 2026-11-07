import { useLayoutEffect, useRef } from "react"

export type StatusTone =
  "preparing" | "preinfusion" | "pouring" | "complete" | "error" | "idle"
// Decaid 14361a94: MachineState / MachineSubstate. Labels remain owned by
// the session; profile frame names do not determine machine-state semantics.
export function machineStatusTone(state: string, substate: string): StatusTone {
  if (
    state === "error" ||
    substate.startsWith("error") ||
    state === "disconnected"
  )
    return "error"
  if (substate === "pouringDone") return "complete"
  if (
    ["heating", "preheating"].includes(state) ||
    substate === "preparingForShot"
  )
    return "preparing"
  if (substate === "preinfusion") return "preinfusion"
  if (state === "espresso" || substate === "pouring") return "pouring"
  return "idle"
}

export function RollingStatus({
  label,
  tone,
  running,
}: {
  label: string
  tone: StatusTone
  running: boolean
}) {
  const text = useRef<HTMLSpanElement>(null)
  const previous = useRef(label)
  useLayoutEffect(() => {
    const node = text.current
    if (!node) return
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    let animation: Animation | undefined
    let cancelled = false
    const settle = () => {
      animation?.cancel()
      node.textContent = label
      previous.current = label
    }
    if (previous.current === label || motion.matches) settle()
    else {
      animation = node.animate(
        [
          { transform: "translateY(0)", opacity: 1 },
          { transform: "translateY(-10px)", opacity: 0 },
        ],
        { duration: 100, easing: "ease-in", fill: "forwards" }
      )
      animation.onfinish = () => {
        if (cancelled) return
        settle()
        animation = node.animate(
          [
            { transform: "translateY(10px)", opacity: 0 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: 140, easing: "cubic-bezier(.16,1,.3,1)" }
        )
      }
    }
    const reduce = () => {
      if (motion.matches) settle()
    }
    motion.addEventListener("change", reduce)
    return () => {
      cancelled = true
      animation?.cancel()
      motion.removeEventListener("change", reduce)
    }
  }, [label])
  return (
    <div
      className="rolling-status"
      data-tone={tone}
      data-running={running}
      role="status"
      aria-label={label}
    >
      <span className="rolling-icon" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            style={{
              animationDelay: `${((i % 3) + Math.abs(Math.floor(i / 3) - 1)) * 90 - 650}ms`,
            }}
          />
        ))}
      </span>
      <span className="rolling-window" aria-hidden="true">
        <span ref={text}>
          {/* Text is replaced only between animation halves. */}
        </span>
      </span>
    </div>
  )
}
