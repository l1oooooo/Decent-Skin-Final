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
  saveError,
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
  saveError?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const replace = useRef(true)
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
  function enter(key: string) {
    if (busy || disabled) return
    setError("")
    const replacing = replace.current
    replace.current = false
    setDraft((current) => {
      if (key === "clear") return ""
      if (key === "backspace") return replacing ? "" : current.slice(0, -1)
      const base = replacing ? "" : current
      if (key === ".")
        return integer || base.includes(".") ? base : (base || "0") + "."
      return (base === "0" ? "" : base) + key
    })
  }
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        if (lock.current) event.preventDefault()
        else onClose()
      }}
      onKeyDown={(event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return
        if (
          /^[0-9]$/.test(event.key) ||
          event.key === "." ||
          event.key === "Backspace" ||
          event.key === "Delete"
        ) {
          event.preventDefault()
          enter(
            event.key === "Backspace"
              ? "backspace"
              : event.key === "Delete"
                ? "clear"
                : event.key
          )
        }
      }}
      className="fixed m-auto max-h-[calc(100dvh-24px)] w-[380px] max-w-[calc(100vw-32px)] overflow-y-auto overscroll-contain rounded-[var(--control-radius)] border border-border bg-card p-4 text-foreground shadow-2xl backdrop:bg-black/70"
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
        <label htmlFor={id} className="sr-only">
          {label}
          {unit ? ` (${unit})` : ""}
        </label>
        <div className="mt-3 flex gap-2">
          <input
            ref={input}
            id={id}
            type="text"
            inputMode="none"
            readOnly
            value={draft}
            disabled={busy}
            autoComplete="off"
            className={inputClass}
            aria-invalid={!!error}
            aria-describedby={`${id}-help`}
            onFocus={() => {
              replace.current = true
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <Action
            type="button"
            variant="outline"
            disabled={busy || disabled}
            onClick={() => enter("clear")}
          >
            Clear
          </Action>
        </div>
        <p
          id={`${id}-help`}
          role={error ? "alert" : undefined}
          className="mt-2 text-sm text-muted-foreground"
        >
          {(error.startsWith("Could not save.") && saveError) ||
            error ||
            `${min}–${max}${unit ? ` ${unit}` : ""}`}
        </p>
        <div
          role="group"
          aria-label="Numeric keypad"
          className="mt-3 grid grid-cols-3 gap-2"
        >
          {[
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            ".",
            "0",
            "backspace",
          ].map((key) => (
            <Action
              key={key}
              type="button"
              variant="outline"
              aria-label={
                key === "."
                  ? "Decimal point"
                  : key === "backspace"
                    ? "Backspace"
                    : key
              }
              disabled={busy || disabled || (key === "." && integer)}
              className="!px-0 text-xl"
              onClick={() => enter(key)}
            >
              {key === "backspace" ? "⌫" : key}
            </Action>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-3">
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
