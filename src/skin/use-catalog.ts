import { useFeedback } from "./notifications/feedback"
import { useRef, useState } from "react"
import type { DecaidGateway } from "@/gateway/client"
import type {
  Inventory,
  InventoryKind,
  InventoryRecord,
  RecipePreference,
} from "@/gateway/recipes"
import type { ProfileRecord } from "@/gateway/types"
export function useCatalog(gateway: DecaidGateway) {
  const [data, setData] = useState<Inventory | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const feedback = useFeedback("Updating inventory")
  const { message, setMessage } = feedback
  const [kind, setKind] = useState<InventoryKind>("beans")
  const [record, setRecord] = useState<InventoryRecord | null>(null)
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const [base, setBase] = useState<Record<string, unknown>>({})
  const [beanId, setBeanId] = useState("")
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [preference, setPreference] = useState<RecipePreference | null>(null)
  const [preferenceBase, setPreferenceBase] = useState<RecipePreference | null>(
    null
  )
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(base)
  const preferenceDirty =
    JSON.stringify(preference) !== JSON.stringify(preferenceBase)
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
  async function refresh() {
    await run(async () => setData(await gateway.recipes.inventory()))
  }
  function edit(
    nextKind: InventoryKind,
    next: InventoryRecord | null,
    parent = ""
  ) {
    setKind(nextKind)
    setRecord(next)
    setBeanId(parent || String(next?.beanId ?? ""))
    setBase(next ?? {})
    setDraft(structuredClone(next ?? {}))
    setMessage("")
  }
  function cancelInventory() {
    setDraft(null)
    setMessage("")
  }
  function cancelPreference() {
    setPreference(preferenceBase)
    setMessage("")
  }
  async function save() {
    if (!draft) return
    const submitted = draft
    const patch = Object.fromEntries(
      Object.entries(submitted).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(base[key])
      )
    )
    const required =
      kind === "beans"
        ? ["name", "roaster"]
        : kind === "grinders"
          ? ["model"]
          : []
    if (
      required.some(
        (key) =>
          typeof submitted[key] !== "string" || !String(submitted[key]).trim()
      )
    ) {
      setMessage(`Enter ${required.join(" and ")}.`, "warning")
      return
    }
    await run(async () => {
      const saved = await gateway.recipes.saveInventory(
        kind,
        record?.id ?? null,
        patch,
        beanId
      )
      setRecord(saved)
      setBase(saved)
      setDraft((current) => (current === submitted ? saved : current))
      setData((current) =>
        current
          ? {
              ...current,
              [kind]: [
                ...current[kind].filter((r) => r.id !== saved.id),
                saved,
              ],
            }
          : current
      )
      setMessage(
        "Inventory record saved. Historical shots are unchanged.",
        "success"
      )
    })
  }
  async function archive(nextKind: InventoryKind, next: InventoryRecord) {
    await run(async () => {
      const saved = await gateway.recipes.saveInventory(nextKind, next.id, {
        archived: !next.archived,
      })
      setData((current) =>
        current
          ? {
              ...current,
              [nextKind]: current[nextKind].map((r) =>
                r.id === saved.id ? saved : r
              ),
            }
          : current
      )
      setMessage(
        saved.archived
          ? "Archived. Existing workflow and shot context are preserved."
          : "Record restored."
      )
    })
  }
  async function assign(
    nextKind: "bean-batches" | "grinders",
    id: string | null
  ) {
    await run(async () => {
      await gateway.recipes.assignInventory(nextKind, id)
    })
  }
  async function openPreference(profile: ProfileRecord) {
    if (recipeId === profile.id && preference) return
    setRecipeId(profile.id)
    setPreference(null)
    setPreferenceBase(null)
    await run(async () => {
      const p = (await gateway.recipes.preferences())[profile.id] ?? {}
      setPreference(p)
      setPreferenceBase(p)
    })
  }
  async function copyStreamline() {
    if (!recipeId || !preference) return
    const id = recipeId
    const before = preference
    await run(async () => {
      const copied = await gateway.recipes.streamlinePreference(id)
      setPreference((current) =>
        current === before ? { ...current, ...copied } : current
      )
      setMessage(
        "Streamline adjustments copied into this draft. Review the values, then Save recipe preferences. Steam and calibration settings are not copied."
      )
    })
  }
  async function savePreference() {
    if (!recipeId || !preference) return
    const submitted = preference
    await run(async () => {
      await gateway.recipes.savePreference(recipeId, submitted)
      setPreferenceBase(submitted)
      setMessage(
        "Recipe preferences saved. Load this profile to apply them.",
        "success"
      )
    })
  }
  return {
    data,
    busy,
    message,
    kind,
    record,
    draft,
    beanId,
    dirty,
    preferenceDirty,
    recipeId,
    preference,
    refresh,
    edit,
    cancelInventory,
    cancelPreference,
    save,
    archive,
    assign,
    openPreference,
    savePreference,
    copyStreamline,
    setPreference,
    setBeanId,
    change: (key: string, value: unknown) =>
      setDraft((current) => ({ ...current, [key]: value })),
  }
}
export type Catalog = ReturnType<typeof useCatalog>
