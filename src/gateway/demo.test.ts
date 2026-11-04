import { describe, expect, it, vi } from "vitest"
import { createDemoGateway, scenarios } from "./demo"

describe("demo gateway", () => {
  it("repeats a complete shot and stops at target yield", () => {
    const gateway = createDemoGateway()
    gateway.startShot()
    gateway.advance(100)
    const first = gateway.getSnapshot()
    expect(first.scenario).toBe("completed")
    expect(first.shot).toMatchObject({
      elapsed: 30,
      weight: 36,
      pressure: 0,
      flow: 0,
    })
    gateway.setScenario("ready")
    gateway.startShot()
    gateway.advance(100)
    expect(gateway.getSnapshot()).toEqual(first)
  })
  it.each(["heating", "disconnected", "error"] as const)(
    "blocks starting while %s",
    (scenario) => {
      const gateway = createDemoGateway()
      gateway.setScenario(scenario)
      const before = gateway.getSnapshot()
      gateway.startShot()
      gateway.advance(2)
      expect(gateway.getSnapshot()).toBe(before)
    }
  )
  it("manual stop preserves partial yield and does not resume", () => {
    const gateway = createDemoGateway()
    gateway.startShot()
    gateway.advance(12)
    gateway.stopShot()
    gateway.advance(20)
    expect(gateway.getSnapshot().shot).toMatchObject({
      elapsed: 12,
      weight: 9,
      pressure: 0,
      flow: 0,
    })
    expect(gateway.getSnapshot().scenario).toBe("completed")
  })
  it("cleans subscriptions and rejects invalid time steps", () => {
    const gateway = createDemoGateway()
    const listener = vi.fn()
    const unsubscribe = gateway.subscribe(listener)
    gateway.startShot()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    const before = gateway.getSnapshot()
    gateway.advance(NaN)
    gateway.advance(-1)
    expect(gateway.getSnapshot()).toBe(before)
    gateway.advance(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })
  it("never uses network transports across scenarios and actions", () => {
    const fetch = vi.fn(() => {
      throw new Error("Demo attempted network access")
    })
    const socket = vi.fn(() => {
      throw new Error("Demo attempted a socket")
    })
    vi.stubGlobal("fetch", fetch)
    vi.stubGlobal("WebSocket", socket)
    try {
      const gateway = createDemoGateway()
      for (const scenario of scenarios) {
        gateway.setScenario(scenario)
        gateway.startShot()
        gateway.advance(5)
        gateway.stopShot()
      }
      expect(fetch).not.toHaveBeenCalled()
      expect(socket).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
