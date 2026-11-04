import type {
  DemoScenario,
  ShotSample,
  SkinGateway,
  SkinSnapshot,
  Workflow,
} from "./types"
export const scenarios: DemoScenario[] = [
  "ready",
  "heating",
  "brewing",
  "completed",
  "disconnected",
  "error",
]
const duration = 30
function sample(elapsed: number, workflow: Workflow): ShotSample {
  return {
    elapsed,
    pressure:
      elapsed === 0 || elapsed >= duration
        ? 0
        : elapsed < 7
          ? 3
          : 9 - Math.max(0, elapsed - 18) * 0.13,
    flow: elapsed === 0 || elapsed >= duration ? 0 : elapsed < 7 ? 2 : 1.6,
    weight: Math.min(
      workflow.context.targetYield,
      (Math.max(0, elapsed - 6) / 24) * workflow.context.targetYield
    ),
    temperature: workflow.brewTemperature,
  }
}
function initial(scenario: DemoScenario, workflow: Workflow): SkinSnapshot {
  const elapsed =
    scenario === "brewing" ? 12 : scenario === "completed" ? duration : 0
  const samples = elapsed
    ? Array.from({ length: elapsed + 1 }, (_, index) => sample(index, workflow))
    : []
  const shot = sample(elapsed, workflow)
  if (scenario === "heating") shot.temperature = 78
  const messages: Record<DemoScenario, string> = {
    ready: "Ready for a simulated shot.",
    heating: "Warming up. Select Ready to continue the demo.",
    brewing: "Simulated extraction in progress.",
    completed: "Simulated shot complete.",
    disconnected: "Demo connection lost. Select Ready to reconnect.",
    error: "Demo machine error. Select Ready to reset.",
  }
  return {
    mode: "demo",
    scenario,
    machineConnected: scenario !== "disconnected",
    scaleConnected: scenario !== "disconnected",
    workflow,
    shot,
    samples,
    message: messages[scenario],
  }
}
export function createDemoGateway() {
  let snapshot = initial("ready", {
    name: "Classic espresso",
    context: { targetDoseWeight: 18, targetYield: 36 },
    brewTemperature: 93,
  })
  const listeners = new Set<() => void>()
  function publish(next: SkinSnapshot) {
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  const gateway = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setScenario(scenario: DemoScenario) {
      publish(initial(scenario, snapshot.workflow))
    },
    startShot() {
      if (snapshot.scenario !== "ready" && snapshot.scenario !== "completed")
        return
      publish({
        ...initial("brewing", snapshot.workflow),
        shot: sample(0, snapshot.workflow),
        samples: [],
      })
    },
    stopShot() {
      if (snapshot.scenario !== "brewing") return
      publish({
        ...snapshot,
        scenario: "completed",
        shot: { ...snapshot.shot, pressure: 0, flow: 0 },
        message: "Simulated shot stopped.",
      })
    },
    advance(seconds: number) {
      if (
        snapshot.scenario !== "brewing" ||
        !Number.isFinite(seconds) ||
        seconds <= 0
      )
        return
      const elapsed = Math.min(duration, snapshot.shot.elapsed + seconds)
      const points: ShotSample[] = []
      for (
        let time = snapshot.shot.elapsed + 0.25;
        time < elapsed;
        time += 0.25
      )
        points.push(sample(time, snapshot.workflow))
      const shot = sample(elapsed, snapshot.workflow)
      publish({
        ...snapshot,
        shot,
        samples: [...snapshot.samples, ...points, shot],
        scenario: elapsed === duration ? "completed" : "brewing",
        message:
          elapsed === duration ? "Simulated shot complete." : snapshot.message,
      })
    },
  } satisfies SkinGateway & {
    setScenario: (scenario: DemoScenario) => void
    advance: (seconds: number) => void
  }
  return gateway
}
export const demoGateway = createDemoGateway()
