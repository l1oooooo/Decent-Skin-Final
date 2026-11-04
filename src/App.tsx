import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from "react"
import {
  ArrowRight,
  Coffee,
  Moon,
  Play,
  RotateCcw,
  Square,
  Sun,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { ShotChart } from "@/components/shot-chart"
import { TabletPreview } from "@/components/tablet-preview"
import { demoGateway, scenarios } from "@/gateway/demo"
import type { DemoScenario } from "@/gateway/types"

const labels: Record<DemoScenario, string> = {
  ready: "Ready",
  heating: "Heating",
  brewing: "Brewing",
  completed: "Completed",
  disconnected: "Disconnected",
  error: "Error",
}
function TouchButton(props: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={`min-h-12 min-w-12 px-4 text-sm motion-reduce:transition-none ${props.className ?? ""}`}
    />
  )
}
function Skin() {
  const snapshot = useSyncExternalStore(
    demoGateway.subscribe,
    demoGateway.getSnapshot
  )
  const [page, setPage] = useState<"home" | "brewing">("home")
  const [paused, setPaused] = useState(false)
  const { theme, setTheme } = useTheme()
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  const { scenario, workflow, shot } = snapshot
  useEffect(() => {
    if (scenario !== "brewing" || paused) return
    const timer = window.setInterval(() => {
      if (!document.hidden) demoGateway.advance(0.25)
    }, 250)
    return () => window.clearInterval(timer)
  }, [scenario, paused])
  function toggleTheme() {
    setTheme(dark ? "light" : "dark")
  }
  function chooseScenario(value: DemoScenario) {
    demoGateway.setScenario(value)
    setPaused(false)
    setPage(value === "brewing" || value === "completed" ? "brewing" : "home")
  }
  const canStart = scenario === "ready" || scenario === "completed"
  const connected = snapshot.machineConnected && scenario !== "error"
  return (
    <main
      className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-4 p-4 sm:p-6"
      aria-label="Decaid skin demo"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Coffee className="size-6" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-medium tracking-tight">Decent Skin</h1>
            <p className="text-sm text-muted-foreground">Development preview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-secondary px-3 py-2 text-xs font-medium">
            DEMO · No machine connection
          </span>
          <TouchButton
            variant="outline"
            aria-label={dark ? "Use light theme" : "Use dark theme"}
            onClick={toggleTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </TouchButton>
        </div>
      </header>
      <section
        aria-label="Demo controls"
        className="flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
          Demo scenario
          <select
            aria-label="Demo scenario"
            value={scenario}
            onChange={(event) =>
              chooseScenario(event.target.value as DemoScenario)
            }
            className="h-12 min-w-44 rounded-lg border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {scenarios.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </label>
        <TouchButton variant="outline" onClick={() => chooseScenario("ready")}>
          <RotateCcw />
          Reset demo
        </TouchButton>
        <nav aria-label="Preview pages" className="flex gap-2 sm:ml-auto">
          <TouchButton
            aria-pressed={page === "home"}
            variant={page === "home" ? "secondary" : "ghost"}
            onClick={() => setPage("home")}
          >
            Home
          </TouchButton>
          <TouchButton
            aria-pressed={page === "brewing"}
            variant={page === "brewing" ? "secondary" : "ghost"}
            onClick={() => setPage("brewing")}
          >
            Brewing
          </TouchButton>
        </nav>
      </section>
      <section
        className="flex flex-wrap items-center justify-between gap-3"
        aria-live="polite"
      >
        <div>
          <h2 className="text-3xl font-medium tracking-tight">
            {labels[scenario]}
          </h2>
          <p
            className={`mt-1 text-sm ${scenario === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {snapshot.message}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>
            Machine: {snapshot.machineConnected ? "simulated" : "disconnected"}
          </p>
          <p>Scale: {snapshot.scaleConnected ? "simulated" : "disconnected"}</p>
        </div>
      </section>
      <div className="grid min-w-0 gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <section
          aria-label="Selected recipe"
          className="flex flex-col rounded-xl border bg-card p-6"
        >
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Selected recipe
          </p>
          <h3 className="mt-2 text-xl font-medium">{workflow.name}</h3>
          <dl className="my-6 grid gap-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Dose</dt>
              <dd className="tabular-nums">
                {workflow.context.targetDoseWeight.toFixed(1)} g
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Target yield</dt>
              <dd className="tabular-nums">
                {workflow.context.targetYield.toFixed(1)} g
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Brew temperature</dt>
              <dd className="tabular-nums">
                {workflow.brewTemperature.toFixed(1)} °C
              </dd>
            </div>
          </dl>

          <div className="mt-auto">
            {scenario === "brewing" ? (
              <TouchButton
                className="w-full"
                variant="destructive"
                onClick={() => demoGateway.stopShot()}
              >
                <Square />
                Stop demo shot
              </TouchButton>
            ) : (
              <TouchButton
                className="w-full"
                disabled={!canStart}
                onClick={() => {
                  demoGateway.startShot()
                  setPage("brewing")
                  setPaused(false)
                }}
              >
                <Play />
                Start demo shot
              </TouchButton>
            )}
          </div>
        </section>
        <section
          aria-label={page === "home" ? "Home preview" : "Brewing preview"}
          className="min-w-0 rounded-xl border bg-card p-6"
        >
          <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              ["Time", `${shot.elapsed.toFixed(1)} s`],
              ["Yield", connected ? `${shot.weight.toFixed(1)} g` : "—"],
              ["Pressure", connected ? `${shot.pressure.toFixed(1)} bar` : "—"],
              [
                "Temperature",
                connected ? `${shot.temperature.toFixed(1)} °C` : "—",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                  data-testid={`metric-${label.toLowerCase()}`}
                  className="mt-2 text-2xl font-medium tracking-tight tabular-nums"
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          {page === "brewing" ? (
            <ShotChart samples={snapshot.samples} />
          ) : (
            <div className="flex min-h-52 flex-col items-start justify-center gap-3 rounded-lg bg-muted/50 p-6">
              <h3 className="text-lg font-medium">Home preview</h3>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Review the recipe and machine state before starting. Brewing
                shows a repeatable 30-second pressure trace.
              </p>
              <TouchButton variant="outline" onClick={() => setPage("brewing")}>
                View brewing
                <ArrowRight />
              </TouchButton>
            </div>
          )}
        </section>
      </div>
      <footer className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="mr-auto">
          Demo data only · Base UI / Nova · 1340 × 800 target
        </span>
        {scenario === "brewing" && (
          <>
            <TouchButton
              variant="outline"
              aria-pressed={paused}
              onClick={() => setPaused(!paused)}
            >
              {paused ? "Resume" : "Pause"} demo
            </TouchButton>
            <TouchButton
              variant="outline"
              onClick={() => demoGateway.advance(5)}
            >
              Advance 5 seconds
            </TouchButton>
          </>
        )}
        {!new URLSearchParams(location.search).has("preview") && (
          <a
            className="flex min-h-12 items-center underline underline-offset-4"
            href="?preview=tablet"
          >
            Tablet preview
          </a>
        )}
      </footer>
    </main>
  )
}
export default function App() {
  return new URLSearchParams(location.search).get("preview") === "tablet" ? (
    <TabletPreview>
      <Skin />
    </TabletPreview>
  ) : (
    <Skin />
  )
}
