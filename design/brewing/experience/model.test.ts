import { describe, expect, it } from "vitest"
import { initialState, reduceExperience } from "./model"
import type { Reading } from "./model"
import { domains, paths } from "./chart"
import { plannedProfile } from "./planned-profile"
import { tankMillilitres } from "./tank"
import { machineStatusTone } from "./rolling-status"
import type { Profile, ProfileStep } from "@/gateway/types"
import { defaultRecipe, homeSession } from "../home-session"
import { previewPaths } from "./preview-paths"

describe("planned targets and header semantics", () => {
  it("smooths the preview without changing targets or bridging missing channels", () => {
    const samples = plannedProfile(
      homeSession(
        1,
        defaultRecipe,
        () => {},
        () => {}
      ).rawProfile
    ).samples
    const original = structuredClone(samples)
    const smooth = previewPaths(
      samples,
      "pressure",
      (n) => n * 10,
      (n) => n,
      0
    )
    expect(smooth.line).toContain("C")
    expect(smooth.line).not.toContain("L")
    expect(samples).toEqual(original)
    const gap = samples.map((s, i) => (i === 2 ? { ...s, pressure: null } : s))
    expect(
      previewPaths(
        gap,
        "pressure",
        (n) => n,
        (n) => n,
        0
      ).line.match(/M/g)
    ).toHaveLength(2)
    expect(
      previewPaths(
        samples,
        "flow",
        (n) => n,
        (n) => n,
        0
      )
    ).toEqual({ line: "", area: "" })
  })
  it("permits React inspection while rejecting every gateway method access", () => {
    const session = homeSession(
      0,
      defaultRecipe,
      () => {},
      () => {}
    )
    expect(Object.prototype.toString.call(session.gateway)).toBe(
      "[object Object]"
    )
    expect(() => Reflect.get(session.gateway, "requestState")).toThrow(
      "no gateway"
    )
  })
  const step = (patch: Partial<ProfileStep>): ProfileStep => ({
    name: "Step",
    pump: "pressure",
    pressure: 3,
    transition: "fast",
    seconds: 5,
    temperature: 90,
    sensor: "coffee",
    ...patch,
  })
  const plan = (steps: ProfileStep[]) =>
    plannedProfile({ title: "Fixture", steps } as Profile)
  it("preserves pump-mode gaps, fast jumps and duration-based smooth transitions", () => {
    const p = plan([
      step({}),
      step({ pressure: 9 }),
      step({ pressure: 6, transition: "smooth", seconds: 10 }),
      step({ pump: "flow", flow: 2, pressure: 8, seconds: 7 }),
    ])
    expect(p.duration).toBe(27)
    expect(p.samples.map((s) => [s.elapsed, s.pressure, s.flow])).toEqual([
      [0, 3, null],
      [5, 3, null],
      [5, 9, null],
      [10, 9, null],
      [10, 9, null],
      [20, 6, null],
      [20, null, 2],
      [27, null, 2],
    ])
  })
  it("does not invent a ramp origin or temperatures for a mix-water target", () => {
    const p = plan([
      step({ pump: "flow", flow: 2 }),
      step({ transition: "smooth", pressure: 7, sensor: "water" }),
    ])
    expect(p.samples[2].pressure).toBeNull()
    expect(p.samples[3].pressure).toBe(7)
    expect(p.samples[3].groupTemperature).toBeNull()
    expect(p.incomplete).toBe(true)
  })
  it("stops at unknown durations instead of shifting later steps earlier", () => {
    const p = plan([step({}), step({ seconds: NaN }), step({})])
    expect(p.duration).toBe(5)
    expect(p.samples).toHaveLength(2)
    expect(p.incomplete).toBe(true)
    expect(plannedProfile(null).samples).toEqual([])
  })
  it("requires known tank calibration and valid connected data", () => {
    expect(tankMillilitres(40.9, "standard-de1", true)).toBe(1104)
    expect(tankMillilitres(75, "standard-de1", true)).toBe(2058)
    expect(tankMillilitres(0, "standard-de1", true)).toBe(0)
    for (const mm of [null, NaN, Infinity, -1])
      expect(tankMillilitres(mm, "standard-de1", true)).toBeNull()
    expect(tankMillilitres(40, null, true)).toBeNull()
    expect(tankMillilitres(40, "standard-de1", false)).toBeNull()
  })
  it("maps observed Decaid substates without interpreting profile titles", () => {
    expect(machineStatusTone("espresso", "preparingForShot")).toBe("preparing")
    expect(machineStatusTone("espresso", "preinfusion")).toBe("preinfusion")
    expect(machineStatusTone("espresso", "pouring")).toBe("pouring")
    expect(machineStatusTone("idle", "pouringDone")).toBe("complete")
    expect(machineStatusTone("espresso", "errorUnsafe")).toBe("error")
  })
})

const sample: Reading = {
  elapsed: 0,
  pressure: 3,
  targetPressure: 3,
  flow: 2.5,
  groupTemperature: 88,
  weightFlow: 0,
  beverageWeight: 0,
  frame: 0,
  stage: "Preinfusion",
}
const start = (sequence = 1) => ({
  type: "start" as const,
  shotId: `shot-${sequence}`,
  sequence,
  profileName: "Selected profile",
})
const active = () =>
  reduceExperience(reduceExperience(initialState, start()), {
    type: "sample",
    shotId: "shot-1",
    reading: sample,
  })

