import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { Dispatch } from "react"
import CandidateHome from "./home"
import { RollingStatus, machineStatusTone } from "./rolling-status"
import type { TankCalibration } from "./tank"
import type { SkinSession } from "@/skin/use-skin"
import { Notice } from "@/skin/controls"
import { BrewingChart } from "./chart"
import { isRunning, outcomeLabel } from "./model"
import type { BrewEvent, ExperienceState } from "./model"

export function LiveBrewingScreen({
  state: s,
  dispatch,
  home,
  tankCalibration,
  onSettings,
  onHistory,
  onBrowse,
  onEdit,
  onAssign,
}: {
  state: ExperienceState
  dispatch: Dispatch<BrewEvent>
  home: SkinSession
  tankCalibration: TankCalibration
  onSettings: () => void
  onHistory: () => void
  onBrowse: () => void
  onEdit: () => void
  onAssign: (slot: number) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const chart = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
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
      const compact = parent.height <= 650
      const chartTop = parent.width <= 1050 ? 248 : compact ? 208 : 232
      const next = expanded
        ? {
            left: 28,
            top: chartTop,
            width: parent.width - 56,
            height: Math.max(150, parent.height - chartTop - 64),
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
  const stale =
    !home.connected || !home.machineFresh || s.outcome === "disconnected"
  const value = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? "—" : v.toFixed(1)
  const machine = home.snapshot.machine
  const displayHome: SkinSession = {
    ...home,
    status: !home.connected
      ? "Disconnected"
      : !home.machineFresh
        ? "Waiting for data"
        : home.phase === "heating"
          ? "Heating"
          : home.phase === "error"
            ? "Needs attention"
            : machine?.state.state === "sleeping"
              ? "Sleeping"
              : "Ready",
    snapshot: { ...home.snapshot, machine: home.machineFresh ? machine : null },
  }
  return (
    <div
      ref={root}
      className="brew-preview"
      data-expanded={expanded}
      data-phase={s.phase}
      data-away={s.route === "away"}
    >
      <div className="brew-home">
        <CandidateHome
          tankCalibration={tankCalibration}
          s={displayHome}
          onSettings={onSettings}
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
        <div className="brew-title" aria-label="Machine state" tabIndex={-1}>
          <RollingStatus
            label={status}
            running={isRunning(s)}
            tone={
              s.outcome
                ? ["success", "manual"].includes(s.outcome)
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
        <div className="brew-metrics">
          {[
            [
              "Time",
              home.snapshot.elapsedKnown ? value(last?.elapsed) : "—",
              "s",
            ],
            ["Pressure", stale ? "—" : value(last?.pressure), "bar"],
            ["Flow", stale ? "—" : value(last?.flow), "mL/s"],
            [
              "In the cup",
              stale || !home.scaleConnected
                ? "—"
                : value(home.active ? home.scaleWeight : home.shot.weight),
              "g",
            ],
            [
              "Group temperature",
              stale
                ? "—"
                : value(home.displayTemperature(last?.groupTemperature)),
              `°${home.temperatureUnit}`,
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
          temperatureUnit={home.temperatureUnit}
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
      {expanded && !home.scaleConnected && s.phase === "active" && (
        <p className="brew-scale-note" role="status">
          Scale unavailable · weight flow and cup weight are unavailable
        </p>
      )}
      {expanded && home.notice && (
        <div className="brew-operation-notice">
          <Notice s={home} />
        </div>
      )}
      <div className="brew-toast" role="status" data-visible={!!s.toast}>
        {s.toast}
      </div>
    </div>
  )
}
