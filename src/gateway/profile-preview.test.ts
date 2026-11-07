import { describe, expect, it } from "vitest"
import type { ProfileStep } from "./types"
import { completeProfilePreview } from "../skin/brewing/planned-profile"

const step = (patch: Partial<ProfileStep> = {}): ProfileStep => ({
  name: "Step",
  pump: "pressure",
  pressure: 3,
  transition: "fast",
  seconds: 5,
  temperature: 90,
  sensor: "coffee",
  ...patch,
})
const preview = (...steps: ProfileStep[]) =>
  completeProfilePreview({ title: "Fixture", steps })

describe("complete Home target curves", () => {
  it("keeps pressure and temperature across changes and known smooth ramps", () => {
    const plan = preview(
      step(),
      step({ pressure: 9, temperature: 88 }),
      step({ pressure: 6, transition: "smooth" })
    )
    expect(plan.visibleKeys).toEqual(["pressure", "groupTemperature"])
    expect(plan.duration).toBe(15)
    expect(plan.samples.map((s) => s.pressure)).toEqual([3, 3, 9, 9, 9, 6])
    expect(plan.samples.map((s) => s.groupTemperature)).toEqual([
      90, 90, 88, 88, 90, 90,
    ])
  })
  it("shows flow-only targets without treating an inactive pressure field as a target", () => {
    const plan = preview(
      step({ pump: "flow", flow: 4 }),
      step({ pump: "flow", flow: 2 })
    )
    expect(plan.visibleKeys).toEqual(["flow", "groupTemperature"])
    expect(plan.samples.every((s) => s.pressure === null)).toBe(true)
  })
  it("omits both partial pump channels in mixed profiles instead of connecting their gaps", () => {
    const plan = preview(
      step({ pump: "flow", flow: 4 }),
      step({ pressure: 9, flow: 2 })
    )
    expect(plan.visibleKeys).toEqual(["groupTemperature"])
    expect(
      plan.samples.every((s) => s.pressure === null && s.flow === null)
    ).toBe(true)
  })
  it("preserves valid zero targets", () => {
    expect(preview(step({ pressure: 0, temperature: 0 })).visibleKeys).toEqual([
      "pressure",
      "groupTemperature",
    ])
    expect(preview(step({ pump: "flow", flow: 0 })).visibleKeys).toEqual([
      "flow",
      "groupTemperature",
    ])
  })
  it("hides missing and nonfinite targets without hiding other complete series", () => {
    expect(preview(step(), step({ pressure: undefined })).visibleKeys).toEqual([
      "groupTemperature",
    ])
    expect(preview(step({ pressure: NaN })).visibleKeys).toEqual([
      "groupTemperature",
    ])
    expect(preview(step({ temperature: Infinity })).visibleKeys).toEqual([
      "pressure",
    ])
  })
  it.each([NaN, -1, 0])(
    "does not present a partial timeline as complete when a duration is %s",
    (seconds) => {
      expect(preview(step(), step({ seconds })).visibleKeys).toEqual([])
    }
  )
  it("does not invent an initial target for a smooth first stage", () => {
    expect(preview(step({ transition: "smooth" })).visibleKeys).toEqual([
      "groupTemperature",
    ])
  })
  it("keeps a consistent configured temperature basis, but never joins different sensors", () => {
    expect(
      preview(step({ sensor: "water" }), step({ sensor: "water" })).visibleKeys
    ).toEqual(["pressure", "groupTemperature"])
    expect(preview(step(), step({ sensor: "water" })).visibleKeys).toEqual([
      "pressure",
    ])
  })
  it("handles absent profiles and empty steps without stale legends", () => {
    expect(completeProfilePreview(null).visibleKeys).toEqual([])
    expect(preview().visibleKeys).toEqual([])
  })
})
