import { createServer } from "node:http"
import { createHash } from "node:crypto"

// Isolated contract fixture. It never forwards requests to a real gateway.
const port = Number(process.env.FOCUS_FIXTURE_PORT || 18080)
const profile = {
  version: "2",
  title: "D-Flow / default",
  author: "Damian Brakel",
  notes: "A gentle fill, an unhurried infusion, then a steady flow.",
  beverage_type: "espresso",
  target_weight: 50,
  target_volume: 0,
  tank_temperature: 0,
  target_volume_count_start: 0,
  steps: [
    {
      name: "Preinfusion",
      pump: "flow",
      flow: 2,
      transition: "fast",
      seconds: 7,
      temperature: 88,
      sensor: "coffee",
      volume: 0,
    },
    {
      name: "Extraction",
      pump: "flow",
      flow: 1.6,
      transition: "fast",
      seconds: 11,
      temperature: 88,
      sensor: "coffee",
      volume: 0,
    },
    {
      name: "Pressure decline",
      pump: "pressure",
      pressure: 7.4,
      transition: "smooth",
      seconds: 12,
      temperature: 88,
      sensor: "coffee",
      volume: 0,
    },
  ],
}
const names = [
  profile.title,
  "80's Espresso",
  "Easy blooming — active pressure decline",
  "Rao Allongé",
  "Gentle & sweet",
]
export const profiles = names.map((title, i) => ({
  id: `profile:${i}`,
  profile: { ...profile, title },
  visibility: "visible",
  isDefault: i === 0,
  updatedAt: "2026-11-04T00:00:00.000Z",
}))
export const baseWorkflow = {
  name: "Morning espresso",
  profile,
  context: {
    targetDoseWeight: 18,
    targetYield: 50,
    grinderSetting: "1.8",
    coffeeName: "Fixture coffee",
  },
  steamSettings: { targetTemperature: 140, duration: 30, flow: 0.8 },
  hotWaterData: { targetTemperature: 90, duration: 15, volume: 50, flow: 4 },
  rinseData: { targetTemperature: 88, duration: 5, flow: 6 },
}
let workflow,
  state,
  substate,
  scale,
  elapsed,
  connected,
  mode,
  error,
  shotId,
  started,
  commandLog,
  library,
  favorites
