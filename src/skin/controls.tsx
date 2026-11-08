import { useState } from "react"
import { NumberEditor } from "./number-editor"
import {
  Flame,
  Droplets,
  Waves,
  Minus,
  Plus,
  Coffee,
  Square,
  X,
} from "lucide-react"
import { Action } from "./primitives"
import { format, type SkinSession } from "./use-skin"
export { Extraction } from "./trace"
export function Wordmark() {
  return (
    <span className="text-[22px] font-medium tracking-[-.045em]">Decent</span>
  )
}
export function TabletStatus({ s }: { s: SkinSession }) {
  const color =
    s.phase === "error"
      ? "var(--status-error)"
      : !s.connected
        ? "var(--status-disconnected)"
        : s.phase === "heating" || s.operation
          ? "var(--status-busy)"
          : s.active
            ? "var(--status-brewing)"
            : "var(--status-ready)"
  return (
    <div
      className="flex items-center gap-2 text-[13px] text-muted-foreground"
      role="status"
      aria-label="Machine state"
      tabIndex={-1}
      data-ready={s.ready}
      data-operation={s.active ? "espresso" : (s.operation ?? "idle")}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="tabular-nums">{s.status}</span>
    </div>
  )
}

export function Stepper({
  label,
  value,
  unit,
  step,
  min,
  max,
  onChange,
  disabled = false,
  large = false,
  horizontal = false,
  text,
  onEdit,
  saveError,
}: {
  label: string
  value: number
  unit?: string
  step: number
  min: number
  max: number
  onChange: (value: number) => void | boolean | Promise<boolean | undefined>
  disabled?: boolean
  large?: boolean
  horizontal?: boolean
  text?: string
  saveError?: string
  onEdit?: () => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div
      className={`focus-stepper ${
        horizontal ? "flex items-center justify-between gap-4" : "min-w-0"
      }`}
      role="group"
      aria-label={label}
    >
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <div
        className={`flex items-center justify-between gap-2 ${horizontal ? "" : "mt-3"}`}
      >
        <Action
          variant="outline"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={
            disabled ||
            (Boolean(onEdit) && Boolean(text) && !Number.isFinite(value)) ||
            value <= min
          }
          onClick={() =>
            onChange(
              Math.max(
                min,
                Math.round(
                  ((Number.isFinite(value) ? value : min) - step) * 10
                ) / 10
              )
            )
          }
          className="!active:scale-100 !h-12 !w-12 !px-0 !transition-none"
        >
          <Minus size={16} />
        </Action>
        <output
          aria-label={`${label} value`}
          className={`min-w-0 text-center font-medium tracking-[-.045em] tabular-nums ${large ? "text-[42px]" : "text-[28px]"}`}
        >
          <button
            type="button"
            aria-label={
              onEdit ? "Edit grinder setting" : `Edit ${label.toLowerCase()}`
            }
            className="min-h-12 max-w-full min-w-12 truncate"
            disabled={disabled}
            onClick={onEdit ?? (() => setEditing(true))}
          >
            {text || format(value, unit === "s" ? 0 : 1)}
          </button>
          <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
            {text === "Off" || text === "Not set" ? "" : unit}
          </span>
        </output>
        <Action
          variant="outline"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={
            disabled ||
            (Boolean(onEdit) && Boolean(text) && !Number.isFinite(value)) ||
            value >= max
          }
          onClick={() =>
            onChange(
              Math.min(
                max,
                Math.round(
                  ((Number.isFinite(value) ? value : min - step) + step) * 10
                ) / 10
              )
            )
          }
          className="!active:scale-100 !h-12 !w-12 !px-0 !transition-none"
        >
          <Plus size={16} />
        </Action>
      </div>
      {editing && (
        <NumberEditor
          {...{ label, value, unit, min, max, disabled, onChange, saveError }}
          integer={unit === "s"}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
export function RecipeControls({
  s,
  vertical = false,
  large = false,
  grind = false,
  divided = false,
}: {
  s: SkinSession
  vertical?: boolean
  large?: boolean
  grind?: boolean
  divided?: boolean
}) {
  return (
    <div
      className={
        vertical
          ? "focus-recipe-controls space-y-7"
          : divided
            ? "grid h-full grid-cols-3 divide-x divide-border [&>div]:px-7"
            : "grid grid-cols-3 gap-7"
      }
    >
      {(
        [
          ...(grind
            ? [["Grind size", s.grind, "", 0.1, 0, 20, "grind"] as const]
            : []),
          ["Dose", s.dose, "g", 0.1, 8, 30, "dose"],
          ["Target yield", s.yieldTarget, "g", 0.5, 0, 1000, "yield"],
          [
            "Temperature",
            s.displayTemperature(s.temperature),
            `°${s.temperatureUnit}`,
            s.temperatureUnit === "F" ? 0.9 : 0.5,
            s.displayTemperature(60),
            s.displayTemperature(98),
            "temperature",
          ],
        ] as const
      ).map(([label, value, unit, step, min, max, key]) => (
        <Stepper
          key={`${s.selectedId}-${key}`}
          {...{ label, value, unit, step, min, max, large }}
          disabled={s.locked}
          saveError={s.notice}
          text={
            key === "grind"
              ? s.grindText
              : key === "dose" && !Number.isFinite(value)
                ? "Not set"
                : key === "yield" && value === 0
                  ? "Off"
                  : undefined
          }
          onEdit={
            key === "grind" && !!s.grindText && !Number.isFinite(s.grind)
              ? () => s.setModal("grind")
              : undefined
          }
          onChange={(value) =>
            s.change(key, key === "temperature" ? s.celsius(value) : value)
          }
        />
      ))}
    </div>
  )
}

export function UtilitySettings({ s }: { s: SkinSession }) {
  const steam = s.settings === "Steam",
    water = s.settings === "Hot water",
    running = s.operation === s.settings
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[20px] font-medium">{s.settings}</h2>
        <Action
          variant="ghost"
          aria-label="Close utility card"
          className="!px-0"
          onClick={() => s.setSettings(null)}
        >
          <X size={18} />
        </Action>
      </div>
      <div className="space-y-6">
        {steam && (
          <button
            type="button"
            role="switch"
            aria-label="Enable steam"
            aria-checked={s.steamEnabled}
            disabled={s.profileLocked}
            onClick={() => s.toggleSteam(!s.steamEnabled)}
            className="flex min-h-16 w-full items-center justify-between gap-4 border-b border-border pb-5 text-left"
          >
            <span className="text-[14px] font-medium">Steam function</span>
            <span className="flex items-center gap-3">
              <span className="w-7 text-[13px] text-muted-foreground">
                {s.steamEnabled ? "On" : "Off"}
              </span>
              <span
                aria-hidden="true"
                className={`relative h-7 w-12 rounded-full border transition-colors duration-150 ${s.steamEnabled ? "border-foreground bg-foreground" : "border-input bg-muted"}`}
              >
                <span
                  className={`absolute top-[3px] left-[3px] size-5 rounded-full transition-transform duration-150 motion-reduce:transition-none ${s.steamEnabled ? "translate-x-5 bg-background" : "translate-x-0 bg-foreground"}`}
                />
              </span>
            </span>
          </button>
        )}

        {steam && (
          <Stepper
            label="Steam temperature"
            value={s.displayTemperature(s.steamTemperature)}
            unit={`°${s.temperatureUnit}`}
            step={s.temperatureUnit === "F" ? 1.8 : 1}
            min={s.displayTemperature(135)}
            max={s.displayTemperature(160)}
            disabled={s.profileLocked || !s.steamEnabled}
            onChange={(value) =>
              s.setSteamTemperature(Math.round(s.celsius(value)))
            }
          />
        )}
        {water && (
          <Stepper
            label="Water temperature"
            value={s.displayTemperature(s.waterTemperature)}
            unit={`°${s.temperatureUnit}`}
            step={s.temperatureUnit === "F" ? 1.8 : 1}
            min={s.displayTemperature(60)}
            max={s.displayTemperature(98)}
            disabled={s.profileLocked}
            onChange={(value) =>
              s.setWaterTemperature(Math.round(s.celsius(value)))
            }
          />
        )}
        <Stepper
          label={steam ? "Steam time" : water ? "Water time" : "Flush time"}
          value={steam ? s.steamTime : water ? s.waterTime : s.flushTime}
          unit="s"
          step={steam ? 5 : 1}
          min={steam ? 5 : 1}
          max={steam ? 90 : water ? 60 : 30}
          disabled={s.profileLocked || (steam && !s.steamEnabled)}
          onChange={
            steam ? s.setSteamTime : water ? s.setWaterTime : s.setFlushTime
          }
        />
        <GroupHeadGuidance operation={s.settings!} running={running} />
      </div>
      <p className="mt-4 text-[12px] text-muted-foreground">
        {running
          ? "Timer running · settings are locked."
          : steam && !s.steamEnabled
            ? "Enable steam to use this function."
            : "Saved to your Decaid workflow."}
      </p>
    </>
  )
}

export function ShotNumbers({
  s,
  large = false,
}: {
  s: SkinSession
  large?: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {[
        ["Time", format(s.shot.elapsed), "s"],
        ["In the cup", s.connected ? format(s.shot.weight) : "—", "g"],
        ["Pressure", s.connected ? format(s.shot.pressure) : "—", "bar"],
        ["Flow", s.connected ? format(s.shot.flow) : "—", "ml/s"],
      ].map(([label, value, unit]) => (
        <div key={label}>
          <p className="mb-3 text-[13px] text-muted-foreground">{label}</p>
          <p
            className={`${large ? "text-[56px]" : "text-[40px]"} leading-none font-medium tracking-[-.055em] tabular-nums`}
          >
            {value}
            <span className="ml-2 text-[14px] font-normal tracking-normal text-muted-foreground">
              {unit}
            </span>
          </p>
        </div>
      ))}
    </div>
  )
}
export function GroupHeadGuidance({
  operation,
  ready,
  running = false,
  className = "",
}: {
  operation: string
  ready?: boolean
  running?: boolean
  className?: string
}) {
  const Icon = running
    ? Square
    : operation === "Espresso"
      ? Coffee
      : operation === "Steam"
        ? Flame
        : operation === "Hot water"
          ? Droplets
          : Waves
  return (
    <div
      role="status"
      aria-label={`Group-head ${running ? "stop " : ""}${operation.toLowerCase()}`}
      tabIndex={-1}
      data-ready={ready}
      className={`focus-start-guidance flex min-h-12 items-center gap-3 text-[14px] ${className}`}
    >
      <Icon size={20} aria-hidden="true" className="shrink-0" />
      <div>
        <p className="font-medium">
          {running ? `Stop ${operation.toLowerCase()}` : `Press ${operation}`}
        </p>
        <p className="text-[12px] text-muted-foreground">
          on the group-head controller
        </p>
      </div>
    </div>
  )
}
