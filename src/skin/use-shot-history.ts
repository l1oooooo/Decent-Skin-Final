import { useRef, useState } from "react"
import type { DecaidGateway } from "@/gateway/client"
import {
  annotationDraft,
  annotationPatch,
  emptyHistoryFilters,
  type AnnotationDraft,
  type AnnotationKey,
  type HistoryFilters,
  type HistoryRecord,
} from "@/gateway/shot-history"

export function useShotHistory(gateway: DecaidGateway) {
  const [filters, setFilters] = useState<HistoryFilters>({
    ...emptyHistoryFilters,
  })
  const [applied, setApplied] = useState<HistoryFilters>({
    ...emptyHistoryFilters,
  })
  const [items, setItems] = useState<HistoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState("")
  const listRevision = useRef(0)
  const [record, setRecord] = useState<HistoryRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [draft, setDraft] = useState<AnnotationDraft | null>(null)
  const [base, setBase] = useState<AnnotationDraft | null>(null)
  const [errors, setErrors] = useState<Partial<Record<AnnotationKey, string>>>(
    {}
  )
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const lock = useRef(false),
    detailRevision = useRef(0),
    activeId = useRef<string | null>(null)
  const baseRef = useRef<AnnotationDraft | null>(null)
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(base)
  async function list(next = applied, start = offset) {
    const revision = ++listRevision.current
    setLoading(true)
    setListError("")
    try {
      const result = await gateway.shots.list(next, start)
      if (revision !== listRevision.current) return
      setItems(result.items)
      setTotal(result.total)
      setOffset(start)
      setApplied(next)
      setLoaded(true)
    } catch (error) {
      if (revision === listRevision.current)
        setListError(
          error instanceof Error ? error.message : "Could not read history."
        )
    } finally {
      if (revision === listRevision.current) setLoading(false)
    }
  }
  async function open(id: string, refresh = false) {
    if (activeId.current === id && !refresh && record) {
      setDetailError("")
      return
    }
    const changed = activeId.current !== id
    if (changed && dirty) {
      setDetailError(
        "Save or cancel annotations on the previous shot before opening another."
      )
      return
    }
    activeId.current = id
    const revision = ++detailRevision.current
    if (changed) {
      setRecord(null)
      setDraft(null)
      setBase(null)
      baseRef.current = null
      setErrors({})
      setMessage("")
    }
    setDetailLoading(true)
    setDetailError("")
    try {
      const next = await gateway.shots.get(id)
      if (revision !== detailRevision.current) return
      const nextBase = annotationDraft(next),
        previous = baseRef.current
      setRecord(next)
      setBase(nextBase)
      baseRef.current = nextBase
      setDraft((current) =>
        current && previous
          ? (Object.fromEntries(
              Object.keys(nextBase).map((key) => [
                key,
                current[key as AnnotationKey] === previous[key as AnnotationKey]
                  ? nextBase[key as AnnotationKey]
                  : current[key as AnnotationKey],
              ])
            ) as AnnotationDraft)
          : nextBase
      )
    } catch (error) {
      if (revision === detailRevision.current)
        setDetailError(
          error instanceof Error ? error.message : "Could not read this shot."
        )
    } finally {
      if (revision === detailRevision.current) setDetailLoading(false)
    }
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setMessage("")
    try {
      await action()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.")
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function cancel() {
    setDraft(base)
    setErrors({})
    setMessage("")
  }
  async function save() {
    if (!record || !draft || !base) return
    const { patch, errors } = annotationPatch(base, draft)
    setErrors(errors)
    if (Object.keys(errors).length || !Object.keys(patch).length) return
    const submitted = draft,
      id = record.id
    await run(async () => {
      detailRevision.current++
      setDetailLoading(false)
      const next = await gateway.shots.save(id, patch)
      listRevision.current++
      setLoading(false)
      setItems((current) => current.map((r) => (r.id === id ? next : r)))
      if (activeId.current !== id) return
      const nextBase = annotationDraft(next)
      setRecord(next)
      setBase(nextBase)
      baseRef.current = nextBase
      setDraft((current) =>
        current
          ? (Object.fromEntries(
              Object.keys(nextBase).map((key) => [
                key,
                current[key as AnnotationKey] ===
                submitted[key as AnnotationKey]
                  ? nextBase[key as AnnotationKey]
                  : current[key as AnnotationKey],
              ])
            ) as AnnotationDraft)
          : nextBase
      )
      setMessage("Annotations saved.")
    })
  }
  async function repeat() {
    if (!record || dirty || busy) return false
    let success = false
    await run(async () => {
      await gateway.shots.repeat(record.id)
      success = true
      setMessage("Recorded recipe loaded. Start the shot when ready.")
    })
    return success
  }
  async function remove() {
    if (!record || dirty || busy) return false
    const id = record.id
    let success = false
    await run(async () => {
      await gateway.shots.remove(id)
      detailRevision.current++
      listRevision.current++
      setLoading(false)
      setDetailLoading(false)
      if (activeId.current === id) {
        setRecord(null)
        setDraft(null)
        setBase(null)
        baseRef.current = null
        activeId.current = null
      }
      setItems((current) => current.filter((r) => r.id !== id))
      setLoaded(false)
      setMessage("Shot deleted.")
      success = true
    })
    return success
  }
  async function exportRecords(ids: string[]) {
    await run(async () => {
      const records = await gateway.shots.exportRecords(ids)
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(records, null, 2)], {
          type: "application/json",
        })
      )
      const link = document.createElement("a")
      link.href = url
      link.download =
        ids.length === 1
          ? `focus-shot-${ids[0].replace(/[^a-zA-Z0-9_-]/g, "_")}.json`
          : "focus-history-page.json"
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(
        `Export prepared: ${records.length} saved shot${records.length === 1 ? "" : "s"}. Unsaved annotations are not included.`
      )
    })
  }
  return {
    filters,
    setFilters,
    applied,
    items,
    total,
    offset,
    loaded,
    loading,
    listError,
    list,
    record,
    detailLoading,
    detailError,
    open,
    draft,
    dirty,
    errors,
    message,
    busy,
    save,
    cancel,
    repeat,
    remove,
    exportRecords,
    change: (key: AnnotationKey, value: string) => {
      setDraft((current) => (current ? { ...current, [key]: value } : current))
      setErrors((current) => ({ ...current, [key]: undefined }))
    },
  }
}
export type ShotHistory = ReturnType<typeof useShotHistory>
