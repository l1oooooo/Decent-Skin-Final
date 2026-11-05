import { useRef, useState } from "react"
import { PageMessage } from "./pages"
export function useOperation() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const pending = useRef(false)
  async function run(action: () => Promise<unknown>, success = "Done.") {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await action()
      setMessage(success)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.")
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return { busy, error, message, run }
}
export function OperationStatus({
  operation,
}: {
  operation: ReturnType<typeof useOperation>
}) {
  return (
    <>
      {operation.error && <PageMessage error>{operation.error}</PageMessage>}
      {operation.message && <PageMessage>{operation.message}</PageMessage>}
    </>
  )
}
