import { afterEach, describe, expect, it, vi } from "vitest"
import { DecaidGateway, initialSnapshot } from "./client"
import {
  AdvancedGateway,
  consumeFirmware,
  sensorCorrection,
  readBackup,
  syncRequest,
  transferRows,
  type Data,
} from "./advanced"
import type { GatewaySnapshot } from "./types"
function setup(
  respond: (
    path: string,
    method: string,
    body: Data
  ) => unknown | Promise<unknown>
) {
  const calls: { path: string; method: string; body: Data }[] = []
  const gateway = new DecaidGateway(
    "http://fixture.invalid",
    async (input, init) => {
      const url = new URL(String(input)),
        path = url.pathname + url.search,
        method = init?.method ?? "GET",
        body = init?.body ? JSON.parse(String(init.body)) : {}
      calls.push({ path, method, body })
      const result = await respond(path, method, body)
      return result instanceof Response
        ? result
        : new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          })
    }
  )
  const state: GatewaySnapshot = {
    ...initialSnapshot(),
    connection: "online",
    settings: { gatewayMode: "tracking" },
    devices: [
      { id: "machine", type: "machine", state: "connected", name: "DE1" },
    ],
    machineReceived: Date.now(),
    machine: {
      timestamp: new Date().toISOString(),
      state: { state: "idle", substate: "idle" },
      flow: 0,
      pressure: 0,
      mixTemperature: 88,
      steamTemperature: 50,
      profileFrame: 0,
    },
    workflow: {
      profile: null,
      steamSettings: { targetTemperature: 0, duration: 30 },
    },
  }
  const original = gateway.getSnapshot
  vi.spyOn(gateway, "getSnapshot").mockImplementation(() => ({
    ...state,
    pending: original().pending,
  }))
  return { api: new AdvancedGateway(gateway), gateway, state, calls }
}
const ndjson = (events: unknown[]) =>
  new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", {
    headers: { "Content-Type": "application/x-ndjson" },
  })
