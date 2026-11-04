import type { ShotSample } from "@/gateway/types"
export function ShotChart({ samples }: { samples: ShotSample[] }) {
  const points = samples
    .map(
      (point) =>
        `${40 + (point.elapsed / 30) * 700},${210 - (point.pressure / 12) * 180}`
    )
    .join(" ")
  return (
    <figure className="min-w-0">
      <figcaption className="mb-4 flex justify-between text-sm">
        <span>Pressure</span>
        <span className="text-muted-foreground">bar / seconds</span>
      </figcaption>
      <svg
        viewBox="0 0 780 250"
        className="h-52 w-full text-foreground"
        role="img"
        aria-label={
          samples.length
            ? "Simulated shot pressure over thirty seconds"
            : "Pressure chart waiting for a simulated shot"
        }
      >
        {[0, 3, 6, 9, 12].map((value) => (
          <g key={value}>
            <line
              x1="40"
              y1={210 - value * 15}
              x2="740"
              y2={210 - value * 15}
              stroke="var(--border)"
            />
            <text
              x="24"
              y={214 - value * 15}
              textAnchor="end"
              fontSize="12"
              fill="var(--muted-foreground)"
            >
              {value}
            </text>
          </g>
        ))}
        {[0, 10, 20, 30].map((value) => (
          <text
            key={value}
            x={40 + (value / 30) * 700}
            y="240"
            textAnchor="middle"
            fontSize="12"
            fill="var(--muted-foreground)"
          >
            {value}s
          </text>
        ))}
        {points && (
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {!points && (
          <text
            x="390"
            y="120"
            textAnchor="middle"
            fontSize="14"
            fill="var(--muted-foreground)"
          >
            Start a demo shot to see the trace
          </text>
        )}
      </svg>
    </figure>
  )
}
