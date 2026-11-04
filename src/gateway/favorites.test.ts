import { describe, expect, it } from "vitest"
import { DecaidGateway } from "./client"
import { activeProfileId, assignFavorite, normalizeFavorites } from "./model"

const profile = {
  title: "Same title",
  steps: [
    {
      name: "Fill",
      pump: "flow" as const,
      transition: "fast" as const,
      seconds: 5,
      temperature: 90,
      flow: 2,
    },
  ],
}
const records = [
  { id: "one", profile },
  {
    id: "two",
    profile: { ...profile, steps: [{ ...profile.steps[0], flow: 3 }] },
  },
]
function fixture(stored: unknown, status = 200) {
  let value = stored
  let readStatus = status
  let failed = false
  const writes: unknown[] = []
  const gateway = new DecaidGateway(
    "http://test.invalid",
    async (url, init) => {
      if (String(url).includes("/profiles")) return Response.json(records)
      if (init?.method === "POST") {
        writes.push(JSON.parse(String(init.body)))
        if (failed)
          return Response.json({ error: "Store rejected" }, { status: 503 })
        value = JSON.parse(String(init.body))
        readStatus = 200
        return new Response(null, { status: 204 })
      }
      return Response.json(value, { status: readStatus })
    }
  )
  return {
    gateway,
    writes,
    fail: () => {
      failed = true
    },
  }
}
describe("five favorite positions", () => {
  it.each([{ stored: [] }, { stored: [null, null, null, null, null] }])(
    "preserves intentionally empty data %j",
    async ({ stored }) => {
      const { gateway, writes } = fixture(stored)
      await gateway.loadProfiles()
      expect(gateway.getSnapshot().favorites).toEqual([
        null,
        null,
        null,
        null,
        null,
      ])
      expect(writes).toEqual([])
    }
  )
  it("suggests only on a missing key; malformed and failed reads cannot seed favorites", async () => {
    const missing = fixture({}, 404)
    await missing.gateway.loadProfiles()
    expect(missing.gateway.getSnapshot().favorites).toEqual([
      "one",
      "two",
      null,
      null,
      null,
    ])
    for (const [value, status] of [
      [{}, 200],
      [["one", 42], 200],
      [{}, 503],
    ] as const) {
      const { gateway, writes } = fixture(value, status)
      await gateway.loadProfiles()
      expect(gateway.getSnapshot().favoritesLoaded).toBe(false)
      expect(gateway.getSnapshot().favoritesIssue).not.toBe("")
      expect(writes).toEqual([])
    }
  })
  it("keeps order, unavailable IDs and first duplicate occurrence", () => {
    expect(normalizeFavorites(["missing", null, "one", "one"]).slots).toEqual([
      "missing",
      null,
      "one",
      null,
      null,
    ])
    expect(normalizeFavorites(["one", "one"]).issue).toMatch(/Duplicate/)
    expect(assignFavorite(["one", "two", null, null, null], 0, "two")).toEqual([
      "two",
      "one",
      null,
      null,
      null,
    ])
    expect(assignFavorite(["one", "two", null, null, null], 2, "one")).toEqual([
      null,
      "two",
      "one",
      null,
      null,
    ])
  })
  it("acknowledges only successful saves, survives reread, never writes workflow", async () => {
    const { gateway, writes, fail } = fixture(["one"])
    await gateway.loadProfiles()
    const empty = [null, null, null, null, null]
    await gateway.saveFavorites(empty)
    await gateway.loadProfiles()
    expect(gateway.getSnapshot().favorites).toEqual(empty)
    fail()
    await expect(
      gateway.saveFavorites(["two", null, null, null, null])
    ).rejects.toThrow("503")
    expect(gateway.getSnapshot().favorites).toEqual(empty)
    expect(writes).toHaveLength(2)
  })
  it("fences a favorites read that began before a save", async () => {
    let finish: (response: Response) => void = () => {}
    const gateway = new DecaidGateway(
      "http://test.invalid",
      async (url, init) => {
        if (String(url).includes("/profiles")) return Response.json(records)
        if (init?.method === "POST") return new Response(null, { status: 204 })
        return new Promise<Response>((resolve) => {
          finish = resolve
        })
      }
    )
    const read = gateway.loadProfiles()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await gateway.saveFavorites(["two", null, null, null, null])
    finish(Response.json(["one"]))
    await read
    expect(gateway.getSnapshot().favorites[0]).toBe("two")
  })
  it("resolves exact records independently of title and object key order; ambiguity stays unselected", () => {
    expect(activeProfileId(profile, records)).toBe("one")
    expect(
      activeProfileId({ steps: profile.steps, title: profile.title }, records)
    ).toBe("one")
    expect(
      activeProfileId(profile, [...records, { id: "third", profile }])
    ).toBeNull()
    expect(
      activeProfileId(
        { ...profile, steps: [{ ...profile.steps[0], temperature: 91 }] },
        records
      )
    ).toBeNull()
  })
})

it("counts a newly observed start once but never counts an active-shot replay", () => {
  const gateway = new DecaidGateway("http://test.invalid")
  const frame = (seconds: number, state: string, substate: string) => ({
    timestamp: new Date(1700000000000 + seconds * 1000).toISOString(),
    state: { state, substate },
    pressure: 0,
    flow: 0,
    mixTemperature: 90,
    profileFrame: 0,
  })
  gateway.receive("machine/snapshot", frame(0, "espresso", "preparingForShot"))
  gateway.receive("machine/snapshot", frame(1, "espresso", "pouring"))
  expect(gateway.getSnapshot().observedShot).toBe(0)
  gateway.receive("machine/snapshot", frame(2, "idle", "idle"))
  gateway.receive("machine/snapshot", frame(3, "espresso", "preparingForShot"))
  gateway.receive("machine/snapshot", frame(4, "espresso", "pouring"))
  expect(gateway.getSnapshot().observedShot).toBe(1)
})
