import { describe, expect, it } from "vitest"
import { DecaidGateway } from "./client"
import { shotOutcome } from "./shot-outcome"

describe("installed Decaid stop reasons", () => {
  it.each([
    ["stop", "apiStop", "manual"],
    ["stop", "appStop", "manual"],
    ["stop", "machineEnded", "ended"],
    ["stop", "targetWeight", "success"],
    ["stop", "targetVolume", "success"],
    ["abort", "appStop", "failed"],
    ["abort", "machineEnded", "failed"],
    ["abort", "noScale", "blocked"],
    ["terminal", "disconnected", "disconnected"],
    ["terminal", "error", "failed"],
    ["stop", "futureReason", "unknown"],
  ])("classifies %s / %s as %s", (kind, reason, outcome) => {
    expect(shotOutcome({ kind, reason }, null)).toBe(outcome)
  })

  it("keeps explicit decisions through machine-ended and finalize events", () => {
    for (const current of [
      "manual",
      "success",
      "failed",
      "blocked",
      "disconnected",
    ] as const) {
      expect(
        shotOutcome({ kind: "stop", reason: "machineEnded" }, current)
      ).toBe(current)
      expect(
        shotOutcome({ kind: "finalize", reason: "stoppingBackstop" }, current)
      ).toBe(current)
    }
    expect(shotOutcome({ kind: "stop", reason: "apiStop" }, "failed")).toBe(
      "failed"
    )
    expect(shotOutcome({ kind: "terminal", reason: "error" }, "manual")).toBe(
      "failed"
    )
  })

  it("uses real wire decisions, waits for stop confirmation, and rejects retired-shot events", () => {
    const gateway = new DecaidGateway(
      "http://fixture.invalid",
      async () => new Response("{}", { status: 404 })
    )
    const event = (
      seconds: number,
      shotId: string,
      state: string,
      reason?: string
    ) =>
      gateway.receive("machine/shotState", {
        event: "state",
        timestamp: new Date(1700000000000 + seconds * 1000).toISOString(),
        shotId,
        state,
        decision: reason ? { kind: "stop", reason } : null,
      })
    event(0, "one", "pouring")
    event(1, "one", "stopping", "machineEnded")
    expect(gateway.getSnapshot()).toMatchObject({
      shotOutcome: "ended",
      complete: false,
    })
    event(2, "one", "finished")
    expect(gateway.getSnapshot()).toMatchObject({
      shotOutcome: "ended",
      complete: true,
    })
    event(3, "two", "pouring")
    event(4, "one", "finished", "apiStop")
    expect(gateway.getSnapshot()).toMatchObject({
      shotId: "two",
      shotOutcome: null,
      complete: false,
    })
  })
})
