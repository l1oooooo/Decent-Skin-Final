import { useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { History, Settings, Power, Wind, Droplet, Waves, X } from "lucide-react"
import type { SkinSession } from "@/skin/use-skin"
import { format } from "@/skin/use-skin"
import { Stepper } from "@/skin/controls"
import { tankMillilitres, type TankCalibration } from "./tank"

type Utility = "Steam" | "Hot water" | "Flush"

function UtilityCard({ s, utility }: { s: SkinSession; utility: Utility }) {
  const steam = utility === "Steam"
  const water = utility === "Hot water"
  return (
    <section className="candidate-utility" aria-label={`${utility} settings`}>
      {steam && (
        <button
          type="button"
          role="switch"
          aria-label="Enable steam"
          aria-checked={s.steamEnabled}
          disabled={s.profileLocked}
          onClick={() => void s.toggleSteam(!s.steamEnabled)}
          className="utility-toggle"
        >
          <span>Steam function</span>
          <span>{s.steamEnabled ? "On" : "Off"}</span>
        </button>
      )}
      {(steam || water) && (
        <Stepper
          label={steam ? "Steam temperature" : "Water temperature"}
          value={s.displayTemperature(
            steam ? s.steamTemperature : s.waterTemperature
          )}
          unit={`°${s.temperatureUnit}`}
          step={s.temperatureUnit === "F" ? 1.8 : 1}
          min={s.displayTemperature(steam ? 135 : 60)}
          max={s.displayTemperature(steam ? 160 : 98)}
          disabled={s.profileLocked || (steam && !s.steamEnabled)}
          onChange={(value) =>
            (steam ? s.setSteamTemperature : s.setWaterTemperature)(
              Math.round(s.celsius(value))
            )
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
    </section>
  )
}

export function CandidateHeader({
  s,
  tankCalibration,
  onSettings,
  onHistory,
}: {
  s: SkinSession
  tankCalibration: TankCalibration
  onSettings: () => void
  onHistory: () => void
}) {
  const [utility, setUtility] = useState<Utility | null>(null)
  const tank = tankMillilitres(s.waterLevel, tankCalibration, s.connected)
  const temperature = (value: number | null | undefined) =>
    `${format(s.displayTemperature(s.connected ? (value ?? null) : null), 0)} °${s.temperatureUnit}`
  return (
    <header className="candidate-header">
      <div className="candidate-readouts" aria-label="Machine status">
        <div
          className="candidate-status"
          title={s.status}
          role="status"
          aria-label="Machine state"
          tabIndex={-1}
          data-ready={s.ready}
          data-operation={s.active ? "espresso" : (s.operation ?? "idle")}
        >
          <span>DE1</span>
          <strong>{s.status}</strong>
        </div>
        <div
          className="scale-readout"
          aria-label={
            s.scaleConnected
              ? `Scale weight ${format(s.scaleWeight)} grams`
              : "Scale disconnected"
          }
        >
          <span>Scale</span>
          <strong>
            {s.scaleConnected ? `${format(s.scaleWeight)} g` : "Disconnected"}
          </strong>
        </div>
        <div aria-label="Group temperature">
          <span>Group</span>
          <strong>{temperature(s.snapshot.machine?.groupTemperature)}</strong>
        </div>
        <div aria-label="Steam temperature">
          <span>Steam</span>
          <strong>{temperature(s.liveSteamTemperature)}</strong>
        </div>
        <div
          aria-label="Tank volume"
          title="Estimated volume for the confirmed tank calibration"
        >
          <span>Tank</span>
          <strong>{tank === null ? "—" : tank} ml</strong>
        </div>
      </div>
      <nav className="candidate-actions" aria-label="Machine navigation">
        {(
          [
            ["Steam", Wind],
            ["Hot water", Droplet],
            ["Flush", Waves],
          ] as const
        ).map(([name, Icon]) => (
          <Popover.Root
            key={name}
            open={utility === name}
            onOpenChange={(next) =>
              setUtility((current) =>
                next ? name : current === name ? null : current
              )
            }
          >
            <Popover.Trigger className="candidate-action" aria-label={name}>
              <Icon size={16} aria-hidden="true" />
              {name === "Hot water" ? "Hot Water" : name}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                side="bottom"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="candidate-popover-position"
              >
                <Popover.Popup
                  className="candidate-popover focus-skin"
                  aria-label={`${name} settings`}
                >
                  <div className="candidate-popover-title">
                    <Popover.Title>
                      {name}
                      <span className="sr-only"> settings</span>
                    </Popover.Title>
                    <Popover.Close
                      aria-label={`Close ${name.toLowerCase()} settings`}
                    >
                      <X size={18} />
                    </Popover.Close>
                  </div>
                  <UtilityCard s={s} utility={name} />
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        ))}
        <button
          className="candidate-action"
          aria-label="History"
          onClick={() => {
            s.setSettings(null)
            onHistory()
          }}
        >
          <History size={16} aria-hidden="true" />
          Shot history
        </button>
        <button className="candidate-action" onClick={onSettings}>
          <Settings size={16} aria-hidden="true" />
          Settings
        </button>
        <button
          className="candidate-action"
          aria-label="Sleep machine"
          title={s.block || "Sleep machine"}
          disabled={!!s.block}
          onClick={() => void s.sleep()}
        >
          <Power size={16} aria-hidden="true" />
          Sleep
        </button>
      </nav>
    </header>
  )
}
