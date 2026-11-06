import type { DecaidGateway } from "./client"
import { commandBlock, object, finite } from "./model"

export type SettingsCategory = "connections" | "brew" | "machine" | "display"
export type SettingsOwner =
  | "settings"
  | "workflow"
  | "machine"
  | "advanced"
  | "display"
  | "presence"
  | "preferences"
export type SettingsRecord = Record<string, unknown>
export interface FocusPreferences extends SettingsRecord {
  temperatureUnit: "C" | "F"
  refillWarningMm: number
  keyboardShortcuts: boolean
}
export const defaultPreferences: FocusPreferences = {
  temperatureUnit: "C",
  refillWarningMm: 0,
  keyboardShortcuts: false,
}
export interface DisplayState extends SettingsRecord {
  requestedBrightness: number
  brightness: number
  wakeLockEnabled: boolean
  wakeLockOverride: boolean
  platformSupported: { brightness: boolean; wakeLock: boolean }
}
export interface WakeSchedule {
  id: string
  time: string
  daysOfWeek: number[]
  enabled: boolean
  keepAwakeFor?: number | null
}
export type GrinderDescriptor =
  | { kind: "numeric"; min: number; max: number; step?: number }
  | { kind: "enumerated"; values: string[] }
  | { kind: "opaque" }
export interface GrinderInfo {
  deviceId: string
  capabilities: string[]
  controls?: {
    grindSetting?: GrinderDescriptor
    rpmControl?: Extract<GrinderDescriptor, { kind: "numeric" }>
  }
}
export interface GrinderState {
  timestamp: string
  state: string
  setting?: string
  rpm?: number
  observedSetting?: string
  observedRpm?: number
}
export interface SettingField {
  key: string
  label: string
  kind: "number" | "boolean" | "select" | "time"
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string }[]
  help?: string
  temperature?: boolean
}
const number = (
  key: string,
  label: string,
  min: number,
  max?: number,
  step = 1,
  help?: string
): SettingField => ({ key, label, kind: "number", min, max, step, help })
const toggle = (key: string, label: string, help?: string): SettingField => ({
  key,
  label,
  kind: "boolean",
  help,
})
const select = (
  key: string,
  label: string,
  values: [string, string][],
  help?: string
): SettingField => ({
  key,
  label,
  kind: "select",
  options: values.map(([value, label]) => ({ value, label })),
  help,
})
const temperature = (
  key: string,
  label: string,
  min: number,
  max: number,
  help?: string
): SettingField => ({
  ...number(key, label, min, max, 1, help),
  temperature: true,
})
export const fields: Record<
  SettingsCategory,
  Partial<Record<SettingsOwner, SettingField[]>>
