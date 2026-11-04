import { useRef, useState } from "react"
import type { DecaidGateway } from "@/gateway/client"
import type { ImportResult } from "@/gateway/types"

export function useProfileTransfer(
  gateway: DecaidGateway,
  refresh: () => Promise<void>
) {
  const [selection, setSelection] = useState<{
    records: unknown[]
    name: string
  } | null>(null)
  const [operation, setOperation] = useState<"import" | "export" | null>(null)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const selectionRevision = useRef(0)
  async function choose(file: File) {
    const revision = ++selectionRevision.current
    setError("")
    setResult(null)
    setSelection(null)
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Choose a profile export smaller than 10 MB.")
      const records: unknown = JSON.parse(await file.text())
      if (!Array.isArray(records) || !records.length)
        throw new Error(
          "Choose a non-empty JSON array of exported profile records."
        )
      if (revision === selectionRevision.current)
        setSelection({ records, name: file.name })
    } catch (error) {
      if (revision === selectionRevision.current)
        setError(
          error instanceof Error ? error.message : "Could not read this file"
        )
    }
  }
  async function importProfiles() {
    if (!selection || operation) return
    setOperation("import")
    setError("")
    try {
      setResult(await gateway.importProfiles(selection.records))
      setSelection(null)
      await refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Import failed")
    } finally {
      setOperation(null)
    }
  }
  async function exportProfiles() {
    if (operation) return
    setOperation("export")
    setError("")
    try {
      const records = await gateway.exportProfiles()
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(records, null, 2)], {
          type: "application/json",
        })
      )
      const link = document.createElement("a")
      link.href = url
      link.download = "focus-profiles.json"
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Export failed")
    } finally {
      setOperation(null)
    }
  }
  return {
    selection,
    operation,
    error,
    result,
    choose,
    importProfiles,
    exportProfiles,
    cancel: () => {
      selectionRevision.current++
      setSelection(null)
      setError("")
    },
  }
}
export type ProfileTransfer = ReturnType<typeof useProfileTransfer>
