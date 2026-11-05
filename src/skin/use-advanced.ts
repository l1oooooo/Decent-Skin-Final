import { useRef, useState } from "react"
import type { DecaidGateway } from "@/gateway/client"
import {
  AdvancedGateway,
  asData,
  machineId,
  type Data,
} from "@/gateway/advanced"

export function useAdvanced(gateway: DecaidGateway) {
  const [api] = useState(() => new AdvancedGateway(gateway))
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [drafts, setDrafts] = useState<Record<string, Data>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const cancelLock = useRef(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [firmware, setFirmware] = useState<Data>({})
  const [scale, setScale] = useState<Data>({})
  const [procedure, setProcedure] = useState("")
  const [result, setResult] = useState<unknown>(null)
  const [identity, setIdentity] = useState<string>()
  const [file, setFile] = useState<File | null>(null)
  const lock = useRef(false),
    revision = useRef<Record<string, number>>({}),
    controller = useRef<AbortController | null>(null),
    job = useRef<Promise<void> | null>(null)
  const dirty =
    Object.values(drafts).some((d) => Object.keys(d).length) || file !== null
  async function read(path: string) {
    const current = (revision.current[path] = (revision.current[path] ?? 0) + 1)
    const id = machineId(gateway.getSnapshot())
    setLoading((prev) => ({ ...prev, [path]: true }))
    try {
      const value = await api.read(path)
      if (revision.current[path] !== current) return
      if (
        path.startsWith("machine/") &&
        id !== machineId(gateway.getSnapshot())
      )
        throw new Error("Machine changed during read. Refresh this section.")
      setValues((prev) => ({ ...prev, [path]: value }))
      setErrors((prev) => ({ ...prev, [path]: "" }))
      if (path === "machine/info") setIdentity(id)
      return value
    } catch (e) {
      if (revision.current[path] === current)
        setErrors((prev) => ({
          ...prev,
          [path]: e instanceof Error ? e.message : "Read failed.",
        }))
    } finally {
      if (revision.current[path] === current)
        setLoading((prev) => ({ ...prev, [path]: false }))
    }
  }
  async function load(category: string) {
    if (
      identity &&
      identity !== machineId(gateway.getSnapshot()) &&
      (dirty || busy)
    ) {
      setError(
        "Machine changed. Cancel the retained advanced edits before refreshing for this device."
      )
      return
    }
    if (!busy) setError("")
    if (category === "calibration" && !busy) setScale({})
    const paths =
      category === "updates"
        ? [
            "machine/info",
            "machine/firmware",
            "update",
            "webui/skins",
            "webui/skins/default",
          ]
        : [
            "machine/info",
            "machine/capabilities",
            ...(category === "calibration"
              ? [
                  "machine/calibration",
                  ...["flow", "pressure", "temperature"].flatMap((t) => [
                    `machine/calibration/${t}`,
                    `machine/calibration/${t}?source=factory`,
                  ]),
                ]
              : category === "machine"
                ? ["machine/settings/advanced"]
                : []),
          ]
    const results = await Promise.allSettled(paths.map(read))
    const capIndex = paths.indexOf("machine/capabilities")
    const caps =
      capIndex >= 0 && results[capIndex].status === "fulfilled"
        ? asData(results[capIndex].value).capabilities
        : []
    if (Array.isArray(caps))
      await Promise.allSettled([
        ...(category === "calibration" && caps.includes("scaleCalibration")
          ? [read("machine/scaleCalibration")]
          : []),
        ...(category === "machine"
          ? [
              ["cupWarmer", "machine/cupWarmer"],
              ["preheat", "machine/cupWarmer/preheat"],
              ["ledStrip", "machine/ledStrip"],
            ]
              .filter(([cap]) => caps.includes(cap))
              .map(([, path]) => read(path))
          : []),
      ])
  }
  function change(key: string, field: string, value: unknown) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }
  function clear(key?: string) {
    setDrafts((prev) => (key ? { ...prev, [key]: {} } : {}))
    if (!key) setFile(null)
  }
  async function run(
    name: string,
    action: (signal: AbortSignal) => Promise<void>
  ) {
    if (lock.current || cancelLock.current) return false
    lock.current = true
    setBusy(name)
    setError("")
    setMessage("")
    controller.current = new AbortController()
    let success = false
    const pending = (async () => {
      try {
        await action(controller.current!.signal)
        success = true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Operation failed.")
      } finally {
        lock.current = false
        setBusy("")
        controller.current = null
      }
    })()
    job.current = pending
    await pending
    return success
  }
  async function cancel(kind: "maintenance" | "firmware" | "scale") {
    if (cancelLock.current) return
    if (
      lock.current &&
      !(kind === "maintenance"
        ? busy.includes("cycle")
        : kind === "scale"
          ? busy.startsWith("Scale ")
          : busy === "Updating machine firmware")
    ) {
      setError(
        "A different operation is running. Return to its controls to cancel it."
      )
      return
    }
    cancelLock.current = true
    setCancelling(true)
    controller.current?.abort()
    setMessage(
      "Cancellation requested; waiting for the outstanding request to settle."
    )
    await job.current
    try {
      if (kind === "maintenance") {
        await api.stopMaintenance(identity)
        setProcedure("Stop requested. Verify that the machine returns to idle.")
      }
      if (kind === "firmware") {
        await api.cancelFirmware(identity)
        await read("machine/firmware")
      }
      if (kind === "scale") {
        await api.abortScale(identity)
        await read("machine/scaleCalibration")
      }
      setError("")
      setMessage(
        "Cancel request sent. Refresh the actual device state before starting again."
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Cancel failed; inspect the device."
      )
    } finally {
      cancelLock.current = false
      setCancelling(false)
    }
  }
  async function save(path: string, capability?: string) {
    const patch = { ...drafts[path] }
    if (!Object.keys(patch).length || errors[path]) return
    await run("Saving machine settings", async () => {
      const next = await api.machineWrite(
        path,
        path.includes("cupWarmer") || path.includes("ledStrip")
          ? "PUT"
          : "POST",
        patch,
        identity,
        capability
      )
      setValues((prev) => ({ ...prev, [path]: next }))
      setDrafts((prev) => ({
        ...prev,
        [path]: Object.fromEntries(
          Object.entries(prev[path] ?? {}).filter(
            ([key, value]) =>
              JSON.stringify(value) !== JSON.stringify(patch[key])
          )
        ),
      }))
      setMessage("Machine values read back. Review the returned values below.")
    })
  }
  return {
    api,
    values,
    drafts,
    errors,
    loading,
    busy: cancelling ? "Cancelling operation" : busy,
    message,
    error,
    firmware,
    scale,
    procedure,
    result,
    identity,
    file,
    setFile,
    dirty,
    read,
    load,
    change,
    clear,
    run,
    cancel,
    save,
    setMessage,
    setFirmware,
    setScale,
    setProcedure,
    setResult,
    value: (path: string, key: string) =>
      drafts[path]?.[key] ?? asData(values[path])[key],
  }
}
export type Advanced = ReturnType<typeof useAdvanced>
