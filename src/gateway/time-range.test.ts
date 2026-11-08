import { expect, it } from "vitest"
import { timeRangeAt, TIME_ZOOM_MS } from "../skin/brewing/time-range"

it("expands monotonically without overshooting and preserves endpoints", () => {
  expect(timeRangeAt(30, 40, -1)).toBe(30)
  let previous = 30
  for (let elapsed = 0; elapsed <= TIME_ZOOM_MS; elapsed += 10) {
    const current = timeRangeAt(30, 40, elapsed)
    expect(current).toBeGreaterThanOrEqual(previous)
    expect(current).toBeLessThanOrEqual(40)
    previous = current
  }
  expect(timeRangeAt(30, 40, TIME_ZOOM_MS + 1)).toBe(40)
})
it("retargets from the displayed domain without a positional jump", () => {
  const interrupted = timeRangeAt(30, 40, 160)
  expect(timeRangeAt(interrupted, 60, 0)).toBe(interrupted)
  expect(timeRangeAt(interrupted, 60, 210)).toBeGreaterThan(interrupted)
  expect(timeRangeAt(interrupted, 60, TIME_ZOOM_MS)).toBe(60)
})
