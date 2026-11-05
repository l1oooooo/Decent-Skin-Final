import { useEffect, useId, useRef, type ReactNode } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Action } from "./primitives"
import type { SettingField } from "@/gateway/daily-settings"

export const inputClass =
  "h-12 w-full min-w-0 rounded-[var(--control-radius)] border border-input bg-card px-3 text-[16px] text-foreground tabular-nums disabled:opacity-50"
export function SettingSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  invalid = false,
}: {
  id?: string
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
  disabled?: boolean
  invalid?: boolean
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v)
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        aria-invalid={invalid}
        className="min-h-12 w-full rounded-[var(--control-radius)] bg-card px-3 text-[16px] duration-150 motion-reduce:transition-none dark:bg-card dark:hover:bg-muted"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="rounded-[var(--control-radius)] bg-card ring-border duration-150 motion-reduce:animate-none"
      >
        <SelectGroup>
          {options.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="min-h-12 rounded-[var(--control-radius)] pr-9 pl-3 text-[16px] focus:bg-muted"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
export function SettingInput({
  field,
  value,
  onChange,
  error,
  disabled = false,
  unit = "C",
}: {
  field: SettingField
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  disabled?: boolean
  unit?: "C" | "F"
}) {
  const id = useId()
  const unavailable = value === undefined || value === null
  const help = unavailable
    ? "Unavailable from this gateway or device."
    : field.key === "steamSettings.targetTemperature" && unit === "F"
      ? "32 °F disables preheating; enabled range is 275–320 °F (329 °F on Bengle)."
      : field.help
  let display = String(value ?? "")
  if (field.kind === "time" && typeof value === "number")
    display = `${Math.floor(value / 60)
      .toString()
      .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`
  const label = field.label + (field.temperature ? ` (°${unit})` : "")
  if (field.temperature && unit === "F" && value !== "" && !unavailable)
    display = String(Math.round(((Number(value) * 9) / 5 + 32) * 10) / 10)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_240px] items-center gap-x-8 gap-y-2 border-b border-border py-4">
      <div>
        <label htmlFor={id} className="text-[15px] font-medium">
          {label}
        </label>
        {help && (
          <p
            id={`${id}-help`}
            className="mt-1 max-w-[580px] text-[13px] leading-relaxed text-muted-foreground"
          >
            {help}
          </p>
        )}
      </div>
      <div>
        {field.kind === "boolean" ? (
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={value === true}
            aria-label={label}
            aria-describedby={`${id}-help`}
            disabled={disabled || unavailable}
            onClick={() => onChange(!value)}
            className={`${inputClass} flex items-center justify-between gap-3 text-left`}
          >
            <span>{unavailable ? "Unavailable" : value ? "On" : "Off"}</span>
            <span
              aria-hidden="true"
              className={`h-5 w-9 rounded-full p-0.5 ${value ? "bg-foreground" : "bg-muted"}`}
            >
              <span
                className={`block size-4 rounded-full ${value ? "translate-x-4 bg-background" : "bg-muted-foreground"}`}
              />
            </span>
          </button>
        ) : field.kind === "select" ? (
          <SettingSelect
            id={id}
            label={label}
            value={display}
            options={field.options ?? []}
            disabled={disabled || unavailable}
            invalid={!!error}
            onChange={onChange}
          />
        ) : (
          <input
            id={id}
            aria-describedby={`${id}-help ${id}-error`}
            aria-invalid={!!error}
            type={field.kind === "time" ? "time" : "number"}
            step={field.temperature && unit === "F" ? "any" : (field.step ?? 1)}
            value={display}
            disabled={disabled || unavailable}
            autoComplete="off"
            className={inputClass}
            onChange={(event) => {
              const v = event.target.value
              onChange(
                field.temperature && unit === "F" && v !== ""
                  ? Math.round((((Number(v) - 32) * 5) / 9) * 1000) / 1000
                  : v
              )
            }}
          />
        )}
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-2 text-[13px] text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="text-xl font-medium">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 border-t border-border">{children}</div>
    </section>
  )
}
export function ConfirmAction({
  title,
  description,
  confirm,
  cancel,
}: {
  title: string
  description: string
  confirm: () => void
  cancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement
    ref.current?.showModal()
    return () => {
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={cancel}
      className="m-auto w-[480px] rounded-lg border border-border bg-background p-7 text-foreground backdrop:bg-black/70"
    >
      <h2 id={id} className="text-xl font-medium">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Action variant="outline" onClick={cancel}>
          Cancel
        </Action>
        <Action onClick={confirm}>Confirm</Action>
      </div>
    </dialog>
  )
}
