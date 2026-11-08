import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { notifications, type NotificationType } from "./manager"

export function useFeedback(label: string) {
  const id = useId()
  const [message, saveMessage] = useState("")
  const [error, saveError] = useState("")
  const current = useRef({
    pending: false,
    message: "",
    error: "",
    type: "info" as NotificationType,
  })
  function setMessage(text: string, type: NotificationType = "info") {
    saveMessage(text)
    current.current.message = text
    current.current.type = type
    if (text && !current.current.pending)
      notifications.show(id, { title: text, type })
  }
  function setError(text: string) {
    saveError(text)
    current.current.error = text
    if (text && !current.current.pending)
      notifications.show(id, { title: text, type: "error" })
  }
  function begin(title = label) {
    current.current = { pending: true, message: "", error: "", type: "info" }
    notifications.begin(id, title)
  }
  function end() {
    const result = current.current
    result.pending = false
    notifications.finish(
      id,
      result.error
        ? { title: result.error, type: "error" }
        : result.message
          ? { title: result.message, type: result.type }
          : undefined
    )
  }
  return { message, setMessage, error, setError, begin, end }
}

function plainText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child): string => {
      if (typeof child === "string" || typeof child === "number")
        return String(child)
      if (isValidElement<{ children?: ReactNode }>(child))
        return plainText(child.props.children)
      return ""
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Effect-only adapter for view-local read failures and state transitions. */
export function NotificationMessage({
  children,
  error = false,
  notificationKey,
  type,
  persistent = false,
}: {
  children: ReactNode
  error?: boolean
  notificationKey: string
  type?: NotificationType
  persistent?: boolean
}) {
  const title = plainText(children)
  useEffect(() => {
    if (!title) return
    if (type === "loading") notifications.begin(notificationKey, title)
    else
      notifications.condition(notificationKey, title, {
        title,
        type: type ?? (error ? "error" : "info"),
        persistent,
      })
    return () => {
      notifications.forget(notificationKey)
      if (type === "loading" || persistent) notifications.close(notificationKey)
    }
  }, [title, error, notificationKey, type, persistent])
  return null
}
