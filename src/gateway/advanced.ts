import type { DecaidGateway } from "./client"
import { commandBlock, connected, finite, object } from "./model"
import type { GatewaySnapshot } from "./types"

export type Data = Record<string, unknown>
export const dataSections = [
  "profiles",
  "shots",
  "workflow",
  "settings",
  "store",
  "steams",
  "beans",
  "grinders",
] as const
export type Procedure = "cleaning" | "descaling" | "airPurge"
export type Sensor = "flow" | "pressure" | "temperature"
export const asData = (v: unknown): Data =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Data) : {}
export const machineId = (s: GatewaySnapshot) =>
  s.devices.find((d) => d.type === "machine" && d.state === "connected")?.id
export const freshMachine = (s: GatewaySnapshot) =>
  connected(s) && !!s.machine && Date.now() - s.machineReceived < 5000
export function numberInput(
  value: unknown,
  min: number,
  max: number,
  label: string
) {
  const n = typeof value === "string" && !value.trim() ? NaN : Number(value)
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error(`${label}: enter ${min}–${max}.`)
  return n
}
export function sensorCorrection(
  target: Sensor,
  saved: number,
  reported: number,
  measured: number
) {
  if (
    ![saved, reported, measured].every(finite) ||
    !reported ||
    Math.abs(reported) >= 32768 ||
    Math.abs(measured) >= 32768
  )
    throw new Error(
      "Use finite instrument readings within the signed Q16.16 range; DE1 reading must not be zero."
    )
  if (
    target !== "temperature" &&
    (reported <= 0 ||
      measured <= 0 ||
      measured / reported < 0.75 ||
      measured / reported > 1.33)
  )
    throw new Error(
      "Flow and pressure readings must be positive, with a correction ratio from 0.75 to 1.33. Check the instruments first."
    )
  const result =
    target === "temperature"
      ? saved + measured - reported
      : (saved * measured) / reported
  if (Math.abs(result) >= 32768)
    throw new Error("The resulting calibration is outside the supported range.")
  return result
}
export function syncRequest(
  target: string,
  mode: string,
  conflict: string,
  sections: string[]
) {
  const url = new URL(target)
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !["", "/"].includes(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Enter a Decaid HTTP(S) origin without credentials, path, query or fragment."
    )
  if (
    !["pull", "push", "two_way"].includes(mode) ||
    !["skip", "overwrite"].includes(conflict) ||
    !sections.length ||
    sections.some(
      (s) => !dataSections.includes(s as (typeof dataSections)[number])
    )
  )
    throw new Error(
      "Choose a direction, conflict policy and at least one supported section."
    )
  return {
    target: url.origin,
    mode,
    onConflict: conflict,
    sections: [...new Set(sections)],
    continueOnPullFailure: false,
  }
}
export interface TransferRow {
  section: string
  imported: number
  skipped: number
  errors: string[]
  warnings: string[]
}
export function transferRows(raw: unknown, prefix = ""): TransferRow[] {
  const data = object(raw)
  if (data.phases)
    return ["pull", "push"].flatMap((phase) =>
      data[phase] ? transferRows(data[phase], `${phase}: `) : []
    )
  return dataSections
    .filter((key) => data[key] !== undefined)
    .map((key) => {
      const row = asData(data[key])
      return {
        section: prefix + key,
        imported: Number(row.imported ?? 0),
        skipped: Number(row.skipped ?? 0),
        errors: Array.isArray(row.errors)
          ? row.errors.map(String)
          : row.error
            ? [String(row.error)]
            : [],
        warnings: Array.isArray(row.warnings) ? row.warnings.map(String) : [],
      }
    })
}
export async function responseData(response: Response) {
  const text = await response.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      `${response.status}: ${text.slice(0, 300) || "Empty response"}`
    )
  }
  if (!response.ok && !asData(data).phases)
    throw new Error(
      `${response.status}: ${String(asData(data).message ?? asData(data).error ?? text)}`
    )
  return data
}
export async function readBackup(response: Response, limit = 128 * 1024 ** 2) {
  if (!response.ok) {
    await responseData(response)
    throw new Error("Export failed.")
  }
  if (!response.headers.get("content-type")?.includes("zip") || !response.body)
    throw new Error("Export did not return a ZIP archive.")
  const large = () =>
    new Error(
      "This backup exceeds the 128 MiB browser download limit. Export it through Decaid’s native data management to avoid exhausting tablet memory."
    )
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body.cancel()
    throw large()
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array<ArrayBuffer>[] = []
  let bytes = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.length
      if (bytes > limit) throw large()
      chunks.push(new Uint8Array(part.value))
    }
    if (!bytes) throw new Error("The backup archive is empty.")
    return new Blob(chunks, { type: "application/zip" })
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
export async function consumeFirmware(
  response: Response,
  onEvent: (data: Data) => void
) {
  if (!response.ok) {
    await responseData(response)
    throw new Error("Firmware request rejected.")
  }
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("ndjson")
  )
    throw new Error("Firmware response is not a progress stream.")
  const reader = response.body.getReader(),
    decoder = new TextDecoder()
  let buffer = "",
    terminal = false
  const line = (value: string) => {
    if (!value.trim()) return
    const event = object(JSON.parse(value))
    if (event.status === "error")
      throw new Error(String(event.error ?? "Firmware verification failed."))
    if (!["erasing", "uploading", "done"].includes(String(event.status)))
      throw new Error("Unknown firmware progress state.")
    if (!finite(event.progress) || event.progress < 0 || event.progress > 1)
      throw new Error("Invalid firmware progress value.")
    onEvent(event)
    if (event.status === "done") terminal = true
  }
  try {
    while (true) {
      const chunk = await reader.read()
      buffer += decoder.decode(chunk.value, { stream: !chunk.done })
      if (buffer.length > 65536)
        throw new Error("Firmware progress response exceeded its limit.")
      let end: number
      while ((end = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, end))
        buffer = buffer.slice(end + 1)
      }
      if (chunk.done) break
    }
    if (buffer.trim()) line(buffer)
    if (!terminal)
      throw new Error(
        "Firmware stream ended without verified completion. Refresh status; do not assume success."
      )
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const done = () => {
      signal?.removeEventListener("abort", abort)
      resolve()
    }
    const timer = setTimeout(done, ms)
    const abort = () => {
      clearTimeout(timer)
      signal?.removeEventListener("abort", abort)
      reject(
        new Error("Operation monitoring cancelled; verify the device state.")
      )
    }
    signal?.addEventListener("abort", abort, { once: true })
    if (signal?.aborted) abort()
  })
