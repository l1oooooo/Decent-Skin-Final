import { describe, expect, it } from "vitest"
import type { ProfileStep } from "./types"
import { profilePreview } from "../skin/brewing/planned-profile"
import { previewPaths } from "../skin/brewing/preview-paths"

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
  profilePreview({ title: "Fixture", steps })
const draw = (
  plan: ReturnType<typeof preview>,
  key: "pressure" | "flow" | "groupTemperature"
) =>
  previewPaths(
    plan.samples,
    key,
    (n) => n,
    (n) => n,
    0
  )

describe("Home target segments", () => {
  it("retains pressure and temperature changes and known ramps", () => {
    const plan = preview(
      step(),
      step({ pressure: 9, temperature: 88 }),
      step({ pressure: 6, transition: "smooth" })
    )
    expect(plan.visibleKeys).toEqual(["pressure", "groupTemperature"])
    expect(plan.samples.map((s) => s.pressure)).toEqual([3, 3, 9, 9, 9, 6])
    expect(plan.samples.map((s) => s.groupTemperature)).toEqual([
      90, 90, 88, 88, 90, 90,
    ])
  })
  it("ignores inactive pump fields and retains every valid mixed-control segment", () => {
    const plan = preview(
      step({ pump: "flow", flow: 4 }),
      step({ pressure: 9, flow: 2 }),
      step({ pump: "flow", flow: 1 })
    )
    expect(plan.visibleKeys).toEqual(["pressure", "flow", "groupTemperature"])
    expect(plan.samples.map((s) => s.pressure)).toEqual([
      null,
      null,
      9,
      9,
      null,
      null,
    ])
    expect(draw(plan, "flow").line.match(/M/g)).toHaveLength(2)
    expect(draw(plan, "flow").area.match(/Z/g)).toHaveLength(2)
    expect(draw(plan, "pressure").line.match(/M/g)).toHaveLength(1)
  })
  it("shows flow-only targets", () => {
    expect(
      preview(step({ pump: "flow", flow: 4 }), step({ pump: "flow", flow: 2 }))
        .visibleKeys
    ).toEqual(["flow", "groupTemperature"])
  })
  it("preserves valid zeros and excludes wholly missing or nonfinite series", () => {
    expect(preview(step({ pressure: 0, temperature: 0 })).visibleKeys).toEqual([
      "pressure",
      "groupTemperature",
    ])
    expect(preview(step({ pump: "flow", flow: 0 })).visibleKeys).toEqual([
      "flow",
      "groupTemperature",
    ])
    expect(preview(step({ pressure: NaN })).visibleKeys).toEqual([
      "groupTemperature",
    ])
    expect(preview(step({ temperature: Infinity })).visibleKeys).toEqual([
      "pressure",
    ])
  })
  it("does not fill missing steps or connect the surrounding valid segments", () => {
    const plan = preview(
      step(),
      step({ pressure: undefined, temperature: NaN }),
      step({ pressure: 6 })
    )
    expect(plan.visibleKeys).toEqual(["pressure", "groupTemperature"])
    expect(draw(plan, "pressure").line.match(/M/g)).toHaveLength(2)
    expect(draw(plan, "groupTemperature").area.match(/Z/g)).toHaveLength(2)
  })
  it.each([NaN, -1, 0])(
    "keeps the known prefix but never places stages beyond an unknown duration %s",
    (seconds) => {
      const plan = preview(
        step(),
        step({ seconds }),
        step({ pump: "flow", flow: 4 })
      )
      expect(plan.visibleKeys).toEqual(["pressure", "groupTemperature"])
      expect(plan.duration).toBe(5)
      expect(plan.samples).toHaveLength(2)
      expect(plan.incomplete).toBe(true)
    }
  )
  it("retains a configured endpoint without inventing a smooth initial ramp or area", () => {
    const plan = preview(step({ transition: "smooth" }))
    expect(plan.visibleKeys).toContain("pressure")
    expect(plan.samples.map((s) => s.pressure)).toEqual([null, 3])
    expect(draw(plan, "pressure")).toEqual({ line: "M5,3 ", area: "" })
  })
  it("splits temperature targets when the sensor basis changes", () => {
    const plan = preview(step(), step({ sensor: "water" }))
    expect(plan.visibleKeys).toEqual(["pressure", "groupTemperature"])
    expect(draw(plan, "groupTemperature").line.match(/M/g)).toHaveLength(2)
    expect(draw(plan, "pressure").line.match(/M/g)).toHaveLength(1)
  })
  it("handles absent profiles without stale legends", () => {
    expect(profilePreview(null).visibleKeys).toEqual([])
    expect(preview().visibleKeys).toEqual([])
  })
})
