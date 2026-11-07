import { FlaskConical } from "lucide-react"
import { useEffect, useReducer, useRef, useState } from "react"
import { BrewingExperience } from "./experience/view"
import { initialState, isRunning, reduceExperience } from "./experience/model"
import { DesignSimulator } from "./simulator"
import type { Scenario } from "./simulator"
import { defaultRecipe, homeSession } from "./home-session"

export default function Preview() {
  const [state, dispatch] = useReducer(reduceExperience, initialState)
  const [simulator] = useState(() => new DesignSimulator(dispatch))
  const [selected, setSelected] = useState(0)
  const [recipes, setRecipes] = useState(() =>
    Array.from({ length: 5 }, () => ({ ...defaultRecipe }))
  )
  const [utilities, setUtilities] = useState({
    steamEnabled: true,
    steamTemperature: 140,
    steamTime: 30,
    waterTime: 15,
    flushTime: 5,
    waterTemperature: 90,
  })
  const [scenario, setScenario] = useState<Scenario>("standard")
  const [speed, setSpeed] = useState(1)
  const [tools, setTools] = useState(false)
  const toolButton = useRef<HTMLButtonElement>(null)
  useEffect(() => () => simulator.dispose(), [simulator])
  const home = homeSession(
    selected,
    recipes[selected],
    setSelected,
    (key, value) => {
      setRecipes((all) =>
        all.map((recipe, i) =>
          i === selected ? { ...recipe, [key]: value } : recipe
        )
      )
    }
  )
  Object.assign(home, utilities, {
    ...Object.fromEntries(
      [
        ["setSteamTemperature", "steamTemperature"],
        ["setSteamTime", "steamTime"],
        ["setWaterTime", "waterTime"],
        ["setFlushTime", "flushTime"],
        ["setWaterTemperature", "waterTemperature"],
        ["toggleSteam", "steamEnabled"],
      ].map(([method, key]) => [
        method,
        async (value: number | boolean) => {
          if (isRunning(state) || state.outcome === "disconnected") return false
          setUtilities((current) => ({ ...current, [key]: value }))
          return true
        },
      ])
    ),
  })
  const start = () => {
    simulator.setSpeed(speed)
    simulator.start(home.profile.name, scenario)
  }
  return (
    <>
      <BrewingExperience
        state={state}
        dispatch={dispatch}
        home={home}
        tankCalibration="standard-de1"
      />
      <div
        className="design-dock"
        data-home={state.phase === "home" || state.phase === "returning"}
        aria-label="Development simulation controls"
      >
        <span>DESIGN PREVIEW</span>
        <button
          ref={toolButton}
          className="design-tools"
          aria-label="Test scenarios"
          aria-expanded={tools}
          aria-controls="design-scenarios"
          onClick={() => setTools(!tools)}
        >
          <FlaskConical size={16} aria-hidden="true" />
          <span>Test scenarios</span>
        </button>
        <button
          className="design-ghc"
          onClick={() => (isRunning(state) ? simulator.end("manual") : start())}
        >
          {isRunning(state) ? "Simulate GHC stop" : "Simulate GHC brew"}
        </button>
      </div>
      {tools && (
        <section
          id="design-scenarios"
          className="design-scenarios"
          aria-label="Simulation scenarios"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setTools(false)
              toolButton.current?.focus()
            }
          }}
        >
          <header>
            <div>
              <strong>Brewing simulator</strong>
              <p>Local synthetic events · no machine connection</p>
            </div>
            <button
              aria-label="Close simulation scenarios"
              onClick={() => {
                setTools(false)
                toolButton.current?.focus()
              }}
            >
              ×
            </button>
          </header>
          <label>
            Telemetry
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
            >
              <option value="standard">Representative 30-second shot</option>
              <option value="high">Pressure exceeds 12 bar</option>
              <option value="missing-scale">
                Scale lost during extraction
              </option>
              <option value="long">Long 65-second shot</option>
            </select>
          </label>
          <label>
            Playback
            <select
              value={speed}
              onChange={(e) => {
                setSpeed(Number(e.target.value))
                simulator.setSpeed(Number(e.target.value))
              }}
            >
              <option value="1">Real time · 1×</option>
              <option value="4">Quick review · 4×</option>
            </select>
          </label>
          <div className="design-scenario-actions">
            <button onClick={start}>Start new shot</button>
            <button
              disabled={!isRunning(state)}
              onClick={() => simulator.end("success")}
            >
              Complete shot
            </button>
            <button
              disabled={!isRunning(state)}
              onClick={() => simulator.end("blocked")}
            >
              Block shot
            </button>
            <button
              disabled={!isRunning(state)}
              onClick={() => simulator.end("disconnected")}
            >
              Disconnect
            </button>
            <button
              disabled={!isRunning(state)}
              onClick={() => simulator.end("failed")}
            >
              Interrupt shot
            </button>
            <button
              disabled={state.phase !== "complete"}
              onClick={() => simulator.duplicate()}
            >
              Duplicate completion
            </button>
            <button onClick={() => simulator.late()}>
              Late previous-shot event
            </button>
            <button
              onClick={() => dispatch({ type: "navigate", route: "away" })}
            >
              Navigate away
            </button>
          </div>
          <p className="design-event-state">
            {state.phase} · {state.samples.length} samples
          </p>
        </section>
      )}
    </>
  )
}
