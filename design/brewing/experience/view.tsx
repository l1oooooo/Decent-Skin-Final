import { useEffect } from "react"
import type { Dispatch } from "react"
import type { TankCalibration } from "./tank"
import type { SkinSession } from "@/skin/use-skin"
import { LiveBrewingScreen } from "@/skin/brewing/live-view"
import { BREW_TRANSITION_MS } from "@/skin/brewing/use-brew-layout"
import { isRunning } from "./model"
import type { BrewEvent, ExperienceState } from "./model"

export function BrewingExperience({
  state: s,
  dispatch,
  home,
  tankCalibration,
}: {
  state: ExperienceState
  dispatch: Dispatch<BrewEvent>
  home: SkinSession
  tankCalibration: TankCalibration
}) {
  const showingChart = s.phase !== "home"
  const last = s.samples.at(-1)
  const stale = s.outcome === "disconnected"
  const navigate = () => dispatch({ type: "navigate", route: "away" })
  useEffect(() => {
    if (!s.shotId || s.route !== "home" || !s.autoReturn) return
    const id = s.shotId
    const event =
      s.phase === "complete"
        ? "holdElapsed"
        : s.phase === "returning"
          ? "returned"
          : null
    if (!event) return
    const timer = setTimeout(
      () => dispatch({ type: event, shotId: id }),
      s.phase === "complete" ? 3000 : BREW_TRANSITION_MS
    )
    return () => clearTimeout(timer)
  }, [s.shotId, s.phase, s.route, s.autoReturn, dispatch])
  useEffect(() => {
    if (!s.toast || !s.shotId) return
    const id = s.shotId
    const timer = setTimeout(
      () => dispatch({ type: "clearToast", shotId: id }),
      2400
    )
    return () => clearTimeout(timer)
  }, [s.shotId, s.toast, dispatch])
  const displayHome: SkinSession = {
    ...home,
    active: isRunning(s),
    machineFresh: !stale,
    snapshot: {
      ...home.snapshot,
      elapsedKnown: true,
      machine: home.snapshot.machine
        ? {
            ...home.snapshot.machine,
            state: {
              ...home.snapshot.machine.state,
              state: isRunning(s) ? "espresso" : "idle",
              substate:
                s.phase === "preparing"
                  ? "preparingForShot"
                  : last?.frame === 0
                    ? "preinfusion"
                    : "pouring",
            },
            groupTemperature: showingChart
              ? (last?.groupTemperature ?? undefined)
              : home.snapshot.machine.groupTemperature,
          }
        : null,
    },
    profileLocked: isRunning(s) || stale,
    locked: isRunning(s) || stale,
    block: stale ? "Disconnected" : isRunning(s) ? "Brewing" : "",
    status: isRunning(s)
      ? (last?.stage ?? "Preparing")
      : stale
        ? "Disconnected"
        : s.phase === "preparing" || home.phase === "heating"
          ? "Heating"
          : "Ready",
    phase: stale
      ? "disconnected"
      : s.phase === "interrupted"
        ? "error"
        : s.phase === "preparing"
          ? "heating"
          : "ready",
    connected: !stale,
    ready: !showingChart,
    shot: {
      ...home.shot,
      weight: last?.beverageWeight ?? 0,
      temperature: showingChart
        ? (last?.groupTemperature ?? null)
        : home.shot.temperature,
    },
    scaleConnected: !stale && (!showingChart || last?.weightFlow !== null),
    scaleWeight: stale
      ? null
      : showingChart
        ? (last?.beverageWeight ?? null)
        : 0,
    liveSteamTemperature: stale ? null : home.liveSteamTemperature,
    waterLevel: stale ? null : home.waterLevel,
  }

  if (s.route === "away")
    return (
      <div className="brew-preview" data-away="true">
        <section className="brew-away">
          <p>Navigation preview</p>
          <h1>You’ve left the brewing view.</h1>
          <p>
            {isRunning(s)
              ? "The shot continues in the background."
              : "This page stays open when a shot ends."}
          </p>
          <button onClick={() => dispatch({ type: "navigate", route: "home" })}>
            Return to brewing preview
          </button>
        </section>
      </div>
    )
  return (
    <LiveBrewingScreen
      state={s}
      dispatch={dispatch}
      home={displayHome}
      tankCalibration={tankCalibration}
      onConnections={navigate}
      onSettings={navigate}
      onHistory={navigate}
      onBrowse={navigate}
      onEdit={navigate}
      onAssign={navigate}
    />
  )
}
