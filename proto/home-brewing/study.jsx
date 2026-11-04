import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { SlidersHorizontal, RotateCcw, Copy, Download } from "lucide-react"
import { SessionDialogs, SimulationBar } from "./common"
import { ProfileLibrary } from "./profile-library"
import selectedDirection from "./selected-direction.json"
import MonochromeRevision from "./variants/MonochromeRevision"
import { useTabletSession } from "./use-tablet-session"

const directions = [
  {
    name: "Revision",
    axis: "Monochrome Studio · Cover profiles and Focus brewing.",
    accent: "oklch(1 0 0)",
    component: MonochromeRevision,
    theme: "r2-grid r3-monochrome",
  },
]

const params = new URLSearchParams(location.search)
const deviceView = params.get("device") === "1"
const scenarios = [
  "ready",
  "brewing",
  "completed",
  "heating",
  "disconnected",
  "error",
]
function Experience(props) {
  const s = useTabletSession(props.scenario, props.longName)
  return <ExperienceFrame {...props} s={s} />
}
function ExperienceFrame({ direction, scale, s }) {
  const View = direction.component
  return (
    <>
      <div
        className="study-frame"
        style={{ width: 1340 * scale, height: 800 * scale }}
      >
        <div
          id="stage"
          className="prototype-surface round-two"
          style={{ transform: `scale(${scale})`, "--signal": direction.accent }}
        >
          <View s={s} />
          {s.notice && (
            <div
              role="status"
              className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-card px-6 py-3 text-sm shadow-lg"
            >
              {s.notice}
            </div>
          )}
        </div>
      </div>
      <div className="study-simulation">
        <SimulationBar s={s} />
      </div>
      <SessionDialogs s={s} />
      <ProfileLibrary s={s} />
    </>
  )
}
export default function App() {
  const current = 0
  const [scenario, setScenario] = useState(
    scenarios.includes(params.get("state"))
      ? params.get("state")
      : selectedDirection.scenario
  )
  const [longName, setLongName] = useState(params.get("long") === "1")
  const [replay, setReplay] = useState(0)
  const [scale, setScale] = useState(1)
  const [panel, setPanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const viewport = useRef(null)
  const [appearances, setAppearances] = useState(() =>
    directions.map(() => ({
      surfaceTone: selectedDirection.surfaceTone,
      controlRadius: selectedDirection.controlRadius,
      duration: selectedDirection.duration,
    }))
  )

  const config = appearances[current]
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setScale(
        Math.max(
          0.1,
          Math.min(
            1,
            entry.contentRect.width / 1340,
            entry.contentRect.height / 800
          )
        )
      )
    )
    observer.observe(viewport.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set("v", "2")
    url.searchParams.set("state", scenario)
    longName
      ? url.searchParams.set("long", "1")
      : url.searchParams.delete("long")
    history.replaceState(null, "", url)
  }, [current, scenario, longName])
  useEffect(() => {
    function key(e) {
      if (
        /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) ||
        e.target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey ||
        document.querySelector("dialog[open]") ||
        e.target.closest('[role="dialog"]')
      )
        return
      if (e.key.toLowerCase() === "r") setReplay((v) => v + 1)
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])
  function tune(key, value) {
    setAppearances((previous) =>
      previous.map((appearance, index) =>
        index === current ? { ...appearance, [key]: Number(value) } : appearance
      )
    )
  }
  function savedConfig() {
    return JSON.stringify(
      {
        direction: directions[current].name,
        variant: 2,
        scenario,
        longName,
        ...config,
      },
      null,
      2
    )
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(savedConfig())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  function download() {
    const blob = new Blob([savedConfig()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `decent-${directions[current].name.toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.input = "keyboard"
      }}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.input = "pointer"
      }}
      className={`study-shell ${deviceView ? "device-view" : ""} ${directions[current].theme}`}
      style={{
        "--surface-tone": config.surfaceTone,
        "--control-radius": `${config.controlRadius}px`,
        "--feedback-duration": `${config.duration}ms`,
      }}
    >
      <header className="study-header">
        <div>
          <p className="study-label">
            DECAID / HOME & BREWING <span>Selected direction</span>
          </p>
          <p className="study-caption">
            <strong>{directions[current].name}</strong>{" "}
            {directions[current].axis}
          </p>
        </div>
        <div className="study-tools">
          <label className="study-select">
            Load state
            <select
              aria-label="Preview state"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {scenarios.map((s, i) => (
                <option key={s} value={s}>
                  {
                    [
                      "Home",
                      "Brewing",
                      "Completed",
                      "Heating",
                      "Disconnected",
                      "Error",
                    ][i]
                  }
                </option>
              ))}
            </select>
          </label>
          <label className="study-check">
            <input
              type="checkbox"
              checked={longName}
              onChange={(e) => setLongName(e.target.checked)}
            />
            Long profile
          </label>
          <button
            className="study-icon"
            aria-label="Reset preview"
            onClick={() => setReplay((v) => v + 1)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="study-icon"
            aria-label="Tune appearance"
            aria-expanded={panel}
            onClick={() => setPanel(!panel)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </header>
      <div className="study-viewport" ref={viewport}>
        <Experience
          key={`${current}-${scenario}-${longName}-${replay}`}
          direction={directions[current]}
          scenario={scenario}
          longName={longName}
          scale={scale}
        />
      </div>
      <div className="study-size">
        <a className="motion-study-link" href="./motion/?v=3&state=brewing">
          Motion studies ↗
        </a>
        1340 × 800 <span>· {Math.round(scale * 100)}%</span>
        <a href={`?v=2&state=${scenario}&device=1`}>Tablet view ↗</a>
      </div>
      {panel && (
        <aside className="study-panel" aria-label="Appearance controls">
          <h2>Appearance</h2>
          {[
            ["surfaceTone", "Surface tone", 0.12, 0.24, 0.01, ""],
            ["controlRadius", "Control radius", 0, 18, 1, "px"],
            ["duration", "Press feedback", 0, 300, 10, "ms"],
          ].map(([key, label, min, max, step, suffix]) => (
            <label key={key}>
              {label}
              <output>
                {config[key]}
                {suffix}
              </output>
              <input
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                onInput={(e) => {
                  tune(key, e.target.value)
                }}
              />
            </label>
          ))}
          <div className="flex gap-2">
            <button onClick={copy}>
              <Copy size={14} />
              {copied ? "Copied" : "Copy config"}
            </button>
            <button aria-label="Download configuration" onClick={download}>
              <Download size={15} />
            </button>
          </div>
          <p>Local demo · no machine commands</p>
        </aside>
      )}
    </div>
  )
}