> = {
  connections: {},
  brew: {
    settings: [
      toggle(
        "blockOnNoScale",
        "Require a scale before brewing",
        "Turn off to brew without a scale. Weight-based stopping needs a connected scale; use the machine’s other limits or stop manually."
      ),
      toggle("blockTareDuringShot", "Block tare during a shot"),
      toggle(
        "stopHotWaterAtWeight",
        "Stop hot water by weight",
        "Uses the hot-water volume target as grams when a scale is connected."
      ),
      select("scalePowerMode", "Scale power while sleeping", [
        ["disabled", "Leave unchanged"],
        ["displayOff", "Turn display off"],
        ["disconnect", "Disconnect"],
      ]),
      number(
        "weightFlowMultiplier",
        "Weight stop compensation",
        0,
        undefined,
        0.1,
        "Higher values stop earlier."
      ),
      number(
        "volumeFlowMultiplier",
        "Volume stop compensation (s)",
        0,
        undefined,
        0.1
      ),
      number(
        "hotWaterFlowMultiplier",
        "Hot-water stop compensation (s)",
        0,
        undefined,
        0.1
      ),
    ],
    workflow: [
      temperature(
        "steamSettings.targetTemperature",
        "Steam temperature",
        0,
        160,
        "0 disables preheating; enabled range is 135–160 °C (165 °C on Bengle)."
      ),
      number("steamSettings.duration", "Steam duration (s)", 0, 120),
      number("steamSettings.flow", "Steam flow", 0.4, 2.5, 0.1),
      temperature(
        "hotWaterData.targetTemperature",
        "Hot-water temperature",
        50,
        95
      ),
      number("hotWaterData.duration", "Hot-water duration (s)", 0, 60),
      number("hotWaterData.volume", "Hot-water volume (ml)", 0, 250),
      number("hotWaterData.flow", "Hot-water flow (ml/s)", 1, 8, 0.1),
      temperature("rinseData.targetTemperature", "Flush temperature", 5, 95),
      number("rinseData.duration", "Flush duration (s)", 0, 60),
      number("rinseData.flow", "Flush flow (ml/s)", 1, 8, 0.1),
    ],
  },
  machine: {
    machine: [
      temperature("tankTemp", "Tank temperature", 10, 40),
      temperature("fan", "Fan threshold", 0, 50),
      select("steamPurgeMode", "Steam purge behavior", [
        ["0", "Normal"],
        ["1", "Two-tap stop"],
      ]),
    ],
    advanced: [
      select(
        "refillKitSetting",
        "Refill kit override",
        [
          ["2", "Automatic"],
          ["1", "Force on"],
          ["0", "Force off"],
        ],
        "Changes the override, not whether a refill kit was detected."
      ),
    ],
    settings: [
      select("chargingMode", "Smart charging", [
        ["disabled", "Disabled"],
        ["longevity", "Longevity"],
        ["balanced", "Balanced"],
        ["highAvailability", "High availability"],
      ]),
      toggle("nightModeEnabled", "Night charging schedule"),
      { key: "nightModeSleepTime", label: "Night starts", kind: "time" },
      { key: "nightModeMorningTime", label: "Morning starts", kind: "time" },
    ],
    preferences: [
      number(
        "refillWarningMm",
        "Low-water warning (mm)",
        0,
        30,
        5,
        "0 disables the Focus warning. Automatic-refill machines do not show this warning."
      ),
    ],
  },
  display: {
    display: [
      number(
        "requestedBrightness",
        "Requested brightness",
        0,
        100,
        1,
        "100 uses OS-managed brightness. Battery policy may cap the applied value."
      ),
    ],
    settings: [
      toggle("keepAwake", "Keep the tablet awake"),
      toggle("lowBatteryBrightnessLimit", "Limit brightness on low battery"),
    ],
    presence: [
      toggle("userPresenceEnabled", "Enable presence and wake schedules"),
      number(
        "sleepTimeoutMinutes",
        "Idle sleep timeout (minutes)",
        0,
        240,
        1,
        "0 disables automatic idle sleep."
      ),
    ],
    preferences: [
      select("temperatureUnit", "Temperature units", [
        ["C", "Celsius"],
        ["F", "Fahrenheit"],
      ]),
      toggle(
        "keyboardShortcuts",
        "Enable keyboard shortcuts",
        "Alt+H: Home · Alt+S: Settings · Escape: stop an active operation. Shortcuts are ignored while typing."
      ),
    ],
  },
}
export const ownerLabels: Record<SettingsOwner, string> = {
  settings: "Decaid preferences",
  workflow: "Utility recipe",
  machine: "Machine settings",
  advanced: "Refill kit",
  display: "Display brightness",
  presence: "Idle sleep",
  preferences: "Focus preferences",
}
export const ownerPaths: Record<SettingsOwner, string> = {
  settings: "/api/v1/settings",
  workflow: "/api/v1/workflow",
  machine: "/api/v1/machine/settings",
  advanced: "/api/v1/machine/settings/advanced",
  display: "/api/v1/display",
  presence: "/api/v1/presence/settings",
  preferences: "/api/v1/store/decent-skin-codex/preferences",
}
export function getField(record: SettingsRecord, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === "object"
          ? (value as SettingsRecord)[part]
          : undefined,
      record
    )
}
export function fieldPatch(values: SettingsRecord): SettingsRecord {
  const result: SettingsRecord = {}
  for (const [key, value] of Object.entries(values)) {
    const [parent, child] = key.split(".")
    if (child)
      result[parent] = {
        ...((result[parent] as SettingsRecord) ?? {}),
        [child]: value,
      }
    else result[parent] = value
  }
  return result
}
export function validateField(
  field: SettingField,
  raw: unknown,
  bengle = false
): unknown {
  if (field.kind === "boolean") {
    if (typeof raw !== "boolean") throw new Error("Choose on or off.")
    return raw
  }
  if (field.kind === "select") {
    if (!field.options?.some((o) => o.value === String(raw)))
      throw new Error("Choose a listed option.")
    return ["refillKitSetting", "steamPurgeMode"].includes(field.key)
      ? Number(raw)
      : raw
  }
  if (field.kind === "time") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw)))
      throw new Error("Enter a time from 00:00 to 23:59.")
    const [h, m] = String(raw).split(":").map(Number)
    return h * 60 + m
  }
  const n = raw === "" || raw === null ? NaN : Number(raw)
  const max =
    field.key === "steamSettings.targetTemperature" && bengle ? 165 : field.max
  if (
    !Number.isFinite(n) ||
    n < (field.min ?? -Infinity) ||
    n > (max ?? Infinity) ||
    (field.step === 1 && !Number.isInteger(n))
  )
    throw new Error(
      `Enter ${field.step === 1 ? "a whole number" : "a number"} from ${field.min ?? 0}${max === undefined ? " or above" : ` to ${max}`}.`
    )
  if (field.key === "steamSettings.targetTemperature" && n !== 0 && n < 135)
    throw new Error("Use 0 to disable steam, or at least 135 °C.")
  return n
}
export function parsePreferences(raw: unknown): FocusPreferences {
  const value = object(raw)
  if (
    (value.temperatureUnit !== undefined &&
      !["C", "F"].includes(String(value.temperatureUnit))) ||
    (value.keyboardShortcuts !== undefined &&
      typeof value.keyboardShortcuts !== "boolean") ||
    (value.refillWarningMm !== undefined &&
      (typeof value.refillWarningMm !== "number" ||
        !Number.isFinite(value.refillWarningMm) ||
        value.refillWarningMm < 0 ||
        value.refillWarningMm > 30))
  )
    throw new Error(
      "Stored Focus preferences are invalid. Correct them in Decaid before saving."
    )
  return { ...defaultPreferences, ...value } as FocusPreferences
}
export class DailySettingsGateway {
  private gateway: DecaidGateway
  constructor(gateway: DecaidGateway) {
    this.gateway = gateway
  }
  async read(owner: SettingsOwner): Promise<SettingsRecord> {
    if (owner === "preferences") {
      const data = await this.gateway.readStored("preferences")
      return data === undefined
        ? { ...defaultPreferences }
        : parsePreferences(data)
    }
    return object(await this.gateway.request(ownerPaths[owner]))
  }

