import { useEffect } from "react"
import type { SkinSession } from "../use-skin"
import { machineNotifications } from "./machine"
export function useMachineNotifications(session: SkinSession) {
  useEffect(() => {
    machineNotifications(session)
  }, [session])
}
