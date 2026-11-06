import { useEffect, useId, useRef, useState } from "react"
import { Action } from "./primitives"
import { inputClass } from "./settings-controls"

export function NumberEditor({
  label,
  value,
  unit,
  min,
  max,
  integer,
  disabled,
  onChange,
  onClose,
}: {
  label: string
  value: number
  unit?: string
  min: number
  max: number
  integer: boolean
  disabled: boolean
  onChange: (value: number) => void | boolean | Promise<boolean | undefined>
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const id = useId()
  const [draft, setDraft] = useState(
    Number.isFinite(value) ? String(Math.round(value * 10) / 10) : ""
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    if (matchMedia("(pointer: fine)").matches) input.current?.select()
    return () => {
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        if (lock.current) event.preventDefault()
        else onClose()
      }}
      className="fixed m-auto max-h-[90dvh] w-[380px] max-w-[calc(100vw-32px)] overflow-y-auto overscroll-contain rounded-[var(--control-radius)] border border-border bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <h2
        id={`${id}-title`}
        tabIndex={-1}
        autoFocus
        className="text-xl font-medium outline-none"
      >
        {label}
      </h2>
      <form
        noValidate
        onSubmit={async (event) => {
          event.preventDefault()
          if (disabled || lock.current) return
          const next = Number(draft)
          if (
            !draft.trim() ||
            !Number.isFinite(next) ||
            next < min ||
            next > max ||
            (integer && !Number.isInteger(next))
          ) {
            setError(
              `Enter ${integer ? "a whole number" : "a number"} from ${min} to ${max}${unit ? ` ${unit}` : ""}.`
            )
            return
          }
          lock.current = true
          setBusy(true)
          setError("")
          try {
            if ((await onChange(next)) !== false) onClose()
            else
              setError(
                "Could not save. Review the connection or machine state, then try again."
              )
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not save this value."
            )
          } finally {
            lock.current = false
            setBusy(false)
          }
        }}
      >
        <label
          htmlFor={id}
          className="mt-5 mb-2 block text-sm text-muted-foreground"
        >
          {label}
          {unit ? ` (${unit})` : ""}
        </label>
        <input
          ref={input}
          id={id}
          type="number"
          inputMode={integer ? "numeric" : "decimal"}
          min={min}
          max={max}
          step={integer ? 1 : "any"}
          value={draft}
          disabled={busy}
          autoComplete="off"
          className={inputClass}
          aria-invalid={!!error}
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            setDraft(event.target.value)
            setError("")
          }}
        />
        <p
          id={`${id}-help`}
          role={error ? "alert" : undefined}
          className="mt-3 text-sm text-muted-foreground"
        >
          {error || `${min}–${max}${unit ? ` ${unit}` : ""}`}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Action
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Action>
          <Action type="submit" disabled={disabled || busy}>
            {busy ? "Saving…" : "Save"}
          </Action>
        </div>
      </form>
    </dialog>
  )
}
