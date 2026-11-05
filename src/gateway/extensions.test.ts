import { describe, expect, it, vi } from "vitest"
import { DecaidGateway, initialSnapshot } from "./client"
import {
  ExtensionsGateway,
  feedbackBody,
  parsePlugins,
  pluginLaunch,
  pluginPatch,
  pluginPath,
  readLog,
} from "./extensions"
import type { Data } from "./advanced"
const raw = {
  id: "tools.test",
  name: "Tools",
  version: "1",
  loaded: true,
  autoLoad: true,
  permissions: ["api"],
  api: [{ id: "ui", type: "http" }],
  settings: {
    title: { type: "string" },
    amount: { type: "number" },
    enabled: { type: "boolean" },
    choice: { type: "enum", values: ["a", "b"] },
    secret: { type: "string", secure: true },
    internal: { type: "string", hidden: true },
    unknown: { type: "object" },
  },
}
const plugin = () => parsePlugins([structuredClone(raw)])[0]
function setup(respond: (path: string, method: string, body: Data) => unknown) {
  const calls: { path: string; method: string; body: Data }[] = []
  const gateway = new DecaidGateway(
    "http://fixture.invalid",
    async (input, init) => {
      const path = new URL(String(input)).pathname,
        method = init?.method ?? "GET",
        body = init?.body ? JSON.parse(String(init.body)) : {}
      calls.push({ path, method, body })
      const result = respond(path, method, body)
      return result instanceof Response
        ? result
        : new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          })
    }
  )
  const state = {
    ...initialSnapshot(),
    connection: "online" as const,
    settings: { gatewayMode: "tracking" },
    machine: null,
    devices: [],
  }
  const original = gateway.getSnapshot
  vi.spyOn(gateway, "getSnapshot").mockImplementation(() => ({
    ...state,
    pending: original().pending,
  }))
  return { api: new ExtensionsGateway(gateway), gateway, state, calls }
}
describe("extensions and support", () => {
  it("rejects unknown permission state and malformed settings responses", async () => {
    expect(() => parsePlugins([{ ...raw, permissions: null }])).toThrow(
      "permissions"
    )
    const s = setup((path) => (path.endsWith("/plugins") ? [raw] : null))
    await expect(s.api.settings(raw.id)).rejects.toThrow("incompatible")
    await expect(s.api.save(plugin(), { title: "Changed" })).rejects.toThrow(
      "incompatible"
    )
    expect(s.calls.filter((c) => c.method === "POST")).toHaveLength(1)
  })
  it("rejects malformed and duplicate inventory IDs", () => {
    expect(() => parsePlugins({})).toThrow("inventory")
    expect(() => parsePlugins([raw, raw])).toThrow("duplicate")
    for (const id of ["..", "/ui", "%2e%2e", "a?b", "a\\b"])
      expect(() => pluginPath(id)).toThrow()
  })
  it("patches only declared visible settings and handles secure clears explicitly", () => {
    expect(
      pluginPatch(plugin(), { title: "New", amount: "2.5", secret: null })
    ).toEqual({ title: "New", amount: 2.5, secret: null })
    for (const draft of [
      { internal: "lost" },
      { amount: "" },
      { amount: Infinity },
      { enabled: "true" },
      { choice: "c" },
      { unknown: {} },
      { secret: { isSet: true } },
    ])
      expect(() => pluginPatch(plugin(), draft)).toThrow()
  })
  it("constructs only declared same-plugin HTTP launches and preserves the real return origin/path", () => {
    const url = new URL(
      pluginLaunch(
        plugin(),
        "http://tablet:8080",
        "http://tablet:3007/skin/index.html?page=settings&category=extensions&view=wide"
      )!
    )
    expect(url.origin).toBe("http://tablet:8080")
    expect(url.pathname).toBe("/api/v1/plugins/tools.test/ui")
    const back = new URL(url.searchParams.get("returnTo")!)
    expect(back.origin + back.pathname).toBe(
      "http://tablet:3007/skin/index.html"
    )
    expect(back.searchParams.get("plugin")).toBe("tools.test")
    expect(back.searchParams.get("view")).toBe("wide")
    expect(
      pluginLaunch({ ...plugin(), loaded: false }, url.origin, back.href)
    ).toBeNull()
    expect(
      pluginLaunch({ ...plugin(), permissions: [] }, url.origin, back.href)
    ).toBeNull()
    expect(
      pluginLaunch(
        { ...plugin(), api: [{ id: "ui", type: "websocket" }] },
        url.origin,
        back.href
      )
    ).toBeNull()
    expect(() =>
      pluginLaunch(plugin(), url.origin, "javascript:alert(1)")
    ).toThrow()
    expect(() =>
      pluginLaunch(plugin(), url.origin, "http://host/?token=private")
    ).toThrow()
  })
  it("rereads the manifest before a patch and never sends hidden or unchanged secure values", async () => {
    const s = setup((path, method, body) =>
      path.endsWith("/plugins")
        ? [raw]
        : method === "POST"
          ? { ...body, secret: { isSet: true } }
          : {}
    )
    await s.api.save(plugin(), { title: "New" })
    expect(s.calls.filter((c) => c.method !== "GET")).toEqual([
      {
        path: "/api/v1/plugins/tools.test/settings",
        method: "POST",
        body: { title: "New" },
      },
    ])
  })
  it("blocks schema changes and changed permission approvals before writing", async () => {
    const s = setup(() => [
      {
        ...raw,
        version: "2",
        pendingUpdate: { version: "3", addedPermissions: ["network.tcp"] },
      },
    ])
    await expect(s.api.save(plugin(), { title: "new" })).rejects.toThrow(
      "changed"
    )
    await expect(s.api.action(plugin(), "approve")).rejects.toThrow("changed")
    expect(s.calls.every((c) => c.method === "GET")).toBe(true)
  })
  it("uses the installed plugin install contract, with no arbitrary URL fallback", async () => {
    const s = setup(() => ({ id: "new.plugin" }))
    await s.api.install({
      source: "github-release",
      repo: "owner/repo",
      assetName: "plugin.zip",
    })
    expect(s.calls[0].body).toEqual({
      repo: "owner/repo",
      assetName: "plugin.zip",
      includePrerelease: false,
    })
    await expect(
      s.api.install({ source: "url", repo: "owner/repo" })
    ).rejects.toThrow("supported")
    expect(s.calls).toHaveLength(1)
  })
  it("gates mutations in full mode and on disconnection without replay", async () => {
    const s = setup(() => ({}))
    s.state.settings.gatewayMode = "full"
    await expect(s.api.action(plugin(), "enable")).rejects.toThrow("full")
    s.state.settings.gatewayMode = "tracking"
    Object.assign(s.state, { connection: "offline" })
    await expect(
      s.api.install({ source: "github-branch", repo: "owner/repo" })
    ).rejects.toThrow("Reconnect")
    expect(s.calls).toHaveLength(0)
  })
  it("submits only reviewed text with attachments explicitly disabled and requires an account", async () => {
    expect(
      feedbackBody({
        description: "  Details  ",
        type: "bug",
        includeLogs: true,
      })
    ).toEqual({
      description: "Details",
      type: "bug",
      includeLogs: false,
      includeSystemInfo: false,
    })
    expect(() => feedbackBody({ description: " ", type: "bug" })).toThrow()
    const s = setup((path) =>
      path.endsWith("/decent") ? { loggedIn: false } : { success: true }
    )
    await expect(
      s.api.feedback({ description: "Review", type: "bug" })
    ).rejects.toThrow("Sign in")
    expect(s.calls.every((c) => c.method === "GET")).toBe(true)
  })
  it("does not turn a rejected feedback result into success or retry it", async () => {
    const s = setup((path) =>
      path.endsWith("/decent")
        ? { loggedIn: true }
        : { success: false, errorMessage: "Rejected" }
    )
    await expect(
      s.api.feedback({ description: "Review", type: "other" })
    ).rejects.toThrow("Rejected")
    expect(s.calls.filter((c) => c.method === "POST")).toHaveLength(1)
  })
  it("bounds diagnostic log display and exposes unsupported endpoints", async () => {
    expect(await readLog(new Response("abcdef"), 3)).toContain(
      "abc\n[Display limited"
    )
    await expect(
      readLog(new Response("missing", { status: 404 }))
    ).rejects.toThrow("404")
  })
})
