import { useFeedback } from "./notifications/feedback"
import { useRef, useState } from "react"
export function useOperation() {
  const [busy, setBusy] = useState(false)
  const feedback = useFeedback("Working…")
  const { message, setMessage } = feedback
  const { error, setError } = feedback
  const pending = useRef(false)
  async function run(action: () => Promise<unknown>, success = "Done.") {
    if (pending.current) return
    pending.current = true
    feedback.begin()
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await action()
      setMessage(success, "success")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.")
    } finally {
      pending.current = false
      feedback.end()
      setBusy(false)
    }
  }
  return { busy, error, message, run }
}
