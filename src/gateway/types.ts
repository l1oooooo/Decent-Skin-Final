export type DemoScenario =
  "ready" | "heating" | "brewing" | "completed" | "disconnected" | "error"
export interface Workflow {
  name: string
  context: { targetDoseWeight: number; targetYield: number }
  brewTemperature: number
}
export interface ShotSample {
  elapsed: number
  pressure: number
  flow: number
  weight: number
  temperature: number
}
export interface SkinSnapshot {
  mode: "demo"
  scenario: DemoScenario
  machineConnected: boolean
  scaleConnected: boolean
  workflow: Workflow
  shot: ShotSample
  samples: ShotSample[]
  message: string
}
/** UI boundary; a future Decaid adapter will normalize API payloads here. */
export interface SkinGateway {
  getSnapshot: () => SkinSnapshot
  subscribe: (listener: () => void) => () => void
  startShot: () => void
  stopShot: () => void
}
