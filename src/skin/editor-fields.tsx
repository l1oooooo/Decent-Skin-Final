import { useId } from "react"
import { inputClass, SettingSelect } from "./settings-controls"
export function EditorField({
  label,
  value,
  onChange,
  type = "text",
  error,
  help,
  multiline = false,
  required = false,
}: {
  label: string
  value: unknown
  onChange: (value: string) => void
  type?: string
  error?: string
  help?: string
  multiline?: boolean
  required?: boolean
}) {
  const id = useId()
  const props = {
    id,
    value:
      value == null || (typeof value === "number" && !Number.isFinite(value))
        ? ""
        : String(value),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => onChange(event.target.value),
    "aria-invalid": !!error,
    "aria-describedby": error || help ? id + "-help" : undefined,
    required,
    autoComplete: "off",
    spellCheck: false,
  }
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm text-muted-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...props}
          rows={4}
          className={`${inputClass} h-auto min-h-24 py-3`}
        />
      ) : (
        <input
          {...props}
          type={type}
          step={type === "number" ? "any" : undefined}
          className={inputClass}
        />
      )}
      {(error || help) && (
        <p
          id={id + "-help"}
          className="mt-2 text-sm text-muted-foreground"
          role={error ? "alert" : undefined}
        >
          {error || help}
        </p>
      )}
    </div>
  )
}
export function EditorChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: unknown
  options: string[]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-muted-foreground">
        {label}
      </label>
      <SettingSelect
        id={id}
        label={label}
        value={String(value ?? "")}
        options={options.map((value) => ({ label: value, value }))}
        onChange={onChange}
      />
    </div>
  )
}
