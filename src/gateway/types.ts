export interface ProfileStep {
  name: string
  pump: "pressure" | "flow"
  transition: "fast" | "smooth"
  seconds: number
  temperature: number
  pressure?: number
  flow?: number
  [key: string]: unknown
}
export interface Profile {
  title: string
  notes?: string
  author?: string
  steps: ProfileStep[]
  target_weight?: number | null
  [key: string]: unknown
}
export interface ProfileRecord {
  id: string
  profile: Profile
}
export interface Workflow {
  name?: string
  profile: Profile | null
  context?: {
    targetDoseWeight?: number | null
    targetYield?: number | null
    grinderSetting?: string | null
    [key: string]: unknown
  }
  steamSettings?: {
    targetTemperature: number
    duration: number
    [key: string]: unknown
  }
  hotWaterData?: {
    targetTemperature: number
    duration: number
    [key: string]: unknown
  }
  rinseData?: { duration: number; [key: string]: unknown }
  [key: string]: unknown
}
export interface MachineSnapshot {
  timestamp: string
  state: { state: string; substate: string }
  flow: number
  pressure: number
  mixTemperature: number
  targetPressure?: number
  profileFrame: number
}
export interface Device {
  id: string
  name: string
  type: string
  state: string
}
export interface ShotSample {
  elapsed: number
  pressure: number | null
  flow: number | null
  weight: number | null
  temperature: number | null
}
export interface ShotEvent {
  event: string
  timestamp: string
  shotId?: string | null
  state: string
  profileFrame?: number | null
  scaleLost?: boolean
  decision?: { kind: string; reason: string; details?: string | null } | null
}
export interface ShotRecord {
  id: string
  timestamp: string
  workflow?: Workflow
  stopReason?: string | null
  annotations?: { actualYield?: number; [key: string]: unknown }
  measurements?: {
    machine: MachineSnapshot
    scale?: { weight: number } | null
  }[]
}
export interface GatewaySnapshot {
  connection: "connecting" | "online" | "offline"
  message: string
  pending: boolean
  workflow: Workflow | null
  profiles: ProfileRecord[]
  favorites: string[]
  devices: Device[]
  deviceError: string
  machine: MachineSnapshot | null
  machineReceived: number
  scale: { weight: number; timestamp: string } | null
  scaleConnected: boolean
  water: number | null
  settings: { gatewayMode: string; blockOnNoScale?: boolean } | null
  build: string
  samples: ShotSample[]
  elapsedKnown: boolean
  shotFrame: number
  shotStart: number | null
  shotId: string | null
  complete: boolean
  stopped: boolean
  scaleLost: boolean
  shotProfile: Profile | null
}
export type MachineCommand =
  "espresso" | "idle" | "steam" | "hotWater" | "flush"
