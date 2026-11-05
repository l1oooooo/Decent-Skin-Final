import type { DecaidGateway } from "./client"
import { finite, object, parseProfile } from "./model"
import { validateProfile } from "./profile-data"
import type { Profile, ShotSample, Workflow } from "./types"

export interface HistoryRecord extends Record<string, unknown> {
  id: string
  timestamp?: string
  workflow?: Record<string, unknown>
  annotations?: Record<string, unknown> | null
  stopReason?: string | null
  measurements?: unknown[]
}
export interface HistoryFilters {
  search: string
  profileTitle: string
  coffeeName: string
  coffeeRoaster: string
  grinderModel: string
  order: "desc" | "asc"
}
export const emptyHistoryFilters: HistoryFilters = {
  search: "",
  profileTitle: "",
  coffeeName: "",
  coffeeRoaster: "",
  grinderModel: "",
  order: "desc",
}
export const annotationFields = [
  ["actualDoseWeight", "Actual dose (g)", 1000],
  ["actualYield", "Actual yield (g)", 10000],
  ["drinkTds", "TDS (%)", 100],
  ["drinkEy", "Extraction yield (%)", 100],
  ["enjoyment", "Enjoyment (0–10)", 10],
] as const
export type AnnotationKey =
  (typeof annotationFields)[number][0] | "espressoNotes"
