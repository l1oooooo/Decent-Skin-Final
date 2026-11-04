import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { SlidersHorizontal, RotateCcw } from "lucide-react"
import { SessionDialogs, SimulationBar } from "../common"
import { ProfileLibrary } from "../profile-library"
import selectedDirection from "../selected-direction.json"
import { useTabletSession } from "../use-tablet-session"

import directions from "./directions"
import MotionControls, { defaults, applyMotion } from "./controls"

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
  useEffect(() => {
    if (props.autoplay) {
      s.gateway.setScenario("ready")
      s.gateway.startShot()
      s.setPaused(false)
    }
  }, [])
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
        <label className="motion-scrub">
          Shot position
          <input
            aria-label="Shot position"
            type="range"
            min="0"
            max="30"
            step="0.25"
            value={s.shot.elapsed}
            disabled={!s.active && !s.complete}
            onChange={(event) => {
              s.setPaused(true)
              s.gateway.setScenario("ready")
              s.gateway.startShot()
              const time = Number(event.target.value)
              if (time > 0) s.gateway.advance(time)
            }}
          />
          <output>{s.shot.elapsed.toFixed(1)}s</output>
        </label>
      </div>
      <SessionDialogs s={s} />
      <ProfileLibrary s={s} />
    </>
  )
}
export default function App() {
  const [current, setCurrent] = useState(
    Math.max(
      0,
      directions.findIndex((direction) => direction.id === initialVariant)
    )
  )
  const [scenario, setScenario] = useState(
    scenarios.includes(params.get("state")) ? params.get("state") : "brewing"
  )
  const [longName, setLongName] = useState(params.get("long") === "1")
  const [replay, setReplay] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [scale, setScale] = useState(1)
  const [panel, setPanel] = useState(false)
  const root = useRef(null)
  const motion = useRef({ ...defaults })
  const picker = useRef(null)
  const viewport = useRef(null)
  const config = selectedDirection
  useLayoutEffect(() => {
    applyMotion(root.current, motion.current)
  }, [])
  useEffect(() => {
    const visibility = () => {
      root.current.dataset.hidden = String(document.hidden)
    }
    document.addEventListener("visibilitychange", visibility)
    return () => document.removeEventListener("visibilitychange", visibility)
  }, [])
  function choose(index) {
    setReplay(0)
    setCurrent(index)
  }
  function replayShot() {
    root.current.dataset.input = "replay"
    setScenario("brewing")
    setReplay((value) => value + 1)
  }
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
    url.searchParams.set("v", directions[current].id)
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
      const n = Number(e.key)
      if (n >= 1 && n <= directions.length) {
        setReplay(0)
        setCurrent(n - 1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setReplay(0)
        setCurrent((v) => (v + 1) % directions.length)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setReplay(0)
        setCurrent((v) => (v + directions.length - 1) % directions.length)
      } else if (e.key.toLowerCase() === "r") replayShot()
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])
  return (
    <div
      ref={root}
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.input = "keyboard"
      }}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.input = "pointer"
      }}
      className={`study-shell motion-study ${deviceView ? "device-view" : ""} ${directions[current].theme}`}
      style={{
        "--surface-tone": config.surfaceTone,
        "--control-radius": `${config.controlRadius}px`,
        "--feedback-duration": `${config.duration}ms`,
      }}
    >
      <header className="study-header">
        <div>
          <p className="study-label">
            DECAID / BREWING MOTION <span>Revision · right pane</span>
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
              onChange={(e) => {
                setReplay(0)
                setScenario(e.target.value)
              }}
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
            onClick={() => {
              setReplay(0)
              setScenario("brewing")
              setResetKey((v) => v + 1)
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="study-icon"
            aria-label="Tune motion"
            aria-expanded={panel}
            onClick={() => setPanel(!panel)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </header>
      <div className="study-viewport" ref={viewport}>
        <Experience
          key={`${current}-${scenario}-${longName}-${replay}-${resetKey}`}
          autoplay={replay > 0 && scenario === "brewing"}
          direction={directions[current]}
          scenario={scenario}
          longName={longName}
          scale={scale}
        />
      </div>
      <div className="study-size">
        <a href="../?v=2&state=brewing">Revision ↗</a>
        1340 × 800 <span>· {Math.round(scale * 100)}%</span>
        <a href={`?v=${directions[current].id}&state=${scenario}&device=1`}>
          Tablet view ↗
        </a>
      </div>
      {panel && (
        <MotionControls
          root={root}
          config={motion}
          direction={directions[current].name}
        />
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
            onClick={() => choose(i)}
          >
            {direction.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={replayShot}
        >
          ↻
        </button>
      </nav>
    </div>
  )
}
