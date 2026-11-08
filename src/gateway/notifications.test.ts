import { afterEach, describe, expect, it, vi } from "vitest"
import { createNotifications } from "@/skin/notifications/manager"
import { createMachineNotifications } from "@/skin/notifications/machine"
import type { SkinSession } from "@/skin/use-skin"

function setup() {
  const add = vi.fn((options) => options.id as string)
  const close = vi.fn()
  const manager = createNotifications({ add, close })
  return { add, close, manager, update: createMachineNotifications(manager) }
}
const flush = async () => {
  await Promise.resolve()
}
function session(
  overrides: Record<string, unknown> = {},
  snapshot: Record<string, unknown> = {}
): SkinSession {
  return {
    connected: true,
    machineFresh: true,
    active: false,
    scaleConnected: true,
    waterLevel: 75,
    yieldTarget: 50,
    block: "",
    reconnect: vi.fn(),
    wake: vi.fn(),
    ...overrides,
    snapshot: {
      connection: "online",
      machine: { state: { state: "idle", substate: "idle" } },
      refillKit: false,
      preferences: {},
      settings: { blockOnNoScale: true },
      shotSequence: 1,
      deviceNotice: "",
      message: "",
      ...snapshot,
    },
  } as unknown as SkinSession
}
afterEach(() => vi.useRealTimers())
describe("notification lifecycle", () => {
  it("announces each heating/preparation transition once, without resetting expiry on frames", async () => {
    const { update, add } = setup()
    const heating = session(
      {},
      { machine: { state: { state: "heating", substate: "idle" } } }
    )
    for (let i = 0; i < 100; i++) update(heating)
    await flush()
    expect(add).toHaveBeenCalledTimes(1)
    expect(add.mock.calls[0][0]).toMatchObject({
      id: "machine-heating",
      timeout: 4000,
      type: "info",
    })
    add.mock.calls[0][0].onClose()
    update(heating)
    await flush()
    expect(add).toHaveBeenCalledTimes(1)
    update(session())
    update(
      session(
        {},
        {
          machine: {
            state: { state: "espresso", substate: "preparingForShot" },
          },
        }
      )
    )
    await flush()
    expect(add.mock.calls.at(-1)?.[0].title).toBe("Preparing for shot")
  })
  it("latches actual refill through missing readings and reconnect; clears only on fresh resolved machine state", async () => {
    const { update, add, close } = setup()
    update(
      session(
        {},
        { machine: { state: { state: "needsWater", substate: "idle" } } }
      )
    )
    await flush()
    expect(add.mock.calls[0][0]).toMatchObject({
      id: "machine-water",
      timeout: 0,
      data: { persistent: true },
    })
    update(
      session({ machineFresh: false, waterLevel: null }, { machine: null })
    )
    await flush()
    expect(close).not.toHaveBeenCalledWith("machine-water")
    update(
      session(
        { connected: false, machineFresh: false },
        { connection: "offline" }
      )
    )
    await flush()
    expect(add.mock.calls.map(([n]) => n.id)).toContain("machine-connection")
    update(
      session(
        { connected: false, machineFresh: false },
        { connection: "connecting" }
      )
    )
    await flush()
    expect(close).not.toHaveBeenCalledWith("machine-connection")
    expect(close).not.toHaveBeenCalledWith("machine-water")
    update(session())
    await flush()
    expect(close).toHaveBeenCalledWith("machine-water")
    expect(close).toHaveBeenCalledWith("machine-connection")
  })
  it("does not invent empty water from an unavailable sensor or unknown refill kit", async () => {
    const { update, add } = setup()
    update(
      session({ waterLevel: null }, { preferences: { refillWarningMm: 20 } })
    )
    update(
      session(
        { waterLevel: 0 },
        { refillKit: null, preferences: { refillWarningMm: 20 } }
      )
    )
    await flush()
    expect(add).not.toHaveBeenCalled()
    update(
      session({ waterLevel: 10 }, { preferences: { refillWarningMm: 20 } })
    )
    await flush()
    expect(add.mock.calls[0][0].title).toBe("Low water")
  })
  it("suppresses ordinary scale loss, preserves active stop-at-weight risk until shot ends", async () => {
    const { update, add, close } = setup()
    update(
      session(
        { scaleConnected: false },
        {
          deviceErrorKind: "scaleDisconnected",
          deviceNotice: "Scale disconnected",
        }
      )
    )
    await flush()
    expect(add).not.toHaveBeenCalled()
    update(
      session({ active: true, scaleConnected: false }, { scaleLost: true })
    )
    await flush()
    expect(add.mock.calls[0][0]).toMatchObject({
      id: "shot-scale",
      type: "warning",
      timeout: 0,
    })
    update(session({ active: false, scaleConnected: false }))
    await flush()
    expect(close).toHaveBeenCalledWith("shot-scale")
  })
  it("updates one pending ID on failure and has a watchdog without replaying actions", async () => {
    vi.useFakeTimers()
    const { manager, add } = setup()
    manager.begin("save", "Saving settings")
    await flush()
    manager.finish("save", { title: "Save failed", type: "error" })
    await flush()
    expect(add.mock.calls.map(([n]) => n.id)).toEqual(["save", "save"])
    expect(add.mock.calls[1][0]).toMatchObject({ type: "error", timeout: 8000 })
    await vi.advanceTimersByTimeAsync(45000)
    expect(add).toHaveBeenCalledTimes(2)
    manager.begin("connect", "Connecting")
    await flush()
    await vi.advanceTimersByTimeAsync(45000)
    expect(add.mock.calls.at(-1)?.[0]).toMatchObject({
      id: "connect",
      type: "warning",
      timeout: 8000,
    })
    manager.finish("connect", { title: "Connected", type: "success" })
    await flush()
    expect(add.mock.calls.at(-1)?.[0]).toMatchObject({
      id: "connect",
      type: "success",
      timeout: 4000,
    })
  })
  it("keeps simultaneous critical conditions ahead of queued feedback and drains the queue", async () => {
    const { manager, add } = setup()
    manager.condition("water", "empty", {
      title: "Water",
      persistent: true,
      type: "warning",
    })
    manager.condition("connection", "offline", {
      title: "Disconnected",
      persistent: true,
      type: "error",
    })
    manager.show("saved", { title: "Saved", type: "success" })
    manager.show("failure", { title: "Failure", type: "error" })
    await flush()
    expect(add.mock.calls.map(([n]) => n.id)).toEqual([
      "water",
      "connection",
      "failure",
    ])
    add.mock.calls[2][0].onClose()
    await flush()
    expect(add.mock.calls.at(-1)?.[0].id).toBe("saved")
  })
  it("coalesces a gateway error with its owning action outcome", async () => {
    const { manager, add } = setup()
    manager.finish("save", { title: "Rejected", type: "error" })
    await flush()
    manager.condition("gateway", "Rejected", {
      title: "Rejected",
      type: "error",
    })
    await flush()
    expect(add).toHaveBeenCalledTimes(1)
  })
})
