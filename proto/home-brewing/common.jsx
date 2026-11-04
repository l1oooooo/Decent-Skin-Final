import { useEffect, useRef, useState } from "react"
import { Button } from "../../src/components/ui/button"
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Coffee,
  Droplets,
  Flame,
  Play,
  Square,
  Waves,
  X,
  AlertCircle,
  CircleCheck,
  Minus,
  Plus,
} from "lucide-react"
import { profiles } from "./use-session"

export function Action({ className = "", children, ...props }) {
  return (
    <Button
      {...props}
      className={`min-h-12 min-w-12 gap-2 rounded-[var(--control-radius)] px-5 text-[14px] font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none ${className}`}
    >
      {children}
    </Button>
  )
}
export function Eyebrow({ children, className = "" }) {
  return (
    <p
      className={`text-[12px] font-medium tracking-[0.13em] text-muted-foreground uppercase ${className}`}
    >
      {children}
    </p>
  )
}
export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg border border-border">
        <Coffee size={19} strokeWidth={1.5} />
      </div>
      {!compact && (
        <span className="text-[18px] font-medium tracking-[-0.04em]">
          decent<span className="text-muted-foreground">.</span>
        </span>
      )}
    </div>
  )
}
export function Status({ s }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span
        className={`size-1.5 rounded-full ${!s.connected ? "bg-destructive" : s.phase === "heating" || s.operation ? "bg-[var(--signal-warm)]" : "bg-[var(--signal)]"}`}
      />
      {s.status}
    </div>
  )
}
export function MachineMeta() {
  return (
    <span className="text-[12px] text-muted-foreground">
      DE1 · Decent Scale{" "}
      <span className="ml-3 rounded border border-border px-1.5 py-0.5 text-[10px] tracking-wider">
        DEMO
      </span>
    </span>
  )
}
export function BrewButton({ s, className = "", label = "Brew espresso" }) {
  return (
    <Action
      className={`h-14 ${s.active ? "bg-foreground text-background hover:bg-foreground/90" : ""} ${className}`}
      disabled={(!s.ready && !s.active) || !!s.operation}
      onClick={() => (s.active ? s.gateway.stopShot() : s.start())}
    >
      {s.active ? <Square size={16} /> : <Play size={16} className="ml-0.5" />}{" "}
      {s.active ? "Stop extraction" : s.complete ? "Brew again" : label}
    </Action>
  )
}
export function ProfileButton({ s, className = "" }) {
  return (
    <button
      disabled={s.active || !!s.operation}
      className={`flex min-h-12 min-w-0 items-center gap-3 text-left disabled:opacity-50 ${className}`}
      onClick={() => s.setModal("profiles")}
      aria-label="Choose profile"
    >
      <span className="min-w-0 break-words">{s.profile.name}</span>
      <ChevronDown size={18} className="shrink-0 text-muted-foreground" />
    </button>
  )
}
export function Metric({ label, value, unit, big = false, className = "" }) {
  return (
    <div className={className}>
      <p className="mb-3 text-[13px] text-muted-foreground">{label}</p>
      <p
        className={`${big ? "text-[64px]" : "text-[36px]"} leading-none font-medium tracking-[-0.055em] tabular-nums`}
      >
        {value}
        <span className="ml-2 text-[16px] font-normal tracking-normal text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  )
}
export function RecipeValues({ s, vertical = false, compact = false }) {
  return (
    <div
      className={
        vertical
          ? "flex flex-col divide-y divide-border"
          : "grid grid-cols-4 divide-x divide-border"
      }
    >
      {[
        ["Dose", s.dose.toFixed(1), "g"],
        ["Yield", s.yieldTarget.toFixed(1), "g"],
        ["Brew", s.temperature.toFixed(0), "°C"],
        ["Grind", s.grind, ""],
      ].map(([label, value, unit]) => (
        <button
          key={label}
          disabled={s.active || !!s.operation}
          aria-label={`Edit ${label.toLowerCase()}`}
          onClick={() => s.setModal("recipe")}
          className={`group ${compact ? "min-h-12" : "min-h-20"} text-left disabled:opacity-60 ${vertical ? `flex items-center justify-between ${compact ? "py-2" : "py-5"}` : "px-6 first:pl-0 last:pr-0"}`}
        >
          <span className="block text-[13px] text-muted-foreground">
            {label}
          </span>
          <span
            className={`${vertical ? "text-[22px]" : "mt-3 block text-[26px]"} tracking-[-0.035em] tabular-nums`}
          >
            {value}
            <span className="ml-1.5 text-[14px] text-muted-foreground">
              {unit}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
export function Utilities({ s, compact = false }) {
  return (
    <div className={`flex ${compact ? "gap-2" : "gap-3"}`}>
      {[
        [Flame, "Steam"],
        [Droplets, "Hot water"],
        [Waves, "Flush"],
      ].map(([Icon, name]) => (
        <Action
          key={name}
          variant="ghost"
          disabled={
            s.active || !s.ready || (!!s.operation && s.operation !== name)
          }
          aria-pressed={s.operation === name}
          onClick={() => s.utility(name)}
          className={
            s.operation === name
              ? "bg-muted text-foreground"
              : "text-muted-foreground"
          }
        >
          <Icon size={16} />
          {s.operation === name ? `Stop ${name.toLowerCase()}` : name}
        </Action>
      ))}
    </div>
  )
}
export function PhaseLine({ s }) {
  const p = s.complete
    ? 3
    : !s.active
      ? 0
      : s.shot.elapsed < 7
        ? 1
        : s.shot.elapsed < 24
          ? 2
          : 3
  return (
    <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
      {["Preinfusion", "Extraction", "Decline"].map((label, i) => (
        <div
          key={label}
          className={`flex flex-1 items-center gap-2 ${p === i + 1 ? "text-foreground" : ""}`}
        >
          <span
            className={`h-0.5 flex-1 ${p > i ? "bg-[var(--signal)]" : "bg-border"}`}
          />
          {label}
        </div>
      ))}
    </div>
  )
}
export function Trace({ s, height = 210, grid = true, simple = false }) {
  const root = useRef(null)
  const [w, setWidth] = useState(820)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])
  const h = 220,
    left = 35,
    right = w - 15,
    top = 18,
    bottom = 185
  const [showFlow, setFlow] = useState(true)
  const curve =
    s.active || s.complete
      ? s.samples
      : Array.from({ length: 121 }, (_, i) => {
          const t = i / 4
          return {
            elapsed: t,
            pressure:
              t === 0 || t === 30
                ? 0
                : t < 7
                  ? 3
                  : 9 - Math.max(0, t - 18) * 0.13,
            flow: t === 0 || t === 30 ? 0 : t < 7 ? 2 : 1.6,
          }
        })
  const points = curve
    .map(
      (p) =>
        `${left + (p.elapsed / 30) * (right - left)},${bottom - (p.pressure / 12) * (bottom - top)}`
    )
    .join(" ")
  const flow = curve
    .map(
      (p) =>
        `${left + (p.elapsed / 30) * (right - left)},${bottom - (p.flow / 4) * (bottom - top)}`
    )
    .join(" ")
  return (
    <div ref={root} className="min-w-0">
      <div className="mb-2 flex items-center gap-5 text-[12px]">
        <span className="flex items-center gap-2">
          <i className="h-0.5 w-3 bg-[var(--signal)]" />
          Pressure <span className="text-muted-foreground">bar</span>
        </span>
        {!simple && (
          <button
            className="flex min-h-11 items-center gap-2"
            aria-pressed={showFlow}
            onClick={() => setFlow(!showFlow)}
          >
            <i
              className={`h-0.5 w-3 ${showFlow ? "bg-[var(--signal-warm)]" : "bg-muted-foreground"}`}
            />
            <span className={showFlow ? "" : "text-muted-foreground"}>
              Flow
            </span>
            <span className="text-muted-foreground">ml/s · 0–4</span>
          </button>
        )}
        <span className="ml-auto text-muted-foreground">
          {s.active || s.complete ? "Simulated shot" : "Illustrative preview"}
        </span>
      </div>
      <svg
        className="w-full overflow-visible"
        style={{ height }}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Illustrative pressure and flow curves"
      >
        {grid &&
          [0, 3, 6, 9, 12].map((n) => (
            <g key={n}>
              <line
                x1={left}
                x2={right}
                y1={bottom - (n / 12) * (bottom - top)}
                y2={bottom - (n / 12) * (bottom - top)}
                stroke="var(--border)"
                strokeDasharray="2 5"
              />
              <text
                x="0"
                y={bottom - (n / 12) * (bottom - top) + 4}
                fill="var(--muted-foreground)"
                fontSize="12"
              >
                {n}
              </text>
            </g>
          ))}
        {[0, 10, 20, 30].map((n) => (
          <text
            key={n}
            x={left + (n / 30) * (right - left)}
            y="213"
            fill="var(--muted-foreground)"
            textAnchor={n === 30 ? "end" : "start"}
            fontSize="12"
          >
            {n}s
          </text>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="var(--signal)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={!s.active && !s.complete ? "5 5" : undefined}
        />
        {!simple && showFlow && (
          <polyline
            points={flow}
            fill="none"
            stroke="var(--signal-warm)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
        )}
      </svg>
    </div>
  )
}
export function StateNotice({ s }) {
  return !s.connected || s.phase === "heating" ? (
    <div
      role="status"
      className="flex items-center gap-3 rounded-[var(--control-radius)] border border-border bg-card px-5 py-3 text-[14px]"
    >
      <AlertCircle
        size={18}
        className={
          !s.connected ? "text-destructive" : "text-[var(--signal-warm)]"
        }
      />
      <span>
        {!s.connected
          ? s.phase === "error"
            ? "The water tank needs attention."
            : "Connection lost. Your recipe is saved."
          : "The group is warming up to your brew temperature."}
      </span>
      <Action className="ml-auto" variant="outline" onClick={s.reset}>
        {s.phase === "heating" ? "Skip warmup" : "Reconnect demo"}
      </Action>
    </div>
  ) : null
}
export function Result({ s }) {
  return (
    <div className="flex items-center gap-3 text-[14px]">
      <CircleCheck size={18} className="text-[var(--signal)]" />
      <span>
        {s.shot.weight.toFixed(1)} g in {s.shot.elapsed.toFixed(1)} s
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">Ready for the next cup.</span>
    </div>
  )
}
export function SessionDialogs({ s }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!s.modal) return
    const trigger = document.activeElement
    ref.current?.showModal()
    return () => trigger?.focus()
  }, [s.modal])
  if (!s.modal) return null
  return (
    <dialog
      ref={ref}
      aria-labelledby="session-dialog-title"
      onClose={() => s.setModal(null)}
      className="fixed m-auto max-h-[85dvh] w-[520px] max-w-[90vw] overflow-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between border-b border-border px-7 py-4">
        <h2 id="session-dialog-title" className="text-[20px] font-medium">
          {s.modal === "profiles"
            ? "Choose your profile"
            : s.modal === "recipe"
              ? "Recipe settings"
              : "Recent shots"}
        </h2>
        <Action
          variant="ghost"
          aria-label="Close dialog"
          onClick={() => ref.current.close()}
        >
          <X size={18} />
        </Action>
      </div>
      {s.modal === "profiles" ? (
        <div className="p-3">
          {profiles.map((profile, i) => (
            <button
              key={profile.name}
              onClick={() => s.selectProfile(i)}
              className="flex min-h-24 w-full items-center gap-4 rounded-lg px-4 py-4 text-left hover:bg-muted"
            >
              <div className="flex-1">
                <p className="text-[16px]">{profile.name}</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {profile.kind} · {profile.by}
                </p>
              </div>
              {i === s.profileIndex ? (
                <Check size={18} />
              ) : (
                <ArrowUpRight size={18} className="text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      ) : s.modal === "recipe" ? (
        <form
          className="space-y-5 p-7"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            s.setDose(Number(data.get("dose")))
            s.setYield(Number(data.get("yield")))
            s.setTemperature(Number(data.get("temperature")))
            s.setGrind(data.get("grind"))
            s.setModal(null)
          }}
        >
          {[
            ["dose", "Dose (g)", s.dose, 8, 30, 0.1],
            ["yield", "Target yield (g)", s.yieldTarget, 10, 100, 0.5],
            [
              "temperature",
              "Brew temperature (°C)",
              s.temperature,
              60,
              98,
              0.5,
            ],
          ].map(([name, label, value, min, max, step]) => (
            <label
              key={name}
              className="flex items-center justify-between text-[14px]"
            >
              {label}
              <input
                className="h-12 w-28 rounded-lg border border-input bg-background px-3 text-[16px] tabular-nums"
                name={name}
                type="number"
                defaultValue={value}
                min={min}
                max={max}
                step={step}
                required
              />
            </label>
          ))}
          <label className="flex items-center justify-between text-[14px]">
            Grind setting
            <input
              className="h-12 w-28 rounded-lg border border-input bg-background px-3 text-[16px]"
              name="grind"
              defaultValue={s.grind}
              maxLength={12}
              required
            />
          </label>
          <p className="text-[12px] text-muted-foreground">
            Changes apply only to this simulated session.
          </p>
          <Action type="submit" className="w-full">
            Apply recipe
          </Action>
        </form>
      ) : (
        <div className="p-7">
          {s.history.length ? (
            s.history.map((shot, i) => (
              <div className="border-b border-border py-4" key={i}>
                <p>{shot.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {shot.weight.toFixed(1)} g · {shot.time.toFixed(1)} seconds
                </p>
              </div>
            ))
          ) : (
            <>
              <p className="text-[18px]">Your first cup starts here.</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Completed demo shots appear here when you start your next shot.
              </p>
            </>
          )}
        </div>
      )}
    </dialog>
  )
}
export function SimulationBar({ s }) {
  return (
    <div className="flex items-center gap-2">
      <span className="mr-2 text-[12px] text-muted-foreground">
        {s.active
          ? s.paused
            ? "Paused"
            : "Simulation running"
          : "No machine connected"}
      </span>
      {s.active && (
        <>
          <Action variant="ghost" onClick={() => s.setPaused(!s.paused)}>
            {s.paused ? "Resume" : "Pause"}
          </Action>
          <Action variant="ghost" onClick={() => s.gateway.advance(5)}>
            +5s
          </Action>
        </>
      )}
    </div>
  )
}
export {
  Coffee,
  Flame,
  Droplets,
  Waves,
  Check,
  ArrowUpRight,
  Play,
  Square,
  Minus,
  Plus,
}
