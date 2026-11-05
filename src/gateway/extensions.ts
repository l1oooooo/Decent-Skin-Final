import type { DecaidGateway } from "./client"
import { asData, responseData, type Data } from "./advanced"

export interface Plugin extends Data {
  id: string
  name: string
  version: string
  settings: Record<string, Data>
  loaded: boolean
  autoLoad: boolean
  permissions: string[]
}
export const logLevels = [
  "ALL",
  "FINEST",
  "FINER",
  "FINE",
  "CONFIG",
  "INFO",
  "WARNING",
  "SEVERE",
  "SHOUT",
  "OFF",
]
export function pluginPath(id: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id))
    throw new Error("Invalid plugin ID.")
  return `/api/v1/plugins/${encodeURIComponent(id)}`
}
export function parsePlugins(value: unknown): Plugin[] {
  if (!Array.isArray(value))
    throw new Error("Plugin inventory is unavailable or incompatible.")
  const ids = new Set<string>()
  return value.map((raw) => {
    const p = asData(raw)
    if (typeof p.id !== "string" || ids.has(p.id))
      throw new Error("Plugin inventory has invalid or duplicate IDs.")
    pluginPath(p.id)
    ids.add(p.id)
    if (
      typeof p.loaded !== "boolean" ||
      typeof p.autoLoad !== "boolean" ||
      !Array.isArray(p.permissions) ||
      p.permissions.some((permission) => typeof permission !== "string")
    )
      throw new Error(
        "Plugin runtime state or permissions are unavailable. Refresh before making changes."
      )
    return {
      ...p,
      id: p.id,
      name: String(p.name ?? p.id),
      version: String(p.version ?? "Unknown"),
      settings: Object.fromEntries(
        Object.entries(asData(p.settings)).map(([k, v]) => [k, asData(v)])
      ),
      loaded: p.loaded === true,
      autoLoad: p.autoLoad === true,
      permissions: Array.isArray(p.permissions)
        ? p.permissions.filter((v): v is string => typeof v === "string")
        : [],
    }
  })
}
function pluginValues(value: unknown): Data {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(
      "Plugin settings response is incompatible. Refresh before another write."
    )
  return asData(value)
}
export function pluginPatch(plugin: Plugin, draft: Data): Data {
  return Object.fromEntries(
    Object.entries(draft).map(([key, raw]) => {
      const field = plugin.settings[key]
      if (!field || field.hidden === true)
        throw new Error(`${key}: this setting is not editable here.`)
      if (field.secure === true && raw === null) return [key, null]
      let value = raw
      if (field.type === "number") {
        value = typeof raw === "string" && !raw.trim() ? NaN : Number(raw)
        if (!Number.isFinite(value))
          throw new Error(`${key}: enter a finite number.`)
      } else if (field.type === "boolean") {
        if (typeof raw !== "boolean")
          throw new Error(`${key}: choose On or Off.`)
      } else if (field.type === "enum") {
        if (!Array.isArray(field.values) || !field.values.includes(raw))
          throw new Error(`${key}: choose a listed value.`)
      } else if (field.type !== "string" || typeof raw !== "string")
        throw new Error(`${key}: unsupported setting type.`)
      return [key, value]
    })
  )
}
export function pluginLaunch(
  plugin: Plugin,
  origin: string,
  skin: string
): string | null {
  if (
    !plugin.loaded ||
    !plugin.permissions.includes("api") ||
    !Array.isArray(plugin.api) ||
    !plugin.api.some((e) => asData(e).id === "ui" && asData(e).type === "http")
  )
    return null
  const returnTo = new URL(skin),
    api = new URL(origin)
  for (const url of [returnTo, api])
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("Unsafe launch or return address.")
  for (const key of returnTo.searchParams.keys())
    if (/token|password|secret|credential|authorization/i.test(key))
      throw new Error(
        "Remove credentials from the skin URL before opening a plugin."
      )
  for (const key of ["profile", "shot", "slot", "returnTo"])
    returnTo.searchParams.delete(key)
  returnTo.searchParams.set("page", "settings")
  returnTo.searchParams.set("category", "extensions")
  returnTo.searchParams.set("plugin", plugin.id)
  const target = new URL(`${pluginPath(plugin.id)}/ui`, api.origin)
  target.searchParams.set("returnTo", returnTo.href)
  return target.href
}
export function feedbackBody(draft: Data) {
  const description = String(draft.description ?? "").trim()
  if (!description || description.length > 20000)
    throw new Error("Enter a description of 1–20,000 characters.")
  if (!["bug", "feature", "question", "other"].includes(String(draft.type)))
    throw new Error("Choose a feedback type.")
  return {
    description,
    type: draft.type,
    includeLogs: false,
    includeSystemInfo: false,
  }
}
export async function readLog(response: Response, limit = 256 * 1024) {
  if (!response.ok)
    throw new Error(
      `${response.status}: Log unavailable. The platform may not expose this log.`
    )
  if (!response.body) throw new Error("Log response has no body.")
  const reader = response.body.getReader(),
    decoder = new TextDecoder()
  let text = "",
    bytes = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) return text + decoder.decode()
      const remaining = limit - bytes
      text += decoder.decode(chunk.value.subarray(0, remaining), {
        stream: true,
      })
      bytes += chunk.value.length
      if (bytes >= limit)
        return (
          text +
          decoder.decode() +
          "\n[Display limited to 256 KiB. Use native Decaid for the full log.]"
        )
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
export class ExtensionsGateway {
  readonly gateway: DecaidGateway
  constructor(gateway: DecaidGateway) {
    this.gateway = gateway
  }
  async list() {
    return parsePlugins(await this.gateway.request("/api/v1/plugins"))
  }
  async settings(id: string) {
    return pluginValues(
      await this.gateway.request(`${pluginPath(id)}/settings`)
    )
  }
  async save(plugin: Plugin, draft: Data) {
    return this.gateway.settingsOperation(async (verify) => {
      const current = (await this.list()).find((p) => p.id === plugin.id)
      if (
        !current ||
        JSON.stringify(current.settings) !== JSON.stringify(plugin.settings) ||
        current.version !== plugin.version
      )
        throw new Error(
          "Plugin changed. Refresh and review its settings before saving."
        )
      const patch = pluginPatch(current, draft)
      verify()
      return pluginValues(
        await this.gateway.request(
          `${pluginPath(plugin.id)}/settings`,
          "POST",
          patch
        )
      )
    })
  }
  async mutate(path: string, body?: unknown, method = "POST") {
    return this.gateway.settingsOperation(async (verify) => {
      verify()
      return this.gateway.transfer(
        path,
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        responseData,
        10 * 60000
      )
    })
  }
  async action(
    plugin: Plugin,
    action: "enable" | "disable" | "remove" | "approve"
  ) {
    return this.gateway.settingsOperation(async (verify) => {
      const current = (await this.list()).find((p) => p.id === plugin.id)
      if (
        !current ||
        current.version !== plugin.version ||
        JSON.stringify(current.pendingUpdate) !==
          JSON.stringify(plugin.pendingUpdate) ||
        JSON.stringify(current.permissions) !==
          JSON.stringify(plugin.permissions)
      )
        throw new Error("Plugin changed. Refresh and review before continuing.")
      verify()
      const suffix =
        action === "remove"
          ? ""
          : action === "approve"
            ? "/update/approve"
            : `/${action}`
      return this.gateway.transfer(
        pluginPath(plugin.id) + suffix,
        { method: action === "remove" ? "DELETE" : "POST" },
        responseData,
        10 * 60000
      )
    })
  }
  async install(draft: Data) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(String(draft.repo)))
      throw new Error("Enter owner/repository.")
    if (!["github-release", "github-branch"].includes(String(draft.source)))
      throw new Error("Choose a supported source.")
    return this.mutate(
      `/api/v1/plugins/install/${draft.source}`,
      draft.source === "github-branch"
        ? { repo: draft.repo, branch: draft.branch || "main" }
        : {
            repo: draft.repo,
            ...(draft.assetName ? { assetName: draft.assetName } : {}),
            includePrerelease: false,
          }
    )
  }
  async feedback(draft: Data) {
    const body = feedbackBody(draft)
    return this.gateway.settingsOperation(async (verify) => {
      const account = asData(
        await this.gateway.request("/api/v1/account/decent")
      )
      if (account.loggedIn !== true)
        throw new Error(
          "Sign in to your Decent account in native Decaid, then refresh account status."
        )
      verify()
      const result = asData(
        await this.gateway.transfer(
          "/api/v1/feedback",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          responseData,
          120000
        )
      )
      if (result.success !== true)
        throw new Error(
          String(result.errorMessage ?? "Feedback was not acknowledged.")
        )
      return result
    })
  }
}
