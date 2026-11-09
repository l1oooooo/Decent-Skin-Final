import type { DecaidGateway } from "./client"
import {
  object,
  parseProfileRecord,
  profileFingerprint,
  normalizeFavorites,
  temperaturePatch,
  commandBlock,
  activeProfileId,
} from "./model"
import {
  executableKey,
  profileExtensions,
  validateProfile,
} from "./profile-data"
import type { Profile, ProfileRecord, Workflow } from "./types"

const store = "/api/v1/store/decent-skin-codex/"
export interface RecipePreference {
  targetDoseWeight?: number
  targetYield?: number
  grinderSetting?: string
  temperature?: number
  [key: string]: unknown
}
export const defaultDoseWeight = 18
export function recipeDose(
  preference: RecipePreference | undefined,
  record: ProfileRecord | undefined
) {
  if (preference?.targetDoseWeight !== undefined)
    return { value: preference.targetDoseWeight, source: "profile" as const }
  const saved = record?.metadata?.targetDoseWeight
  if (
    typeof saved === "number" &&
    Number.isFinite(saved) &&
    saved > 0 &&
    saved <= 100
  )
    return { value: saved, source: "profile" as const }
  return { value: defaultDoseWeight, source: "default" as const }
}
export interface ProfileSave {
  operation: string
  sourceId: string | null
  mode: "update" | "new"
  payload: {
    profile: Profile
    metadata: Record<string, unknown>
    parentId?: string
  }
  savedId?: string
}
export interface SaveOutcome {
  record: ProfileRecord | null
  pending: ProfileSave | null
  message: string
}
export type InventoryKind = "beans" | "bean-batches" | "grinders"
export interface InventoryRecord extends Record<string, unknown> {
  id: string
  name?: string
  model?: string
  roaster?: string
  beanId?: string
  archived?: boolean
}
export type Inventory = Record<InventoryKind, InventoryRecord[]>
function inventoryRecord(value: unknown): InventoryRecord {
  const record = object(value)
  if (typeof record.id !== "string" || !record.id)
    throw new Error("Inventory record has no ID.")
  return record as InventoryRecord
}
export function validatePreference(value: unknown): RecipePreference {
  const p = object(value)
  for (const [key, max] of [
    ["targetDoseWeight", 100],
    ["targetYield", 1000],
    ["temperature", 98],
  ] as const) {
    const value = p[key]
    if (
      value !== undefined &&
      (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < (key === "temperature" ? 60 : 0) ||
        value > max)
    )
      throw new Error(`Invalid ${key}.`)
  }
  if (p.grinderSetting !== undefined && typeof p.grinderSetting !== "string")
    throw new Error("Grind setting must be text.")
  return p
}
export const numericGrindRange = { min: 0, max: 50, step: 0.1 } as const

