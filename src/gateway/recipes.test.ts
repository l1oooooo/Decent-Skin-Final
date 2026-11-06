import { describe, expect, it, vi } from "vitest"
import { DecaidGateway, initialSnapshot } from "./client"
import {
  newProfile,
  profileExtensions,
  restoreExtensions,
  validateProfile,
  executableKey,
} from "./profile-data"
import { parseProfileRecord } from "./model"
import { validateInventoryPatch } from "./recipes"
import type { ProfileRecord, GatewaySnapshot } from "./types"

function setup() {
  const source: ProfileRecord = {
    id: "old",
    profile: newProfile(),
    isDefault: false,
    metadata: { vendor: { keep: true } },
    visibility: "visible",
  }
  const library = [source]
  const kv: Record<string, unknown> = {
    favorites: ["old", null, null, null, null],
    recipes: { old: { targetDoseWeight: 18, extension: "keep" } },
  }
  const calls: { path: string; method: string; body: unknown }[] = []
  let fail = ""
  const gateway = new DecaidGateway(
    "http://fixture.invalid",
    async (input, init) => {
      const path = new URL(String(input)).pathname
      const method = init?.method ?? "GET"
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ path, method, body })
      if (path === fail && method !== "GET")
        return new Response('{"error":"rejected"}', { status: 500 })
      let result: unknown
      if (path.includes("/store/")) {
        const key = path.split("/").at(-1)!
        if (method === "POST") kv[key] = structuredClone(body)
        if (method === "DELETE") delete kv[key]
        if (method === "GET" && !(key in kv))
          return new Response("{}", { status: 404 })
        result = method === "GET" ? kv[key] : {}
      } else if (path === "/api/v1/profiles" && method === "GET")
        result = library
      else if (path === "/api/v1/profiles/old" && method === "GET")
        result = source
      else if (path === "/api/v1/profiles/old" && method === "PUT") {
        const record = {
          ...source,
          id: "new",
          profile: body.profile,
          metadata: body.metadata,
        }
        library.splice(0, library.length, record)
        result = record
      } else result = {}
      return new Response(JSON.stringify(result))
    }
  )
  const state: GatewaySnapshot = {
    ...initialSnapshot(),
    connection: "online",
    settings: { gatewayMode: "tracking" },
    profiles: library,
    favorites: kv.favorites as (string | null)[],
    favoritesLoaded: true,
    devices: [
      { id: "m", name: "machine", type: "machine", state: "connected" },
    ],
    machineReceived: Date.now(),
    machine: {
      timestamp: new Date().toISOString(),
      state: { state: "idle", substate: "idle" },
      flow: 0,
      pressure: 0,
      mixTemperature: 90,
      profileFrame: 0,
    },
    workflow: {
      profile: source.profile,
      context: {
        coffeeName: "Coffee",
        beanBatchId: "batch",
        grinderId: "equipment",
        extras: { keep: 1 },
      },
    },
  }
  const original = gateway.getSnapshot
  vi.spyOn(gateway, "getSnapshot").mockImplementation(() => ({
    ...state,
    pending: original().pending,
  }))
  return {
    gateway,
    source,
    kv,
    library,
    calls,
    state,
    fail: (path: string) => {
      fail = path
    },
  }
}

