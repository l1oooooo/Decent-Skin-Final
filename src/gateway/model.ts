import type {
  GatewaySnapshot,
  MachineSnapshot,
  Profile,
  ShotSample,
  Workflow,
} from "./types"

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Decaid response")
  return value as Record<string, unknown>
}
export function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
export function parseProfile(value: unknown): Profile {
  const p = object(value)
  if (typeof p.title !== "string" || !Array.isArray(p.steps) || !p.steps.length)
    throw new Error("Decaid returned a profile without executable steps")
  for (const step of p.steps) {
    const s = object(step)
    if (
      typeof s.name !== "string" ||
      !finite(s.seconds) ||
      !finite(s.temperature) ||
      !["flow", "pressure"].includes(String(s.pump))
    )
      throw new Error("Unsupported Decaid profile step")
  }
  return p as unknown as Profile
}
export function parseWorkflow(value: unknown): Workflow {
  const w = object(value)
  return {
    ...w,
    profile: w.profile == null ? null : parseProfile(w.profile),
  } as Workflow
}
export function parseMachine(value: unknown): MachineSnapshot {
  const m = object(value)
  const state = object(m.state)
  if (
    typeof state.state !== "string" ||
    typeof state.substate !== "string" ||
    typeof m.timestamp !== "string" ||
    !Number.isFinite(Date.parse(m.timestamp)) ||
    !finite(m.pressure) ||
    !finite(m.flow) ||
    !finite(m.mixTemperature) ||
    !Number.isInteger(m.profileFrame)
  )
    throw new Error("Unsupported Decaid machine snapshot")
  return m as unknown as MachineSnapshot
}
export function connected(s: GatewaySnapshot) {
  return (
    s.connection === "online" &&
    s.devices.some((d) => d.type === "machine" && d.state === "connected")
  )
}
export function pouring(m: MachineSnapshot | null) {
  return (
    m?.state.state === "espresso" &&
    ["preinfusion", "pouring"].includes(m.state.substate)
  )
}
export function commandBlock(s: GatewaySnapshot, now = Date.now()): string {
  if (!connected(s))
    return "Machine disconnected. Check the connection in Decaid."
  if (!s.machine || now - s.machineReceived > 5000)
    return "Waiting for current machine readings."
  if (s.pending) return "Waiting for Decaid to finish the previous request."
  if (!s.settings) return "Waiting for Decaid settings."
  if (!["tracking", "disabled"].includes(s.settings.gatewayMode))
    return "Use Decaid's tracking mode for gateway-owned shot control and stop-at-weight."
  if (s.deviceError) return s.deviceError
  if (s.machine.state.state !== "idle")
    return `Machine is ${s.machine.state.state}.`
  return ""
}
export function temperaturePatch(workflow: Workflow, value: number) {
  const profile = workflow.profile
  if (!profile || !finite(value) || value < 60 || value > 98)
    throw new Error("Invalid brew temperature")
  const offset = value - profile.steps[0].temperature
  if (
    profile.steps.some(
      (s) => s.temperature + offset < 0 || s.temperature + offset > 100
    )
  )
    throw new Error(
      "This temperature would put a profile step outside its supported range."
    )
  return {
    profile: {
      ...profile,
      steps: profile.steps.map((s) => ({
        ...s,
        temperature: s.temperature + offset,
      })),
    },
  }
}
export function previewSamples(profile: Profile | null): ShotSample[] {
  let elapsed = 0
  return (
    profile?.steps.flatMap((step) => {
      const point = {
        pressure: finite(step.pressure) ? step.pressure : null,
        flow: finite(step.flow) ? step.flow : null,
        temperature: step.temperature,
        weight: null,
      }
      const start = { ...point, elapsed }
      elapsed += Math.max(0, step.seconds)
      return [start, { ...point, elapsed }]
    }) ?? []
  )
}
