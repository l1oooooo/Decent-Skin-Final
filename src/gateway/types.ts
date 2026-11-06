import type { FocusPreferences } from "./daily-settings"
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
  visibility?: "visible" | "hidden" | "deleted"
  isDefault?: boolean
  parentId?: string | null
  updatedAt?: string
  metadata?: Record<string, unknown> | null
  [key: string]: unknown
}
export type FavoriteSlots = (string | null)[]
export interface ImportResult {
  imported: number
  skipped: number
  failed: number
  errors: string[]
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
  groupTemperature?: number
  steamTemperature?: number
  targetPressure?: number
  profileFrame: number
}
export interface Device {
  id: string
  name: string
  type: string
  state: string
  available?: boolean
  connectionRole?: "primary" | "auxiliary"
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
  favorites: FavoriteSlots
  favoritesLoaded: boolean
  favoritesIssue: string
  observedShot: number
  devices: Device[]
  deviceError: string
  deviceErrorKind: string
  deviceNotice: string
  machine: MachineSnapshot | null
  machineReceived: number
  scale: { weight: number; timestamp: string } | null
  scaleConnected: boolean
  water: number | null
  settings: {
    gatewayMode: string
    blockOnNoScale?: boolean
    [key: string]: unknown
  } | null
  preferences: FocusPreferences | null
  preferencesIssue: string
  refillKit: boolean | null
  presenceEnabled: boolean
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
