import { RecipeGateway } from "./recipes"
import { ShotHistoryGateway } from "./shot-history"
import type { ProfileRecord } from "./types"
import {
  DailySettingsGateway,
  parsePreferences,
  settingsBlock,
  type FocusPreferences,
} from "./daily-settings"
import {
  commandBlock,
  finite,
  object,
  parseMachine,
  parseProfileRecord,
  normalizeFavorites,
  parseWorkflow,
  profileFingerprint,
  pouring,
} from "./model"
import type {
  FavoriteSlots,
  ImportResult,
  Device,
  GatewaySnapshot,
  MachineCommand,
  ShotEvent,
  ShotRecord,
  Workflow,
} from "./types"

export const initialSnapshot = (): GatewaySnapshot => ({
  connection: "connecting",
  message: "",
  pending: false,
  workflow: null,
  profiles: [],
  favorites: [null, null, null, null, null],
  favoritesLoaded: false,
  favoritesIssue: "",
  observedShot: 0,
  devices: [],
  deviceError: "",
  deviceErrorKind: "",
  deviceNotice: "",
  machine: null,
  machineReceived: 0,
  scale: null,
  scaleConnected: false,
  water: null,
  settings: null,
  build: "",
  preferences: null,
  preferencesIssue: "",
  refillKit: null,
  presenceEnabled: false,
  samples: [],
  elapsedKnown: false,
  shotFrame: 0,
  shotStart: null,
  shotId: null,
  complete: false,
  stopped: false,
  scaleLost: false,
  shotProfile: null,
})
export function gatewayUrl() {
  const override = import.meta.env.VITE_DECAID_URL as string | undefined
  const url = new URL(
    override || `${location.protocol}//${location.hostname}:8080`
  )
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "VITE_DECAID_URL must be an HTTP(S) gateway origin without credentials or a path"
    )
  return url.origin
}
export class DecaidGateway {
  private snapshot = initialSnapshot()
  private listeners = new Set<() => void>()
  private sockets = new Map<string, WebSocket>()
  private retries = new Set<ReturnType<typeof setTimeout>>()
  private abort = new AbortController()
  private interval?: ReturnType<typeof setInterval>
  private notification?: ReturnType<typeof setTimeout>
  private receiving = false
  private active = false
  private syncing = false
  private syncQueued = false
  private lastTimestamp = 0
  private stopPending = false
  private generation = 0
  private telemetryRevision = 0
  private deviceRevision = 0
  private workflowRevision = 0
  private libraryRevision = 0
  private infoDevice: string | undefined
  private settingsRevision = 0
  private preferencesRevision = 0
  readonly daily = new DailySettingsGateway(this)
  readonly shots = new ShotHistoryGateway(this)
  private favoritesRevision = 0
  private favoritesSaving = false
  private deviceErrorKey = ""
  private dismissedDeviceError = ""
  private channels = new Set<string>()
  private observedIdle = false
  private navigationState: string | null = null
  private shotDismissed = false
  private restoredShot: string | null = null
  private restoringShot: string | null = null
  private restoreAttempts = new Map<string, number>()
  readonly origin: string
  private transport: typeof fetch
  private socketFactory: (url: string) => WebSocket
  constructor(
    origin: string,
    transport: typeof fetch = fetch,
    socketFactory = (url: string) => new WebSocket(url)
  ) {
    this.origin = origin
    this.transport = (input, init) => transport(input, init)
    this.socketFactory = socketFactory
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private emit(patch: Partial<GatewaySnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    if (this.receiving) {
      this.notification ??= setTimeout(this.notify, 100)
    } else this.notify()
  }
  private notify = () => {
    clearTimeout(this.notification)
    this.notification = undefined
    this.listeners.forEach((fn) => fn())
  }
  clearMessage = () => {
    this.dismissedDeviceError = this.deviceErrorKey
    this.emit({ message: "", deviceNotice: "" })
  }
  dismissShot = () => {
    if (!pouring(this.snapshot.machine)) {
      this.shotDismissed = true
      this.emit({ complete: false })
    }
  }
  async transfer<T>(
    path: string,
    init: RequestInit,
    consume: (response: Response) => Promise<T>,
    timeoutMs = 120000,
    signal?: AbortSignal
  ): Promise<T> {
    const controller = new AbortController()
    const parent = this.abort.signal
    const abort = () => controller.abort()
    parent.addEventListener("abort", abort, { once: true })
    signal?.addEventListener("abort", abort, { once: true })
    if (parent.aborted || signal?.aborted) controller.abort()
    const timeout = setTimeout(abort, timeoutMs)
    try {
      return await consume(
        await this.transport(`${this.origin}${path}`, {
          ...init,
          signal: controller.signal,
        })
      )
    } finally {
      clearTimeout(timeout)
      parent.removeEventListener("abort", abort)
      signal?.removeEventListener("abort", abort)
    }
  }
  async appUpdateCommand(command: "check" | "install") {
    return this.settingsOperation(async (verify) => {
      const state = object(await this.request("/api/v1/update"))
      if (command === "install" && state.installable !== true)
        throw new Error("This platform cannot install the offered app update.")
      verify()
      return new Promise<void>((resolve, reject) => {
        const socket = this.socketFactory(
          `${this.origin.replace(/^http/, "ws")}/ws/v1/update`
        )
        const parent = this.abort.signal
        let sent = false
        const finish = (error?: Error) => {
          clearTimeout(timer)
          parent.removeEventListener("abort", abort)
          socket.onclose = null
          socket.close()
          if (error) reject(error)
          else resolve()
        }
        const abort = () =>
          finish(
            new Error("Connection changed; update request was not replayed.")
          )
        const timer = setTimeout(
          () =>
            finish(
              new Error(
                "Update response is unknown. Refresh app status before retrying."
              )
            ),
          10000
        )
        parent.addEventListener("abort", abort, { once: true })
        socket.onopen = () => {
          try {
            verify()
            socket.send(JSON.stringify({ command }))
            sent = true
          } catch (error) {
            finish(
              error instanceof Error ? error : new Error("Update blocked.")
            )
          }
        }
        socket.onmessage = (event) => {
          try {
            const data = object(JSON.parse(String(event.data)))
            if (data.error) finish(new Error(String(data.error)))
            else if (
              sent &&
              (command === "check"
                ? data.phase === "checking" || data.phase === "available"
                : data.phase === "downloading" || data.phase === "installing")
            )
              finish()
          } catch {
            finish(new Error("Invalid app update response."))
          }
        }
        socket.onerror = () =>
          finish(
            new Error(
              "App update connection failed. Refresh status before retrying."
            )
          )
        socket.onclose = () =>
          finish(new Error("App update connection closed. Outcome unknown."))
      })
    })
  }
  async request(
    path: string,
    method = "GET",
    body?: unknown
  ): Promise<unknown> {
    const controller = new AbortController()
    const parent = this.abort.signal
    const abort = () => controller.abort()
    parent.addEventListener("abort", abort, { once: true })
    if (parent.aborted) controller.abort()
    const timeout = setTimeout(abort, 8000)
    try {
      const response = await this.transport(`${this.origin}${path}`, {
        method,
        signal: controller.signal,
        headers:
          body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await response.text()
      let data: unknown = null
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          if (response.ok)
            throw new Error(`Decaid returned invalid JSON for ${path}`)
        }
      }
      if (!response.ok) {
        const detail =
          data && typeof data === "object" && "error" in data
            ? String(data.error)
            : response.statusText
        throw new Error(
          `${response.status}: ${detail || "Decaid request failed"}`
        )
      }
      return data
    } catch (error) {
      if (controller.signal.aborted && !parent.aborted)
        throw new Error(
          "Decaid did not respond. Check the gateway connection and try again.",
          { cause: error }
        )
      throw error
    } finally {
      clearTimeout(timeout)
      parent.removeEventListener("abort", abort)
    }
  }
  async readStored(key: string): Promise<unknown | undefined> {
    const namespace = "/api/v1/store/decent-skin-codex"
    let value: unknown
    try {
      value = await this.request(`${namespace}/${encodeURIComponent(key)}`)
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("404:"))
        return undefined
      throw error
    }
    if (value !== null) return value
    // The installed Decaid returns 200/null for an absent key.
    const keys = await this.request(namespace)
    if (!Array.isArray(keys) || keys.some((item) => typeof item !== "string"))
      throw new Error(
        "Could not verify stored preferences. Retry reading them."
      )
    return keys.includes(key) ? value : undefined
  }
  start = () => {
    if (this.active) return
    this.active = true
    this.abort = new AbortController()
    this.generation++
    for (const channel of [
      "devices",
      "machine/snapshot",
      "scale/snapshot",
      "machine/waterLevels",
      "machine/shotState",
    ])
      this.open(channel)
    void this.sync()
    void this.loadPreferences()
    const generation = this.generation
    void this.daily
      .read("presence")
      .then((value) => {
        if (generation === this.generation) this.acceptPresence(value)
      })
      .catch(() => {
        if (generation === this.generation)
          this.emit({ presenceEnabled: false })
      })
    this.interval = setInterval(() => {
      void this.sync()
    }, 5000)
    document.addEventListener("visibilitychange", this.resume)
    window.addEventListener("online", this.resume)
    window.addEventListener("pageshow", this.resume)
  }
  stop = () => {
    this.active = false
    this.generation++
    this.syncing = false
    this.syncQueued = false
    this.abort.abort()
    clearInterval(this.interval)
    clearTimeout(this.notification)
    this.notification = undefined
    this.retries.forEach(clearTimeout)
    this.retries.clear()
    this.sockets.forEach((ws) => ws.close())
    this.sockets.clear()
    this.channels.clear()
    document.removeEventListener("visibilitychange", this.resume)
    window.removeEventListener("online", this.resume)
    window.removeEventListener("pageshow", this.resume)
  }
  private resume = () => {
    if (!document.hidden) {
      this.emit({ machineReceived: 0 })
      void this.sync()
      void this.loadPreferences()
    }
  }
  private open(channel: string, attempt = 0) {
    if (!this.active) return
    const generation = this.generation
    const ws = this.socketFactory(
      `${this.origin.replace(/^http/, "ws")}/ws/v1/${channel}`
    )
    this.sockets.set(channel, ws)
    ws.onopen = () => {
      if (generation !== this.generation) return
      attempt = 0
      this.channels.add(channel)
      void this.sync()
    }
    ws.onmessage = (event) => {
      if (generation !== this.generation) return
      try {
        this.receive(channel, JSON.parse(String(event.data)))
      } catch (error) {
        this.emit({
          message:
            error instanceof Error ? error.message : "Invalid gateway update",
        })
      }
    }
    ws.onerror = () => ws.close()
    ws.onclose = () => {
      if (!this.active || generation !== this.generation) return
      this.channels.delete(channel)
      if (
        ["devices", "machine/snapshot", "machine/shotState"].includes(channel)
      ) {
        this.observedIdle = false
        this.navigationState = null
        this.emit({ connection: "offline", machineReceived: 0 })
      }
      if (channel === "scale/snapshot")
        this.emit({ scale: null, scaleConnected: false })
      const timer = setTimeout(
        () => {
          this.retries.delete(timer)
          this.open(channel, attempt + 1)
        },
        Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 300
      )
      this.retries.add(timer)
    }
  }
  async sync() {
    if (!this.active) return
    if (this.syncing) {
      this.syncQueued = true
      return
    }
    this.syncing = true
    const generation = this.generation
    const deviceRevision = this.deviceRevision
    const workflowRevision = this.workflowRevision
    const settingsRevision = this.settingsRevision
    try {
      const [devices, workflow, settings, info] = await Promise.all([
        this.request("/api/v1/devices"),
        this.request("/api/v1/workflow"),
        this.request("/api/v1/settings"),
        this.request("/api/v1/info"),
      ])
      if (generation !== this.generation) return
      const mode = object(settings)
      if (typeof mode.gatewayMode !== "string")
        throw new Error("Decaid settings are incompatible")
      if (deviceRevision === this.deviceRevision)
        this.receive("devices", { devices })
      this.emit({
        ...(workflowRevision === this.workflowRevision && !this.snapshot.pending
          ? {
              workflow: parseWorkflow(workflow),
              ...(!this.snapshot.shotProfile &&
              this.snapshot.machine?.state.state === "espresso"
                ? { shotProfile: parseWorkflow(workflow).profile }
                : {}),
            }
          : {}),
        ...(settingsRevision === this.settingsRevision && !this.snapshot.pending
          ? {
              settings: {
                ...mode,
                gatewayMode: mode.gatewayMode,
                blockOnNoScale: mode.blockOnNoScale === true,
              },
            }
          : {}),
        message: "",
        build: String(
          object(info).fullVersion ?? object(info).version ?? "Unknown version"
        ),
        connection: ["devices", "machine/snapshot", "machine/shotState"].every(
          (c) => this.channels.has(c)
        )
          ? "online"
          : "connecting",
      })
      if (
        this.snapshot.devices.some(
          (d) => d.type === "machine" && d.state === "connected"
        )
      ) {
        const revision = this.telemetryRevision
        const machine = await this.request("/api/v1/machine/state")
        if (
          generation === this.generation &&
          revision === this.telemetryRevision
        )
          this.receive("machine/snapshot", machine)
      }
    } catch (error) {
      if (generation === this.generation)
        this.emit({
          connection: "offline",
          machineReceived: 0,
          message:
            error instanceof Error ? error.message : "Cannot reach Decaid",
        })
    } finally {
      if (generation === this.generation) {
        this.syncing = false
        if (this.syncQueued) {
          this.syncQueued = false
          void this.sync()
        }
      }
    }
  }
  receive(channel: string, raw: unknown) {
    this.receiving = true
    try {
      this.process(channel, raw)
    } finally {
      this.receiving = false
    }
  }
  private process(channel: string, raw: unknown) {
    const data = object(raw)
    if (channel === "devices") {
      if (!Array.isArray(data.devices)) return
      const devices = data.devices.map((value) => {
        const d = object(value)
        if (
          ![d.id, d.name, d.type, d.state].every((v) => typeof v === "string")
        )
          throw new Error("Invalid Decaid device status")
        return d as unknown as Device
      })
      this.deviceRevision++
      const currentMachineId = devices.find(
        (d) => d.type === "machine" && d.state === "connected"
      )?.id
      if (currentMachineId !== this.infoDevice) {
        this.infoDevice = currentMachineId
        this.emit({ refillKit: null })
        if (currentMachineId)
          void this.request("/api/v1/machine/info")
            .then((value) => {
              if (this.infoDevice === currentMachineId)
                this.acceptMachineInfo(object(value))
            })
            .catch(() => {
              if (this.infoDevice === currentMachineId)
                this.infoDevice = undefined
            })
      }
      const isConnected = devices.some(
        (d) => d.type === "machine" && d.state === "connected"
      )
      if (!isConnected) {
        this.observedIdle = false
        this.navigationState = null
      }
      const scaleConnected = devices.some(
        (d) => d.type === "scale" && d.state === "connected"
      )
      const status = data.connectionStatus
        ? object(data.connectionStatus)
        : null
      const error = status?.error ? object(status.error) : null
      const errorMessage = error
        ? String(error.message ?? "Device connection needs attention")
        : ""
      if (status) {
        this.deviceErrorKey = error
          ? JSON.stringify([
              error.kind,
              error.deviceId,
              error.timestamp,
              errorMessage,
            ])
          : ""
        if (!error) this.dismissedDeviceError = ""
      }
      this.emit({
        devices,
        scaleConnected,
        ...(!isConnected ? { refillKit: null } : {}),
        ...(scaleConnected ? {} : { scale: null }),
        ...(status
          ? {
              deviceError: errorMessage,
              deviceErrorKind: String(error?.kind ?? ""),
              deviceNotice:
                this.deviceErrorKey === this.dismissedDeviceError
                  ? ""
                  : errorMessage,
            }
          : {}),
        ...(!isConnected
          ? { machine: null, machineReceived: 0, water: null }
          : {}),
      })
    } else if (channel === "machine/snapshot") {
      const m = parseMachine(data)
      const timestamp = Date.parse(m.timestamp)
      if (timestamp < this.lastTimestamp) return
      this.telemetryRevision++
      this.lastTimestamp = timestamp
      const s = this.snapshot
      const running = pouring(m)
      const observedStart =
        m.state.state === "espresso" &&
        this.navigationState !== null &&
        this.navigationState !== "espresso"
      if (m.state.state === "idle" || m.state.substate === "preparingForShot")
        this.observedIdle = true
      this.navigationState = m.state.state
      const wasRunning = pouring(s.machine)
      const newShot =
        running && !wasRunning && (s.shotStart === null || s.complete)
      if (newShot) this.shotDismissed = false
      const start = newShot ? timestamp : s.shotStart
      const sample = {
        elapsed: start === null ? 0 : Math.max(0, (timestamp - start) / 1000),
        pressure: m.pressure,
        flow: m.flow,
        temperature: m.mixTemperature,
        weight: s.scale?.weight ?? null,
      }
      const samples = newShot
        ? [sample]
        : (running || wasRunning) &&
            (s.samples.length === 0 ||
              timestamp > (s.machine ? Date.parse(s.machine.timestamp) : 0))
          ? [...s.samples.slice(-3599), sample]
          : s.samples
      this.emit({
        machine: m,
        observedShot: s.observedShot + (observedStart ? 1 : 0),
        machineReceived: Date.now(),
        shotStart: start,
        samples,
        ...(running ? { shotFrame: m.profileFrame } : {}),
        ...(newShot
          ? {
              complete: false,
              elapsedKnown: this.observedIdle,
              stopped: false,
              scaleLost: false,
              shotProfile: s.workflow?.profile ?? null,
            }
          : {}),
        ...(!running && wasRunning && m.state.state !== "espresso"
          ? { complete: true }
          : {}),
      })
    } else if (channel === "scale/snapshot") {
      if (typeof data.status === "string")
        this.emit({
          scaleConnected: data.status === "connected",
          ...(data.status !== "connected" ? { scale: null } : {}),
        })
      else if (finite(data.weight) && typeof data.timestamp === "string") {
        const samples = this.snapshot.samples
        const settling =
          this.snapshot.complete &&
          this.snapshot.shotId !== this.restoredShot &&
          samples.length > 0
        this.emit({
          scaleConnected: true,
          scale: { weight: data.weight, timestamp: data.timestamp },
          ...(settling
            ? {
                samples: [
                  ...samples.slice(0, -1),
                  { ...samples[samples.length - 1], weight: data.weight },
                ],
              }
            : {}),
        })
      }
    } else if (channel === "machine/waterLevels") {
      this.emit({ water: finite(data.currentLevel) ? data.currentLevel : null })
    } else if (channel === "machine/shotState") {
      if (typeof data.state !== "string" || typeof data.timestamp !== "string")
        throw new Error("Invalid Decaid shot state")
      const event = data as unknown as ShotEvent
      if (["idle", "preheating"].includes(event.state)) this.observedIdle = true
      const newShot =
        event.shotId &&
        event.shotId !== this.snapshot.shotId &&
        !["finished", "idle"].includes(event.state)
      if (newShot) this.shotDismissed = false
      this.emit({
        shotId: event.shotId ?? this.snapshot.shotId,
        scaleLost: event.scaleLost === true,
        ...(newShot
          ? {
              samples: [],
              elapsedKnown: this.observedIdle,
              shotFrame: 0,
              shotStart: null,
              complete: false,
              stopped: false,
              shotProfile: this.snapshot.workflow?.profile ?? null,
            }
          : {}),
      })
      if (event.state === "pouring" && this.snapshot.shotStart === null)
        this.emit({ shotStart: Date.parse(event.timestamp) })
      if (["stop", "abort", "terminal"].includes(event.decision?.kind ?? ""))
        this.emit({
          stopped: !["targetWeight", "targetVolume", "machineEnded"].includes(
            event.decision?.reason ?? ""
          ),
          message:
            event.decision?.kind === "abort" ||
            event.decision?.reason === "error" ||
            event.decision?.reason === "disconnected"
              ? event.decision?.details ||
                `Shot stopped: ${event.decision?.reason}`
              : this.snapshot.message,
        })
      if (event.state === "finished" && !this.shotDismissed) {
        this.emit({ complete: true })
        if (
          event.shotId &&
          this.restoredShot !== event.shotId &&
          this.restoringShot !== event.shotId &&
          (this.restoreAttempts.get(event.shotId) ?? 0) < 3
        ) {
          this.restoringShot = event.shotId
          void this.restoreShot(event.shotId)
        }
      }
    }
  }
  private async restoreShot(id: string) {
    this.restoreAttempts.set(id, (this.restoreAttempts.get(id) ?? 0) + 1)
    try {
      const record = await this.shot(id)
      if (
        this.snapshot.shotId !== id ||
        !this.snapshot.complete ||
        !record.measurements?.length
      )
        return
      const start = Date.parse(record.measurements[0].machine.timestamp)
      this.restoredShot = id
      const samples = record.measurements.map((point) => ({
        elapsed: Math.max(
          0,
          (Date.parse(point.machine.timestamp) - start) / 1000
        ),
        pressure: point.machine.pressure,
        flow: point.machine.flow,
        weight: point.scale?.weight ?? null,
        temperature: point.machine.mixTemperature,
      }))
      this.emit({
        samples,
        elapsedKnown: true,
        shotStart: start,
        shotProfile: record.workflow?.profile ?? this.snapshot.shotProfile,
      })
    } catch {
      // A sequencer terminal event may precede shot persistence. Retain observed readings.
      if (this.snapshot.shotId === id) this.restoredShot = null
    } finally {
      if (this.restoringShot === id) this.restoringShot = null
    }
  }
  async loadProfiles() {
    const revision = ++this.libraryRevision
    const favoritesRevision = this.favoritesRevision
    const data = await this.request("/api/v1/profiles?includeHidden=true")
    if (!Array.isArray(data)) throw new Error("Invalid profile library")
    const profiles = data.map(parseProfileRecord)
    if (revision !== this.libraryRevision) return
    this.emit({ profiles })
    try {
      const stored = await this.readStored("favorites")
      const normalized = normalizeFavorites(
        stored === undefined
          ? profiles
              .filter((p) => !p.visibility || p.visibility === "visible")
              .slice(0, 5)
              .map((p) => p.id)
          : stored
      )
      if (
        revision === this.libraryRevision &&
        favoritesRevision === this.favoritesRevision &&
        !this.favoritesSaving
      )
        this.emit({
          favorites: normalized.slots,
          favoritesIssue: normalized.issue,
          favoritesLoaded: true,
        })
    } catch (error) {
      if (
        revision === this.libraryRevision &&
        favoritesRevision === this.favoritesRevision
      )
        this.emit({
          favoritesIssue:
            error instanceof Error ? error.message : "Could not read favorites",
        })
    }
  }
  readonly recipes = new RecipeGateway(this)
  acceptProfile(record: ProfileRecord, previous: string | null) {
    this.libraryRevision++
    this.emit({
      profiles: [
        ...this.snapshot.profiles.filter(
          (p) => p.id !== record.id && p.id !== previous
        ),
        record,
      ],
    })
  }
  async saveFavorites(slots: FavoriteSlots) {
    const normalized = normalizeFavorites(slots)
    if (slots.length !== 5 || normalized.issue)
      throw new Error("Choose five unique or empty favorite positions.")
    if (this.favoritesSaving) throw new Error("Favorites are already saving.")
    this.favoritesSaving = true
    this.favoritesRevision++
    const saved = [...slots]
    try {
      await this.request(
        "/api/v1/store/decent-skin-codex/favorites",
        "POST",
        saved
      )
      this.favoritesRevision++
      this.emit({ favorites: saved, favoritesLoaded: true, favoritesIssue: "" })
      return saved
    } finally {
      this.favoritesSaving = false
    }
  }
  async setProfileVisibility(id: string, visibility: "visible" | "hidden") {
    this.libraryRevision++
    const result = parseProfileRecord(
      await this.request(
        `/api/v1/profiles/${encodeURIComponent(id)}/visibility`,
        "PUT",
        { visibility }
      )
    )
    this.libraryRevision++
    this.emit({
      profiles: this.snapshot.profiles.map((p) => (p.id === id ? result : p)),
    })
    return result
  }
  async importProfiles(value: unknown): Promise<ImportResult> {
    if (!Array.isArray(value) || !value.length)
      throw new Error("Choose a JSON array of exported profile records.")
    value.forEach(parseProfileRecord)
    const result = object(
      await this.request("/api/v1/profiles/import", "POST", value)
    )
    if (
      ![result.imported, result.skipped, result.failed].every(
        (v) => Number.isInteger(v) && Number(v) >= 0
      ) ||
      !Array.isArray(result.errors) ||
      result.errors.some((v) => typeof v !== "string")
    )
      throw new Error(
        "Import response is invalid. Refresh the library before trying again."
      )
    return result as unknown as ImportResult
  }
  async exportProfiles() {
    const result = await this.request(
      "/api/v1/profiles/export?includeHidden=true&includeDeleted=false"
    )
    if (!Array.isArray(result)) throw new Error("Invalid profile export")
    result.forEach(parseProfileRecord)
    return result
  }
  async updateWorkflow(patch: Partial<Workflow>) {
    const block = commandBlock(this.snapshot)
    if (block) throw new Error(block)
    this.workflowRevision++
    this.emit({ pending: true, message: "" })
    try {
      const result = await this.request("/api/v1/workflow", "PUT", patch)
      this.workflowRevision++
      this.emit({ workflow: parseWorkflow(result), complete: false })
    } finally {
      this.emit({ pending: false })
    }
  }
  async workflowOperation(
    action: (
      verify: () => void,
      update: (patch: Partial<Workflow>) => Promise<void>
    ) => Promise<void>
  ) {
    return this.settingsOperation(async (verifyConnection) => {
      let expected = profileFingerprint(this.getSnapshot().workflow)
      const verify = () => {
        verifyConnection()
        if (profileFingerprint(this.getSnapshot().workflow) !== expected)
          throw new Error(
            "The current recipe changed. Review it before saving again."
          )
      }
      const update = async (patch: Partial<Workflow>) => {
        verify()
        this.workflowRevision++
        const workflow = parseWorkflow(
          await this.request("/api/v1/workflow", "PUT", patch)
        )
        this.workflowRevision++
        this.emit({ workflow, complete: false })
        expected = profileFingerprint(workflow)
      }
      await action(verify, update)
    }, true)
  }
  async command(state: MachineCommand) {
    if (state === "idle") {
      if (this.stopPending) return
      this.stopPending = true
      try {
        await this.request("/api/v1/machine/state/idle", "PUT")
      } finally {
        this.stopPending = false
      }
      return
    }
    const block = commandBlock(this.snapshot)
    if (block) throw new Error(block)
    if (state === "espresso" && !this.snapshot.workflow?.profile)
      throw new Error("Choose a profile before brewing")
    if (
      state === "espresso" &&
      this.snapshot.settings?.blockOnNoScale &&
      !this.snapshot.scaleConnected
    )
      throw new Error("Connect the scale before brewing")
    this.emit({ pending: true, message: "" })
    try {
      await this.request(`/api/v1/machine/state/${state}`, "PUT")
      await this.sync()
    } finally {
      this.emit({ pending: false })
    }
  }
  async settingsOperation<T>(
    action: (verify: () => void) => Promise<T>,
    machine = false,
    wake = false,
    stop = false
  ): Promise<T> {
    const block = settingsBlock(this, machine, wake, stop)
    if (block) throw new Error(block)
    const generation = this.generation
    const machineId = this.snapshot.devices.find(
      (d) => d.type === "machine" && d.state === "connected"
    )?.id
    const verify = () => {
      const reason = settingsBlock(this, machine, wake, stop, true)
      if (
        generation !== this.generation ||
        machineId !==
          this.snapshot.devices.find(
            (d) => d.type === "machine" && d.state === "connected"
          )?.id
      )
        throw new Error(
          "Connection changed. Review the current device before retrying."
        )
      if (reason) throw new Error(reason)
    }
    if (stop) return action(verify)
    this.settingsRevision++
    this.emit({ pending: true })
    try {
      return await action(verify)
    } finally {
      this.settingsRevision++
      this.emit({ pending: false })
    }
  }
  acceptPresence(value: Record<string, unknown>) {
    this.emit({ presenceEnabled: value.userPresenceEnabled === true })
  }
  acceptSettings(value: Record<string, unknown>) {
    if (typeof value.gatewayMode !== "string")
      throw new Error("Invalid Decaid settings")
    this.settingsRevision++
    this.emit({
      settings: {
        ...value,
        gatewayMode: value.gatewayMode,
        blockOnNoScale: value.blockOnNoScale === true,
      },
    })
  }
  acceptPreferences(value: FocusPreferences) {
    this.preferencesRevision++
    this.emit({ preferences: value, preferencesIssue: "" })
  }
  async loadPreferences() {
    const generation = this.generation
    const revision = this.preferencesRevision
    try {
      const value = parsePreferences(await this.daily.read("preferences"))
      if (
        generation === this.generation &&
        revision === this.preferencesRevision
      )
        this.acceptPreferences(value)
    } catch (error) {
      if (generation !== this.generation) return
      this.emit({
        preferencesIssue:
          error instanceof Error
            ? error.message
            : "Could not read Focus preferences",
      })
    }
  }
  acceptMachineInfo(value: Record<string, unknown>) {
    const extra =
      value.extra && typeof value.extra === "object"
        ? (value.extra as Record<string, unknown>)
        : {}
    this.emit({
      refillKit: typeof extra.refillKit === "boolean" ? extra.refillKit : null,
    })
  }
  async history(offset = 0): Promise<{ items: ShotRecord[]; total: number }> {
    const data = object(
      await this.request(`/api/v1/shots?limit=20&offset=${offset}`)
    )
    if (!Array.isArray(data.items) || !finite(data.total))
      throw new Error("Invalid shot history")
    return { items: data.items as ShotRecord[], total: data.total }
  }
  async shot(id: string): Promise<ShotRecord> {
    return object(
      await this.request(`/api/v1/shots/${encodeURIComponent(id)}`)
    ) as unknown as ShotRecord
  }
}
