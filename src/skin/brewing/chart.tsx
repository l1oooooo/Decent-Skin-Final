import { memo, useId, useMemo } from "react"
import type { Reading } from "./model"
import { previewPaths } from "./preview-paths"

export const series = [
  {
    key: "pressure",
    name: "Pressure",
    unit: "bar",
    color: "var(--brew-pressure)",
    width: 3,
  },
  {
    key: "targetPressure",
    name: "Target Pressure",
    unit: "bar",
    color: "var(--brew-target-pressure)",
    width: 1.5,
  },
  {
    key: "flow",
    name: "Flow",
    unit: "mL/s",
    color: "var(--brew-flow)",
    width: 2.75,
  },
  {
    key: "groupTemperature",
    name: "Group Temperature",
    unit: "°C",
    color: "var(--brew-temperature)",
    width: 1.75,
  },
  {
    key: "weightFlow",
    name: "Weight Flow",
    unit: "g/s",
    color: "var(--brew-weight-flow)",
    width: 2,
  },
] as const
export type SeriesKey = (typeof series)[number]["key"]
export function domains(samples: Reading[]) {
  let min = 0,
    max = 12,
    tempMin = 60,
    tempMax = 100,
    duration = 30
  for (const point of samples) {
    duration = Math.max(duration, Math.ceil(point.elapsed / 10) * 10)
    for (const key of [
      "pressure",
      "targetPressure",
      "flow",
      "weightFlow",
    ] as const) {
      const value = point[key]
      if (value !== null && Number.isFinite(value)) {
        if (value > max) max = Math.ceil((value + 1) / 3) * 3
        if (value < min) min = Math.floor((value - 1) / 3) * 3
      }
    }
    const t = point.groupTemperature
    if (t !== null && Number.isFinite(t)) {
      if (t < tempMin) tempMin = Math.floor(t / 10) * 10
      if (t > tempMax) tempMax = Math.ceil(t / 10) * 10
    }
  }
  return { min, max, tempMin, tempMax, duration }
}
export function paths(
  samples: Reading[],
  key: SeriesKey,
  x: (v: number) => number,
  y: (v: number) => number,
  baseline: number
) {
  let line = "",
    areas = "",
    segment = "",
    start = 0,
    end = 0,
    previous: Reading | undefined
  const close = () => {
    if (segment)
      areas += `${segment} L${end},${baseline} L${start},${baseline} Z `
    segment = ""
  }
  for (const point of samples) {
    if (point.breakBefore) {
      close()
      previous = undefined
    }
    const value = point[key]
    if (value === null || !Number.isFinite(value)) {
      close()
      previous = undefined
      continue
    }
    const px = x(point.elapsed),
      py = y(value)
    if (!segment) {
      start = px
      segment = `M${px},${py}`
      line += `M${px},${py} `
    } else {
      if (
        key === "targetPressure" &&
        point.targetStep &&
        previous?.targetPressure != null
      )
        line += `L${px},${y(previous.targetPressure)} `
      line += `L${px},${py} `
      segment += ` L${px},${py}`
    }
    end = px
    previous = point
  }
  close()
  return { line, area: areas }
}
export const BrewingChart = memo(function BrewingChart({
  samples,
  width,
  height,
  plannedDuration,
  plannedKeys,
  temperatureUnit = "C",
}: {
  samples: Reading[]
  width: number
  height: number
  plannedDuration?: number
  plannedKeys?: readonly SeriesKey[]
  temperatureUnit?: "C" | "F"
}) {
  const id = useId().replaceAll(":", "")
  const liveRange = useMemo(() => domains(samples), [samples])
  const planned = plannedDuration !== undefined
  const range = planned
    ? { ...liveRange, duration: Math.max(1, plannedDuration) }
    : liveRange
  const visibleSeries = planned
    ? series.filter((s) =>
        (plannedKeys ?? ["pressure", "flow", "groupTemperature"]).includes(
          s.key
        )
      )
    : series
  const w = Math.max(300, width),
    h = Math.max(100, height - 44)
  const left = planned ? 2 : 36,
    right = w - (planned ? 2 : 48),
    top = planned ? 16 : 38,
    bottom = h - (planned ? 2 : 34)
  const x = (v: number) => left + (v / range.duration) * (right - left)
  const y = (v: number) =>
    bottom - ((v - range.min) / (range.max - range.min)) * (bottom - top)
  const tempY = (v: number) =>
    bottom -
    ((v - range.tempMin) / (range.tempMax - range.tempMin)) * (bottom - top)
  const drawing = Object.fromEntries(
    series.map((s) => [
      s.key,
      (planned ? previewPaths : paths)(
        samples,
        s.key,
        x,
        s.key === "groupTemperature" ? tempY : y,
        y(0)
      ),
    ])
  ) as Record<SeriesKey, ReturnType<typeof paths>>
  const markers = samples.filter(
    (p, i) => i === 0 || p.frame !== samples[i - 1].frame
  )
  const ticks = Array.from(
    { length: 5 },
    (_, i) => range.min + ((range.max - range.min) * i) / 4
  )
  const temps = Array.from(
    { length: 5 },
    (_, i) => range.tempMin + ((range.tempMax - range.tempMin) * i) / 4
  )
  return (
    <div
      className="brew-chart"
      aria-label={planned ? "Planned profile chart" : "Brewing chart"}
      data-samples={samples.length}
      data-duration={range.duration}
    >
      <div className="brew-legend">
        {visibleSeries.map((s) => (
          <span key={s.key}>
            <i
              style={{
                borderColor: s.color,
                borderTopStyle: s.key === "targetPressure" ? "dotted" : "solid",
              }}
            />
            {planned && s.key === "groupTemperature" ? "Temperature" : s.name}
            {!planned && (
              <small>
                {s.key === "groupTemperature" ? `°${temperatureUnit}` : s.unit}
              </small>
            )}
          </span>
        ))}
      </div>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={
          planned
            ? "Complete configured targets only. Curves are visual interpolation, not exact machine transitions. Temperature is independently scaled. Incomplete series are omitted."
            : `Five extraction traces. Shared numerical left axis: pressure in bar, flow in millilitres per second, weight flow in grams per second. Independent right axis: group temperature in degrees ${temperatureUnit === "F" ? "Fahrenheit" : "Celsius"}.`
        }
      >
        <defs>
          <linearGradient id={`${id}-pressure`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--brew-pressure)"
              stopOpacity={0.32}
            />
            <stop
              offset="95%"
              stopColor="var(--brew-pressure)"
              stopOpacity={0.04}
            />
          </linearGradient>
          <linearGradient id={`${id}-flow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brew-flow)" stopOpacity={0.32} />
            <stop
              offset="95%"
              stopColor="var(--brew-flow)"
              stopOpacity={0.04}
            />
          </linearGradient>
          {planned && (
            <linearGradient
              id={`${id}-groupTemperature`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor="var(--brew-temperature)"
                stopOpacity=".32"
              />
              <stop
                offset="95%"
                stopColor="var(--brew-temperature)"
                stopOpacity=".04"
              />
            </linearGradient>
          )}
          <clipPath id={`${id}-clip`}>
            <rect x={left} y={top} width={right - left} height={bottom - top} />
          </clipPath>
        </defs>
        {ticks.map((n) => (
          <g key={n}>
            <line
              x1={left}
              x2={right}
              y1={y(n)}
              y2={y(n)}
              stroke="oklch(0.256 0 0)"
              strokeWidth=".75"
            />
            {!planned && (
              <text x="0" y={y(n) + 4}>
                {Number(n.toFixed(1))}
              </text>
            )}
          </g>
        ))}
        {!planned &&
          temps.map((n) => (
            <text
              className="brew-temp-tick"
              key={n}
              x={w}
              y={tempY(n) + 4}
              textAnchor="end"
            >
              {temperatureUnit === "F" ? Math.round((n * 9) / 5 + 32) : n}°
            </text>
          ))}
        {!planned &&
          Array.from(
            { length: Math.floor(range.duration / 5) + 1 },
            (_, i) => i * 5
          )
            .filter(
              (n) =>
                (range.duration <= 40 || n % 10 === 0) &&
                (!planned ||
                  n === 0 ||
                  n === range.duration ||
                  range.duration - n > range.duration * 0.08)
            )
            .map((n) => (
              <text
                key={n}
                x={x(n)}
                y={h - 7}
                textAnchor={
                  n === 0 ? "start" : n === range.duration ? "end" : "middle"
                }
              >
                {n}s
              </text>
            ))}
        {!planned &&
          markers.map((p) => (
            <g key={`${p.frame}-${p.elapsed}`}>
              <line
                x1={x(p.elapsed)}
                x2={x(p.elapsed)}
                y1={top}
                y2={bottom}
                stroke="oklch(0.45 0 0)"
                strokeDasharray="2 6"
                strokeOpacity=".65"
              />
              <text x={Math.min(x(p.elapsed) + 8, right - 130)} y="21">
                {p.stage}
              </text>
            </g>
          ))}
        <g clipPath={`url(#${id}-clip)`}>
          {planned &&
            samples
              .filter((_, i) => i % 2 === 1)
              .flatMap((point) =>
                visibleSeries.map((spec) =>
                  point[spec.key] === null ||
                  samples.find((sample) => sample.frame === point.frame)?.[
                    spec.key
                  ] !== null ? null : (
                    <circle
                      key={`${point.frame}-${spec.key}`}
                      cx={x(point.elapsed)}
                      cy={(spec.key === "groupTemperature" ? tempY : y)(
                        point[spec.key]!
                      )}
                      r={2.5}
                      fill={spec.color}
                    >
                      <title>
                        {point.stage}: {point[spec.key]} {spec.unit} configured
                        target
                      </title>
                    </circle>
                  )
                )
              )}
          {(planned
            ? (["groupTemperature", "pressure", "flow"] as const)
            : (["pressure", "flow"] as const)
          )
            .filter(
              (key) => !planned || visibleSeries.some((s) => s.key === key)
            )
            .map((key) => (
              <path
                key={`${key}-area`}
                data-area={key}
                d={drawing[key].area}
                fill={`url(#${id}-${key})`}
              />
            ))}
          {(
            [
              "groupTemperature",
              "weightFlow",
              "targetPressure",
              "flow",
              "pressure",
            ] as const
          )
            .filter((key) => visibleSeries.some((s) => s.key === key))
            .map((key) => {
              const spec = series.find((s) => s.key === key)!
              return (
                <path
                  key={key}
                  data-series={key}
                  d={drawing[key].line}
                  fill="none"
                  stroke={spec.color}
                  strokeWidth={spec.width}
                  strokeDasharray={key === "targetPressure" ? "1 5" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
        </g>
      </svg>
    </div>
  )
})
