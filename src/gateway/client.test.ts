import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DecaidGateway, initialSnapshot } from "./client"
import {
  commandBlock,
  parseProfile,
  previewSamples,
  temperaturePatch,
} from "./model"
import type { GatewaySnapshot, MachineSnapshot, Workflow } from "./types"

const profile = {
  title: "D-Flow",
  steps: [
    {
      name: "Fill",
      pump: "flow" as const,
      transition: "fast" as const,
      seconds: 7,
      temperature: 88,
      flow: 2,
    },
    {
      name: "Finish",
      pump: "pressure" as const,
      transition: "smooth" as const,
      seconds: 20,
      temperature: 86,
      pressure: 8,
    },
  ],
  tank_temperature: 0,
  target_volume_count_start: 0,
}
const workflow: Workflow = {
  profile,
  context: {
    targetDoseWeight: 18,
    targetYield: 50,
    grinderSetting: "1.8",
    coffeeName: "Keep me",
  },
}
const machine = (
  seconds = 0,
  state = "idle",
  substate = "idle"
): MachineSnapshot => ({
  timestamp: new Date(1700000000000 + seconds * 1000).toISOString(),
  state: { state, substate },
  pressure: 9,
  flow: 1.6,
  mixTemperature: 88,
  profileFrame: 0,
})
const devices = [
  { id: "machine", name: "DE1", type: "machine", state: "connected" },
  { id: "scale", name: "Scale", type: "scale", state: "connected" },
]
class Socket {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  close() {
    this.onclose?.()
  }
}
let gateway: DecaidGateway
let sockets: Socket[]
let writes: { path: string; body: unknown }[]
let failWrites: boolean
let stored: Workflow
function readySnapshot(): GatewaySnapshot {
  return {
    ...initialSnapshot(),
    connection: "online",
    devices,
    workflow,
    machine: machine(),
    machineReceived: Date.now(),
    settings: { gatewayMode: "tracking" },
    scaleConnected: true,
  }
}
beforeEach(() => {
  vi.stubGlobal("document", new EventTarget())
  vi.stubGlobal("window", new EventTarget())
  sockets = []
  writes = []
  failWrites = false
  stored = structuredClone(workflow)
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname
    if (init?.method !== "GET") {
      writes.push({
        path,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      })
      if (failWrites)
        return new Response(JSON.stringify({ error: "Write rejected" }), {
          status: 503,
        })
      if (path === "/api/v1/workflow") {
        const patch = JSON.parse(String(init?.body))
        stored = {
          ...stored,
          ...patch,
          context: { ...stored.context, ...patch.context },
        }
      }
    }
    const body: Record<string, unknown> = {
      "/api/v1/devices": devices,
      "/api/v1/workflow": stored,
      "/api/v1/settings": { gatewayMode: "tracking" },
      "/api/v1/info": { fullVersion: "test" },
      "/api/v1/machine/state": machine(),
      "/api/v1/profiles": [{ id: "p", profile }],
    }
    if (path.startsWith("/api/v1/store/"))
      return new Response("{}", { status: 404 })
    return new Response(JSON.stringify(body[path] ?? { ok: true }), {
      status: 200,
    })
  }
  gateway = new DecaidGateway("http://test.invalid", fetcher, () => {
    const ws = new Socket()
    sockets.push(ws)
    return ws as unknown as WebSocket
  })
})
afterEach(() => {
  gateway.stop()
  vi.unstubAllGlobals()
})
async function connect() {
  gateway.start()
  sockets.forEach((s) => s.onopen?.())
  await vi.waitFor(() =>
    expect(gateway.getSnapshot().connection).toBe("online")
  )
}
describe("Decaid integration", () => {
  it("bootstraps with reads only and never scans or commands automatically", async () => {
    await connect()
    await gateway.loadProfiles()
    expect(writes).toEqual([])
    expect(gateway.getSnapshot().favorites).toEqual(["p"])
  })
  it("does not confuse telemetry with machine connection", async () => {
    await connect()
    gateway.receive("devices", { devices: [] })
    gateway.receive("machine/snapshot", machine(2))
    expect(commandBlock(gateway.getSnapshot())).toMatch(/disconnected/)
    await expect(gateway.command("espresso")).rejects.toThrow(/disconnected/)
    expect(writes).toEqual([])
  })
  it("patches workflow without dropping other recipe fields", async () => {
    await connect()
    await gateway.updateWorkflow({ context: { targetDoseWeight: 18.5 } })
    expect(writes[0]).toEqual({
      path: "/api/v1/workflow",
      body: { context: { targetDoseWeight: 18.5 } },
    })
    expect(gateway.getSnapshot().workflow?.context?.coffeeName).toBe("Keep me")
  })
  it("leaves acknowledged recipe unchanged after failed mutation and never retries commands", async () => {
    await connect()
    failWrites = true
    await expect(
      gateway.updateWorkflow({ context: { targetYield: 40 } })
    ).rejects.toThrow("503")
    expect(gateway.getSnapshot().workflow?.context?.targetYield).toBe(50)
    expect(gateway.getSnapshot().pending).toBe(false)
    await expect(gateway.command("espresso")).rejects.toThrow("503")
    expect(writes).toHaveLength(2)
  })
  it("tracks profile frames and completion from telemetry, not a 30-second script", async () => {
    await connect()
    gateway.receive("machine/shotState", {
      state: "pouring",
      timestamp: machine(1).timestamp,
      shotId: "one",
      event: "state",
    })
    gateway.receive("machine/snapshot", machine(1, "espresso", "preinfusion"))
    gateway.receive("machine/snapshot", {
      ...machine(42, "espresso", "pouring"),
      profileFrame: 1,
    })
    expect(gateway.getSnapshot().samples.at(-1)?.elapsed).toBe(41)
    gateway.receive("machine/shotState", {
      state: "finished",
      timestamp: machine(45).timestamp,
      event: "terminal",
      decision: { kind: "stop", reason: "targetWeight" },
    })
    expect(gateway.getSnapshot().complete).toBe(true)
    expect(gateway.getSnapshot().stopped).toBe(false)
  })
  it("shows manual stop distinctly and ignores out-of-order samples", async () => {
    await connect()
    gateway.receive("machine/snapshot", machine(5, "espresso", "pouring"))
    gateway.receive("machine/snapshot", machine(4, "espresso", "preinfusion"))
    expect(gateway.getSnapshot().machine?.timestamp).toBe(machine(5).timestamp)
    gateway.receive("machine/shotState", {
      state: "finished",
      timestamp: machine(6).timestamp,
      event: "terminal",
      decision: { kind: "stop", reason: "apiStop" },
    })
    expect(gateway.getSnapshot().stopped).toBe(true)
  })
  it("never reports disconnected scale readings as zero", async () => {
    await connect()
    gateway.receive("scale/snapshot", {
      timestamp: machine().timestamp,
      weight: 12,
    })
    gateway.receive("scale/snapshot", { status: "disconnected" })
    expect(gateway.getSnapshot().scale).toBeNull()
    expect(gateway.getSnapshot().scaleConnected).toBe(false)
  })
  it("allows an explicit stop even with an offline stream", async () => {
    await connect()
    sockets[0].close()
    await gateway.command("idle")
    expect(writes.at(-1)?.path).toBe("/api/v1/machine/state/idle")
    await expect(gateway.command("espresso")).rejects.toThrow()
  })
  it("does not invent elapsed time when joining an active shot", () => {
    gateway.receive("machine/shotState", {
      state: "pouring",
      timestamp: machine(12).timestamp,
      shotId: "existing",
      event: "state",
    })
    gateway.receive("machine/snapshot", {
      ...machine(12, "espresso", "pouring"),
      profileFrame: 1,
    })
    expect(gateway.getSnapshot().elapsedKnown).toBe(false)
    expect(gateway.getSnapshot().shotFrame).toBe(1)
    expect(gateway.getSnapshot().complete).toBe(false)
  })
  it("hydrates the profile when telemetry arrives before the workflow", async () => {
    gateway.receive("machine/snapshot", machine(12, "espresso", "pouring"))
    await connect()
    expect(gateway.getSnapshot().shotProfile?.title).toBe("D-Flow")
  })
  it("retains final scale settling while a record is unavailable", async () => {
    await connect()
    gateway.receive("machine/snapshot", machine(1, "espresso", "pouring"))
    gateway.receive("machine/snapshot", machine(30, "espresso", "pouring"))
    gateway.receive("machine/shotState", {
      state: "finished",
      timestamp: machine(30).timestamp,
      shotId: "unavailable",
      event: "terminal",
    })
    gateway.receive("scale/snapshot", {
      timestamp: machine(31).timestamp,
      weight: 50.5,
    })
    expect(gateway.getSnapshot().samples.at(-1)?.weight).toBe(50.5)
  })
  it("accepts the first profile into an empty workflow but blocks brewing until selected", async () => {
    stored.profile = null
    await connect()
    expect(commandBlock(gateway.getSnapshot())).toBe("")
    await expect(gateway.command("espresso")).rejects.toThrow(
      /Choose a profile/
    )
    await gateway.updateWorkflow({ profile })
    expect(gateway.getSnapshot().workflow?.profile?.title).toBe("D-Flow")
  })
  it("does not reopen a dismissed completion when a terminal event is replayed", async () => {
    await connect()
    gateway.receive("machine/snapshot", machine(1, "espresso", "pouring"))
    gateway.receive("machine/snapshot", machine(30))
    const event = {
      state: "finished",
      timestamp: machine(30).timestamp,
      shotId: "done",
      event: "terminal",
    }
    gateway.receive("machine/shotState", event)
    expect(gateway.getSnapshot().samples.at(-1)?.elapsed).toBe(29)
    gateway.dismissShot()
    gateway.receive("machine/shotState", event)
    expect(gateway.getSnapshot().complete).toBe(false)
  })
  it("keeps the first pouring sample even when its timestamp matches the idle replay", async () => {
    await connect()
    gateway.receive("machine/shotState", {
      state: "pouring",
      timestamp: machine().timestamp,
      shotId: "first",
      event: "state",
    })
    gateway.receive("machine/snapshot", machine(0, "espresso", "preinfusion"))
    gateway.receive("machine/snapshot", machine(12, "espresso", "pouring"))
    expect(gateway.getSnapshot().samples.map((s) => s.elapsed)).toEqual([0, 12])
  })
  it("coalesces simultaneous streams while exposing current state immediately to command guards", async () => {
    const listener = vi.fn()
    gateway.subscribe(listener)
    gateway.receive("machine/snapshot", machine(1))
    gateway.receive("scale/snapshot", {
      timestamp: machine(1).timestamp,
      weight: 12,
    })
    gateway.receive("machine/waterLevels", { currentLevel: 75 })
    expect(gateway.getSnapshot().scale?.weight).toBe(12)
    expect(listener).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1))
  })
  it("keeps temperature offsets and non-temperature profile fields intact", () => {
    const patch = temperaturePatch(workflow, 90)
    expect(patch.profile.steps.map((s) => s.temperature)).toEqual([90, 88])
    expect(patch.profile.steps[0].flow).toBe(2)
    expect(patch.profile).toHaveProperty("tank_temperature", 0)
  })
  it("does not fabricate the other axis of pressure/flow targets", () => {
    const samples = previewSamples(profile)
    expect(samples[0].pressure).toBeNull()
    expect(samples[0].flow).toBe(2)
    expect(samples.at(-1)?.flow).toBeNull()
  })
  it("rejects malformed profiles and stale or unsupported command states", () => {
    expect(() => parseProfile({ title: "bad", steps: [] })).toThrow()
    const snapshot = readySnapshot()
    expect(commandBlock(snapshot, Date.now() + 6000)).toMatch(
      /current machine readings/
    )
    expect(
      commandBlock({ ...snapshot, settings: { gatewayMode: "full" } })
    ).toMatch(/tracking mode/)
    expect(
      commandBlock({ ...snapshot, machine: machine(0, "heating") })
    ).toMatch(/heating/)
  })
})
