import { Toaster } from "@/components/ui/toast"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster>
      <App />
    </Toaster>
  </StrictMode>
)
