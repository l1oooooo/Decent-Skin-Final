import { expect, it } from "vitest"
import { domains, paths } from "../skin/brewing/chart"
import type { Reading } from "../skin/brewing/model"

const reading: Reading = {
  elapsed: 0,
  pressure: 9,
  targetPressure: 9,
  flow: 1.6,
  groupTemperature: 88,
  weightFlow: 2.1,
  beverageWeight: 0,
  frame: 0,
  stage: "Extraction",
}

it.each([
  [0, 35],
  [25, 35],
  [30, 35],
  [34, 35],
  [34.999, 35],
  [35, 40],
  [39, 40],
  [39.999, 40],
  [40, 50],
  [40.001, 50],
  [45, 50],
  [50, 60],
  [60, 70],
  [120, 130],
])("places %ss telemetry in a %ss live domain", (elapsed, duration) => {
  const samples = [reading, { ...reading, elapsed }]
  const original = structuredClone(samples)
  expect(domains(samples)).toEqual({
    min: 0,
    max: 12,
    tempMin: 60,
    tempMax: 100,
    duration,
  })
  expect(duration).toBeGreaterThan(elapsed)
  expect(samples).toEqual(original)
})

it("starts empty shots at thirty-five seconds without changing sample gaps or units", () => {
  expect(domains([]).duration).toBe(35)
  const samples = [
    reading,
    { ...reading, elapsed: 39, pressure: null },
    { ...reading, elapsed: 40, pressure: 8.25 },
  ]
  const identity = (value: number) => value
  expect(paths(samples, "pressure", identity, identity, 0).line).toBe(
    "M0,9 M40,8.25 "
  )
})
