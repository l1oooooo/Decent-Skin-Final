import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { Action } from "./primitives"
import type { SkinSession } from "./use-skin"

export function GrindEditor({ s }: { s: SkinSession }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [value, setValue] = useState(s.grindText)
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => trigger?.focus()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby="grind-title"
      onCancel={() => s.setModal(null)}
      className="fixed m-auto w-[520px] max-w-[90vw] rounded-2xl border border-border bg-card p-7 text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="grind-title" className="text-[20px] font-medium">
          Grind size
        </h2>
        <Action
          variant="ghost"
          aria-label="Close grind settings"
          onClick={() => s.setModal(null)}
        >
          <X size={18} />
        </Action>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (await s.setGrindText(value.trim())) s.setModal(null)
        }}
      >
        <label className="block text-sm text-muted-foreground">
          Grinder setting
          <input
            className="mt-3 h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={40}
          />
        </label>
        {s.notice && (
          <p role="alert" className="mt-4 text-sm">
            {s.notice}
          </p>
        )}
        <Action
          type="submit"
          className="mt-6 w-full"
          disabled={s.locked || !value.trim()}
        >
          Save setting
        </Action>
      </form>
    </dialog>
  )
}
