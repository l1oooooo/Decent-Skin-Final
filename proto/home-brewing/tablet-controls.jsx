import { useEffect, useRef } from "react"
import {
  Library,
  Thermometer,
  ChevronRight,
  Droplets,
  Flame,
  Minus,
  Plus,
  Square,
  Waves,
  X,
  History,
  AlertCircle,
} from "lucide-react"
import { Action, BrewButton, Trace } from "./common"

export function Wordmark() {
  return (
    <span className="text-[22px] font-medium tracking-[-.045em]">Decent</span>
  )
}
export function TabletStatus({ s }) {
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
    >
      <span
        aria-hidden="true"
        className="pointer-events-none size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="tabular-nums">
        {s.operation ? `${s.operation} · ${s.remaining}s` : s.status}
      </span>
    </div>
  )
}
export function TabletHeader({ s, children, showDemo = true }) {
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border px-7">
      <Wordmark />
      <div aria-label="Machine status" className="flex items-center gap-7">
        <TabletStatus s={s} />
        <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums">
          <Thermometer size={14} aria-hidden="true" />
          {s.connected ? `${s.shot.temperature.toFixed(1)}°C` : "—°C"}
        </span>
        <span className="text-[12px] text-muted-foreground">
          {s.connected ? "Scale connected" : "Scale unavailable"}
        </span>
        {showDemo && (
          <span className="rounded border border-border px-2 py-1 text-[10px] tracking-wider text-muted-foreground">
            DEMO
          </span>
        )}
        {children}
      </div>
    </header>
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
}) {
  return (
    <div
      className={
        horizontal ? "flex items-center justify-between gap-4" : "min-w-0"
      }
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
          disabled={disabled || value <= min}
          onClick={() =>
            onChange(Math.max(min, Math.round((value - step) * 10) / 10))
          }
          className="!active:scale-100 !h-12 !w-12 !px-0 !transition-none"
        >
          <Minus size={16} />
        </Action>
        <output
          aria-label={`${label} value`}
          className={`min-w-0 text-center font-medium tracking-[-.045em] tabular-nums ${large ? "text-[42px]" : "text-[28px]"}`}
        >
          {value.toFixed(unit === "s" ? 0 : 1)}
          <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
            {unit}
          </span>
        </output>
        <Action
          variant="outline"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={disabled || value >= max}
          onClick={() =>
            onChange(Math.min(max, Math.round((value + step) * 10) / 10))
          }
          className="!active:scale-100 !h-12 !w-12 !px-0 !transition-none"
        >
          <Plus size={16} />
        </Action>
      </div>
    </div>
  )
}
export function RecipeControls({
  s,
  vertical = false,
  large = false,
  grind = false,
  divided = false,
}) {
  return (
    <div
      className={
        vertical
          ? "space-y-7"
          : divided
            ? "grid h-full grid-cols-3 divide-x divide-border [&>div]:px-7"
            : "grid grid-cols-3 gap-7"
      }
    >
      {[
        ...(grind ? [["Grind size", s.grind, "", 0.1, 0, 20, "grind"]] : []),
        ["Dose", s.dose, "g", 0.1, 8, 30, "dose"],
        ["Target yield", s.yieldTarget, "g", 0.5, 10, 120, "yield"],
        ["Temperature", s.temperature, "°C", 0.5, 60, 98, "temperature"],
      ].map(([label, value, unit, step, min, max, key]) => (
        <Stepper
          key={key}
          {...{ label, value, unit, step, min, max, large }}
          disabled={s.locked}
          onChange={(value) => s.change(key, value)}
        />
      ))}
    </div>
  )
}
export function Favorites({ s, layout = "tabs" }) {
  const rail = layout === "rail",
    cards = layout === "cards"
  return (
    <div
      className={
        rail ? "space-y-3" : "flex items-stretch border-b border-border"
      }
    >
      <div
        role="group"
        aria-label="Favorite profiles"
        className={
          rail
            ? "flex flex-col gap-1"
            : cards
              ? "grid grid-cols-5 gap-3"
              : "grid min-w-0 flex-1 grid-cols-5"
        }
      >
        {s.profiles.map((p, i) => (
          <button
            key={p.name}
            aria-label={`Select ${p.name}`}
            aria-pressed={s.profileIndex === i}
            disabled={s.locked}
            onClick={() => s.selectProfile(i)}
            className={`relative min-h-14 text-left font-medium transition-colors duration-150 disabled:text-muted-foreground ${rail ? "flex min-h-16 items-center rounded-lg px-4 py-4" : cards ? "min-h-[92px] rounded-xl border px-4 py-4" : "flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-[14px]"} ${s.profileIndex === i ? (rail ? "bg-foreground/15 text-foreground" : cards ? "border-foreground/70 bg-muted text-foreground" : "border-foreground bg-foreground/15 text-foreground") : cards ? "border-border bg-card/30 text-muted-foreground hover:bg-muted" : rail ? "text-muted-foreground hover:bg-muted" : "border-transparent text-muted-foreground hover:bg-card"}`}
          >
            <span className="block min-w-0 text-[14px]">{p.short}</span>
          </button>
        ))}
      </div>
      <div
        className={
          rail
            ? "border-t border-border pt-3"
            : "relative flex w-[196px] shrink-0 items-center justify-center"
        }
      >
        {!rail && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-0 h-7 -translate-y-1/2 border-l border-border"
          />
        )}
        <Action
          variant="ghost"
          onClick={() => {
            s.setSettings(null)
            s.setLibraryOpen(true)
          }}
          aria-haspopup="dialog"
          className={`!border-0 text-muted-foreground ${rail ? "w-full justify-start !px-4" : "!px-4"}`}
        >
          <Library size={16} aria-hidden="true" />
          Browse profiles
        </Action>
      </div>
    </div>
  )
}
export function UtilityButtons({ s, vertical = false }) {
  return (
    <div className={vertical ? "grid gap-2" : "flex gap-3"}>
      {[
        [Flame, "Steam"],
        [Droplets, "Hot water"],
        [Waves, "Flush"],
      ].map(([Icon, name]) => (
        <Action
          key={name}
          variant="ghost"
          aria-expanded={s.settings === name}
          onClick={() => s.setSettings(s.settings === name ? null : name)}
          aria-label={name}
          className={`w-[184px] justify-between ${vertical ? "!px-3" : "!px-4"} text-muted-foreground`}
        >
          <span className="flex items-center gap-2">
            <Icon size={16} aria-hidden="true" />
            <span className="tabular-nums">
              {s.operation === name
                ? `${name} · ${s.remaining}s`
                : name === "Steam" && !s.steamEnabled
                  ? "Steam · Off"
                  : name}
            </span>
          </span>
          <ChevronRight size={14} />
        </Action>
      ))}
    </div>
  )
}
export function UtilityCard({ s }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!s.settings) return
    const trigger = document.activeElement
    ref.current?.focus()
    return () => {
      if (trigger?.isConnected) trigger.focus()
    }
  }, [s.settings])
  if (!s.settings) return null
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={`${s.settings} settings`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation()
          s.setSettings(null)
        }
      }}
      className="absolute bottom-[108px] left-6 z-[var(--z-dropdown)] w-[380px] rounded-xl border border-border bg-card p-6 shadow-2xl focus-visible:outline-2 focus-visible:outline-foreground"
    >
      <UtilitySettings s={s} />
    </section>
  )
}
export function UtilitySettings({ s }) {
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

        {water && (
          <Stepper
            label="Water temperature"
            value={s.waterTemperature}
            unit="°C"
            step={1}
            min={60}
            max={98}
            disabled={!!s.operation}
            onChange={s.setWaterTemperature}
          />
        )}
        <Stepper
          label={steam ? "Steam time" : water ? "Water time" : "Flush time"}
          value={steam ? s.steamTime : water ? s.waterTime : s.flushTime}
          unit="s"
          step={steam ? 5 : 1}
          min={steam ? 5 : 1}
          max={steam ? 90 : water ? 60 : 30}
          disabled={!!s.operation || (steam && !s.steamEnabled)}
          onChange={
            steam ? s.setSteamTime : water ? s.setWaterTime : s.setFlushTime
          }
        />
        <Action
          className="h-14 w-full tabular-nums"
          disabled={
            s.active ||
            !s.ready ||
            (!!s.operation && !running) ||
            (steam && !s.steamEnabled)
          }
          onClick={() => s.utility(s.settings)}
        >
          {running ? (
            <Square size={16} />
          ) : steam ? (
            <Flame size={16} />
          ) : water ? (
            <Droplets size={16} />
          ) : (
            <Waves size={16} />
          )}
          {running
            ? `Stop ${s.settings.toLowerCase()} · ${s.remaining}s`
            : `Start ${s.settings.toLowerCase()}`}
        </Action>
      </div>
      <p className="mt-4 text-[12px] text-muted-foreground">
        {running
          ? "Timer running · settings are locked."
          : steam && !s.steamEnabled
            ? "Enable steam to use this function."
            : "Saved for this demo session."}
      </p>
    </>
  )
}

