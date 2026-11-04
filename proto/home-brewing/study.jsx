import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { SlidersHorizontal, RotateCcw, Copy, Download } from "lucide-react"
import { SessionDialogs, SimulationBar } from "./common"
import { ProfileLibrary } from "./profile-library"
import Studio from "./variants/Studio"
import Grid from "./variants/Grid"
import MonochromeStudio from "./variants/MonochromeStudio"
import GridFocus from "./variants/GridFocus"
import { useTabletSession } from "./use-tablet-session"

const directions = [
  {
    name: "Studio",
    axis: "Warm split panes, profile rail, and a bottom action bar.",
    accent: "oklch(.93 .015 85)",
    component: Studio,
    theme: "r2-studio",
  },
  {
    name: "Monochrome Studio",
    axis: "Studio layout, Grid palette. Preparation and extraction each get a clear focus.",
    accent: "oklch(1 0 0)",
    component: MonochromeStudio,
    theme: "r2-grid r3-monochrome",
  },
  {
    name: "Grid",
    axis: "Joined grid, direct recipe controls, and a focused Brewing view.",
    accent: "oklch(1 0 0)",
    component: Grid,
    theme: "r2-grid",
  },
  {
    name: "Grid Focus",
    axis: "Recipe controls above the graph, with a dedicated shot column.",
    accent: "oklch(1 0 0)",
    component: GridFocus,
    theme: "r2-grid",
  },
]

const params = new URLSearchParams(location.search)
const initialVariant = Number(params.get("v"))
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
  const [current, setCurrent] = useState(
    Number.isInteger(initialVariant) &&
      initialVariant >= 1 &&
      initialVariant <= directions.length
      ? initialVariant - 1
      : 0
  )
  const [scenario, setScenario] = useState(
    scenarios.includes(params.get("state")) ? params.get("state") : "ready"
  )
  const [longName, setLongName] = useState(params.get("long") === "1")
  const [replay, setReplay] = useState(0)
  const [scale, setScale] = useState(1)
  const [panel, setPanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const picker = useRef(null)
  const viewport = useRef(null)
  const config = useRef({ surfaceTone: 0.16, controlRadius: 8, duration: 150 })
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
  useLayoutEffect(() => {
    const move = () => {
      const el = picker.current.querySelectorAll("button")[current]
      const highlight = picker.current.firstElementChild
      highlight.style.width = `${el.offsetWidth}px`
      highlight.style.transform = `translateX(${el.offsetLeft}px)`
    }
    move()
    window.addEventListener("resize", move)
    return () => window.removeEventListener("resize", move)
  }, [current])
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        picker.current?.setAttribute("data-ready", "")
      )
    )
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set("v", current + 1)
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
        document.querySelector("dialog[open]")
      )
        return
      const n = Number(e.key)
      if (n >= 1 && n <= directions.length) setCurrent(n - 1)
      else if (e.key === "ArrowRight") {
        e.preventDefault()
        setCurrent((v) => (v + 1) % directions.length)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCurrent((v) => (v + directions.length - 1) % directions.length)
      } else if (e.key.toLowerCase() === "r") setReplay((v) => v + 1)
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])
  function tune(key, variable, value, suffix = "") {
    config.current[key] = Number(value)
    document.documentElement.style.setProperty(variable, value + suffix)
  }
  function savedConfig() {
    return JSON.stringify(
      {
        direction: directions[current].name,
        variant: current + 1,
        scenario,
        longName,
        ...config.current,
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
      className={`study-shell ${deviceView ? "device-view" : ""} ${directions[current].theme}`}
    >
      <header className="study-header">
        <div>
          <p className="study-label">
            DECAID / ROUND 06 <span>0{current + 1} — 04</span>
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
        1340 × 800 <span>· {Math.round(scale * 100)}%</span>
        <a href={`?v=${current + 1}&state=ready&device=1`}>Tablet view ↗</a>
      </div>
      {panel && (
        <aside className="study-panel" aria-label="Appearance controls">
          <h2>Appearance</h2>
          {[
            [
              "surfaceTone",
              "Surface tone",
              "--surface-tone",
              0.12,
              0.24,
              0.01,
              "",
            ],
            [
              "controlRadius",
              "Control radius",
              "--control-radius",
              0,
              18,
              1,
              "px",
            ],
            [
              "duration",
              "Press feedback",
              "--feedback-duration",
              0,
              300,
              10,
              "ms",
            ],
          ].map(([key, label, variable, min, max, step, suffix]) => (
            <label key={key}>
              {label}
              <output>
                {config.current[key]}
                {suffix}
              </output>
              <input
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                defaultValue={config.current[key]}
                onInput={(e) => {
                  tune(key, variable, e.target.value, suffix)
                  e.target.previousElementSibling.textContent =
                    e.target.value + suffix
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
      <nav
        ref={picker}
        className="proto-picker"
        aria-label="Prototype variants"
      >
        <span className="proto-picker-highlight" aria-hidden="true" />
        {directions.map((direction, i) => (
          <button
            key={direction.name}
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => setCurrent(i)}
          >
            {direction.name}
          </button>
        ))}
      </nav>
    </div>
  )
}
