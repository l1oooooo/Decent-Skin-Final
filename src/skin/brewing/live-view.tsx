import { conciseNumber, elapsedTime } from "@/skin/format"
import { useEffect, useRef, useState } from "react"
import type { Dispatch } from "react"
import CandidateHome from "./home"
import { ProfileChart } from "./profile-chart"
import { useBrewLayout } from "./use-brew-layout"
import { RollingStatus, machineStatusTone } from "./rolling-status"
import type { TankCalibration } from "./tank"
import type { SkinSession } from "@/skin/use-skin"
import { notifications } from "@/skin/notifications/manager"
import { BrewingChart } from "./chart"
import { isRunning, outcomeLabel } from "./model"
import type { BrewEvent, ExperienceState } from "./model"

export function LiveBrewingScreen({
  state: s,
  dispatch,
  home,
  tankCalibration,
  onSettings,
  onConnections,
  onHistory,
  onBrowse,
  onEdit,
  onAssign,
  embedded = false,
}: {
  embedded?: boolean
  state: ExperienceState
  dispatch: Dispatch<BrewEvent>
  home: SkinSession
  tankCalibration: TankCalibration
  onConnections: () => void
  onSettings: () => void
  onHistory: () => void
  onBrowse: () => void
  onEdit: () => void
  onAssign: (slot: number) => void
}) {
  useEffect(
    () => () => {
      if (s.shotId) notifications.close(`shot-result-${s.shotId}`)
    },
    [s.shotId]
  )
  useEffect(() => {
    if (!s.toast || !s.shotId) return
    notifications.show(`shot-result-${s.shotId}`, {
      title: s.toast,
      type: s.outcome === "success" ? "success" : "info",
    })
    dispatch({ type: "clearToast", shotId: s.shotId })
  }, [s.toast, s.shotId, s.outcome, dispatch])
  const review =
    s.phase === "interrupted" || (s.phase === "complete" && !s.autoReturn)
  useEffect(() => {
    notifications.condition(
      "shot-review",
      review ? `${s.shotId}-${s.outcome}` : null,
      {
        title:
          s.outcome === "disconnected"
            ? "Last received trace · machine state is unknown."
            : s.outcome === "blocked"
              ? "Brewing was blocked."
              : "Review this shot before returning home.",
        type: "warning",
        persistent: true,
        action: {
          children: "Back to Home",
          onClick: () => dispatch({ type: "dismiss" }),
        },
      }
    )
    return () => {
      if (review) notifications.condition("shot-review", null, { title: "" })
    }
  }, [review, s.shotId, s.outcome, dispatch])
  const root = useRef<HTMLDivElement>(null)
  const chart = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 1284, height: 484 })
  const expanded = s.phase !== "home" && s.phase !== "returning"
  const showingChart = s.phase !== "home"
  const last = s.samples.at(-1)
  const status = s.outcome
    ? outcomeLabel[s.outcome]
    : isRunning(s) && !home.machineFresh
      ? "Waiting for data"
      : s.phase === "preparing"
        ? "Preparing"
        : home.active
          ? home.status
          : (last?.stage ?? "Brewing")

  useBrewLayout(root, expanded, s.phase === "returning")
  useEffect(() => {
    const node = chart.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [])
  const stale =
    !home.connected || !home.machineFresh || s.outcome === "disconnected"
  const value = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? "—" : v.toFixed(1)
  const machine = home.snapshot.machine
  return (
    <div
      ref={root}
      className="brew-preview"
      data-embedded={embedded}
      data-expanded={expanded}
      data-phase={s.phase}
      data-away={s.route === "away"}
    >
      <div className="brew-home">
        <CandidateHome
          sharedChart
          animateNumbers={s.phase === "home"}
          tankCalibration={tankCalibration}
          s={home}
          showHeader={!embedded}
          onSettings={onSettings}
          onConnections={onConnections}
          onHistory={onHistory}
          onBrowse={onBrowse}
          onEdit={onEdit}
          onAssign={onAssign}
        />
      </div>
      <section
        className="brew-live"
        data-visible={expanded}
        aria-hidden={!expanded}
        inert={!expanded}
        aria-label="Shot monitoring"
      >
        <div className="brew-profile-heading">
          <h1 className="brew-profile-name" title={s.profileName || undefined}>
            {s.profileName || "Profile unavailable"}
          </h1>
        </div>
        <div className="brew-title" aria-label="Machine state" tabIndex={-1}>
          <RollingStatus
            label={status}
            running={isRunning(s)}
            tone={
              s.outcome
                ? ["success", "manual", "ended"].includes(s.outcome)
                  ? "complete"
                  : "error"
                : !home.machineFresh
                  ? "error"
                  : machineStatusTone(
                      machine?.state.state ?? "disconnected",
                      machine?.state.substate ?? ""
                    )
            }
          />
        </div>
        <div className="brew-data">
          <div className="brew-metrics">
            {[
              [
                "Time",
                home.snapshot.elapsedKnown ? elapsedTime(last?.elapsed) : "—",
                "",
              ],
              [
                "In the cup",
                stale || !home.scaleConnected
                  ? "—"
                  : value(home.active ? home.scaleWeight : home.shot.weight),
                "g",
              ],
              [
                "Temperature",
                stale
                  ? "—"
                  : conciseNumber(
                      home.displayTemperature(last?.groupTemperature),
                      1
                    ),
                `°${home.temperatureUnit}`,
              ],
              ["Pressure", stale ? "—" : value(last?.pressure), "bar"],
              ["Flow", stale ? "—" : value(last?.flow), "mL/s"],
            ].map(([label, reading, unit]) => (
              <div key={label}>
                <span>{label}</span>
                <p>
                  {reading}
                  <small>{unit}</small>
                </p>
              </div>
            ))}
          </div>
          <div className="brew-live-chart-anchor" aria-hidden="true" />
        </div>
      </section>
      <div className="brew-chart-surface" data-visible="true">
        <div className="brew-chart-preview" aria-hidden={showingChart}>
          <ProfileChart profile={home.rawProfile} />
        </div>
        <div
          ref={chart}
          className="brew-chart-live"
          aria-hidden={!showingChart}
        >
          <BrewingChart
            animateTime={expanded}
            shotKey={s.shotId}
            samples={s.samples}
            width={size.width}
            height={size.height}
            temperatureUnit={home.temperatureUnit}
          />
        </div>
      </div>
    </div>
  )
}
