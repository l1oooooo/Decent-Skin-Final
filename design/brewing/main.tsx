import { Toaster } from "@/components/ui/toast"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./theme.css"
import "@/skin/skin.css"
import "./preview.css"
import Preview from "./preview"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster>
      <Preview />
    </Toaster>
  </StrictMode>
)
