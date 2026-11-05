import { describe, expect, it, vi } from "vitest"
import { DecaidGateway, initialSnapshot } from "./client"
import {
  fieldPatch,
  fields,
  parsePreferences,
  validateField,
} from "./daily-settings"
import type { GatewaySnapshot } from "./types"

function setup(
  respond: (
    path: string,
    method: string,
    body: unknown
  ) => unknown | Promise<unknown>
) {
  const calls: { path: string; method: string; body: unknown }[] = []
  const gateway = new DecaidGateway(
    "http://fixture.invalid",
    async (input, init) => {
      const path =
        new URL(String(input)).pathname + new URL(String(input)).search
      const method = init?.method ?? "GET"
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ path, method, body })
      const value = await respond(path, method, body)
      return value instanceof Response
        ? value
        : new Response(JSON.stringify(value))
    }
  )
  const state: GatewaySnapshot = {
    ...initialSnapshot(),
    connection: "online",
    settings: { gatewayMode: "tracking" },
    devices: [
      { id: "machine", name: "DE1", type: "machine", state: "connected" },
      { id: "grinder", name: "Grinder", type: "grinder", state: "connected" },
    ],
    machineReceived: Date.now(),
    machine: {
      timestamp: new Date().toISOString(),
      state: { state: "idle", substate: "idle" },
      pressure: 0,
      flow: 0,
      mixTemperature: 88,
      profileFrame: 0,
    },
  }
  const original = gateway.getSnapshot
  vi.spyOn(gateway, "getSnapshot").mockImplementation(() => ({
    ...state,
    pending: original().pending,
  }))
  return { gateway, state, calls }
}
describe("daily settings contract", () => {
  it("only treats missing preferences as defaults, preserving unknown keys", async () => {
    const { gateway } = setup(
      () => new Response('{"error":"missing"}', { status: 404 })
    )
    expect(await gateway.daily.read("preferences")).toEqual({
      temperatureUnit: "C",
      refillWarningMm: 0,
      keyboardShortcuts: false,
    })
    expect(
      parsePreferences({ temperatureUnit: "F", extension: 42 }).extension
    ).toBe(42)
    expect(() => parsePreferences({ temperatureUnit: "Kelvin" })).toThrow(
      "invalid"
    )
  })
  it("validates steam ranges and builds owned nested workflow patches", () => {
    const steam = fields.brew.workflow![0]
    expect(validateField(steam, "0")).toBe(0)
    expect(() => validateField(steam, "134")).toThrow("135")
    expect(() => validateField(steam, "165")).toThrow()
    expect(validateField(steam, "165", true)).toBe(165)
    expect(
      fieldPatch({ "steamSettings.duration": 45, "rinseData.flow": 6 })
    ).toEqual({ steamSettings: { duration: 45 }, rinseData: { flow: 6 } })
  })
  it("scans only on an explicit action without auto-connect", async () => {
    const { gateway, calls } = setup(() => [])
    expect(calls).toEqual([])
    await gateway.daily.device("scan")
    expect(calls).toEqual([
      {
        path: "/api/v1/devices/scan?connect=false&quick=true",
        method: "GET",
        body: undefined,
      },
    ])
  })
  it("does not write brightness when unsupported or a shot starts during validation", async () => {
    const setupResult = setup(() => ({
      platformSupported: { brightness: false },
    }))
    await expect(
      setupResult.gateway.daily.save("display", { requestedBrightness: 80 })
    ).rejects.toThrow("not supported")
    expect(setupResult.calls.every((c) => c.method === "GET")).toBe(true)
    const next = setup(() => {
      next.state.machine!.state.state = "espresso"
      return { platformSupported: { brightness: true } }
    })
    await expect(
      next.gateway.daily.save("display", { requestedBrightness: 80 })
    ).rejects.toThrow("idle")
    expect(next.calls.every((c) => c.method === "GET")).toBe(true)
  })
  it("acknowledges settings from a reread and reports uncertain verification", async () => {
    const { gateway, calls } = setup((_path, method) =>
      method === "POST"
        ? null
        : { gatewayMode: "tracking", blockOnNoScale: false }
    )
    await gateway.daily.save("settings", { blockOnNoScale: false })
    expect(calls.map((c) => c.method)).toEqual(["POST", "GET"])
    expect(calls[0].body).toEqual({ blockOnNoScale: false })
    const failed = setup((_path, method) =>
      method === "POST" ? null : new Response("unavailable", { status: 503 })
    )
    await expect(
      failed.gateway.daily.save("settings", { blockOnNoScale: false })
    ).rejects.toThrow("Write acknowledged")
    expect(failed.calls.filter((c) => c.method === "POST")).toHaveLength(1)
  })
  it("rejects descriptor violations and changed grinders before any motor write", async () => {
    const info = {
      deviceId: "grinder",
      capabilities: ["grindSetting"],
      controls: { grindSetting: { kind: "numeric", min: 0, max: 10 } },
    }
    const { gateway, calls } = setup((path) =>
      path.endsWith("info")
        ? info
        : { timestamp: new Date().toISOString(), state: "idle" }
    )
    await expect(
      gateway.daily.grinder("setting", "20", "grinder")
    ).rejects.toThrow("0 to 10")
    await expect(
      gateway.daily.grinder("setting", "2", "other")
    ).rejects.toThrow("changed")
    expect(calls.every((c) => c.method === "GET")).toBe(true)
    await gateway.daily.grinder("setting", "2", "grinder")
    expect(calls.at(-1)).toEqual({
      path: "/api/v1/grinder/setting",
      method: "PUT",
      body: { setting: "2" },
    })
  })
  it("blocks settings in full mode, stale state and active operations", async () => {
    const { gateway, state, calls } = setup(() => null)
    state.settings!.gatewayMode = "full"
    await expect(
      gateway.daily.save("settings", { blockOnNoScale: false })
    ).rejects.toThrow("full")
    state.settings!.gatewayMode = "tracking"
    state.machineReceived = 0
    await expect(gateway.daily.device("scan")).rejects.toThrow(
      "current machine"
    )
    state.machineReceived = Date.now()
    state.machine!.state.state = "steam"
    await expect(gateway.daily.power(true)).rejects.toThrow("idle")
    expect(calls).toEqual([])
  })
})
