import { NotificationMessage } from "./notifications/feedback"
import { useCallback, useEffect, useState } from "react"
import {
  settingsBlock,
  type SettingsRecord,
  type GrinderInfo,
  type GrinderState,
} from "@/gateway/daily-settings"
import { object } from "@/gateway/model"
import type { SkinSession } from "./use-skin"
import { Action } from "./primitives"
import { PageHint } from "./pages"
import { useOperation } from "./settings-operation"
import {
  ConfirmAction,
  inputClass,
  SettingInput,
  SettingSelect,
  SettingsGroup,
} from "./settings-controls"
export function Connections({ s }: { s: SkinSession }) {
  const op = useOperation()
  const [wifi, setWifi] = useState<string[]>([])
  const [wifiError, setWifiError] = useState("")
  const [host, setHost] = useState("")
  const [diagnostics, setDiagnostics] = useState<unknown>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    action: () => Promise<unknown>
  } | null>(null)
  const [preferences, setPreferences] = useState<SettingsRecord>({})
  const block = settingsBlock(s.gateway)
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      s.gateway.request("/api/v1/devices/wifi"),
      s.gateway.daily.read("settings"),
    ])
    if (results[0].status === "fulfilled") {
      const endpoints = object(results[0].value).endpoints
      if (
        Array.isArray(endpoints) &&
        endpoints.every((v) => typeof v === "string")
      ) {
        setWifi(endpoints)
        setWifiError("")
      } else setWifiError("Invalid Wi-Fi endpoint list.")
    } else setWifiError(results[0].reason.message)
    if (results[1].status === "fulfilled") setPreferences(results[1].value)
  }, [s.gateway])
  useEffect(() => {
    let alive = true
    s.gateway
      .request("/api/v1/devices/wifi")
      .then((value) => {
        const endpoints = object(value).endpoints
        if (
          !Array.isArray(endpoints) ||
          endpoints.some((v) => typeof v !== "string")
        )
          throw new Error("Invalid Wi-Fi endpoint list.")
        if (alive) setWifi(endpoints)
      })
      .catch((e) => {
        if (alive) setWifiError(e.message)
      })
    s.gateway.daily
      .read("settings")
      .then((value) => {
        if (alive) setPreferences(value)
      })
      .catch((e) => {
        if (alive) setWifiError(e.message)
      })
    return () => {
      alive = false
    }
  }, [s.gateway])
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        <Action
          disabled={op.busy || !!block}
          onClick={() =>
            void op.run(
              () => s.gateway.daily.device("scan"),
              "Discovery requested. Devices appear as Decaid finds them; nothing is connected automatically."
            )
          }
        >
          Scan for devices
        </Action>
        <Action
          variant="outline"
          disabled={op.busy}
          onClick={() =>
            void op.run(async () => {
              await s.gateway.sync()
              await refresh()
            }, "")
          }
        >
          Refresh inventory
        </Action>
        <Action
          variant="outline"
          disabled={
            op.busy || !!settingsBlock(s.gateway, true) || !s.scaleConnected
          }
          onClick={() => void op.run(() => s.gateway.daily.tare(), "")}
        >
          Tare scale
        </Action>
      </div>
      <SettingsGroup
        title="Devices"
        description="Device preferences belong to Decaid. Selecting a preferred device can affect its future automatic connections."
      >
        {!s.snapshot.devices.length && (
          <PageHint>
            No known devices. Start an explicit scan to discover nearby devices.
          </PageHint>
        )}
        {s.snapshot.devices.map((d) => {
          const key =
            d.type === "machine"
              ? "preferredMachineId"
              : d.type === "scale"
                ? "preferredScaleId"
                : d.type === "grinder"
                  ? "preferredGrinderDeviceId"
                  : null
          return (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-3 border-b border-border py-4"
            >
              <div className="min-w-[200px] flex-1">
                <p className="text-[15px] font-medium [overflow-wrap:anywhere]">
                  {d.name}
                </p>
                <p className="mt-1 text-xs [overflow-wrap:anywhere] text-muted-foreground">
                  {d.type} · {d.state}
                  {d.connectionRole ? ` · ${d.connectionRole}` : ""} · {d.id}
                </p>
              </div>
              <Action
                variant="outline"
                disabled={
                  op.busy ||
                  !!block ||
                  ["connecting", "disconnecting"].includes(d.state)
                }
                onClick={() =>
                  d.state === "connected"
                    ? setConfirm({
                        title: `Disconnect ${d.name}?`,
                        description:
                          "The device will be unavailable until connected again.",
                        action: () =>
                          s.gateway.daily.device("disconnect", d.id),
                      })
                    : void op.run(
                        () => s.gateway.daily.device("connect", d.id),
                        ""
                      )
                }
              >
                {d.state === "connected" ? "Disconnect" : "Connect"}
              </Action>
              {key && (
                <Action
                  variant="outline"
                  disabled={op.busy || !!block || !(key in preferences)}
                  aria-pressed={preferences[key] === d.id}
                  onClick={() =>
                    void op.run(async () => {
                      const next = await s.gateway.daily.save("settings", {
                        [key]: preferences[key] === d.id ? null : d.id,
                      })
                      setPreferences(next)
                    }, "")
                  }
                >
                  {preferences[key] === d.id
                    ? "Clear preferred"
                    : "Set preferred"}
                </Action>
              )}
              <Action
                variant="ghost"
                disabled={op.busy || !!block}
                onClick={() =>
                  setConfirm({
                    title: `Forget ${d.name}?`,
                    description:
                      "Removes the remembered device. A device still present may remain in the inventory; it can be discovered again.",
                    action: () => s.gateway.daily.device("forget", d.id),
                  })
                }
              >
                Forget
              </Action>
            </div>
          )
        })}
      </SettingsGroup>
      <SettingsGroup
        title="Manual Wi-Fi scales"
        description="Register a scale by IP address or hostname, then explicitly connect it from Devices."
      >
        {wifiError && (
          <NotificationMessage
            notificationKey={`connection-settings-220`}
            error
          >
            {wifiError}
          </NotificationMessage>
        )}
        {wifi.map((h) => (
          <div
            key={h}
            className="flex items-center justify-between gap-4 border-b border-border py-3"
          >
            <span>{h}</span>
            <Action
              variant="outline"
              disabled={op.busy || !!block}
              onClick={() =>
                setConfirm({
                  title: "Remove Wi-Fi endpoint?",
                  description: `Remove ${h} and disconnect its scale instance.`,
                  action: async () => {
                    await s.gateway.daily.wifi(h, true)
                    await refresh()
                  },
                })
              }
            >
              Remove
            </Action>
          </div>
        ))}
        <form
          className="mt-4 flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void op.run(async () => {
              await s.gateway.daily.wifi(host.trim())
              setHost("")
              await refresh()
            }, "Wi-Fi endpoint registered.")
          }}
        >
          <label className="flex flex-1 flex-col gap-2 text-sm">
            IP address or hostname
            <input
              className={inputClass}
              value={host}
              onChange={(e) => setHost(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <Action type="submit" disabled={op.busy || !!block || !host.trim()}>
            Add endpoint
          </Action>
        </form>
      </SettingsGroup>
      <Grinder
        key={
          s.snapshot.devices.find(
            (d) => d.type === "grinder" && d.state === "connected"
          )?.id ?? "disconnected"
        }
        s={s}
      />
      <SettingsGroup
        title="Connectivity diagnostics"
        description="Bluetooth permissions and transport settings are managed in the Decaid app."
      >
        <Action
          variant="outline"
          className="mt-4"
          disabled={op.busy}
          onClick={() =>
            void op.run(
              async () =>
                setDiagnostics(
                  await s.gateway.request("/api/v1/diagnostics/ble")
                ),
              ""
            )
          }
        >
          Read Bluetooth diagnostics
        </Action>
        {diagnostics !== null && (
          <pre className="mt-4 text-xs leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        )}
      </SettingsGroup>
      {confirm && (
        <ConfirmAction
          title={confirm.title}
          description={confirm.description}
          cancel={() => setConfirm(null)}
          confirm={() => {
            const action = confirm.action
            setConfirm(null)
            void op.run(action)
          }}
        />
      )}
    </>
  )
}
function Grinder({ s }: { s: SkinSession }) {
  const op = useOperation()
  const stopOp = useOperation()
  const [info, setInfo] = useState<GrinderInfo | null>(null)
  const [state, setState] = useState<GrinderState | null>(null)
  const [error, setError] = useState("")
  const [setting, setSetting] = useState("")
  const [rpm, setRpm] = useState("")
  const [allowSend, setAllowSend] = useState(false)
  const id = s.snapshot.devices.find(
    (d) => d.type === "grinder" && d.state === "connected"
  )?.id
  useEffect(() => {
    let alive = true
    async function refresh() {
      if (!id) return
      try {
        const [next, current] = await Promise.all([
          s.gateway.daily.grinderInfo(),
          s.gateway.daily.grinderState(),
        ])
        if (alive) {
          setInfo(next)
          setState(current)
          setError("")
        }
      } catch (e) {
        if (alive) {
          setInfo(null)
          setState(null)
          setError((e as Error).message)
        }
      }
    }
    void refresh()
    const timer = setInterval(() => {
      if (!document.hidden) void refresh()
    }, 3000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [id, s.gateway])
  const descriptor = info?.controls?.grindSetting
  const blocked =
    op.busy ||
    !!settingsBlock(s.gateway) ||
    !info ||
    !state ||
    state.state !== "idle"
  return (
    <SettingsGroup
      title="Connected grinder"
      description="Recipe grind text and device readings are separate. Commands are explicit; no automatic synchronization is enabled."
    >
      {!id && <PageHint>No connected grinder.</PageHint>}
      {error && (
        <NotificationMessage notificationKey={`connection-settings-376`} error>
          {error}
        </NotificationMessage>
      )}
      {info && (
        <>
          <p className="my-4 text-sm text-muted-foreground">
            {info.deviceId} · {state?.state ?? "Unavailable"} · Setting{" "}
            {state?.setting ?? state?.observedSetting ?? "—"} · RPM{" "}
            {state?.rpm ?? state?.observedRpm ?? "—"}
          </p>
          {info.capabilities.includes("grindSetting") && descriptor ? (
            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                void op.run(
                  () =>
                    s.gateway.daily.grinder("setting", setting, info.deviceId),
                  "Grinder setting acknowledged."
                )
              }}
            >
              <label className="flex max-w-[320px] flex-1 flex-col gap-2 text-sm">
                Grinder setting
                {descriptor.kind === "enumerated" ? (
                  <SettingSelect
                    label="Grinder setting"
                    value={setting}
                    options={descriptor.values.map((v) => ({
                      label: v,
                      value: v,
                    }))}
                    onChange={setSetting}
                  />
                ) : (
                  <input
                    className={inputClass}
                    value={setting}
                    type={descriptor.kind === "numeric" ? "number" : "text"}
                    step="any"
                    min={
                      descriptor.kind === "numeric" ? descriptor.min : undefined
                    }
                    max={
                      descriptor.kind === "numeric" ? descriptor.max : undefined
                    }
                    onChange={(e) => setSetting(e.target.value)}
                  />
                )}
              </label>
              <Action type="submit" disabled={blocked || !setting.trim()}>
                Send setting
              </Action>
            </form>
          ) : (
            <PageHint>Grind setting is read-only or unavailable.</PageHint>
          )}
          {info.capabilities.includes("rpmControl") &&
            info.controls?.rpmControl && (
              <form
                className="mt-4 flex items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void op.run(
                    () => s.gateway.daily.grinder("rpm", rpm, info.deviceId),
                    "RPM acknowledged."
                  )
                }}
              >
                <label className="flex max-w-[320px] flex-1 flex-col gap-2 text-sm">
                  Grinder RPM
                  <input
                    type="number"
                    min={info.controls.rpmControl.min}
                    max={info.controls.rpmControl.max}
                    step={1}
                    className={inputClass}
                    value={rpm}
                    onChange={(e) => setRpm(e.target.value)}
                  />
                </label>
                <Action type="submit" disabled={blocked || !rpm.trim()}>
                  Send RPM
                </Action>
              </form>
            )}
          {info.capabilities.includes("startStop") && (
            <div className="mt-4 flex gap-3">
              <Action
                disabled={blocked}
                onClick={() =>
                  void op.run(
                    () =>
                      s.gateway.daily.grinder(
                        "start",
                        undefined,
                        info.deviceId
                      ),
                    "Grinder start acknowledged."
                  )
                }
              >
                Start grinder
              </Action>
              <Action
                variant="outline"
                disabled={s.snapshot.connection !== "online"}
                onClick={() =>
                  void stopOp.run(
                    () =>
                      s.gateway.daily.grinder("stop", undefined, info.deviceId),
                    "Grinder stop acknowledged."
                  )
                }
              >
                Stop grinder
              </Action>
            </div>
          )}
          {descriptor && info.capabilities.includes("grindSetting") && (
            <>
              <SettingInput
                field={{
                  key: "send",
                  label: "Allow sending the recipe setting",
                  kind: "boolean",
                  help: "Off each time you enter this page or change devices. Sending still requires the button below.",
                }}
                value={allowSend}
                onChange={(v) => setAllowSend(v === true)}
              />
              <Action
                className="mt-4"
                variant="outline"
                disabled={!allowSend || blocked || !s.grindText}
                onClick={() =>
                  void op.run(
                    () =>
                      s.gateway.daily.grinder(
                        "setting",
                        s.grindText,
                        info.deviceId
                      ),
                    "Recipe setting sent once."
                  )
                }
              >
                Send recipe setting once
              </Action>
            </>
          )}
        </>
      )}
    </SettingsGroup>
  )
}
