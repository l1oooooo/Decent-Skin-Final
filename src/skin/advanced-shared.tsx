import type { ReactNode } from "react"
import type { Data } from "@/gateway/advanced"
import { SettingInput } from "./settings-controls"
export const shown = (value: unknown) =>
  value === undefined || value === null ? "Unavailable" : String(value)
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h2 className="mb-4 text-xl">{title}</h2>
      {children}
    </section>
  )
}
export function Facts({ data }: { data: Data }) {
  return (
    <dl className="my-4 grid grid-cols-3 gap-4 text-sm">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="text-muted-foreground">{key}</dt>
          <dd className="mt-1 break-words">{shown(value)}</dd>
        </div>
      ))}
    </dl>
  )
}
export function Prepared({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <SettingInput
      field={{ key: "prepared", label, kind: "boolean" }}
      value={value}
      onChange={(v) => onChange(Boolean(v))}
    />
  )
}
export type Ask = (
  title: string,
  description: string,
  action: () => Promise<unknown>
) => void
