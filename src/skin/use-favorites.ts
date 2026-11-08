import { useFeedback } from "./notifications/feedback"
import { useRef, useState } from "react"
import type { FavoriteSlots, GatewaySnapshot } from "@/gateway/types"
import type { DecaidGateway } from "@/gateway/client"
import { assignFavorite } from "@/gateway/model"

export function useFavorites(
  gateway: DecaidGateway,
  snapshot: GatewaySnapshot
) {
  const [draft, setDraft] = useState<FavoriteSlots | null>(null)
  const latestDraft = useRef<FavoriteSlots | null>(null)
  const [saving, setSaving] = useState(false)
  const feedback = useFeedback("Saving favorites")
  const { message, setMessage } = feedback
  const { error, setError } = feedback
  const slots = draft ?? snapshot.favorites
  const dirty =
    draft !== null &&
    JSON.stringify(draft) !== JSON.stringify(snapshot.favorites)
  function change(next: FavoriteSlots) {
    latestDraft.current = next
    setDraft(next)
    setError("")
    setMessage("")
  }
  function cancel() {
    latestDraft.current = null
    setDraft(null)
    setError("")
    setMessage("")
  }
  async function save() {
    if (saving) return
    const submitted = [...slots]
    feedback.begin()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await gateway.saveFavorites(submitted)
      setDraft((current) =>
        JSON.stringify(current) === JSON.stringify(submitted) ? null : current
      )
      const newerEdits =
        latestDraft.current !== null &&
        JSON.stringify(latestDraft.current) !== JSON.stringify(submitted)
      if (!newerEdits) latestDraft.current = null
      setMessage(
        newerEdits
          ? "Submitted favorites saved. Newer edits are still unsaved."
          : "Favorites saved.",
        newerEdits ? "info" : "success"
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save favorites"
      )
    } finally {
      feedback.end()
      setSaving(false)
    }
  }
  return {
    slots,
    dirty,
    saving,
    error,
    message:
      message && dirty
        ? "Submitted favorites saved. Newer edits are still unsaved."
        : message,
    cancel,
    save,
    clear: (index: number) =>
      change(slots.map((id, i) => (i === index ? null : id))),
    assign: (index: number, id: string) =>
      change(assignFavorite(slots, index, id)),
    move: (index: number, offset: number) => {
      const next = [...slots]
      ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
      change(next)
    },
  }
}
export type FavoritesEditor = ReturnType<typeof useFavorites>
