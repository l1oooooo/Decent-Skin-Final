import type { ReactNode } from "react"
import { toast } from "@/components/ui/toast"

export type NotificationType =
  "success" | "info" | "warning" | "error" | "loading"
export type Notification = {
  title: ReactNode
  description?: ReactNode
  type?: NotificationType
  persistent?: boolean
  action?: { children: ReactNode; onClick: () => void }
}
type Entry = Notification & {
  id: string
  rank: number
  visible: boolean
  sequence: number
}
export const notificationRank = (n: Notification) =>
  n.persistent
    ? 0
    : n.type === "error" || n.type === "warning"
      ? 1
      : n.type === "loading"
        ? 2
        : n.type === "success"
          ? 4
          : 3
export const notificationDuration = (n: Notification) =>
  n.persistent || n.type === "loading"
    ? 0
    : n.type === "error" || n.type === "warning"
      ? 8000
      : 4000

// One queue owns policy; Base UI owns the displayed cards and their expiry/focus.
export function createNotifications(sink: Pick<typeof toast, "add" | "close">) {
  const entries = new Map<string, Entry>()
  const conditions = new Map<string, string>()
  const watchdogs = new Map<string, ReturnType<typeof setTimeout>>()
  let sequence = 0
  function pump() {
    const ordered = [...entries.values()].sort(
      (a, b) => a.rank - b.rank || a.sequence - b.sequence
    )
    const critical = ordered.filter((n) => n.persistent)
    const shown = new Set(
      [
        ...critical,
        ...ordered
          .filter((n) => !n.persistent)
          .slice(0, Math.max(1, 3 - critical.length)),
      ].map((n) => n.id)
    )
    for (const n of ordered) {
      if (!shown.has(n.id)) {
        if (n.visible) {
          n.visible = false
          sink.close(n.id)
        }
        continue
      }
      if (n.visible) continue
      n.visible = true
      const generation = n.sequence
      sink.add({
        id: n.id,
        title: n.title,
        description: n.description,
        type: n.type ?? "info",
        timeout: notificationDuration(n),
        priority: n.persistent || n.type === "error" ? "high" : "low",
        data: { rank: n.rank, persistent: !!n.persistent },
        actionProps: n.action,
        onClose: () => {
          const current = entries.get(n.id)
          if (!current?.visible || current.sequence !== generation) return
          entries.delete(n.id)
          pump()
        },
      })
    }
  }
  function show(id: string, value: Notification) {
    if (!value.persistent && typeof value.title === "string") {
      for (const other of entries.values()) {
        if (
          other.id !== id &&
          !other.persistent &&
          other.title === value.title &&
          other.type === value.type
        )
          close(other.id)
      }
    }
    entries.set(id, {
      ...value,
      id,
      rank: notificationRank(value),
      visible: false,
      sequence: ++sequence,
    })
    // Initial child effects run before the external Base UI manager subscribes.
    queueMicrotask(pump)
    return id
  }
  function close(id: string) {
    entries.delete(id)
    const timer = watchdogs.get(id)
    if (timer) clearTimeout(timer)
    watchdogs.delete(id)
    sink.close(id)
    queueMicrotask(pump)
  }
  function condition(
    id: string,
    fingerprint: string | null,
    value: Notification
  ) {
    if (fingerprint === null) {
      if (conditions.delete(id)) close(id)
    } else if (conditions.get(id) !== fingerprint) {
      conditions.set(id, fingerprint)
      if (
        ![...entries.values()].some(
          (n) =>
            !n.persistent &&
            !value.persistent &&
            n.title === value.title &&
            n.type === value.type
        )
      )
        show(id, value)
    }
  }
  function begin(id: string, title: string, waitMs = 45000, quiet = false) {
    const prior = watchdogs.get(id)
    if (prior) clearTimeout(prior)
    if (!quiet) show(id, { title, type: "loading" })
    watchdogs.set(
      id,
      setTimeout(() => {
        watchdogs.delete(id)
        show(id, {
          title: "Still waiting for Decaid",
          description:
            "The outcome is unconfirmed. Check the operation before retrying.",
          type: "warning",
        })
      }, waitMs)
    )
  }
  function finish(id: string, value?: Notification) {
    const timer = watchdogs.get(id)
    if (timer) clearTimeout(timer)
    watchdogs.delete(id)
    if (value) show(id, value)
    else close(id)
  }
  return {
    show,
    close,
    condition,
    begin,
    finish,
    forget: (id: string) => {
      conditions.delete(id)
    },
  }
}
export const notifications = createNotifications(toast)