export type AnnotationDraft = Record<AnnotationKey, string>
export function historyRecord(raw: unknown): HistoryRecord {
  const r = object(raw)
  if (typeof r.id !== "string" || !r.id)
    throw new Error("Shot record has no identifier.")
  return r as HistoryRecord
}
export function recordObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
}
export function recordContext(record: HistoryRecord) {
  return recordObject(recordObject(record.workflow).context)
}
export function recordTitle(record: HistoryRecord) {
  const p = recordObject(recordObject(record.workflow).profile)
  return typeof p.title === "string" && p.title
    ? p.title
    : "Unnamed recorded recipe"
}
export function annotations(record: HistoryRecord): Record<string, unknown> {
  if (Object.hasOwn(record, "annotations"))
    return recordObject(record.annotations)
  return {
    espressoNotes:
      typeof record.shotNotes === "string" ? record.shotNotes : undefined,
  }
}
export function annotationDraft(record: HistoryRecord): AnnotationDraft {
  const data = annotations(record)
  return Object.fromEntries([
    ...annotationFields.map(([key]) => [
      key,
      finite(data[key]) ? String(data[key]) : "",
    ]),
    [
      "espressoNotes",
      typeof data.espressoNotes === "string" ? data.espressoNotes : "",
    ],
  ]) as AnnotationDraft
}
export function annotationPatch(base: AnnotationDraft, draft: AnnotationDraft) {
  const patch: Partial<Record<AnnotationKey, number | string | null>> = {}
  const errors: Partial<Record<AnnotationKey, string>> = {}
  for (const [key, label, max] of annotationFields) {
    if (base[key] === draft[key]) continue
    const value = draft[key].trim() === "" ? null : Number(draft[key])
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > max))
      errors[key] = `${label}: enter 0–${max}, or leave blank.`
    else patch[key] = value
  }
  if (base.espressoNotes !== draft.espressoNotes)
    patch.espressoNotes = draft.espressoNotes
  return { patch, errors }
}
export function recordedTrace(record: HistoryRecord) {
  const measurements = Array.isArray(record.measurements)
    ? record.measurements
    : []
  const samples: ShotSample[] = []
  let start: number | null = null,
    previous = -1,
    invalid = 0
  for (const raw of measurements) {
    const row = recordObject(raw),
      machine = recordObject(row.machine),
      scale = recordObject(row.scale)
    const time =
      typeof machine.timestamp === "string"
        ? Date.parse(machine.timestamp)
        : NaN
    if (
      !Number.isFinite(time) ||
      (start !== null && time < start + previous * 1000)
    ) {
      invalid++
      if (samples.length)
        samples.push({
          elapsed: previous,
          pressure: null,
          flow: null,
          temperature: null,
          weight: null,
        })
      continue
    }
    start ??= time
    const elapsed = (time - start) / 1000
    previous = elapsed
    samples.push({
      elapsed,
      pressure: finite(machine.pressure) ? machine.pressure : null,
      flow: finite(machine.flow) ? machine.flow : null,
      temperature: finite(machine.mixTemperature)
        ? machine.mixTemperature
        : null,
      weight: finite(scale.weight) ? scale.weight : null,
    })
  }
  return {
    samples,
    invalid,
    span: samples.length > 1 ? samples.at(-1)!.elapsed : null,
    finalWeight: samples.findLast((s) => s.weight !== null)?.weight ?? null,
  }
}
export function repeatPatch(record: HistoryRecord): Partial<Workflow> {
  const workflow = recordObject(record.workflow)
  let profile: Profile
  try {
    profile = parseProfile(workflow.profile)
  } catch {
    throw new Error("This shot has no complete executable recipe to repeat.")
  }
  if (Object.keys(validateProfile(profile)).length)
    throw new Error(
      "This recorded profile has incomplete or unsupported stages. Review it in the profile editor before repeating."
    )
  const recorded = recordContext(record)
  const target = finite(recorded.targetYield)
    ? recorded.targetYield
    : profile.target_weight
  if (!finite(target) || target <= 0)
    throw new Error(
      "The recorded recipe has no usable target yield. Choose a recipe from the library instead."
    )
  const clear = Object.fromEntries(
    "targetDoseWeight targetWaterVolume grinderId grinderModel grinderBurrs grinderSetting beanBatchId coffeeName coffeeRoaster finalBeverageType baristaName drinkerName"
      .split(" ")
      .map((key) => [key, null])
  )
  return {
    profile: structuredClone(profile),
    context: {
      ...clear,
      ...recorded,
      targetYield: target,
      extras: {
        ...recordObject(recorded.extras),
        focusProfileId: recordObject(recorded.extras).focusProfileId ?? null,
      },
    },
  }
}
export class ShotHistoryGateway {
  private gateway: DecaidGateway
  constructor(gateway: DecaidGateway) {
    this.gateway = gateway
  }
  async list(filters: HistoryFilters, offset = 0) {
    const query = new URLSearchParams({
      limit: "20",
      offset: String(Math.max(0, offset)),
      order: filters.order,
    })
    for (const [key, value] of Object.entries(filters))
      if (key !== "order" && value.trim()) query.set(key, value.trim())
    const data = object(await this.gateway.request(`/api/v1/shots?${query}`))
    if (
      !Array.isArray(data.items) ||
      !Number.isInteger(data.total) ||
      Number(data.total) < 0
    )
      throw new Error("Invalid shot history response.")
    return {
      items: data.items.map(historyRecord),
      total: Number(data.total),
      offset,
    }
  }
  async get(id: string) {
    const record = historyRecord(
      await this.gateway.request(`/api/v1/shots/${encodeURIComponent(id)}`)
    )
    if (record.id !== id)
      throw new Error("The returned shot does not match the requested record.")
    return record
  }
  async save(
    id: string,
    patch: Partial<Record<AnnotationKey, number | string | null>>
  ) {
    for (const key of Object.keys(patch))
      if (![...annotationFields.map(([k]) => k), "espressoNotes"].includes(key))
        throw new Error("Only canonical shot annotations can be edited.")
    for (const [key, , max] of annotationFields)
      if (
        patch[key] != null &&
        (!finite(patch[key]) ||
          Number(patch[key]) < 0 ||
          Number(patch[key]) > max)
      )
        throw new Error(`Invalid ${key}.`)
    if (
      patch.espressoNotes !== undefined &&
      typeof patch.espressoNotes !== "string"
    )
      throw new Error("Notes must be text; use an empty string to clear them.")
    return this.gateway.settingsOperation(async (verify) => {
      verify()
      const result = historyRecord(
        await this.gateway.request(
          `/api/v1/shots/${encodeURIComponent(id)}`,
          "PUT",
          { annotations: patch }
        )
      )
      if (result.id !== id)
        throw new Error(
          "Save acknowledgement did not match this shot. Refresh before retrying."
        )
      return result
    })
  }
  async repeat(id: string) {
    const before = this.gateway.getSnapshot().workflow
    const patch = repeatPatch(await this.get(id))
    if (this.gateway.getSnapshot().workflow !== before)
      throw new Error(
        "The current recipe changed. Review it before repeating this shot."
      )
    await this.gateway.updateWorkflow(patch)
  }
  async remove(id: string) {
    return this.gateway.settingsOperation(async (verify) => {
      verify()
      const result = object(
        await this.gateway.request(
          `/api/v1/shots/${encodeURIComponent(id)}`,
          "DELETE"
        )
      )
      if (result.success !== true || result.id !== id)
        throw new Error(
          "Deletion was not fully acknowledged. Refresh history before retrying."
        )
    })
  }
  async exportRecords(ids: string[]) {
    const records: HistoryRecord[] = []
    for (const id of [...new Set(ids)]) records.push(await this.get(id))
    return records
  }
}
