import type { BrewEvent, Outcome, Reading } from "./experience/model"

export type Scenario = "standard" | "high" | "missing-scale" | "long"
// This adapter has no transport, gateway, command identifiers, or machine handlers.
export class DesignSimulator {
  private sequence = 0
  private id = ""
  private timer: ReturnType<typeof setInterval> | undefined
  private time = -1
  private weight = 0
  private running = false
  private scenario: Scenario = "standard"
  private speed = 1
  setSpeed(speed: number) {
    this.speed = speed
  }
  private emit: (event: BrewEvent) => void
  constructor(emit: (event: BrewEvent) => void) {
    this.emit = emit
  }
  start(profileName: string, scenario: Scenario) {
    this.dispose()
    this.scenario = scenario
    this.sequence += 1
    this.id = `design-shot-${this.sequence}`
    this.time = -1
    this.weight = 0
    this.running = true
    this.emit({
      type: "start",
      shotId: this.id,
      sequence: this.sequence,
      profileName,
    })
    this.timer = setInterval(() => {
      for (let n = 0; n < this.speed && this.running; n++) this.advance()
    }, 100)
  }
  private advance() {
    this.time = Math.round((this.time + 0.1) * 10) / 10
    if (this.time < 0) return
    const t = this.time
    const duration = this.scenario === "long" ? 65 : 30
    const frame = t < 7 ? 0 : t < 20 ? 1 : 2
    const ripple = Math.sin(t * 9) * 0.065 + Math.sin(t * 23) * 0.03
    const high = this.scenario === "high" && t >= 14 && t < 18
    const pressure = high
      ? 14.2 + ripple
      : t < 7
        ? Math.min(3, t * 0.53) + ripple
        : t < 9
          ? 3 + (t - 7) * 2.9 + ripple
          : Math.max(5.7, 8.8 - Math.max(0, t - 20) * 0.25) + ripple
    const flow =
      t < 7 ? 4.5 - t * 0.29 + ripple : 2.0 + (t - 7) * 0.025 + ripple
    const weightFlow =
      t < 4
        ? 0
        : t < 7
          ? (t - 4) * 0.25
          : 1.5 + Math.min(1.1, (t - 7) * 0.035) + ripple * 0.8
    this.weight += weightFlow * 0.1
    const missing = this.scenario === "missing-scale" && t > 12
    const reading: Reading = {
      elapsed: t,
      pressure: Math.max(0, pressure),
      targetPressure:
        t < 7 ? 3 : t < 20 ? 9 : Math.max(5.8, 9 - (t - 20) * 0.3),
      flow,
      groupTemperature:
        88 -
        0.8 * Math.sin(Math.min(t / 7, Math.PI)) +
        Math.sin(t * 0.8) * 0.08,
      weightFlow: missing ? null : weightFlow,
      beverageWeight: missing ? null : this.weight,
      frame,
      stage: ["Preinfusion", "Extraction", "Pressure decline"][frame],
      targetStep: t === 7,
    }
    this.emit({ type: "sample", shotId: this.id, reading })
    if (t >= duration) this.end("success")
  }
  end(outcome: Outcome) {
    this.dispose()
    this.emit({ type: "end", shotId: this.id, outcome })
  }
  duplicate() {
    this.emit({ type: "end", shotId: this.id, outcome: "success" })
  }
  late() {
    this.emit({
      type: "end",
      shotId: `design-shot-${this.sequence - 1}`,
      outcome: "success",
    })
  }
  dispose() {
    clearInterval(this.timer)
    this.running = false
  }
}
