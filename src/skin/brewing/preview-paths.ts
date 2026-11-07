import type { Reading } from "./model"
import type { SeriesKey } from "./chart"

// A visual Home illustration; the profile adapter retains exact setpoints.
export function previewPaths(
  samples: Reading[],
  key: SeriesKey,
  x: (value: number) => number,
  y: (value: number) => number,
  baseline: number
) {
  const segments: { x: number; y: number }[][] = []
  let segment: { x: number; y: number }[] = []
  for (const sample of samples) {
    const value = sample[key]
    if (value === null || !Number.isFinite(value)) {
      if (segment.length) segments.push(segment)
      segment = []
      continue
    }
    const point = { x: x(sample.elapsed), y: y(value) }
    const previous = segment.at(-1)
    if (!previous || previous.x !== point.x || previous.y !== point.y)
      segment.push(point)
  }
  if (segment.length) segments.push(segment)
  let line = "",
    area = ""
  for (const points of segments) {
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1],
        point = points[i]
      if (previous.x !== point.x) continue
      const before = points[i - 2],
        after = points[i + 1]
      if (!before || !after) continue
      const radius = Math.min(
        20,
        (point.x - before.x) / 3,
        (after.x - point.x) / 3
      )
      previous.x -= radius
      point.x += radius
    }
    let curve = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1],
        point = points[i]
      const middle = (previous.x + point.x) / 2
      curve += ` C${middle},${previous.y} ${middle},${point.y} ${point.x},${point.y}`
    }
    line += `${curve} `
    area += `${curve} L${points.at(-1)!.x},${baseline} L${points[0].x},${baseline} Z `
  }
  return { line, area }
}