describe("profile and inventory ownership", () => {
  for (const operation of ["load", "assign"] as const)
    it.each([false, true])(
      `${operation} compares workflow contents across reads (changed=%s)`,
      async (changed) => {
        const s = setup()
        const update = vi.spyOn(s.gateway, "updateWorkflow").mockResolvedValue()
        const refresh = () => {
          if (changed)
            s.state.workflow!.context!.coffeeName = "Changed during read"
          else s.state.workflow = structuredClone(s.state.workflow)
        }
        if (operation === "load")
          vi.spyOn(s.gateway.recipes, "preferences").mockImplementation(
            async () => {
              refresh()
              return {}
            }
          )
        else
          vi.spyOn(s.gateway, "request").mockImplementation(async () => {
            refresh()
            return { id: "equipment", model: "Grinder" }
          })
        const result =
          operation === "load"
            ? s.gateway.recipes.load("old")
            : s.gateway.recipes.assignInventory("grinders", "equipment")
        if (changed) {
          await expect(result).rejects.toThrow(/changed/)
          expect(update).not.toHaveBeenCalled()
        } else {
          await result
          expect(update).toHaveBeenCalledOnce()
          expect(update).toHaveBeenCalledWith(
            expect.objectContaining({
              context: expect.objectContaining({ coffeeName: "Coffee" }),
            })
          )
        }
      }
    )
  it("preserves unknown profile, stage, exit and limiter keys through the metadata sidecar", () => {
    const p = newProfile()
    p.plugin = { v: 1 }
    p.steps[0].custom = "stage"
    p.steps[0].exit = {
      type: "flow",
      condition: "over",
      value: 2,
      custom: "exit",
    }
    p.steps[0].limiter = { value: 4, range: 1, custom: "limiter" }
    const ext = profileExtensions(p)
    const wire = newProfile()
    wire.steps[0].exit = { type: "flow", condition: "over", value: 2 }
    wire.steps[0].limiter = { value: 4, range: 1 }
    expect(restoreExtensions(wire, ext)).toEqual(p)
    expect(
      parseProfileRecord({
        id: "id",
        profile: wire,
        metadata: { focusExtensions: ext },
      }).profile
    ).toEqual(p)
  })
  it("validates exits, finite targets, stage index and structured profiles", () => {
    const p = newProfile()
    expect(validateProfile(p)).toEqual({})
    p.steps[0].seconds = Infinity
    p.steps[0].exit = { type: "weight", condition: "wrong", value: -1 }
    p.target_volume_count_start = 3
    expect(Object.keys(validateProfile(p))).toEqual(
      expect.arrayContaining([
        "steps.0.seconds",
        "steps.0.exit.type",
        "steps.0.exit.condition",
        "steps.0.exit.value",
        "target_volume_count_start",
      ])
    )
    const renamed = { ...newProfile(), title: "Same executable" }
    expect(executableKey(renamed)).toBe(executableKey(newProfile()))
  })
  it("recovers a changed ID after partial failure without resending content, retaining preferences", async () => {
    const s = setup()
    s.fail("/api/v1/store/decent-skin-codex/favorites")
    const changed = structuredClone(s.source.profile)
    changed.steps[0].seconds = 12
    const first = await s.gateway.recipes.save(s.source, changed, "update")
    expect(first.record?.id).toBe("new")
    expect(first.pending).not.toBeNull()
    expect(s.kv.favorites).toContain("old")
    s.fail("")
    const second = await s.gateway.recipes.retry()
    expect(second.pending).toBeNull()
    expect(s.kv.favorites).toEqual(["new", null, null, null, null])
    expect(s.kv.recipes).toEqual({
      new: { targetDoseWeight: 18, extension: "keep" },
    })
    expect(s.kv["profile-save"]).toBeUndefined()
    expect(
      s.calls.filter((c) => c.method === "PUT" && c.path.includes("profiles"))
    ).toHaveLength(1)
    expect(s.library[0].metadata?.vendor).toEqual({ keep: true })
  })
  it("blocks default updates and title-only copies without writes", async () => {
    const s = setup()
    s.source.isDefault = true
    await expect(
      s.gateway.recipes.save(s.source, s.source.profile, "update")
    ).rejects.toThrow("Default")
    await expect(
      s.gateway.recipes.save(
        s.source,
        { ...s.source.profile, title: "Copy" },
        "new"
      )
    ).rejects.toThrow("executable recipe")
    expect(s.calls.filter((c) => c.method !== "GET")).toEqual([])
  })
  it("loads saved adjustments without changing coffee/equipment or moving a grinder", async () => {
    const s = setup()
    s.kv.recipes = {
      old: {
        targetDoseWeight: 20,
        targetYield: 40,
        temperature: 94,
        grinderSetting: "3",
      },
    }
    const update = vi.spyOn(s.gateway, "updateWorkflow").mockResolvedValue()
    await s.gateway.recipes.load("old")
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          beanBatchId: "batch",
          grinderId: "equipment",
          coffeeName: "Coffee",
          targetDoseWeight: 20,
          targetYield: 40,
          grinderSetting: "3",
        }),
        profile: expect.objectContaining({
          steps: [expect.objectContaining({ temperature: 94 })],
        }),
      })
    )
    expect(s.calls.filter((c) => c.method !== "GET")).toEqual([])
  })
  it("rejects malformed preference data instead of loading a fallback", async () => {
    const s = setup()
    s.kv.recipes = { old: { temperature: "hot" } }
    const update = vi.spyOn(s.gateway, "updateWorkflow").mockResolvedValue()
    await expect(s.gateway.recipes.load("old")).rejects.toThrow("temperature")
    expect(update).not.toHaveBeenCalled()
  })
  it.each([-1, NaN, "36"])(
    "rejects an invalid profile weight target instead of disabling its stop (%s)",
    async (target) => {
      const s = setup()
      Object.assign(s.source.profile, { target_weight: target })
      const update = vi.spyOn(s.gateway, "updateWorkflow").mockResolvedValue()
      await expect(s.gateway.recipes.load("old")).rejects.toThrow(
        "invalid weight target"
      )
      expect(update).not.toHaveBeenCalled()
      expect(s.calls).toEqual([])
    }
  )
  it.each([0, null, undefined])(
    "clears the previous yield for a profile without a weight target (%s)",
    async (target) => {
      const s = setup()
      s.kv.recipes = {}
      s.state.workflow!.context!.targetDoseWeight = 20
      s.state.workflow!.context!.targetYield = 36
      s.source.profile.target_weight = target
      s.source.profile.steps[0].temperature = 82
      const update = vi.spyOn(s.gateway, "updateWorkflow").mockResolvedValue()
      await s.gateway.recipes.load("old")
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({
            steps: [expect.objectContaining({ temperature: 82 })],
          }),
          context: expect.objectContaining({
            targetDoseWeight: null,
            targetYield: 0,
            extras: expect.objectContaining({
              focusDoseSource: "unset",
              focusProfileId: "old",
              keep: 1,
            }),
          }),
        })
      )
      expect(s.calls.every((c) => c.method === "GET")).toBe(true)
    }
  )
  it("keeps inventory edits as patches and validates list and weight fields", () => {
    expect(
      validateInventoryPatch("beans", {
        variety: "Bourbon, Caturra",
        altitude: "1200, 1600",
      })
    ).toEqual({ variety: ["Bourbon", "Caturra"], altitude: [1200, 1600] })
    expect(() =>
      validateInventoryPatch("bean-batches", { weightRemaining: -1 })
    ).toThrow("weightRemaining")
    expect(() =>
      validateInventoryPatch("beans", { altitude: "1200, unknown" })
    ).toThrow("Altitude")
  })
  it("blocks offline writes before creating a recovery journal", async () => {
    const s = setup()
    s.state.connection = "offline"
    await expect(
      s.gateway.recipes.save(
        s.source,
        { ...s.source.profile, target_weight: 50 },
        "update"
      )
    ).rejects.toThrow()
    expect(s.calls).toEqual([])
  })
})