afterEach(() => vi.useRealTimers())
describe("advanced operations", () => {
  it("bounds browser backup memory before accepting a download", async () => {
    const headers = { "Content-Type": "application/zip" }
    const blob = await readBackup(new Response("ZIP", { headers }), 10)
    expect(blob.size).toBe(3)
    await expect(
      readBackup(new Response("too large", { headers }), 3)
    ).rejects.toThrow("native data management")
    await expect(readBackup(new Response("", { headers }), 10)).rejects.toThrow(
      "empty"
    )
  })
  it("uses measured sensor readings as a one-time ratio or offset correction", () => {
    expect(sensorCorrection("pressure", 1, 8, 8.4)).toBeCloseTo(1.05)
    expect(sensorCorrection("temperature", 1.5, 90, 91)).toBe(2.5)
    expect(() => sensorCorrection("pressure", 1, 0, 8)).toThrow("zero")
    expect(() => sensorCorrection("flow", 1, 2, 4)).toThrow("ratio")
    expect(() => sensorCorrection("temperature", 0, Infinity, 90)).toThrow(
      "finite"
    )
  })
  it("acknowledges and rereads sensor corrections without touching workflow or replaying failed writes", async () => {
    let saved = 1
    const s = setup((path, method, body) =>
      path.endsWith("/info")
        ? { model: "DE1" }
        : method === "PUT"
          ? ((saved *=
              Number(body.measuredValue) / Number(body.de1ReportedValue)),
            null)
          : { measuredValue: saved }
    )
    const result = await s.api.sensor("pressure", 8, 8.4, "machine")
    expect(result).toEqual({ measuredValue: 1.05 })
    expect(s.calls.filter((c) => c.method !== "GET")).toEqual([
      {
        path: "/api/v1/machine/calibration/pressure",
        method: "PUT",
        body: { de1ReportedValue: 8, measuredValue: 8.4 },
      },
    ])
  })
  it("factory restoration uses the current calibration as its baseline", async () => {
    const s = setup((path) =>
      path.endsWith("/info")
        ? { model: "DE1" }
        : path.includes("source=factory")
          ? { measuredValue: 1 }
          : { measuredValue: 1.1 }
    )
    await s.api.sensor("pressure", 0, 0, "machine", true)
    expect(s.calls.find((c) => c.method === "PUT")?.body).toEqual({
      de1ReportedValue: 1.1,
      measuredValue: 1,
    })
  })
  it("blocks unsupported capabilities, stale readings and changed machines before writes", async () => {
    const s = setup(() => ({ capabilities: [] }))
    await expect(
      s.api.machineWrite(
        "machine/cupWarmer",
        "PUT",
        { enabled: true },
        "machine",
        "cupWarmer"
      )
    ).rejects.toThrow("support")
    await expect(
      s.api.machineWrite(
        "machine/settings/advanced",
        "POST",
        { heaterVoltage: 120 },
        "other"
      )
    ).rejects.toThrow("changed")
    s.state.machineReceived = Date.now() - 6000
    await expect(s.api.sensor("pressure", 8, 8, "machine")).rejects.toThrow(
      "readings"
    )
    expect(s.calls.every((c) => c.method === "GET")).toBe(true)
  })
  it("keeps the unedited lighting zone when saving a palette", async () => {
    const palette = {
      frontStrip: { awake: "000000000000", sleeping: "000000000000" },
      backStrip: { awake: "FFFF00000000", sleeping: "000000000000" },
    }
    const s = setup((path) =>
      path.endsWith("capabilities") ? { capabilities: ["ledStrip"] } : palette
    )
    await s.api.machineWrite(
      "machine/ledStrip",
      "PUT",
      { frontStrip: { awake: "00FF00FF00FF", sleeping: "000000000000" } },
      "machine",
      "ledStrip"
    )
    expect(s.calls.find((c) => c.method === "PUT")?.body.backStrip).toEqual(
      palette.backStrip
    )
  })
  it("requires a verified firmware terminal event, including across chunk boundaries", async () => {
    const encoder = new TextEncoder(),
      events: Data[] = []
    const stream = new ReadableStream({
      start(controller) {
        for (const text of [
          '{"status":"uploading","progress":1}\n{"sta',
          'tus":"done","progress":1}\n',
        ])
          controller.enqueue(encoder.encode(text))
        controller.close()
      },
    })
    await consumeFirmware(
      new Response(stream, {
        headers: { "Content-Type": "application/x-ndjson" },
      }),
      (e) => events.push(e)
    )
    expect(events.at(-1)?.status).toBe("done")
    await expect(
      consumeFirmware(ndjson([{ status: "uploading", progress: 1 }]), () => {})
    ).rejects.toThrow("without verified")
    await expect(
      consumeFirmware(
        ndjson([
          { status: "uploading", progress: 1 },
          { status: "error", error: "CRC failed" },
        ]),
        () => {}
      )
    ).rejects.toThrow("CRC failed")
  })
  it("blocks ineligible firmware and never sets force", async () => {
    let eligible = false
    const s = setup((path) =>
      path.endsWith("/apply")
        ? ndjson([{ status: "done", progress: 1 }])
        : {
            artifacts: [
              {
                id: "image",
                eligibility: {
                  status: eligible ? "applicable" : "notApplicable",
                },
              },
            ],
            operation: { state: "idle" },
          }
    )
    await expect(
      s.api.firmware("image", "machine", () => {}, new AbortController().signal)
    ).rejects.toThrow("not eligible")
    expect(s.calls.every((c) => c.method === "GET")).toBe(true)
    eligible = true
    await s.api.firmware(
      "image",
      "machine",
      () => {},
      new AbortController().signal
    )
    expect(s.calls.find((c) => c.method === "POST")?.body).toEqual({
      artifactId: "image",
      force: false,
    })
  })
  it("never starts maintenance after preparation was cancelled or while descaling is hot", async () => {
    const s = setup(() => ({})),
      controller = new AbortController()
    controller.abort()
    await expect(
      s.api.maintenance("cleaning", "machine", () => {}, controller.signal)
    ).rejects.toThrow("cancelled")
    s.state.machine!.steamTemperature = 100
    await expect(
      s.api.maintenance(
        "descaling",
        "machine",
        () => {},
        new AbortController().signal
      )
    ).rejects.toThrow("60")
    expect(s.calls).toEqual([])
  })
  it("only reports a maintenance cycle ended after observing active state then idle", async () => {
    vi.useFakeTimers()
    const s = setup(() => ({})),
      messages: string[] = []
    const pending = s.api.maintenance(
      "cleaning",
      "machine",
      (m) => messages.push(m),
      new AbortController().signal
    )
    await vi.advanceTimersByTimeAsync(500)
    expect(messages.some((m) => m.includes("returned"))).toBe(false)
    s.state.machine!.state = { state: "cleaning", substate: "cleanSoaking" }
    await vi.advanceTimersByTimeAsync(500)
    expect(messages.at(-1)).toBe("Running: cleanSoaking")
    s.state.machine!.state = { state: "idle", substate: "idle" }
    await vi.advanceTimersByTimeAsync(250)
    await pending
    expect(messages.at(-1)).toContain("returned to idle")
  })
  it("a disconnect during maintenance is unknown rather than completion", async () => {
    vi.useFakeTimers()
    const s = setup(() => ({})),
      messages: string[] = []
    const promise = s.api.maintenance(
      "airPurge",
      "machine",
      (m) => messages.push(m),
      new AbortController().signal
    )
    const rejected = expect(promise).rejects.toThrow("may still be running")
    await vi.advanceTimersByTimeAsync(250)
    s.state.connection = "offline"
    await vi.advanceTimersByTimeAsync(250)
    await rejected
    expect(messages.some((m) => m.includes("returned to idle"))).toBe(false)
  })
  it("does not apply a late calibration command after cancellation during capability read", async () => {
    const controller = new AbortController(),
      s = setup(() => {
        controller.abort()
        return { capabilities: ["scaleCalibration"] }
      })
    await expect(
      s.api.scale("zero", 0, "machine", () => {}, controller.signal)
    ).rejects.toThrow("cancelled")
    expect(s.calls.every((c) => c.method === "GET")).toBe(true)
  })
  it("uses explicit conflict and section choices and stops two-way after an incomplete pull", () => {
    expect(
      syncRequest("http://other.local:8080/", "two_way", "overwrite", [
        "shots",
        "profiles",
      ])
    ).toEqual({
      target: "http://other.local:8080",
      mode: "two_way",
      onConflict: "overwrite",
      sections: ["shots", "profiles"],
      continueOnPullFailure: false,
    })
    expect(() =>
      syncRequest("http://user:secret@other.local", "pull", "skip", ["shots"])
    ).toThrow("credentials")
    expect(() => syncRequest("http://other.local", "pull", "skip", [])).toThrow(
      "at least"
    )
    expect(
      transferRows({
        profiles: { imported: 2, skipped: 3 },
        shots: { imported: 0, skipped: 0, errors: ["Rejected"] },
      })
    ).toEqual([
      {
        section: "profiles",
        imported: 2,
        skipped: 3,
        errors: [],
        warnings: [],
      },
      {
        section: "shots",
        imported: 0,
        skipped: 0,
        errors: ["Rejected"],
        warnings: [],
      },
    ])
  })
})
