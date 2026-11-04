import {
  ChevronUp,
  Droplet,
  Droplets,
  Flame,
  History,
  Library,
  RotateCw,
  Thermometer,
  Waves,
} from "lucide-react"
import { Action } from "./common"
import {
  Brew,
  TabletStatus,
  UtilitySettings,
  Wordmark,
} from "./tablet-controls"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import dFlow from "./assets/profiles/d-flow.jpg"
import espresso from "./assets/profiles/80s-espresso.jpg"
import blooming from "./assets/profiles/easy-blooming.jpg"
import allonge from "./assets/profiles/rao-allonge.jpg"
import gentle from "./assets/profiles/gentle-sweet.jpg"

const artwork = [dFlow, espresso, blooming, allonge, gentle]

export function RevisionHeader({ s }) {
  return (
    <header className="flex h-[72px] shrink-0 items-center border-b border-border pr-7">
      <div className="w-[220px] shrink-0 px-7">
        <Wordmark />
      </div>
      <div
        aria-label="Machine status"
        className="ml-auto flex items-center gap-6"
      >
        <TabletStatus s={s} />
        <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums">
          <Thermometer size={14} aria-hidden="true" />
          {s.connected ? `${s.shot.temperature.toFixed(1)}°C` : "—°C"}
        </span>
        <span
          aria-label="Water level"
          className="inline-flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums"
        >
          <Droplet size={14} aria-hidden="true" />
          {s.waterLevel === null ? "Water —" : `Water ${s.waterLevel}%`}
        </span>
        {s.scaleConnected ? (
          <span
            aria-label={`Scale weight ${s.scaleWeight.toFixed(1)} grams`}
            className="inline-flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums"
          >
            <span>Scale</span>
            <span className="min-w-[5ch]">{s.scaleWeight.toFixed(1)}g</span>
          </span>
        ) : (
          <Action
            variant="ghost"
            aria-label="Retry scale connection"
            title="Scale disconnected — retry connection"
            className="gap-2 !px-2 text-[12px] text-muted-foreground"
            onClick={s.retryScale}
          >
            <span>Scale</span>
            <span>Retry</span>
            <RotateCw size={14} aria-hidden="true" />
          </Action>
        )}
      </div>
      <Action
        variant="ghost"
        aria-label="History"
        aria-haspopup="dialog"
        title="History"
        className="ml-6 !size-12 !px-0 text-muted-foreground"
        onClick={() => {
          s.setSettings(null)
          s.setModal("history")
        }}
      >
        <History size={16} aria-hidden="true" />
      </Action>
    </header>
  )
}

export function RevisionProfiles({ s }) {
  const image = artwork[s.profileIndex]
  return (
    <aside
      aria-label="Profile selection"
      className="flex w-[220px] shrink-0 flex-col gap-4 border-r border-border bg-[var(--recess)] p-4"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div
          role="group"
          aria-label="Favorite profiles"
          className="flex shrink-0 flex-col gap-1"
        >
          {s.profiles.map((profile, index) => (
            <button
              key={profile.name}
              type="button"
              aria-label={`Select ${profile.name}`}
              aria-pressed={s.profileIndex === index}
              disabled={s.locked}
              onClick={() => s.selectProfile(index)}
              className={`flex h-12 min-h-12 shrink-0 items-center justify-between gap-2 rounded-[var(--control-radius)] px-3 text-left text-[14px] font-medium focus-visible:outline-offset-2 ${s.profileIndex === index ? "bg-foreground/15 text-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <span>{profile.short}</span>
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${s.profileIndex === index ? "bg-foreground" : "bg-border"}`}
              />
            </button>
          ))}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--control-radius)] bg-muted">
          {image ? (
            <img
              src={image}
              width={768}
              height={768}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover outline-1 -outline-offset-1 outline-white/10 select-none"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full items-center justify-center text-muted-foreground"
            >
              <Library size={40} strokeWidth={1} />
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-border pt-3">
        <Action
          variant="ghost"
          aria-haspopup="dialog"
          className="w-full justify-start !px-3 text-muted-foreground"
          onClick={() => {
            s.setSettings(null)
            s.setLibraryOpen(true)
          }}
        >
          <Library size={16} aria-hidden="true" />
          Browse profiles
        </Action>
      </div>
    </aside>
  )
}

export function RevisionBottomBar({ s, container }) {
  return (
    <footer className="flex h-[96px] shrink-0 items-center gap-6 border-t border-border bg-background pr-6 pb-[env(safe-area-inset-bottom)] pl-7">
      <div className="flex gap-3">
        {[
          [Flame, "Steam"],
          [Droplets, "Hot water"],
          [Waves, "Flush"],
        ].map(([Icon, name]) => (
          <Popover
            key={name}
            open={s.settings === name}
            onOpenChange={(open) => s.setSettings(open ? name : null)}
          >
            <PopoverTrigger
              aria-label={name}
              render={
                <Action
                  variant="ghost"
                  className="w-auto justify-start gap-3 !pr-3.5 !pl-4 text-muted-foreground"
                />
              }
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
              <ChevronUp
                size={14}
                aria-hidden="true"
                className={s.settings === name ? "rotate-180" : ""}
              />
            </PopoverTrigger>
            <PopoverContent
              container={container}
              aria-label={`${name} settings`}
            >
              <UtilitySettings s={{ ...s, settings: name }} />
            </PopoverContent>
          </Popover>
        ))}
      </div>
      <Brew
        s={s}
        className={`ml-auto w-[279px] shrink-0 ${s.active ? "!rounded-[8px] !border-transparent !bg-[#e7000b]/10 !text-[#e7000b] hover:!bg-[#e7000b]/20" : ""}`}
      />
    </footer>
  )
}