export class AdvancedGateway {
  readonly gateway: DecaidGateway
  constructor(gateway: DecaidGateway) {
    this.gateway = gateway
  }
  async read(path: string) {
    return this.gateway.request(`/api/v1/${path}`)
  }
  private identity(expected: string | undefined) {
    if (!expected || machineId(this.gateway.getSnapshot()) !== expected)
      throw new Error(
        "Machine changed. Refresh and prepare this procedure again."
      )
  }
  async machineWrite(
    path: string,
    method: string,
    body: unknown,
    expected: string | undefined,
    capability?: string
  ) {
    return this.gateway.settingsOperation(async (verify) => {
      this.identity(expected)
      if (capability) {
        const caps = object(await this.read("machine/capabilities"))
        if (
          !Array.isArray(caps.capabilities) ||
          !caps.capabilities.includes(capability)
        )
          throw new Error("This machine does not support this control.")
      }
      if (path === "machine/ledStrip") {
        const palette = object(await this.read(path))
        body = {
          frontStrip: palette.frontStrip,
          backStrip: palette.backStrip,
          ...asData(body),
        }
      }
      verify()
      this.identity(expected)
      await this.gateway.request(`/api/v1/${path}`, method, body)
      try {
        verify()
        return await this.read(path)
      } catch (error) {
        throw new Error(
          `Write acknowledged, but read-back could not be verified. Refresh before another change. ${error instanceof Error ? error.message : ""}`,
          { cause: error }
        )
      }
    }, true)
  }
  async sensor(
    target: Sensor,
    reported: number,
    measured: number,
    expected: string | undefined,
    reset = false
  ) {
    return this.gateway.settingsOperation(async (verify) => {
      this.identity(expected)
      const info = object(await this.read("machine/info"))
      if (!String(info.model).toLowerCase().startsWith("de1"))
        throw new Error("DE1 sensor calibration is unavailable for this model.")
      const path = `machine/calibration/${target}`
      const current = object(await this.read(path))
      if (!finite(current.measuredValue))
        throw new Error("Current calibration is unavailable.")
      if (reset) {
        const factory = object(await this.read(`${path}?source=factory`))
        if (!finite(factory.measuredValue))
          throw new Error("Factory calibration is unavailable.")
        reported = current.measuredValue
        measured = factory.measuredValue
        if (target !== "temperature" && reported === 0)
          throw new Error("Cannot restore a zero ratio calibration.")
      } else sensorCorrection(target, current.measuredValue, reported, measured)
      verify()
      this.identity(expected)
      await this.gateway.request(`/api/v1/${path}`, "PUT", {
        de1ReportedValue: reported,
        measuredValue: measured,
      })
      try {
        verify()
        return await this.read(path)
      } catch (error) {
        throw new Error(
          `Write acknowledged, but read-back could not be verified. Refresh before another change. ${error instanceof Error ? error.message : ""}`,
          { cause: error }
        )
      }
    }, true)
  }
  async firmware(
    id: string,
    expected: string | undefined,
    onEvent: (data: Data) => void,
    signal: AbortSignal
  ) {
    return this.gateway.settingsOperation(async (verify) => {
      this.identity(expected)
      const catalog = object(await this.read("machine/firmware"))
      const artifact = (
        Array.isArray(catalog.artifacts) ? catalog.artifacts : []
      )
        .map(asData)
        .find((a) => a.id === id)
      if (
        asData(artifact?.eligibility).status !== "applicable" ||
        asData(catalog.operation).state !== "idle"
      )
        throw new Error(
          "Firmware is not eligible or an update is already active. Refresh the catalog."
        )
      verify()
      this.identity(expected)
      if (signal.aborted) throw new Error("Firmware start cancelled.")
      await this.gateway.transfer(
        "/api/v1/machine/firmware/apply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artifactId: id, force: false }),
        },
        (response) => consumeFirmware(response, onEvent),
        15 * 60000,
        signal
      )
    }, true)
  }
  async cancelFirmware(expected: string | undefined) {
    this.identity(expected)
    return this.gateway.settingsOperation(
      () => this.gateway.request("/api/v1/machine/firmware", "DELETE"),
      true,
      false,
      true
    )
  }
  async scale(
    command: "zero" | "latch",
    weight: number,
    expected: string | undefined,
    onState: (value: Data) => void,
    signal: AbortSignal
  ) {
    return this.gateway.settingsOperation(async (verify) => {
      this.identity(expected)
      const caps = object(await this.read("machine/capabilities"))
      if (!(caps.capabilities as unknown[])?.includes("scaleCalibration"))
        throw new Error("Load-cell calibration is unsupported.")
      if (command === "latch") numberInput(weight, 1, 10000, "Known mass")
      verify()
      this.identity(expected)
      if (signal.aborted)
        throw new Error("Scale calibration cancelled before starting.")
      const result = object(
        await this.gateway.request("/api/v1/machine/scaleCalibration", "PUT", {
          command,
          ...(command === "latch" ? { weightGrams: weight } : {}),
        })
      )
      if (result.status !== "accepted")
        throw new Error("Calibration step was not accepted.")
      const started = Date.now()
      let state = object(result.state)
      while (true) {
        onState(state)
        this.identity(expected)
        if (!freshMachine(this.gateway.getSnapshot()))
          throw new Error(
            "Connection lost. Calibration outcome unknown; refresh its state."
          )
        if (
          ["error"].includes(String(state.step)) ||
          state.subState === "error"
        )
          throw new Error(`Calibration failed: ${state.status}.`)
        if (!["zeroing", "calLatch", "taring"].includes(String(state.step))) {
          if (
            state.step !== "complete" ||
            state.subState !== "done" ||
            (command === "latch" &&
              !["ok", "incomplete"].includes(String(state.status)))
          )
            throw new Error(
              `Calibration outcome needs review: ${state.step} / ${state.status}.`
            )
          return state
        }
        if (Date.now() - started > 180000)
          throw new Error(
            "Calibration has not reported a result. Refresh or abort; it may still be running."
          )
        await delay(750, signal)
        state = object(await this.read("machine/scaleCalibration"))
      }
    }, true)
  }
  async abortScale(expected: string | undefined) {
    this.identity(expected)
    return this.gateway.settingsOperation(
      () =>
        this.gateway.request("/api/v1/machine/scaleCalibration", "PUT", {
          command: "abort",
        }),
      true,
      false,
      true
    )
  }
  async maintenance(
    kind: Procedure,
    expected: string | undefined,
    onState: (text: string) => void,
    signal: AbortSignal
  ) {
    return this.gateway.settingsOperation(async (verify) => {
      this.identity(expected)
      verify()
      const snap = this.gateway.getSnapshot()
      if (
        kind === "descaling" &&
        (!finite(snap.machine?.steamTemperature) ||
          snap.machine.steamTemperature > 60 ||
          snap.workflow?.steamSettings?.targetTemperature !== 0)
      )
        throw new Error(
          "Disable the steam heater and wait for a fresh measured boiler temperature of 60 °C or below."
        )
      if (signal.aborted)
        throw new Error("Preparation cancelled; no start sent.")
      onState("Start requested; waiting for the machine.")
      await this.gateway.request(`/api/v1/machine/state/${kind}`, "PUT")
      let entered = false
      const start = Date.now()
      while (true) {
        this.identity(expected)
        const current = this.gateway.getSnapshot()
        if (!freshMachine(current))
          throw new Error(
            "Readings unavailable. The procedure may still be running; reconnect and inspect its actual state."
          )
        const state = current.machine!.state
        if (state.state === kind) {
          entered = true
          onState(`Running: ${state.substate}`)
        } else if (entered) {
          if (state.state === "idle") {
            onState(
              "Cycle returned to idle. Inspect the machine and complete the prescribed rinse or transport checks."
            )
            return
          }
          throw new Error(
            `Procedure interrupted: ${state.state} / ${state.substate}. Inspect the machine.`
          )
        } else if (Date.now() - start > 20000)
          throw new Error(
            "Start was not observed. Outcome unknown; inspect the machine before trying again."
          )
        if (Date.now() - start > 30 * 60000)
          throw new Error(
            "Monitoring timed out. The procedure may still be running."
          )
        await delay(250, signal)
      }
    }, true)
  }
  async stopMaintenance(expected: string | undefined) {
    this.identity(expected)
    if (!connected(this.gateway.getSnapshot()))
      throw new Error("Reconnect before sending Stop. No stop will be queued.")
    await this.gateway.command("idle")
  }
  async backup() {
    return this.gateway.transfer(
      "/api/v1/data/export",
      {},
      readBackup,
      20 * 60000
    )
  }
  async importBackup(file: File, conflict: string) {
    if (
      !file.size ||
      file.size > 2 * 1024 ** 3 ||
      !["skip", "overwrite"].includes(conflict)
    )
      throw new Error(
        "Choose a nonempty ZIP up to 2 GiB and a conflict policy."
      )
    return this.gateway.settingsOperation(() =>
      this.gateway.transfer(
        `/api/v1/data/import?onConflict=${conflict}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/zip" },
          body: file,
        },
        responseData,
        30 * 60000
      )
    )
  }
  async sync(
    target: string,
    mode: string,
    conflict: string,
    sections: string[]
  ) {
    const body = syncRequest(target, mode, conflict, sections)
    if (body.target === this.gateway.origin)
      throw new Error("Choose a different Decaid instance.")
    return this.gateway.settingsOperation(() =>
      this.gateway.transfer(
        "/api/v1/data/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        responseData,
        30 * 60000
      )
    )
  }
  async skin(path: string, method: string, body?: unknown) {
    return this.gateway.settingsOperation(async (verify) => {
      verify()
      return this.gateway.transfer(
        `/api/v1/webui/skins${path}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
        responseData,
        10 * 60000
      )
    })
  }
  block() {
    return commandBlock(this.gateway.getSnapshot())
  }
}
