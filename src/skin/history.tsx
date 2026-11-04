import { useEffect, useRef, useState } from "react"
import { X, ArrowLeft } from "lucide-react"
import { Action } from "./primitives"
import { format, type SkinSession } from "./use-skin"
import type { ShotRecord } from "@/gateway/types"

export function History({ s }: { s: SkinSession }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [items, setItems] = useState<ShotRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<ShotRecord | null>(null)
  const load = async (offset = 0) => {
    setLoading(true)
    setError("")
    try {
      const result = await s.gateway.history(offset)
      setItems((previous) =>
        offset ? [...previous, ...result.items] : result.items
      )
      setTotal(result.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load shot history")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    let cancelled = false
    s.gateway
      .history()
      .then((result) => {
        if (!cancelled) {
          setItems(result.items)
          setTotal(result.total)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
      trigger?.focus()
    }
  }, [s.gateway])
  async function detail(id: string) {
    setLoading(true)
    setError("")
    try {
      setSelected(await s.gateway.shot(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load shot")
    } finally {
      setLoading(false)
    }
  }
  const measurements = selected?.measurements ?? []
  const seconds = measurements.length
    ? (Date.parse(measurements.at(-1)!.machine.timestamp) -
        Date.parse(measurements[0].machine.timestamp)) /
      1000
    : null
  return (
    <dialog
      ref={ref}
      aria-labelledby="history-title"
      onCancel={() => s.setModal(null)}
      className="fixed m-auto max-h-[85dvh] w-[520px] max-w-[90vw] overflow-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between border-b border-border px-7 py-4">
        <h2 id="history-title" className="text-[20px] font-medium">
          {selected
            ? selected.workflow?.profile?.title || "Shot record"
            : "Recent shots"}
        </h2>
        <Action
          variant="ghost"
          aria-label="Close dialog"
          onClick={() => s.setModal(null)}
        >
          <X size={18} />
        </Action>
      </div>
      <div className="p-7">
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Action variant="outline" className="mt-3" onClick={() => load()}>
              Retry
            </Action>
          </div>
        )}
        {loading && <p role="status">Loading shots…</p>}
        {selected ? (
          <>
            <Action variant="ghost" onClick={() => setSelected(null)}>
              <ArrowLeft size={16} />
              All shots
            </Action>
            <p className="my-4 text-sm text-muted-foreground">
              {new Date(selected.timestamp).toLocaleString()}
            </p>
            <p className="text-2xl tabular-nums">
              {format(
                selected.annotations?.actualYield ??
                  measurements.at(-1)?.scale?.weight
              )}{" "}
              g · {format(seconds)} s
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {selected.stopReason || "Recorded shot"}
            </p>
          </>
        ) : (
          <>
            {!loading && !error && items.length === 0 && (
              <p>No shots recorded yet.</p>
            )}
            {items.map((shot) => (
              <button
                disabled={loading}
                key={shot.id}
                className="min-h-24 w-full border-b border-border py-4 text-left"
                onClick={() => detail(shot.id)}
              >
                <p>
                  {shot.workflow?.profile?.title ||
                    shot.workflow?.name ||
                    "Shot"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {new Date(shot.timestamp).toLocaleString()} ·{" "}
                  {format(shot.annotations?.actualYield)} g
                </p>
              </button>
            ))}
            {items.length < total && (
              <Action
                variant="outline"
                disabled={loading}
                className="mt-5 w-full"
                onClick={() => load(items.length)}
              >
                Load more
              </Action>
            )}
          </>
        )}
      </div>
    </dialog>
  )
}
