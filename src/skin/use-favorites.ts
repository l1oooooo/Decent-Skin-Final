import { useState } from "react"
import type { FavoriteSlots, GatewaySnapshot } from "@/gateway/types"
import type { DecaidGateway } from "@/gateway/client"
import { assignFavorite } from "@/gateway/model"

export function useFavorites(
  gateway: DecaidGateway,
  snapshot: GatewaySnapshot
) {
  const [draft, setDraft] = useState<FavoriteSlots | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const slots = draft ?? snapshot.favorites
  const dirty =
    draft !== null &&
    JSON.stringify(draft) !== JSON.stringify(snapshot.favorites)
  function change(next: FavoriteSlots) {
    setDraft(next)
    setError("")
    setMessage("")
  }
  function cancel() {
    setDraft(null)
    setError("")
    setMessage("")
  }
  async function save() {
    if (saving) return
    const submitted = [...slots]
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await gateway.saveFavorites(submitted)
      setDraft((current) =>
        JSON.stringify(current) === JSON.stringify(submitted) ? null : current
      )
      setMessage("Favorites saved.")
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save favorites"
      )
    } finally {
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
