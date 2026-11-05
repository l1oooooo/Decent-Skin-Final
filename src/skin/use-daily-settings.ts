import { useCallback, useRef, useState } from "react"
import type { DecaidGateway } from "@/gateway/client"
import {
  fieldPatch,
  fields,
  getField,
  ownerLabels,
  validateField,
  type SettingsCategory,
  type SettingsOwner,
  type SettingsRecord,
  type WakeSchedule,
} from "@/gateway/daily-settings"

interface Section {
  value?: SettingsRecord
  machineId?: string
  edits: SettingsRecord
  errors: Record<string, string>
  loading: boolean
  saving: boolean
  message: string
  error: string
}
const empty = (): Section => ({
  edits: {},
  errors: {},
  loading: false,
  saving: false,
  message: "",
  error: "",
})
export function useDailySettings(gateway: DecaidGateway) {
  const [sections, setSections] = useState<
    Partial<Record<SettingsOwner, Section>>
  >({})
  const current = useRef(sections)
  const revisions = useRef<Partial<Record<SettingsOwner, number>>>({})
  const pending = useRef(new Set<SettingsOwner>())
  const [scheduleDraft, setScheduleDraft] = useState<WakeSchedule | null>(null)
  function update(owner: SettingsOwner, fn: (s: Section) => Section) {
    const next = {
      ...current.current,
      [owner]: fn(current.current[owner] ?? empty()),
    }
    current.current = next
    setSections(next)
  }
  const load = useCallback(
    async (owner: SettingsOwner) => {
      if (pending.current.has(owner)) return
      const revision = (revisions.current[owner] =
        (revisions.current[owner] ?? 0) + 1)
      update(owner, (s) => ({ ...s, loading: true, error: "" }))
      try {
        const machineId = gateway
          .getSnapshot()
          .devices.find(
            (d) => d.type === "machine" && d.state === "connected"
          )?.id
        const value = await gateway.daily.read(owner)
        const section = current.current[owner]
        if (
          ["workflow", "machine", "advanced"].includes(owner) &&
          section?.value &&
          Object.keys(section.edits).length &&
          machineId !== section.machineId
        )
          throw new Error(
            "The machine changed. Cancel the previous machine draft and refresh before editing."
          )
        if (revisions.current[owner] === revision)
          update(owner, (s) => ({ ...s, value, machineId, error: "" }))
      } catch (error) {
        if (revisions.current[owner] === revision)
          update(owner, (s) => ({
            ...s,
            error:
              error instanceof Error
                ? error.message
                : "Could not load settings",
          }))
      } finally {
        if (revisions.current[owner] === revision)
          update(owner, (s) => ({ ...s, loading: false }))
      }
    },
    [gateway]
  )
  function edit(owner: SettingsOwner, key: string, value: unknown) {
    update(owner, (s) => ({
      ...s,
      edits: { ...s.edits, [key]: value },
      errors: { ...s.errors, [key]: "" },
      message: "",
    }))
  }
  function cancel(owner?: SettingsOwner, category?: SettingsCategory) {
    if (owner)
      update(owner, (s) => ({
        ...s,
        edits: category
          ? Object.fromEntries(
              Object.entries(s.edits).filter(
                ([key]) => !fields[category][owner]?.some((f) => f.key === key)
              )
            )
          : {},
        errors: {},
        message: "",
      }))
    else {
      for (const key of Object.keys(current.current) as SettingsOwner[])
        update(key, (s) => ({ ...s, edits: {}, errors: {}, message: "" }))
      setScheduleDraft(null)
    }
  }
  async function save(
    owner: SettingsOwner,
    category: SettingsCategory,
    bengle = false
  ) {
    if (pending.current.has(owner)) return
    const section = current.current[owner]
    if (!section?.value) return
    if (
      ["workflow", "machine", "advanced"].includes(owner) &&
      section.machineId !==
        gateway
          .getSnapshot()
          .devices.find((d) => d.type === "machine" && d.state === "connected")
          ?.id
    ) {
      update(owner, (s) => ({
        ...s,
        error:
          "The machine changed. Cancel this draft and refresh before saving.",
      }))
      return
    }
    const definitions = fields[category][owner] ?? []
    const sent = Object.fromEntries(
      Object.entries(section.edits).filter(([key]) =>
        definitions.some((f) => f.key === key)
      )
    )
    const parsed: SettingsRecord = {}
    const errors: Record<string, string> = {}
    for (const [key, value] of Object.entries(sent)) {
      const field = definitions.find((f) => f.key === key)
      if (!field) {
        errors[key] = "Unsupported setting."
        continue
      }
      try {
        parsed[key] = validateField(field, value, bengle)
      } catch (error) {
        errors[key] = (error as Error).message
      }
    }
    if (Object.keys(errors).length) {
      update(owner, (s) => ({ ...s, errors }))
      return
    }
    const changed = Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) => getField(section.value!, key) !== value
      )
    )
    if (!Object.keys(changed).length) {
      cancel(owner, category)
      return
    }
    pending.current.add(owner)
    revisions.current[owner] = (revisions.current[owner] ?? 0) + 1
    update(owner, (s) => ({
      ...s,
      saving: true,
      loading: false,
      error: "",
      message: "",
    }))
    try {
      const value = await gateway.daily.save(owner, fieldPatch(changed))
      update(owner, (s) => ({
        ...s,
        value,
        edits: Object.fromEntries(
          Object.entries(s.edits).filter(([key, v]) => v !== sent[key])
        ),
        message: `${ownerLabels[owner]} saved.`,
        error: "",
      }))
    } catch (error) {
      let refreshed: SettingsRecord | undefined
      try {
        refreshed = await gateway.daily.read(owner)
      } catch {
        /* Retain the last acknowledged values when verification also fails. */
      }
      update(owner, (s) => ({
        ...s,
        ...(refreshed ? { value: refreshed } : {}),
        error: `${error instanceof Error ? error.message : "Save failed."} Changes are retained; some values may have applied. Review the refreshed section before retrying.`,
      }))
    } finally {
      pending.current.delete(owner)
      update(owner, (s) => ({ ...s, saving: false }))
    }
  }
  return {
    sections,
    load,
    edit,
    cancel,
    save,
    scheduleDraft,
    setScheduleDraft,
    dirty:
      Object.values(sections).some((s) => Object.keys(s.edits).length > 0) ||
      scheduleDraft !== null,
    saving: Object.values(sections).some((s) => s.saving),
  }
}
export type DailySettingsEditor = ReturnType<typeof useDailySettings>
