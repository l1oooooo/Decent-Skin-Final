import { useFeedback } from "./notifications/feedback"
import { useRef, useState } from "react"
import type { DecaidGateway } from "@/gateway/client"
import type { Profile, ProfileRecord } from "@/gateway/types"
import { newProfile, validateProfile } from "@/gateway/profile-data"
import type { ProfileSave } from "@/gateway/recipes"

export function useRecipeEditor(gateway: DecaidGateway) {
  const [source, setSource] = useState<ProfileRecord | null>(null)
  const [draft, setDraft] = useState<Profile | null>(null)
  const [baseline, setBaseline] = useState("")
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const origin = useRef<string | null | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const feedback = useFeedback("Updating profile")
  const { message, setMessage } = feedback
  const [pending, setPending] = useState<ProfileSave | null>(null)
  const [lineage, setLineage] = useState<ProfileRecord[]>([])
  const [json, setJson] = useState<string | null>(null)
  const dirty = !!draft && (JSON.stringify(draft) !== baseline || json !== null)
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    feedback.begin(undefined, true)
    setBusy(true)
    setMessage("")
    try {
      await action()
    } catch (error) {
      feedback.setError(
        error instanceof Error ? error.message : "Request failed."
      )
    } finally {
      lock.current = false
      feedback.end()
      setBusy(false)
    }
  }
  function open(record: ProfileRecord | null) {
    if (
      (origin.current === (record?.id ?? null) ||
        (source && record && source.id === record.id)) &&
      draft
    ) {
      origin.current = record?.id ?? null
      return
    }
    origin.current = record?.id ?? null
    const next = structuredClone(record?.profile ?? newProfile())
    setSource(record)
    setDraft(next)
    setBaseline(JSON.stringify(next))
    setErrors({})
    setMessage("")
    setJson(null)
    setLineage([])
    void run(async () => {
      setPending(await gateway.recipes.pending())
      if (record) setLineage(await gateway.recipes.lineage(record.id))
    })
  }
  function change(value: Profile) {
    setDraft(value)
    setErrors({})
  }
  function cancel() {
    if (baseline) setDraft(JSON.parse(baseline))
    setJson(null)
    setErrors({})
    setMessage("")
  }
  async function refreshLineage(id: string) {
    try {
      setLineage(await gateway.recipes.lineage(id))
    } catch {
      setLineage([])
      setMessage(
        "Profile saved. Lineage could not be refreshed; reopen this record to retry."
      )
    }
  }
  async function save(mode: "update" | "new") {
    if (!draft || json !== null) return
    const errors = validateProfile(draft)
    setErrors(errors)
    if (Object.keys(errors).length) {
      setMessage("Correct the marked fields before saving.", "warning")
      return
    }
    const submitted = draft
    await run(async () => {
      const result = await gateway.recipes.save(source, submitted, mode)
      setPending(result.pending)
      setMessage(result.message, result.pending ? "warning" : "success")
      if (result.record && !result.pending) {
        setSource(result.record)
        setBaseline(JSON.stringify(result.record.profile))
        setDraft((current) =>
          current === submitted ? result.record!.profile : current
        )
        await refreshLineage(result.record.id)
      }
    })
  }
  async function retry() {
    await run(async () => {
      const result = await gateway.recipes.retry()
      setPending(result.pending)
      setMessage(result.message, result.pending ? "warning" : "success")
      if (result.record && !result.pending) {
        setSource(result.record)
        setBaseline(JSON.stringify(result.record.profile))
        setDraft(result.record.profile)
        setJson(null)
        await refreshLineage(result.record.id)
      }
    })
  }
  function applyJson() {
    if (json === null) return
    try {
      const value = JSON.parse(json) as Profile
      const errors = validateProfile(value)
      setErrors(errors)
      if (Object.keys(errors).length) {
        setMessage(
          "Correct the structured profile before applying it.",
          "warning"
        )
        return
      }
      setDraft(value)
      setJson(null)
      setMessage(
        "Structured changes applied to the draft. Save to persist them."
      )
    } catch {
      setMessage("Enter a valid profile JSON object.", "error")
    }
  }
  async function cancelPending() {
    await run(async () => {
      await gateway.recipes.cancelUnsubmittedSave()
      setPending(null)
      setMessage(
        "Recovery record cleared. Review the library before saving again; a timed-out request may have completed separately."
      )
    })
  }
  async function recover() {
    await run(async () => {
      setPending(await gateway.recipes.pending())
      setMessage(
        "This profile ID is unavailable. Use recovery if a save changed its ID, or return to the library."
      )
    })
  }
  return {
    recover,
    cancelPending,
    source,
    draft,
    busy,
    errors,
    message,
    pending,
    lineage,
    json,
    dirty,
    open,
    change,
    cancel,
    save,
    retry,
    setJson,
    applyJson,
  }
}
export type RecipeEditor = ReturnType<typeof useRecipeEditor>