function reset() {
  workflow = structuredClone(baseWorkflow)
  state = "idle"
  substate = "idle"
  scale = true
  elapsed = 0
  connected = true
  mode = "tracking"
  error = null
  shotId = null
  started = false
  commandLog = []
  library = structuredClone(profiles)
  favorites = undefined
}
reset()
const sockets = new Map()
function frame(value) {
  const payload = Buffer.from(JSON.stringify(value))
  const head = Buffer.alloc(payload.length < 126 ? 2 : 4)
  head[0] = 0x81
  if (payload.length < 126) head[1] = payload.length
  else {
    head[1] = 126
    head.writeUInt16BE(payload.length, 2)
  }
  return Buffer.concat([head, payload])
}
function send(channel, value) {
  for (const [socket, path] of sockets)
    if (path === channel && !socket.destroyed) socket.write(frame(value))
}
const baseTime = Date.now()
function machine() {
  return {
    timestamp: new Date(baseTime + elapsed * 1000).toISOString(),
    state: { state, substate },
    pressure: state === "espresso" ? (elapsed < 7 ? 3 : 9) : 0,
    flow: state === "espresso" ? (elapsed < 7 ? 2 : 1.6) : 0,
    mixTemperature: state === "heating" ? 78 : 88,
    profileFrame: elapsed < 7 ? 0 : elapsed < 18 ? 1 : 2,
  }
}
function devices() {
  return [
    {
      id: "machine-fixture",
      name: "DE1 fixture",
      type: "machine",
      state: connected ? "connected" : "disconnected",
    },
    {
      id: "scale-fixture",
      name: "Scale fixture",
      type: "scale",
      state: scale ? "connected" : "disconnected",
    },
  ]
}
function event(reason) {
  return {
    event: reason ? "terminal" : "state",
    timestamp: machine().timestamp,
    shotId,
    state: state === "espresso" ? "pouring" : started ? "finished" : "idle",
    scaleConnected: scale,
    scaleLost: started && !scale,
    machineHasAutonomousSAW: false,
    decision: reason ? { kind: "stop", reason } : null,
  }
}
function emit(reason) {
  send("devices", {
    devices: devices(),
    scanning: false,
    connectionStatus: { phase: "ready", error: null },
  })
  send(
    "scale/snapshot",
    scale
      ? {
          timestamp: machine().timestamp,
          weight: started
            ? Math.min(50, Math.max(0, ((elapsed - 7) / 23) * 50))
            : 0,
        }
      : { status: "disconnected" }
  )
  send("machine/shotState", event(reason))
  if (connected) send("machine/snapshot", machine())
  send("machine/waterLevels", { currentLevel: 75, refillLevel: 10 })
}
function merge(a, b) {
  for (const [k, v] of Object.entries(b))
    a[k] =
      v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] || {}, v) : v
  return a
}
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") {
    res.writeHead(204).end()
    return
  }
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  let body = ""
  for await (const chunk of req) body += chunk
  const data = body ? JSON.parse(body) : {}
  const reply = (value, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" })
    res.end(JSON.stringify(value))
  }
  if (url.pathname === "/__test/reset") {
    reset()
    emit()
    return reply({ ok: true })
  }
  if (url.pathname === "/__test/state") {
    state = data.state ?? state
    substate = data.substate ?? (state === "espresso" ? "pouring" : "idle")
    elapsed = data.elapsed ?? elapsed
    connected = data.connected ?? connected
    scale = data.scale ?? scale
    mode = data.mode ?? mode
    error = data.error ?? null
    if ("favorites" in data) favorites = data.favorites
    if (data.profiles) library = data.profiles
    if (state === "espresso") {
      started = true
      shotId ||= "fixture-shot"
    }
    if (data.profileTitle && workflow.profile)
      workflow.profile.title = data.profileTitle
    if (data.emptyProfile) workflow.profile = null
    if (data.grinderSetting)
      workflow.context.grinderSetting = data.grinderSetting
    emit(data.reason)
    return reply({ ok: true })
  }
  if (url.pathname === "/__test/requests") return reply(commandLog)
  if (req.method !== "GET")
    commandLog.push({ path: url.pathname, method: req.method, body: data })
  if (error && req.method !== "GET") return reply({ error }, 500)
  if (url.pathname === "/api/v1/devices") return reply(devices())
  if (url.pathname === "/api/v1/settings")
    return reply({ gatewayMode: mode, blockOnNoScale: true })
  if (url.pathname === "/api/v1/info")
    return reply({ fullVersion: "contract-fixture c9e2650" })
  if (url.pathname === "/api/v1/workflow") {
    if (req.method === "PUT") workflow = merge(workflow, data)
    return reply(workflow)
  }
  if (url.pathname === "/api/v1/profiles") return reply(library)
  if (url.pathname === "/api/v1/profiles/export") return reply(library)
  if (url.pathname === "/api/v1/profiles/import") {
    let imported = 0, skipped = 0, failed = 0
    const errors = []
    for (const record of data) {
      if (library.some(p => p.id === record.id)) skipped++
      else if (!record.profile?.steps?.length || record.id === "invalid-import") { failed++; errors.push("Profile record was rejected") }
      else { library.push(record); imported++ }
    }
    return reply({ imported, skipped, failed, errors })
  }
  if (url.pathname.endsWith("/visibility")) {
    const id = decodeURIComponent(url.pathname.split("/").at(-2))
    const record = library.find(p => p.id === id)
    if (!record) return reply({ error: "Not found" }, 404)
    record.visibility = data.visibility
    return reply(record)
  }
  if (url.pathname.startsWith("/api/v1/store/")) {
    if (req.method === "POST") { favorites = data; res.writeHead(204).end(); return }
    return favorites === undefined ? reply({ error: "Not found" }, 404) : reply(favorites)
  }
  if (url.pathname === "/api/v1/machine/state") return reply(machine())
  if (url.pathname.startsWith("/api/v1/machine/state/")) {
    const target = url.pathname.split("/").at(-1)
    const stopping = state === "espresso" && target === "idle"
    state = target
    substate = target === "espresso" ? "preinfusion" : "idle"
    if (target === "espresso") {
      elapsed = 0
      shotId = `fixture-${Date.now()}`
      started = true
    }
    emit(stopping ? "apiStop" : undefined)
    return reply({ ok: true })
  }
  if (url.pathname === "/api/v1/devices/connect") {
    scale = true
    emit()
    return reply({ outcome: "connected", state: "connected" })
  }
  if (url.pathname === "/api/v1/shots")
    return reply({
      items: [
        {
          id: "record",
          timestamp: new Date().toISOString(),
          workflow,
          annotations: { actualYield: 50 },
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    })
  if (url.pathname === "/api/v1/shots/record")
    return reply({
      id: "record",
      timestamp: new Date().toISOString(),
      workflow,
      stopReason: "targetWeight",
      annotations: { actualYield: 50 },
      measurements: [],
    })
  reply({ error: "Unknown fixture route" }, 404)
})
server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"]
  if (!key) {
    socket.destroy()
    return
  }
  const accept = createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64")
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`
  )
  sockets.set(socket, req.url.replace("/ws/v1/", ""))
  socket.on("close", () => sockets.delete(socket))
  socket.on("error", () => sockets.delete(socket))
  socket.on("data", (buffer) => {
    if ((buffer[0] & 15) === 8) socket.end()
  })
  emit()
})
setInterval(() => emit(), 500).unref()
server.listen(port, "127.0.0.1")
