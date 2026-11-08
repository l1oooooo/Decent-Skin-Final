import { useId, useState } from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverClose,
} from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { History, Settings, Power, Gauge, X } from "lucide-react"
import type { SkinSession } from "@/skin/use-skin"
import { format } from "@/skin/use-skin"
import { Stepper } from "@/skin/controls"
import { tankMillilitres, type TankCalibration } from "./tank"

type Utility = "Steam" | "Hot water" | "Flush"

function UtilityCard({ s, utility }: { s: SkinSession; utility: Utility }) {
  const switchId = useId()
  const steam = utility === "Steam"
  const steamAvailable = Number.isFinite(s.steamTemperature)
  const water = utility === "Hot water"
  return (
    <section className="candidate-utility" aria-label={`${utility} settings`}>
      {steam && (
        <div className="utility-toggle">
          <label htmlFor={switchId}>Steam function</label>
          <Switch
            id={switchId}
            className="steam-switch"
            aria-label="Enable steam"
            checked={s.steamEnabled}
            disabled={s.profileLocked || !steamAvailable}
            onCheckedChange={(checked) => void s.toggleSteam(checked)}
          />
        </div>
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
  onConnections,
  onHistory,
}: {
  s: SkinSession
  tankCalibration: TankCalibration
  onConnections: () => void
  onSettings: () => void
  onHistory: () => void
}) {
  const [open, setOpen] = useState(false)
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
          {s.scaleConnected ? (
            <strong>{`${format(s.scaleWeight)} g`}</strong>
          ) : (
            <button
              type="button"
              className="scale-connection-action"
              aria-label="Scale disconnected. Open Connections to reconnect"
              onClick={onConnections}
            >
              Disconnected
            </button>
          )}
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="candidate-action">
            <Gauge size={16} aria-hidden="true" />
            Machine Setting
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="candidate-popover focus-skin !gap-0 !shadow-none !ring-0"
          >
            <div className="candidate-popover-title">
              <PopoverTitle>Machine Setting</PopoverTitle>
              <PopoverClose aria-label="Close machine settings">
                <X size={18} />
              </PopoverClose>
            </div>
            <Tabs defaultValue="Steam" className="candidate-tabs">
              <TabsList variant="line" aria-label="Machine functions">
                {(["Steam", "Hot water", "Flush"] as const).map((name) => (
                  <TabsTrigger key={name} value={name}>
                    {name === "Hot water" ? "Hot Water" : name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {(["Steam", "Hot water", "Flush"] as const).map((name) => (
                <TabsContent key={name} value={name}>
                  <UtilityCard s={s} utility={name} />
                </TabsContent>
              ))}
            </Tabs>
            {!Number.isFinite(s.steamTemperature) && (
              <p className="utility-note">Steam setting unavailable.</p>
            )}
            {s.notice && (
              <p className="utility-note" role="alert">
                {s.notice}
              </p>
            )}
          </PopoverContent>
        </Popover>
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
