import { useEffect, useState } from "react"
import { DecaidGateway, gatewayUrl } from "@/gateway/client"
import FocusScreen from "@/skin/screen"
import { ProfileLibrary } from "@/skin/profile-library"
import { GrindEditor } from "@/skin/grind-editor"
import { History } from "@/skin/history"
import { useSkin } from "@/skin/use-skin"
import "@/skin/skin.css"

export default function App() {
  const [gateway] = useState(() => new DecaidGateway(gatewayUrl()))
  const s = useSkin(gateway)
  useEffect(() => {
    const keyboard = () => {
      document.documentElement.dataset.input = "keyboard"
    }
    const pointer = () => {
      document.documentElement.dataset.input = "pointer"
    }
    window.addEventListener("keydown", keyboard)
    window.addEventListener("pointerdown", pointer)
    return () => {
      window.removeEventListener("keydown", keyboard)
      window.removeEventListener("pointerdown", pointer)
    }
  }, [])
  return (
    <div className="skin-viewport">
      <FocusScreen s={s} />
      <ProfileLibrary s={s} />
      {s.modal === "history" && <History s={s} />}
      {s.modal === "grind" && <GrindEditor s={s} />}
    </div>
  )
}