export function SessionHistory({ s }) {
  return (
    <Action
      variant="ghost"
      className="!px-3 text-muted-foreground"
      onClick={() => s.setModal("history")}
    >
      <History size={16} />
      History
    </Action>
  )
}
export function Extraction({
  s,
  height = 210,
  temperature = false,
  compactLegend = false,
}) {
  return (
    <div
      className="graph-color"
      style={{
        "--signal": "oklch(.76 .14 250)",
        "--signal-warm": "oklch(.78 .13 65)",
        ...(temperature
          ? { "--signal-temperature": "oklch(.78 .12 330)" }
          : {}),
      }}
    >
      <Trace
        s={s}
        height={height}
        temperature={temperature}
        compactLegend={compactLegend}
      />
    </div>
  )
}
export function ShotNumbers({ s, large = false }) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {[
        ["Time", s.shot.elapsed.toFixed(1), "s"],
        ["In the cup", s.connected ? s.shot.weight.toFixed(1) : "—", "g"],
        ["Pressure", s.connected ? s.shot.pressure.toFixed(1) : "—", "bar"],
        ["Flow", s.connected ? s.shot.flow.toFixed(1) : "—", "ml/s"],
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
export function Brew({ s, className = "" }) {
  return (
    <BrewButton
      s={s}
      className={`bg-foreground text-background hover:bg-foreground/90 ${className}`}
    />
  )
}
export function Notice({ s }) {
  return !s.connected || s.phase === "heating" ? (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-2 text-[13px]"
    >
      <AlertCircle size={16} />
      <span>
        {s.phase === "heating"
          ? "Heating to your brew temperature."
          : s.phase === "error"
            ? "Check the water tank before brewing."
            : "Machine disconnected. Your recipe is saved."}
      </span>
      <Action variant="ghost" className="ml-auto !px-2" onClick={s.reset}>
        {s.phase === "heating" ? "Skip warmup" : "Reset demo"}
      </Action>
    </div>
  ) : null
}

export function BottomBar({
  s,
  history = true,
  dividers = true,
  stopDestructive = false,
}) {
  return (
    <footer className="flex h-[96px] shrink-0 items-center gap-6 border-t border-border bg-background px-7 pb-[env(safe-area-inset-bottom)]">
      {history && (
        <>
          <SessionHistory s={s} />
          {dividers && (
            <span aria-hidden="true" className="h-8 border-l border-border" />
          )}
        </>
      )}
      <UtilityButtons s={s} />
      <span
        aria-hidden="true"
        className={`ml-auto h-8 ${dividers ? "border-l border-border" : ""}`}
      />
      <Brew
        s={s}
        className={`w-[240px] shrink-0 ${stopDestructive && s.active ? "!bg-red-700 !text-white hover:!bg-red-600" : ""}`}
      />
    </footer>
  )
}
