import { describe, expect, it, vi } from "vitest"
import { DecaidGateway, initialSnapshot } from "./client"
import {
  annotationDraft,
  annotationPatch,
  annotations,
  emptyHistoryFilters,
  recordedTrace,
  repeatPatch,
  type HistoryRecord,
} from "./shot-history"
import { newProfile } from "./profile-data"
import type { GatewaySnapshot } from "./types"
const shot = (): HistoryRecord => ({
  id: "shot:a/b",
  timestamp: "2026-11-04T12:00:00Z",
  workflow: {
    profile: newProfile(),
    context: {
      targetDoseWeight: 18,
      targetYield: 36,
      coffeeName: "Historical coffee",
      beanBatchId: "archived-batch",
      grinderId: "record-id",
      extras: { vendor: 42 },
    },
    steamSettings: { duration: 45 },
  },
  annotations: {
    actualYield: 35,
    enjoyment: 8,
    espressoNotes: "Sweet",
    extras: { plugin: "keep" },
  },
  measurements: [
    {
      machine: {
        timestamp: "2026-11-04T12:00:00Z",
        pressure: 0,
        flow: 1,
        mixTemperature: 90,
      },
      scale: null,
    },
  ],
  stopReason: "scaleLost",
})
function setup(
  respond: (path: string, method: string, body: unknown) => unknown = () =>
    shot()
) {
  const calls: { path: string; method: string; body: unknown }[] = []
  const gateway = new DecaidGateway(
    "http://fixture.invalid",
    async (input, init) => {
      const u = new URL(String(input)),
        path = u.pathname + u.search,
        method = init?.method ?? "GET",
        body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ path, method, body })
      const result = respond(path, method, body)
      return result instanceof Response
        ? result
        : new Response(JSON.stringify(result))
    }
  )
  const state: GatewaySnapshot = {
    ...initialSnapshot(),
    connection: "online",
    settings: { gatewayMode: "tracking" },
    machineReceived: Date.now(),
    devices: [
      { id: "machine", type: "machine", state: "connected", name: "DE1" },
    ],
    machine: {
      timestamp: new Date().toISOString(),
      state: { state: "idle", substate: "idle" },
      flow: 0,
      pressure: 0,
      mixTemperature: 90,
      profileFrame: 0,
    },
    workflow: {
      profile: newProfile(),
      context: { coffeeName: "Current" },
      steamSettings: { targetTemperature: 140, duration: 30 },
    },
  }
  const original = gateway.getSnapshot
  vi.spyOn(gateway, "getSnapshot").mockImplementation(() => ({
    ...state,
    pending: original().pending,
  }))
  return { gateway, calls, state }
}
describe("recorded shot history", () => {
  it("uses canonical notes and sends only changed annotations, including explicit clears", () => {
    const record = shot()
    record.shotNotes = "Old alias"
    const base = annotationDraft(record),
      draft = { ...base, actualYield: "", espressoNotes: "" }
    expect(base.espressoNotes).toBe("Sweet")
    expect(annotationPatch(base, draft)).toEqual({
      patch: { actualYield: null, espressoNotes: "" },
      errors: {},
    })
    expect(annotations({ ...record, annotations: null })).toEqual({})
    const legacy = { ...record }
    delete legacy.annotations
    expect(annotationDraft(legacy).espressoNotes).toBe("Old alias")
  })
  it("rejects out-of-range enjoyment and non-finite assessments", () => {
    const base = annotationDraft(shot())
    expect(
      annotationPatch(base, { ...base, enjoyment: "11", drinkTds: "Infinity" })
        .errors
    ).toHaveProperty("enjoyment")
    expect(
      annotationPatch(base, { ...base, drinkTds: "Infinity" }).errors
    ).toHaveProperty("drinkTds")
  })
  it("keeps missing measurements as gaps and rejects out-of-order timestamps", () => {
    const r = shot()
    r.measurements!.push(
      { machine: { timestamp: "bad", pressure: 9 } },
      {
        machine: { timestamp: "2026-11-04T12:00:02Z", flow: 2 },
        scale: { weight: 4 },
      },
      { machine: { timestamp: "2026-11-04T12:00:01Z", pressure: 7 } }
    )
    const trace = recordedTrace(r)
    expect(trace.invalid).toBe(2)
    expect(trace.span).toBe(2)
    expect(trace.finalWeight).toBe(4)
    expect(trace.samples[0].weight).toBeNull()
    expect(trace.samples[1].pressure).toBeNull()
    expect(trace.samples[2]).toMatchObject({
      pressure: null,
      temperature: null,
      weight: 4,
    })
    expect(recordedTrace({ id: "missing" }).samples).toEqual([])
  })
  it("repeats only the recorded profile/context, clearing absent labels and never applying utility or machine fields", async () => {
    const r = shot()
    r.workflow!.machine = { id: "old-machine" }
    r.annotations = { actualDoseWeight: 20, actualYield: 40 }
    const patch = repeatPatch(r)
    expect(Object.keys(patch)).toEqual(["profile", "context"])
    expect(patch.context).toMatchObject({
      targetDoseWeight: 18,
      targetYield: 36,
      grinderId: "record-id",
      beanBatchId: "archived-batch",
      coffeeRoaster: null,
      grinderSetting: null,
      extras: { vendor: 42, focusProfileId: null },
    })
    const s = setup(() => r),
      update = vi.spyOn(s.gateway, "updateWorkflow").mockResolvedValue()
    await s.gateway.shots.repeat(r.id)
    expect(update).toHaveBeenCalledWith(patch)
    expect(s.calls.map((c) => c.method)).toEqual(["GET"])
  })
  it("blocks repeat for incomplete historical profiles instead of substituting a recipe", () => {
    expect(() =>
      repeatPatch({
        id: "partial",
        workflow: { profile: { title: "Old", steps: [] } },
      })
    ).toThrow("complete executable")
    const r = shot()
    r.workflow!.context = {}
    ;(r.workflow!.profile as Record<string, unknown>).target_weight = null
    expect(() => repeatPatch(r)).toThrow("target yield")
  })
  it("encodes server-side filters, paging and record identifiers", async () => {
    const s = setup((path) =>
      path.includes("?") ? { items: [shot()], total: 25 } : shot()
    )
    await s.gateway.shots.list(
      { ...emptyHistoryFilters, search: "A & B", profileTitle: "80's" },
      20
    )
    const query = new URL("http://fixture.invalid" + s.calls[0].path)
      .searchParams
    expect(query.get("search")).toBe("A & B")
    expect(query.get("offset")).toBe("20")
    await s.gateway.shots.get("shot:a/b")
    expect(s.calls[1].path).toBe("/api/v1/shots/shot%3Aa%2Fb")
  })
  it("restricts save payloads and retains measurements/extras in canonical responses and export", async () => {
    const r = shot(),
      original = structuredClone(r),
      s = setup(() => r)
    const saved = await s.gateway.shots.save(r.id, { espressoNotes: "New" })
    expect(s.calls[0].body).toEqual({ annotations: { espressoNotes: "New" } })
    expect(saved.measurements).toEqual(original.measurements)
    await expect(
      s.gateway.shots.save(r.id, { measurements: [] } as never)
    ).rejects.toThrow("Only canonical")
    expect(await s.gateway.shots.exportRecords([r.id])).toEqual([r])
    expect(r).toEqual(original)
  })
  it("does not claim a failed deletion or replay it, and gates offline writes", async () => {
    const s = setup(() => new Response('{"error":"rejected"}', { status: 500 }))
    await expect(s.gateway.shots.remove("record")).rejects.toThrow("rejected")
    expect(s.calls).toHaveLength(1)
    s.state.connection = "offline"
    await expect(
      s.gateway.shots.save("record", { enjoyment: 5 })
    ).rejects.toThrow("Reconnect")
    expect(s.calls).toHaveLength(1)
  })
})
