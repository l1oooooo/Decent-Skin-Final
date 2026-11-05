import { executableKey, restoreExtensions } from "./profile-data"
import type {
  FavoriteSlots,
  ProfileRecord,
  GatewaySnapshot,
  MachineSnapshot,
  Profile,
  ShotSample,
  Workflow,
} from "./types"

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Decaid response")
  return value as Record<string, unknown>
}
export function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
export function parseProfile(value: unknown): Profile {
  const p = object(value)
  if (typeof p.title !== "string" || !Array.isArray(p.steps) || !p.steps.length)
    throw new Error("Decaid returned a profile without executable steps")
  for (const step of p.steps) {
    const s = object(step)
    if (
      typeof s.name !== "string" ||
      !finite(s.seconds) ||
      !finite(s.temperature) ||
      !["flow", "pressure"].includes(String(s.pump))
    )
      throw new Error("Unsupported Decaid profile step")
  }
  return p as unknown as Profile
}
export function parseWorkflow(value: unknown): Workflow {
  const w = object(value)
  return {
    ...w,
    profile: w.profile == null ? null : parseProfile(w.profile),
  } as Workflow
}
export function parseMachine(value: unknown): MachineSnapshot {
  const m = object(value)
  const state = object(m.state)
  if (
    typeof state.state !== "string" ||
    typeof state.substate !== "string" ||
    typeof m.timestamp !== "string" ||
    !Number.isFinite(Date.parse(m.timestamp)) ||
    !finite(m.pressure) ||
    !finite(m.flow) ||
    !finite(m.mixTemperature) ||
    !Number.isInteger(m.profileFrame)
  )
    throw new Error("Unsupported Decaid machine snapshot")
  return m as unknown as MachineSnapshot
}
export function connected(s: GatewaySnapshot) {
  return (
    s.connection === "online" &&
    s.devices.some((d) => d.type === "machine" && d.state === "connected")
  )
}
export function pouring(m: MachineSnapshot | null) {
  return (
    m?.state.state === "espresso" &&
    ["preinfusion", "pouring"].includes(m.state.substate)
  )
}
export function commandBlock(s: GatewaySnapshot, now = Date.now()): string {
  if (!connected(s))
    return "Machine disconnected. Check the connection in Decaid."
  if (!s.machine || now - s.machineReceived > 5000)
    return "Waiting for current machine readings."
  if (s.pending) return "Waiting for Decaid to finish the previous request."
  if (!s.settings) return "Waiting for Decaid settings."
  if (!["tracking", "disabled"].includes(s.settings.gatewayMode))
    return "Use Decaid's tracking mode for gateway-owned shot control and stop-at-weight."
  if (s.deviceError) return s.deviceError
  if (s.machine.state.state !== "idle")
    return `Machine is ${s.machine.state.state}.`
  return ""
}
export function temperaturePatch(workflow: Workflow, value: number) {
  const profile = workflow.profile
  if (!profile || !finite(value) || value < 60 || value > 98)
    throw new Error("Invalid brew temperature")
  const offset = value - profile.steps[0].temperature
  if (
    profile.steps.some(
      (s) => s.temperature + offset < 0 || s.temperature + offset > 100
    )
  )
    throw new Error(
      "This temperature would put a profile step outside its supported range."
    )
  return {
    profile: {
      ...profile,
      steps: profile.steps.map((s) => ({
        ...s,
        temperature: s.temperature + offset,
      })),
    },
  }
}
export function previewSamples(profile: Profile | null): ShotSample[] {
  let elapsed = 0
  return (
    profile?.steps.flatMap((step) => {
      const point = {
        pressure: finite(step.pressure) ? step.pressure : null,
        flow: finite(step.flow) ? step.flow : null,
        temperature: step.temperature,
        weight: null,
      }
      const start = { ...point, elapsed }
      elapsed += Math.max(0, step.seconds)
      return [start, { ...point, elapsed }]
    }) ?? []
  )
}

export function parseProfileRecord(value: unknown): ProfileRecord {
  const record = object(value)
  if (typeof record.id !== "string" || !record.id)
    throw new Error("Invalid profile identifier")
  if (
    record.visibility !== undefined &&
    !["visible", "hidden", "deleted"].includes(String(record.visibility))
  )
    throw new Error("Invalid profile visibility")
  return {
    ...record,
    id: record.id,
    profile: restoreExtensions(
      parseProfile(record.profile),
      (record.metadata as Record<string, unknown> | null)?.focusExtensions
    ),
  } as ProfileRecord
}

export function normalizeFavorites(value: unknown): {
  slots: FavoriteSlots
  issue: string
} {
  if (
    !Array.isArray(value) ||
    value.some((id) => id !== null && (typeof id !== "string" || !id))
  )
    throw new Error(
      "Stored favorites are malformed. Retry reading them or explicitly replace them in Manage favorites."
    )
  const seen = new Set<string>()
  let issue =
    value.length > 5
      ? "Only the first five positions can be used. Review and Save to correct the stored list."
      : ""
  const slots = Array.from({ length: 5 }, (_, index) => {
    const id = value[index] ?? null
    if (id === null) return null
    if (seen.has(id)) {
      issue =
        "Duplicate assignments were cleared after their first occurrence. Review and Save to correct them."
      return null
    }
    seen.add(id)
    return id as string
  })
  return { slots, issue }
}

export function assignFavorite(
  slots: FavoriteSlots,
  index: number,
  id: string
): FavoriteSlots {
  const next = [...slots]
  const previous = next.indexOf(id)
  if (previous !== -1) next[previous] = next[index]
  next[index] = id
  return next
}

// Compare all fields, independent of object key order. Titles alone never establish identity.
export function profileFingerprint(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(profileFingerprint).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${profileFingerprint(v)}`)
      .join(",")}}`
  return JSON.stringify(value) ?? "null"
}

export function activeProfileId(
  profile: Profile | null,
  records: ProfileRecord[],
  explicitId?: unknown
): string | null {
  if (!profile) return null
  if (typeof explicitId === "string") {
    const record = records.find((p) => p.id === explicitId)
    if (
      record &&
      record.profile.title === profile.title &&
      profile.steps.length === record.profile.steps.length
    ) {
      const offset =
        profile.steps[0].temperature - record.profile.steps[0].temperature
      const adjusted = {
        ...record.profile,
        steps: record.profile.steps.map((step) => ({
          ...step,
          temperature: step.temperature + offset,
        })),
      }
      if (executableKey(adjusted) === executableKey(profile)) return record.id
    }
  }
  const fingerprint = profileFingerprint(profile)
  const matches = records.filter(
    (record) => profileFingerprint(record.profile) === fingerprint
  )
  return matches.length === 1 ? matches[0].id : null
}