export class RecipeGateway {
  private gateway: DecaidGateway
  constructor(gateway: DecaidGateway) {
    this.gateway = gateway
  }
  async readStore(key: string): Promise<unknown | null> {
    try {
      return await this.gateway.request(store + key)
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("404:"))
        return null
      throw error
    }
  }
  async preferences(): Promise<Record<string, RecipePreference>> {
    const value = await this.gateway.readStored("recipes")
    if (value === undefined) return {}
    if (value === null || Array.isArray(value) || typeof value !== "object")
      throw new Error(
        "Stored recipe preferences are invalid. Nothing was saved."
      )
    const map = object(value)
    Object.values(map).forEach(validatePreference)
    return map as Record<string, RecipePreference>
  }
  async streamlinePreference(id: string): Promise<RecipePreference> {
    const record = parseProfileRecord(
      await this.gateway.request(`/api/v1/profiles/${encodeURIComponent(id)}`)
    )
    if (record.id !== id)
      throw new Error("The requested profile changed. Reopen its preferences.")
    let saved: unknown = null
    let absent = false
    try {
      saved = await this.gateway.request(
        `/api/v1/store/streamlineProfileOverrides/${encodeURIComponent(id)}`
      )
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith("404:")))
        throw error
      absent = true
    }
    if (saved === null && !absent) {
      const keys = await this.gateway.request(
        "/api/v1/store/streamlineProfileOverrides"
      )
      if (
        !Array.isArray(keys) ||
        !keys.every((key) => typeof key === "string") ||
        keys.some((key) => key === id || key === encodeURIComponent(id))
      )
        throw new Error(
          "Streamline settings are unavailable or invalid. Nothing was copied."
        )
    }
    if (saved !== null && (typeof saved !== "object" || Array.isArray(saved)))
      throw new Error("Invalid Streamline settings. Nothing was copied.")
    const fields = { ...record.metadata, ...object(saved ?? {}) }
    const preference: RecipePreference = {}
    for (const [source, target] of [
      ["targetDoseWeight", "targetDoseWeight"],
      ["targetYield", "targetYield"],
      ["grinderSetting", "grinderSetting"],
      ["brewTemperature", "temperature"],
    ]) {
      if (fields[source] !== undefined && fields[source] !== null)
        preference[target] = fields[source]
    }
    validatePreference(preference)
    if (!Object.keys(preference).length)
      throw new Error(
        "No saved Streamline Home adjustments were found for this profile."
      )
    return preference
  }
  async savePreference(id: string, preference: RecipePreference) {
    validatePreference(preference)
    return this.gateway.settingsOperation(async (verify) => {
      const map = await this.preferences()
      verify()
      await this.gateway.request(store + "recipes", "POST", {
        ...map,
        [id]: preference,
      })
    })
  }
  async adjust(
    id: string | null,
    key: "targetDoseWeight" | "targetYield" | "temperature" | "grinderSetting",
    value: number | string
  ) {
    const snapshot = this.gateway.getSnapshot()
    const before = snapshot.workflow
    const record = snapshot.profiles.find((p) => p.id === id)
    const matched = activeProfileId(
      before?.profile ?? null,
      snapshot.profiles,
      before?.context?.extras && object(before.context.extras).focusProfileId
    )
    if (!id || !record || !before?.profile || matched !== id)
      throw new Error(
        "Load a profile from the library before saving profile adjustments."
      )
    if (key === "grinderSetting" && typeof value === "string" && value.trim()) {
      const numeric = Number(value)
      if (
        !Number.isNaN(numeric) &&
        (!Number.isFinite(numeric) ||
          numeric < numericGrindRange.min ||
          numeric > numericGrindRange.max)
      )
        throw new Error("Grind size must be from 0 to 50.")
    }
    const patch = validatePreference({ [key]: value })
    const recordKey = profileFingerprint(record)
    await this.gateway.workflowOperation(async (verify, update) => {
      const map = await this.preferences()
      verify()
      if (
        profileFingerprint(
          this.gateway.getSnapshot().profiles.find((p) => p.id === id)
        ) !== recordKey
      )
        throw new Error(
          "The stored profile changed. Reload it before saving adjustments."
        )
      const dose = recipeDose(map[id], record)
      const context: Workflow["context"] = {
        ...before.context,
        targetDoseWeight: before.context?.targetDoseWeight ?? dose.value,
        extras: {
          ...object(before.context?.extras ?? {}),
          focusProfileId: id,
          ...(key === "targetDoseWeight"
            ? { focusDoseSource: "current" }
            : before.context?.targetDoseWeight == null
              ? { focusDoseSource: dose.source }
              : {}),
        },
        ...(key !== "temperature" ? { [key]: value } : {}),
      }
      await update({
        ...(key === "temperature"
          ? temperaturePatch(before, Number(value))
          : {}),
        context,
      })
      try {
        verify()
        await this.gateway.request(store + "recipes", "POST", {
          ...map,
          [id]: { ...map[id], ...patch },
        })
        verify()
      } catch (error) {
        throw new Error(
          `Current recipe updated, but saving this profile adjustment could not be confirmed. Retry explicitly before switching profiles. ${error instanceof Error ? error.message : ""}`,
          { cause: error }
        )
      }
    })
  }
  async load(id: string) {
    const record = this.gateway.getSnapshot().profiles.find((p) => p.id === id)
    if (
      !record ||
      record.visibility === "hidden" ||
      record.visibility === "deleted"
    )
      throw new Error("This profile is unavailable.")
    const weightTarget = record.profile.target_weight
    if (
      weightTarget != null &&
      (!Number.isFinite(weightTarget) || weightTarget < 0)
    )
      throw new Error("The profile has an invalid weight target.")
    const block = commandBlock(this.gateway.getSnapshot())
    if (block) throw new Error(block)
    const before = this.gateway.getSnapshot().workflow
    const beforeKey = profileFingerprint(before)
    const p = (await this.preferences())[id]
    const dose = recipeDose(p, record)
    if (profileFingerprint(this.gateway.getSnapshot().workflow) !== beforeKey)
      throw new Error(
        "The recipe changed while loading preferences. Try again."
      )
    const profile =
      p?.temperature === undefined
        ? record.profile
        : temperaturePatch({ profile: record.profile }, p.temperature).profile
    const context: Workflow["context"] = {
      ...before?.context,
      extras: {
        ...((before?.context?.extras as Record<string, unknown>) ?? {}),
        focusProfileId: id,
        focusDoseSource: dose.source,
      },
    }
    // Zero disables the workflow weight target; never inherit another profile's yield.
    context.targetYield = weightTarget ?? 0
    context.targetDoseWeight = dose.value
    for (const key of [
      "targetDoseWeight",
      "targetYield",
      "grinderSetting",
    ] as const)
      if (p?.[key] !== undefined) Object.assign(context, { [key]: p[key] })
    await this.gateway.updateWorkflow({ profile, context })
  }
  async lineage(id: string) {
    const data = await this.gateway.request(
      `/api/v1/profiles/${encodeURIComponent(id)}/lineage`
    )
    if (!Array.isArray(data)) throw new Error("Invalid profile lineage.")
    return data.map(parseProfileRecord)
  }
  async pending(): Promise<ProfileSave | null> {
    const data = await this.readStore("profile-save")
    if (data === null) return null
    const p = object(data)
    if (
      typeof p.operation !== "string" ||
      !["new", "update"].includes(String(p.mode)) ||
      !(p.sourceId === null || typeof p.sourceId === "string") ||
      !p.payload
    )
      throw new Error(
        "The profile recovery record is invalid. Export your data before repairing it in Decaid."
      )
    const payload = object(p.payload)
    if (
      !payload.profile ||
      !payload.metadata ||
      Object.keys(validateProfile(payload.profile as Profile)).length
    )
      throw new Error("The recovery profile is invalid.")
    return p as unknown as ProfileSave
  }
  async save(
    source: ProfileRecord | null,
    profile: Profile,
    mode: "update" | "new"
  ): Promise<SaveOutcome> {
    if (Object.keys(validateProfile(profile)).length)
      throw new Error("Correct the profile fields before saving.")
    if (mode === "update" && (!source || source.isDefault))
      throw new Error("Default profiles require Save as new.")
    const journal: ProfileSave = {
      operation: crypto.randomUUID(),
      sourceId: source?.id ?? null,
      mode,
      payload: {
        profile,
        ...(source ? { parentId: source.id } : {}),
        metadata: {
          ...source?.metadata,
          focusExtensions: profileExtensions(profile),
          ...(mode === "update" && source
            ? { focusPrevious: { id: source.id, profile: source.profile } }
            : {}),
        },
      },
    }
    journal.payload.metadata.focusOperation = journal.operation
    return this.gateway.settingsOperation(async (verify) => {
      if (await this.pending())
        throw new Error(
          "Finish the pending profile save before saving another profile."
        )
      const records = await this.gateway.request(
        "/api/v1/profiles?includeHidden=true"
      )
      if (!Array.isArray(records)) throw new Error("Invalid profile library.")
      const duplicate = records
        .map(parseProfileRecord)
        .find(
          (p) =>
            (mode === "new" || p.id !== source?.id) &&
            executableKey(p.profile) === executableKey(profile)
        )
      if (duplicate)
        throw new Error(
          `Decaid already has this executable recipe: ${duplicate.profile.title} (${duplicate.id}). Change a stage or target to create a distinct recipe; renaming alone does not create a new ID.`
        )
      if (source) {
        const current = parseProfileRecord(
          await this.gateway.request(
            `/api/v1/profiles/${encodeURIComponent(source.id)}`
          )
        )
        if (
          profileFingerprint(current.profile) !==
          profileFingerprint(source.profile)
        )
          throw new Error(
            "The source profile changed. Reload it before saving."
          )
      }
      verify()
      await this.gateway.request(store + "profile-save", "POST", journal)
      return this.finish(journal, verify)
    })
  }
  async cancelUnsubmittedSave() {
    await this.gateway.settingsOperation(async (verify) => {
      const pending = await this.pending()
      if (!pending) return
      const list = await this.gateway.request(
        "/api/v1/profiles?includeHidden=true"
      )
      if (!Array.isArray(list)) throw new Error("Invalid profile library.")
      if (
        pending.savedId ||
        list
          .map(parseProfileRecord)
          .some((p) => p.metadata?.focusOperation === pending.operation)
      )
        throw new Error(
          "The profile was saved. Complete its reference updates with Retry pending save."
        )
      verify()
      await this.gateway.request(store + "profile-save", "DELETE")
    })
  }
  async retry(): Promise<SaveOutcome> {
    return this.gateway.settingsOperation(async (verify) => {
      const pending = await this.pending()
      if (!pending) throw new Error("There is no pending profile save.")
      return this.finish(pending, verify)
    })
  }
  private async finish(
    journal: ProfileSave,
    verify: () => void
  ): Promise<SaveOutcome> {
    let record: ProfileRecord | null = null
    try {
      const list = await this.gateway.request(
        "/api/v1/profiles?includeHidden=true"
      )
      if (!Array.isArray(list)) throw new Error("Invalid profile library.")
      record =
        list
          .map(parseProfileRecord)
          .find(
            (p) =>
              p.id === journal.savedId ||
              p.metadata?.focusOperation === journal.operation
          ) ?? null
      if (!record && journal.savedId)
        throw new Error(
          "The saved profile is no longer available. References were left unchanged."
        )
      if (!record) {
        verify()
        record = parseProfileRecord(
          await this.gateway.request(
            journal.mode === "update"
              ? `/api/v1/profiles/${encodeURIComponent(journal.sourceId!)}`
              : "/api/v1/profiles",
            journal.mode === "update" ? "PUT" : "POST",
            journal.payload
          )
        )
        journal = { ...journal, savedId: record.id }
        await this.gateway.request(store + "profile-save", "POST", journal)
      }
      this.gateway.acceptProfile(
        record,
        journal.mode === "update" ? journal.sourceId : null
      )
      if (
        journal.mode === "update" &&
        journal.sourceId &&
        journal.sourceId !== record.id
      ) {
        const raw = await this.readStore("favorites")
        const normalized = raw === null ? null : normalizeFavorites(raw)
        if (normalized?.issue)
          throw new Error(
            `Favorites need review before remapping: ${normalized.issue}`
          )
        const favorites =
          normalized?.slots ?? this.gateway.getSnapshot().favorites
        const next = favorites.map((id) =>
          id === journal.sourceId ? record!.id : id
        )
        const seen = new Set<string>()
        const unique = next.map((id) => {
          if (id === null || seen.has(id)) return null
          seen.add(id)
          return id
        })
        verify()
        await this.gateway.saveFavorites(unique)
        const recipes = await this.preferences()
        if (recipes[journal.sourceId]) {
          const updated = { ...recipes, [record.id]: recipes[journal.sourceId] }
          delete updated[journal.sourceId]
          verify()
          await this.gateway.request(store + "recipes", "POST", updated)
        }
      }
      verify()
      await this.gateway.request(store + "profile-save", "DELETE")
      return {
        record,
        pending: null,
        message:
          "Profile saved. The active recipe is unchanged until you load it.",
      }
    } catch (error) {
      return {
        record,
        pending: journal,
        message: `${record ? "Profile saved; reference updates are incomplete." : "Profile save was not fully acknowledged."} ${error instanceof Error ? error.message : "Request failed."} Use Retry pending save; it checks for the saved record before writing again.`,
      }
    }
  }
  async inventory(): Promise<Inventory> {
    const entries = await Promise.all(
      (["beans", "bean-batches", "grinders"] as const).map(async (kind) => {
        const list = await this.gateway.request(
          `/api/v1/${kind}?includeArchived=true`
        )
        if (!Array.isArray(list)) throw new Error(`Invalid ${kind} list.`)
        return [kind, list.map(inventoryRecord)] as const
      })
    )
    return Object.fromEntries(entries) as Inventory
  }
  async saveInventory(
    kind: InventoryKind,
    id: string | null,
    patch: Record<string, unknown>,
    beanId?: string
  ) {
    if (!id && kind === "bean-batches" && !beanId)
      throw new Error("Choose a bean before creating a batch.")
    patch = validateInventoryPatch(kind, patch)
    return this.gateway.settingsOperation(async (verify) => {
      verify()
      const path = id
        ? `${kind}/${encodeURIComponent(id)}`
        : kind === "bean-batches"
          ? `beans/${encodeURIComponent(beanId!)}/batches`
          : kind
      return inventoryRecord(
        await this.gateway.request(
          `/api/v1/${path}`,
          id ? "PUT" : "POST",
          patch
        )
      )
    })
  }
  async assignInventory(kind: "bean-batches" | "grinders", id: string | null) {
    const before = this.gateway.getSnapshot().workflow
    const beforeKey = profileFingerprint(before)
    let context: Workflow["context"]
    if (id === null)
      context =
        kind === "bean-batches"
          ? { beanBatchId: null, coffeeName: null, coffeeRoaster: null }
          : { grinderId: null, grinderModel: null, grinderBurrs: null }
    else {
      const record = inventoryRecord(
        await this.gateway.request(`/api/v1/${kind}/${encodeURIComponent(id)}`)
      )
      if (record.archived)
        throw new Error("Restore this record before selecting it.")
      if (kind === "bean-batches") {
        const bean = inventoryRecord(
          await this.gateway.request(
            `/api/v1/beans/${encodeURIComponent(String(record.beanId))}`
          )
        )
        if (bean.archived)
          throw new Error("Restore the bean before selecting its batch.")
        context = {
          beanBatchId: id,
          coffeeName: bean.name,
          coffeeRoaster: bean.roaster,
        }
      } else
        context = {
          grinderId: id,
          grinderModel: record.model,
          grinderBurrs: record.burrs ?? null,
        }
    }
    if (profileFingerprint(this.gateway.getSnapshot().workflow) !== beforeKey)
      throw new Error(
        "The active recipe changed. Review it before selecting this record."
      )
    await this.gateway.updateWorkflow({
      context: { ...before?.context, ...context },
    })
  }
}