  async save(
    owner: SettingsOwner,
    patch: SettingsRecord
  ): Promise<SettingsRecord> {
    if (owner === "workflow") {
      await this.gateway.updateWorkflow(patch)
      return this.gateway.getSnapshot().workflow!
    }
    return this.gateway.settingsOperation(
      async (verify) => {
        if (owner === "display") {
          const current = (await this.read("display")) as DisplayState
          if (!current.platformSupported?.brightness)
            throw new Error("Brightness is not supported on this platform.")
        }
        const body =
          owner === "display"
            ? { brightness: patch.requestedBrightness }
            : owner === "preferences"
              ? { ...(await this.read(owner)), ...patch }
              : patch
        verify()
        await this.gateway.request(
          owner === "display"
            ? "/api/v1/display/brightness"
            : ownerPaths[owner],
          owner === "display" ? "PUT" : "POST",
          body
        )
        let saved: SettingsRecord
        try {
          saved = await this.read(owner)
        } catch {
          throw new Error(
            "Write acknowledged, but the saved value could not be read. Refresh this section before retrying."
          )
        }
        if (owner === "presence") this.gateway.acceptPresence(saved)
        if (owner === "settings") this.gateway.acceptSettings(saved)
        if (owner === "preferences")
          this.gateway.acceptPreferences(parsePreferences(saved))
        return saved
      },
      owner === "machine" || owner === "advanced"
    )
  }
  async device(
    action: "scan" | "connect" | "disconnect" | "forget",
    id?: string
  ) {
    return this.gateway.settingsOperation(async () => {
      if (
        action !== "scan" &&
        !this.gateway.getSnapshot().devices.some((d) => d.id === id)
      )
        throw new Error("Device is no longer available. Refresh the inventory.")
      const result = await this.gateway.request(
        `/api/v1/devices/${action}${action === "scan" ? "?connect=false&quick=true" : ""}`,
        action === "scan" ? "GET" : "PUT",
        action === "scan" ? undefined : { deviceId: id }
      )
      if (
        action === "connect" &&
        !["connected", "alreadyConnected"].includes(
          String(object(result).outcome)
        )
      )
        throw new Error(
          String(object(result).error ?? "Connection was not confirmed.")
        )
      await this.gateway.sync()
      return result
    })
  }
  async wifi(host: string, remove = false) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(host))
      throw new Error(
        "Enter an IP address or hostname without a scheme, port or path."
      )
    return this.gateway.settingsOperation(() =>
      this.gateway.request("/api/v1/devices/wifi", remove ? "DELETE" : "POST", {
        host,
      })
    )
  }
  async power(sleep: boolean) {
    return this.gateway.settingsOperation(
      async () => {
        const s = this.gateway.getSnapshot()
        if (!sleep && s.machine?.state.state !== "sleeping")
          throw new Error("Machine is not sleeping.")
        await this.gateway.request(
          `/api/v1/machine/state/${sleep ? "sleeping" : "idle"}`,
          "PUT"
        )
        await this.gateway.sync()
      },
      true,
      !sleep
    )
  }
  async tare() {
    return this.gateway.settingsOperation(async () => {
      if (!this.gateway.getSnapshot().scaleConnected)
        throw new Error("Connect a scale first.")
      await this.gateway.request("/api/v1/scale/tare", "PUT")
    }, true)
  }
  async wakeLock(enabled: boolean) {
    return this.gateway.settingsOperation(async (verify) => {
      const state = (await this.read("display")) as DisplayState
      if (!state.platformSupported?.wakeLock)
        throw new Error("Wake lock is not supported on this platform.")
      verify()
      return object(
        await this.gateway.request(
          "/api/v1/display/wakelock",
          enabled ? "POST" : "DELETE"
        )
      )
    })
  }
  async schedules(): Promise<WakeSchedule[]> {
    const result = await this.gateway.request("/api/v1/presence/schedules")
    if (
      !Array.isArray(result) ||
      result.some(
        (s) =>
          typeof s.id !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) ||
          !Array.isArray(s.daysOfWeek) ||
          typeof s.enabled !== "boolean"
      )
    )
      throw new Error("Invalid wake schedules.")
    return result
  }
  async saveSchedule(schedule: Omit<WakeSchedule, "id">, id?: string) {
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time) ||
      schedule.daysOfWeek.some((n) => !Number.isInteger(n) || n < 1 || n > 7) ||
      !Number.isInteger(schedule.keepAwakeFor ?? 0) ||
      (schedule.keepAwakeFor ?? 0) < 0 ||
      (schedule.keepAwakeFor ?? 0) > 720
    )
      throw new Error(
        "Check schedule time, weekdays and duration (0–720 minutes)."
      )
    return this.gateway.settingsOperation(() =>
      this.gateway.request(
        `/api/v1/presence/schedules${id ? `/${encodeURIComponent(id)}` : ""}`,
        id ? "PUT" : "POST",
        schedule
      )
    )
  }
  async deleteSchedule(id: string) {
    return this.gateway.settingsOperation(() =>
      this.gateway.request(
        `/api/v1/presence/schedules/${encodeURIComponent(id)}`,
        "DELETE"
      )
    )
  }
  async grinderInfo(): Promise<GrinderInfo> {
    const info = object(await this.gateway.request("/api/v1/grinder/info"))
    if (
      typeof info.deviceId !== "string" ||
      !Array.isArray(info.capabilities) ||
      info.capabilities.some((v) => typeof v !== "string")
    )
      throw new Error("Unsupported grinder capabilities.")
    if (info.controls !== undefined) {
      const controls = object(info.controls)
      for (const key of ["grindSetting", "rpmControl"]) {
        if (controls[key] === undefined) continue
        const descriptor = object(controls[key])
        const numeric =
          descriptor.kind === "numeric" &&
          finite(descriptor.min) &&
          finite(descriptor.max) &&
          descriptor.min <= descriptor.max &&
          (descriptor.step === undefined ||
            (finite(descriptor.step) && descriptor.step > 0))
        const enumerated =
          descriptor.kind === "enumerated" &&
          Array.isArray(descriptor.values) &&
          descriptor.values.length > 0 &&
          descriptor.values.every((v) => typeof v === "string" && v.length > 0)
        if (
          key === "rpmControl"
            ? !numeric ||
              !Number.isInteger(descriptor.min) ||
              !Number.isInteger(descriptor.max) ||
              Number(descriptor.min) < 0
            : !numeric && !enumerated && descriptor.kind !== "opaque"
        )
          throw new Error("Unsupported grinder control descriptor.")
      }
    }
    return info as unknown as GrinderInfo
  }
  async grinderState(): Promise<GrinderState> {
    const state = object(await this.gateway.request("/api/v1/grinder/state"))
    if (typeof state.state !== "string" || typeof state.timestamp !== "string")
      throw new Error("Invalid grinder state.")
    return state as unknown as GrinderState
  }
  async grinder(
    action: "setting" | "rpm" | "start" | "stop",
    value?: string,
    expectedId?: string
  ) {
    return this.gateway.settingsOperation(
      async (verify) => {
        const info = await this.grinderInfo()
        if (info.deviceId !== expectedId)
          throw new Error(
            "The connected grinder changed. Refresh before sending a command."
          )
        const cap =
          action === "setting"
            ? "grindSetting"
            : action === "rpm"
              ? "rpmControl"
              : "startStop"
        if (!info.capabilities.includes(cap))
          throw new Error("This grinder does not support that control.")
        if (action !== "stop") {
          const state = await this.grinderState()
          if (
            state.state !== "idle" ||
            !Number.isFinite(Date.parse(state.timestamp))
          )
            throw new Error("Waiting for current idle grinder state.")
        }
        if (action === "setting" || action === "rpm") {
          const descriptor =
            info.controls?.[cap as "grindSetting" | "rpmControl"]
          if (!descriptor || !value?.trim())
            throw new Error("No writable descriptor or value is available.")
          if (
            descriptor.kind === "numeric" &&
            (!Number.isFinite(Number(value)) ||
              Number(value) < descriptor.min ||
              Number(value) > descriptor.max ||
              (action === "rpm" && !Number.isInteger(Number(value))))
          )
            throw new Error(
              `Enter a value from ${descriptor.min} to ${descriptor.max}.`
            )
          if (
            descriptor.kind === "enumerated" &&
            !descriptor.values.includes(value)
          )
            throw new Error("Choose a supported grinder setting.")
        }
        verify()
        if (
          !this.gateway
            .getSnapshot()
            .devices.some((d) => d.id === expectedId && d.state === "connected")
        )
          throw new Error(
            "Grinder disconnected. Review the device before retrying."
          )
        await this.gateway.request(
          `/api/v1/grinder/${action === "start" ? "state/grinding" : action === "stop" ? "state/idle" : action}`,
          "PUT",
          action === "setting"
            ? { setting: value }
            : action === "rpm"
              ? { rpm: Number(value) }
              : undefined
        )
      },
      false,
      false,
      action === "stop"
    )
  }
}
export function settingsBlock(
  gateway: DecaidGateway,
  machine = false,
  wake = false,
  stop = false,
  ignorePending = false
) {
  const s = gateway.getSnapshot()
  if (s.connection !== "online")
    return "Reconnect to Decaid before making changes."
  if (stop) return ""
  if (s.pending && !ignorePending)
    return "Wait for the current operation to finish."
  if (!s.settings || !["tracking", "disabled"].includes(s.settings.gatewayMode))
    return "Operations are unavailable in full gateway mode."
  if (s.machine && !["idle", "sleeping"].includes(s.machine.state.state))
    return "Wait until the machine is idle."
  if (
    s.devices.some((d) => d.type === "machine" && d.state === "connected") &&
    (!s.machine || Date.now() - s.machineReceived > 5000)
  )
    return "Waiting for current machine readings."
  if (machine)
    return commandBlock(
      wake
        ? {
            ...s,
            pending: ignorePending ? false : s.pending,
            machine: s.machine
              ? { ...s.machine, state: { ...s.machine.state, state: "idle" } }
              : null,
          }
        : { ...s, pending: ignorePending ? false : s.pending }
    )
  return ""
}