describe("brewing presentation event ownership", () => {
  it("freezes final samples, deduplicates completion and emits one success toast after the hold", () => {
    const ended = reduceExperience(active(), {
      type: "end",
      shotId: "shot-1",
      outcome: "success",
    })
    expect(ended.phase).toBe("complete")
    expect(ended.toast).toBe("")
    expect(
      reduceExperience(ended, {
        type: "sample",
        shotId: "shot-1",
        reading: { ...sample, elapsed: 2 },
      })
    ).toBe(ended)
    expect(
      reduceExperience(ended, {
        type: "end",
        shotId: "shot-1",
        outcome: "success",
      })
    ).toBe(ended)
    const returning = reduceExperience(ended, {
      type: "holdElapsed",
      shotId: "shot-1",
    })
    const home = reduceExperience(returning, {
      type: "returned",
      shotId: "shot-1",
    })
    expect(home.phase).toBe("home")
    expect(home.toast).toBe("Shot completed")
    expect(home.profileName).toBe("Selected profile")
    expect(
      reduceExperience(home, {
        type: "end",
        shotId: "shot-1",
        outcome: "success",
      })
    ).toBe(home)
  })
  it("cancels old hold, end and toast events when a newer shot begins", () => {
    const ended = reduceExperience(active(), {
      type: "end",
      shotId: "shot-1",
      outcome: "success",
    })
    const next = reduceExperience(ended, start(2))
    for (const event of [
      { type: "end" as const, shotId: "shot-1", outcome: "success" as const },
      { type: "holdElapsed" as const, shotId: "shot-1" },
      { type: "returned" as const, shotId: "shot-1" },
      { type: "clearToast" as const, shotId: "shot-1" },
      start(1),
    ])
      expect(reduceExperience(next, event)).toBe(next)
    expect(next.samples).toHaveLength(0)
    expect(next.toast).toBe("")
  })
  it("does not override intentional navigation or strand a returning state", () => {
    const away = reduceExperience(active(), { type: "navigate", route: "away" })
    const ended = reduceExperience(away, {
      type: "end",
      shotId: "shot-1",
      outcome: "success",
    })
    expect(
      reduceExperience(ended, { type: "holdElapsed", shotId: "shot-1" })
    ).toBe(ended)
    const back = reduceExperience(ended, { type: "navigate", route: "home" })
    expect(back.autoReturn).toBe(false)
    expect(back.toast).toBe("")
    expect(
      reduceExperience(
        { ...ended, phase: "returning" },
        { type: "navigate", route: "away" }
      ).phase
    ).toBe("home")
  })
  it.each(["blocked", "failed", "disconnected", "unknown"] as const)(
    "keeps %s visible without a success message",
    (outcome) => {
      const ended = reduceExperience(active(), {
        type: "end",
        shotId: "shot-1",
        outcome,
      })
      expect(ended.phase).toBe("interrupted")
      expect(
        reduceExperience(ended, { type: "holdElapsed", shotId: "shot-1" })
      ).toBe(ended)
      expect(ended.toast).toBe("")
    }
  )
  it("distinguishes manual stop and a blocked start without samples", () => {
    const manual = reduceExperience(active(), {
      type: "end",
      shotId: "shot-1",
      outcome: "manual",
    })
    const home = reduceExperience(
      reduceExperience(manual, { type: "holdElapsed", shotId: "shot-1" }),
      { type: "returned", shotId: "shot-1" }
    )
    expect(home.toast).toBe("Shot stopped manually")
    expect(
      reduceExperience(reduceExperience(initialState, start()), {
        type: "end",
        shotId: "shot-1",
        outcome: "success",
      }).phase
    ).toBe("interrupted")
  })
  it("rejects late, duplicate and invalid sample timestamps", () => {
    const s = active()
    for (const elapsed of [-1, 0, NaN, Infinity])
      expect(
        reduceExperience(s, {
          type: "sample",
          shotId: "shot-1",
          reading: { ...sample, elapsed },
        })
      ).toBe(s)
  })
})
describe("honest chart geometry", () => {
  it("keeps numerical units, broad temperature domain and an expanding range", () => {
    const points = [
      sample,
      { ...sample, elapsed: 14, pressure: 14.2 },
      { ...sample, elapsed: 42, pressure: 3 },
    ]
    expect(domains(points)).toEqual({
      min: 0,
      max: 18,
      tempMin: 60,
      tempMax: 100,
      duration: 50,
    })
    expect(
      domains([{ ...sample, weightFlow: -2, groupTemperature: 102 }])
    ).toEqual({ min: -3, max: 12, tempMin: 60, tempMax: 110, duration: 30 })
  })
  it("leaves missing readings as gaps and steps only explicit target discontinuities", () => {
    const samples = [
      sample,
      {
        ...sample,
        elapsed: 1,
        pressure: null,
        targetPressure: 9,
        targetStep: true,
      },
      { ...sample, elapsed: 2, pressure: 4, targetPressure: 8 },
    ]
    const identity = (n: number) => n
    expect(paths(samples, "pressure", identity, identity, 0).line).toBe(
      "M0,3 M2,4 "
    )
    expect(paths(samples, "targetPressure", identity, identity, 0).line).toBe(
      "M0,3 L1,3 L1,9 L2,8 "
    )
  })
})
