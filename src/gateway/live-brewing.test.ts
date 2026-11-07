import { describe, it, expect } from "vitest"
import { initialSnapshot } from "./client"
import type { GatewaySnapshot } from "./types"
import { initialState } from "../skin/brewing/model"
import { liveReducer, readings } from "../skin/brewing/live-session"
import { paths } from "../skin/brewing/chart"

const shot = (): GatewaySnapshot => ({
  ...initialSnapshot(),
  connection: "online",
  shotSequence: 1,
  devices: [{ id: "m", name: "DE1", type: "machine", state: "connected" }],
  samples: [
    {
      elapsed: 0,
      pressure: 3,
      flow: 4,
      temperature: 92,
      weight: 0,
      groupTemperature: 88,
      targetPressure: 3,
      weightFlow: 0,
      frame: 0,
    },
  ],
})
const observe = (snapshot: GatewaySnapshot, fresh = true) => ({
  type: "observe" as const,
  snapshot,
  samples: readings(snapshot),
  fresh,
})
describe("production brewing presentation", () => {
  it("leaves a visible gap across lost telemetry instead of connecting the missing interval", () => {
    const s = shot()
    s.samples.push({
      ...s.samples[0],
      elapsed: 12,
      pressure: 9,
      breakBefore: true,
    })
    const drawing = paths(
      readings(s),
      "pressure",
      (x) => x,
      (y) => y,
      0
    )
    expect(drawing.line).toBe("M0,3 M12,9 ")
    expect(drawing.area.match(/ Z /g)).toHaveLength(2)
  })
  it("waits for initial fresh telemetry before attaching an active replay", () => {
    const s = shot()
    s.connection = "connecting"
    let ui = liveReducer(initialState, observe(s, false))
    expect(ui).toBe(initialState)
    s.connection = "online"
    ui = liveReducer(ui, observe(s))
    expect(ui.phase).toBe("active")
    expect(ui.outcome).toBeNull()
  })
  it("does not celebrate a shot that finished before live attachment", () => {
    const s = shot()
    s.complete = true
    s.shotOutcome = "success"
    const ui = liveReducer(initialState, observe(s))
    expect(ui.phase).toBe("home")
    expect(ui.sequence).toBe(1)
    expect(ui.toast).toBe("")
  })
  it("retains actual group temperature and true zero weight flow without substituting mix", () => {
    const s = shot()
    expect(readings(s)[0]).toMatchObject({
      groupTemperature: 88,
      weightFlow: 0,
      targetPressure: 3,
    })
    s.samples[0].groupTemperature = null
    s.samples[0].weightFlow = null
    expect(readings(s)[0]).toMatchObject({
      groupTemperature: null,
      weightFlow: null,
    })
  })
  it("freezes the completed trace and shows a successful toast once after returning", () => {
    const s = shot()
    let ui = liveReducer(initialState, observe(s))
    s.complete = true
    s.shotOutcome = "success"
    ui = liveReducer(ui, observe(s))
    const trace = ui.samples
    s.samples = [...s.samples, { ...s.samples[0], elapsed: 1, pressure: 0 }]
    ui = liveReducer(ui, observe(s))
    expect(ui.samples).toBe(trace)
    ui = liveReducer(ui, { type: "holdElapsed", shotId: "live-1" })
    ui = liveReducer(ui, { type: "returned", shotId: "live-1" })
    expect(ui.toast).toBe("Shot completed")
    ui = liveReducer(ui, { type: "clearToast", shotId: "live-1" })
    ui = liveReducer(ui, observe(s))
    expect(ui.phase).toBe("home")
    expect(ui.toast).toBe("")
  })
  it("accepts a late authoritative outcome but never guesses success from idle", () => {
    const s = shot()
    let ui = liveReducer(initialState, observe(s))
    s.complete = true
    ui = liveReducer(ui, observe(s))
    expect(ui.outcome).toBe("unknown")
    expect(ui.phase).toBe("interrupted")
    s.shotOutcome = "manual"
    ui = liveReducer(ui, observe(s))
    expect(ui.phase).toBe("complete")
    expect(ui.outcome).toBe("manual")
  })
  it("does not invent a terminal outcome when telemetry is stale but the transport remains connected", () => {
    const s = shot()
    let ui = liveReducer(initialState, observe(s))
    ui = liveReducer(ui, observe(s, false))
    expect(ui.phase).toBe("active")
    expect(ui.outcome).toBeNull()
    s.complete = true
    s.shotOutcome = "manual"
    ui = liveReducer(ui, observe(s, false))
    expect(ui.phase).toBe("complete")
    expect(ui.outcome).toBe("manual")
  })
  it("interrupts on disconnection without replaying success after reconnect", () => {
    const s = shot()
    let ui = liveReducer(initialState, observe(s))
    s.connection = "offline"
    ui = liveReducer(ui, observe(s, false))
    expect(ui.outcome).toBe("disconnected")
    s.connection = "online"
    s.complete = true
    s.shotOutcome = "success"
    ui = liveReducer(ui, observe(s))
    expect(ui.outcome).toBe("disconnected")
    expect(ui.toast).toBe("")
  })
  it("resumes monitoring when fresh telemetry confirms the same shot is still active", () => {
    const s = shot()
    let ui = liveReducer(initialState, observe(s))
    s.connection = "offline"
    ui = liveReducer(ui, observe(s, false))
    s.connection = "online"
    s.machine = {
      timestamp: new Date().toISOString(),
      state: { state: "espresso", substate: "pouring" },
      pressure: 9,
      flow: 2,
      mixTemperature: 90,
      profileFrame: 0,
    }
    ui = liveReducer(ui, observe(s))
    expect(ui.phase).toBe("active")
    expect(ui.sequence).toBe(1)
    expect(ui.outcome).toBeNull()
    expect(ui.toast).toBe("")
  })
  it("a new shot supersedes completion timers, while navigation cancels auto-return", () => {
    const s = shot()
    let ui = liveReducer(initialState, observe(s))
    s.complete = true
    s.shotOutcome = "success"
    ui = liveReducer(ui, observe(s))
    s.shotSequence = 2
    s.complete = false
    s.shotOutcome = null
    s.samples = []
    ui = liveReducer(ui, observe(s))
    ui = liveReducer(ui, { type: "holdElapsed", shotId: "live-1" })
    expect(ui.phase).toBe("preparing")
    expect(ui.samples).toEqual([])
    ui = liveReducer(ui, { type: "navigate", route: "away" })
    expect(ui.autoReturn).toBe(false)
  })
  it("keeps automatic return when a newly observed shot brings another page Home", () => {
    let ui = liveReducer(initialState, { type: "navigate", route: "away" })
    ui = liveReducer(ui, observe(shot()))
    ui = liveReducer(ui, { type: "navigate", route: "home" })
    expect(ui.autoReturn).toBe(true)
    expect(ui.phase).toBe("active")
    ui = liveReducer(ui, { type: "navigate", route: "away" })
    ui = liveReducer(ui, { type: "navigate", route: "home" })
    expect(ui.autoReturn).toBe(false)
  })
  it("does not open a terminal replay without an observed or attached active shot", () => {
    const s = shot()
    s.shotSequence = 0
    s.complete = true
    expect(liveReducer(initialState, observe(s))).toBe(initialState)
  })
})