export function validateInventoryPatch(
  kind: InventoryKind,
  patch: Record<string, unknown>
) {
  const result = { ...patch }
  for (const key of ["variety", "altitude", "settingValues"])
    if (typeof result[key] === "string")
      result[key] = (result[key] as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((v) => (key === "altitude" ? Number(v) : v))
  if (
    result.altitude != null &&
    (!Array.isArray(result.altitude) ||
      result.altitude.some((v) => !Number.isInteger(v) || v < 0))
  )
    throw new Error("Altitude must contain nonnegative whole metres.")
  for (const key of [
    "weight",
    "weightRemaining",
    "price",
    "qualityScore",
    "burrSize",
    "settingSmallStep",
    "settingBigStep",
    "rpmSmallStep",
    "rpmBigStep",
  ]) {
    const value = result[key]
    if (
      value != null &&
      (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        (key === "qualityScore" && value > 100))
    )
      throw new Error(
        `Invalid ${key}. Use a nonnegative number${key === "qualityScore" ? " up to 100" : ""}.`
      )
  }
  for (const key of kind === "beans"
    ? ["name", "roaster"]
    : kind === "grinders"
      ? ["model"]
      : [])
    if (
      key in result &&
      (typeof result[key] !== "string" || !String(result[key]).trim())
    )
      throw new Error(`Enter ${key}.`)
  return result
}
