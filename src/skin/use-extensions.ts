import { useFeedback } from "./notifications/feedback"
import { useRef, useState } from "react"
import type { DecaidGateway } from "@/gateway/client"
import { ExtensionsGateway, readLog, type Plugin } from "@/gateway/extensions"
import { asData, type Data } from "@/gateway/advanced"
export function useExtensions(gateway: DecaidGateway) {
  const [api] = useState(() => new ExtensionsGateway(gateway))
  const [plugins, setPlugins] = useState<Plugin[] | null>(null)
  const [values, setValues] = useState<Record<string, Data>>({})
  const [drafts, setDrafts] = useState<Record<string, Data>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState("")
  const feedback = useFeedback("Waiting for operation")
  const { message, setMessage } = feedback
  const { error, setError } = feedback
  const [logs, setLogs] = useState<Record<string, string>>({})
  const [receipt, setReceipt] = useState<Data>({})
  const revision = useRef<Record<string, number>>({}),
    lock = useRef(false)
  const dirty = Object.values(drafts).some((d) => Object.keys(d).length > 0)
  function change(key: string, field: string, value: unknown) {
    setDrafts((p) => ({ ...p, [key]: { ...p[key], [field]: value } }))
  }
  function clear(key?: string) {
    setDrafts((p) => (key ? { ...p, [key]: {} } : {}))
  }
  function acknowledge(key: string, submitted: Data) {
    setDrafts((p) => ({
      ...p,
      [key]: Object.fromEntries(
        Object.entries(p[key] ?? {}).filter(([k, v]) => v !== submitted[k])
      ),
    }))
  }
  async function read(key: string) {
    const attempt = (revision.current[key] = (revision.current[key] ?? 0) + 1)
    setLoading((p) => ({ ...p, [key]: true }))
    try {
      const data =
        key === "plugins"
          ? await api.list()
          : key.startsWith("plugin:")
            ? await api.settings(key.slice(7))
            : await gateway.request(`/api/v1/${key}`)
      if (revision.current[key] !== attempt) return
      if (key === "plugins") setPlugins(data as Plugin[])
      else setValues((p) => ({ ...p, [key]: asData(data) }))
      setErrors((p) => ({ ...p, [key]: "" }))
      return data
    } catch (e) {
      if (revision.current[key] === attempt)
        setErrors((p) => ({
          ...p,
          [key]: e instanceof Error ? e.message : "Read failed.",
        }))
    } finally {
      if (revision.current[key] === attempt)
        setLoading((p) => ({ ...p, [key]: false }))
    }
  }
  async function run(name: string, action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    feedback.begin(name)
    setBusy(name)
    setMessage("")
    setError("")
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.")
    } finally {
      lock.current = false
      feedback.end()
      setBusy("")
    }
  }
  async function save(plugin: Plugin) {
    const key = `plugin:${plugin.id}`,
      patch = { ...drafts[key] }
    await run("Saving plugin settings", async () => {
      const next = await api.save(plugin, patch)
      revision.current[key] = (revision.current[key] ?? 0) + 1
      setLoading((p) => ({ ...p, [key]: false }))
      setValues((p) => ({ ...p, [key]: next }))
      acknowledge(key, patch)
      setMessage(
        "Plugin settings acknowledged. A running plugin may have reloaded."
      )
      await read("plugins")
    })
  }
  async function log(kind: "logs" | "webview/logs") {
    await run("Reading log", async () => {
      const text = await gateway.transfer(
        `/api/v1/${kind}?order=desc${kind === "logs" ? "&kb=256" : ""}`,
        {},
        readLog
      )
      setLogs((p) => ({ ...p, [kind]: text }))
      setMessage("Log read locally. Nothing has been submitted.")
    })
  }
  return {
    api,
    plugins,
    values,
    drafts,
    errors,
    loading,
    busy,
    message,
    error,
    logs,
    receipt,
    setReceipt,
    setMessage,
    read,
    run,
    save,
    change,
    clear,
    acknowledge,
    log,
    dirty,
  }
}
export type ExtensionsState = ReturnType<typeof useExtensions>
