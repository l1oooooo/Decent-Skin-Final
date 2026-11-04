import { useEffect, useRef, useState, useId } from "react"
import type { SkinSession } from "./use-skin"
function Trace({ s, height = 205 }: { s: SkinSession; height?: number }) {
  const clipId = useId()
  const root = useRef<HTMLDivElement>(null)
  const [w, setWidth] = useState(820)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    if (root.current) observer.observe(root.current)
    return () => observer.disconnect()
  }, [])
  const h = 220,
    left = 35,
    right = w - 44,
    top = 18,
    bottom = 185
  const [showFlow, setFlow] = useState(true)
  const [showTemperature, setTemperature] = useState(true)
  const curve = s.active || s.complete ? s.samples : s.preview
  const duration = Math.max(
    30,
    Math.ceil((curve.at(-1)?.elapsed ?? 30) / 10) * 10
  )
  function linePath(
    field: "pressure" | "flow" | "temperature",
    minimum: number,
    maximum: number
  ) {
    let continuous = false
    return curve
      .map((point) => {
        const value = point[field]
        if (value === null || !Number.isFinite(value)) {
          continuous = false
          return ""
        }
        const x = left + (point.elapsed / duration) * (right - left)
        const y =
          bottom - ((value - minimum) / (maximum - minimum)) * (bottom - top)
        const command = continuous ? "L" : "M"
        continuous = true
        return `${command}${x},${y}`
      })
      .join(" ")
  }
  return (
    <div ref={root} className="min-w-0">
      <div className="mb-2 flex items-center gap-5 text-[12px]">
        <span className="flex items-center gap-2">
          <i className="h-0.5 w-3 bg-[var(--signal)]" />
          Pressure <span className="text-muted-foreground">bar</span>
        </span>
        <button
          className="flex min-h-11 items-center gap-2"
          aria-pressed={showFlow}
          onClick={() => setFlow(!showFlow)}
        >
          <i
            className={`h-0.5 w-3 ${showFlow ? "bg-[var(--signal-warm)]" : "bg-muted-foreground"}`}
          />
          <span className={showFlow ? "" : "text-muted-foreground"}>Flow</span>
          <span className="text-muted-foreground">ml/s</span>
        </button>
        <button
          className="flex min-h-11 items-center gap-2"
          aria-label="Temperature trace"
          aria-pressed={showTemperature}
          onClick={() => setTemperature(!showTemperature)}
        >
          <i
            aria-hidden="true"
            className={`h-0 w-3 border-t-2 border-dashed ${showTemperature ? "border-[var(--signal-temperature)]" : "border-muted-foreground"}`}
          />
          <span className={showTemperature ? "" : "text-muted-foreground"}>
            Temperature
          </span>
          <span className="text-muted-foreground">°C</span>
        </button>
        {(s.active || s.complete) && (
          <span className="ml-auto text-muted-foreground">
            {s.complete ? "Shot trace" : "Live shot"}
          </span>
        )}
      </div>
      <svg
        className="w-full overflow-visible"
        style={{ height }}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Pressure, flow and temperature curves. Temperature uses the right axis, 60 to 100 degrees Celsius."
      >
        {[0, 3, 6, 9, 12].map((n) => (
          <g key={n}>
            <line
              x1={left}
              x2={right}
              y1={bottom - (n / 12) * (bottom - top)}
              y2={bottom - (n / 12) * (bottom - top)}
              stroke="var(--border)"
              strokeDasharray="2 5"
            />
            <text
              x="0"
              y={bottom - (n / 12) * (bottom - top) + 4}
              fill="var(--muted-foreground)"
              fontSize="12"
            >
              {n}
            </text>
          </g>
        ))}
        {[60, 70, 80, 90, 100].map((n) => (
          <text
            key={`temperature-${n}`}
            x={w}
            y={bottom - ((n - 60) / 40) * (bottom - top) + 4}
            textAnchor="end"
            fill="var(--signal-temperature)"
            fontSize="12"
          >
            {n}°
          </text>
        ))}
        {[0, duration / 3, (duration * 2) / 3, duration].map((n) => (
          <text
            key={n}
            x={left + (n / duration) * (right - left)}
            y="213"
            fill="var(--muted-foreground)"
            textAnchor={n === duration ? "end" : "start"}
            fontSize="12"
          >
            {Math.round(n)}s
          </text>
        ))}
        <defs>
          <clipPath id={clipId}>
            <rect
              x={left}
              y={top}
              width={Math.max(0, right - left)}
              height={bottom - top}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path
            d={linePath("pressure", 0, 12)}
            fill="none"
            stroke="var(--signal)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={!s.active && !s.complete ? "5 5" : undefined}
          />
          {showFlow && (
            <path
              d={linePath("flow", 0, 4)}
              fill="none"
              stroke="var(--signal-warm)"
              strokeWidth="1.5"
              strokeDasharray="3 5"
            />
          )}
          {showTemperature && (
            <path
              aria-label="Temperature"
              d={linePath("temperature", 60, 100)}
              fill="none"
              stroke="var(--signal-temperature)"
              strokeWidth="2"
              strokeDasharray="8 4"
            />
          )}
        </g>
      </svg>
    </div>
  )
}

export function Extraction({
  s,
  height = 205,
}: {
  s: SkinSession
  height?: number
}) {
  return (
    <div className="graph-color">
      <Trace s={s} height={height} />
    </div>
  )
}
