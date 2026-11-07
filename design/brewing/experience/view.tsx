import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { Dispatch } from "react"
import CandidateHome from "./home"
import { RollingStatus, machineStatusTone } from "./rolling-status"
import type { TankCalibration } from "./tank"
import type { SkinSession } from "@/skin/use-skin"
import { BrewingChart } from "./chart"
import { isRunning, outcomeLabel } from "./model"
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
  const root = useRef<HTMLDivElement>(null)
  const chart = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const [size, setSize] = useState({ width: 1284, height: 484 })
  const expanded =
    s.phase !== "home" && s.phase !== "returning" && s.route === "home"
  const showingChart = s.phase !== "home" && s.route === "home"
  const last = s.samples.at(-1)
  const status = s.outcome
    ? outcomeLabel[s.outcome]
    : s.phase === "preparing"
      ? "Preparing"
      : (last?.stage ?? "Ready to brew")

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
      s.phase === "complete" ? 3000 : 280
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
  useLayoutEffect(() => {
    const element = chart.current
    const container = root.current
    if (!element || !container) return
    const layout = (animate: boolean) => {
      const anchor = container
        .querySelector(".focus-chart .graph-color")
        ?.getBoundingClientRect()
      if (!anchor) return
      const parent = container.getBoundingClientRect()
      const from = element.getBoundingClientRect()
      animation.current?.cancel()
      const next = expanded
        ? {
            left: 28,
            top: 232,
            width: parent.width - 56,
            height: parent.height - 296,
          }
        : {
            left: anchor.left - parent.left,
            top: anchor.top - parent.top,
            width: anchor.width,
            height: anchor.height,
          }
      Object.assign(element.style, {
        left: `${next.left}px`,
        top: `${next.top}px`,
        width: `${next.width}px`,
        height: `${next.height}px`,
      })
      if (
        animate &&
        from.width &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        animation.current = element.animate(
          [
            {
              transform: `translate(${from.left - parent.left - next.left}px, ${from.top - parent.top - next.top}px) scale(${from.width / next.width}, ${from.height / next.height})`,
            },
            { transform: "none" },
          ],
          {
            duration: expanded ? 280 : 220,
            easing: "cubic-bezier(0.645, 0.045, 0.355, 1)",
          }
        )
      }
    }
    for (const node of container.querySelectorAll<HTMLElement>(".focus-body")) {
      node.inert = expanded
      node.setAttribute("aria-hidden", String(expanded))
    }
    layout(showingChart)
    let previousWidth = container.clientWidth
    let previousHeight = container.clientHeight
    const observer = new ResizeObserver(() => {
      if (
        container.clientWidth === previousWidth &&
        container.clientHeight === previousHeight
      )
        return
      previousWidth = container.clientWidth
      previousHeight = container.clientHeight
      layout(false)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [expanded, showingChart])
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
      animation.current?.cancel()
    }
  }, [])
  const stale = s.outcome === "disconnected"
  const value = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? "—" : v.toFixed(1)
  const navigate = () => dispatch({ type: "navigate", route: "away" })
  const displayHome: SkinSession = {
    ...home,
    snapshot: {
      ...home.snapshot,
      machine: home.snapshot.machine
        ? {
            ...home.snapshot.machine,
            groupTemperature: showingChart
              ? (last?.groupTemperature ?? undefined)
              : home.snapshot.machine.groupTemperature,
          }
        : null,
    },
    profileLocked: isRunning(s) || stale,
    locked: isRunning(s) || stale,
    block: stale ? "Disconnected" : isRunning(s) ? "Brewing" : "",
    status: stale
      ? "Disconnected"
      : s.phase === "preparing" || home.phase === "heating"
        ? "Heating"
        : "Ready",
    phase: stale
      ? "disconnected"
      : s.phase === "interrupted"
        ? "error"
        : "ready",
    connected: !stale,
    ready: !showingChart,
    shot: {
      ...home.shot,
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
  return (
    <div
      ref={root}
      className="brew-preview"
      data-expanded={expanded}
      data-phase={s.phase}
      data-away={s.route === "away"}
    >
      <div className="brew-home" inert={s.route === "away"}>
        <CandidateHome
          tankCalibration={tankCalibration}
          s={displayHome}
          onSettings={navigate}
          onHistory={navigate}
          onBrowse={navigate}
          onEdit={navigate}
          onAssign={navigate}
        />
      </div>
      <section
        className="brew-live"
        data-visible={expanded}
        aria-hidden={!expanded}
        inert={!expanded}
        aria-label="Shot monitoring"
      >
        <div className="brew-title">
          <RollingStatus
            label={status}
            running={isRunning(s)}
            tone={
              s.outcome
                ? ["success", "manual"].includes(s.outcome)
                  ? "complete"
                  : "error"
                : machineStatusTone(
                    s.phase === "preparing" ? "heating" : "espresso",
                    s.phase === "preparing"
                      ? "preparingForShot"
                      : last?.frame === 0
                        ? "preinfusion"
                        : "pouring"
                  )
            }
          />
        </div>
        <div className="brew-metrics">
          {[
            ["Time", value(last?.elapsed), "s"],
            ["Pressure", stale ? "—" : value(last?.pressure), "bar"],
            ["Flow", stale ? "—" : value(last?.flow), "mL/s"],
            ["In the cup", stale ? "—" : value(last?.beverageWeight), "g"],
            [
              "Group temperature",
              stale ? "—" : value(last?.groupTemperature),
              "°C",
            ],
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
      </section>
      <div
        ref={chart}
        className="brew-chart-surface"
        data-visible={showingChart}
        aria-hidden={!showingChart}
      >
        <BrewingChart
          samples={s.samples}
          width={size.width}
          height={size.height}
        />
      </div>
      {expanded &&
        (s.phase === "interrupted" ||
          (s.phase === "complete" && !s.autoReturn)) && (
          <div className="brew-alert" role="alert">
            <span>
              {s.outcome === "disconnected"
                ? "Last received trace · machine state is unknown."
                : s.outcome === "blocked"
                  ? "Brewing was blocked."
                  : "Review this shot before returning home."}
            </span>
            <button onClick={() => dispatch({ type: "dismiss" })}>
              Back to Home
            </button>
          </div>
        )}
      {expanded && last?.weightFlow === null && s.phase === "active" && (
        <p className="brew-scale-note" role="status">
          Scale unavailable · weight flow and cup weight are unavailable
        </p>
      )}
      <div className="brew-toast" role="status" data-visible={!!s.toast}>
        {s.toast}
      </div>
      {s.route === "away" && (
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
      )}
    </div>
  )
}
