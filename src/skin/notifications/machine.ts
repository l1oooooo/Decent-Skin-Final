import type { SkinSession } from "../use-skin"
import { notifications, type createNotifications } from "./manager"

export function createMachineNotifications(
  manager: ReturnType<typeof createNotifications>
) {
  let refill = false
  let fault = false
  let lowWater = false
  let disconnected = false
  return (s: SkinSession) => {
    const snap = s.snapshot
    const state = snap.machine?.state.state
    const substate = snap.machine?.state.substate
    const fresh = s.connected && s.machineFresh && !!state
    if (fresh) {
      if (state === "needsWater") refill = true
      if (state === "error") fault = true
      // Stale/absent readings and a different unresolved fault are not resolution.
      if (
        [
          "idle",
          "sleeping",
          "heating",
          "preheating",
          "espresso",
          "steam",
          "hotWater",
          "flush",
        ].includes(state!)
      ) {
        refill = false
        fault = false
      }
      if (
        snap.refillKit === true ||
        (snap.preferences != null && snap.preferences.refillWarningMm === 0)
      )
        lowWater = false
      else if (
        snap.refillKit === false &&
        s.waterLevel !== null &&
        snap.preferences?.refillWarningMm != null
      )
        lowWater = s.waterLevel < snap.preferences.refillWarningMm
    }
    manager.condition(
      "machine-water",
      refill ? "refill" : lowWater ? "low" : null,
      {
        title: refill ? "Water refill required" : "Low water",
        description: refill
          ? "Refill the water tank to continue."
          : "The tank is below your configured refill warning. Refill the tank.",
        type: "warning",
        persistent: true,
      }
    )
    manager.condition("machine-fault", fault ? "fault" : null, {
      title: "Machine needs attention",
      description: "Check the machine fault in Decaid before continuing.",
      type: "error",
      persistent: true,
    })
    if (s.connected && s.machineFresh) disconnected = false
    else if (
      snap.connection === "offline" ||
      (snap.connection === "online" && !s.connected)
    )
      disconnected = true
    manager.condition("machine-connection", disconnected ? "offline" : null, {
      title: "Machine disconnected",
      description: "Check the connection in Decaid.",
      type: "error",
      persistent: true,
      action: {
        children: "Reconnect",
        onClick: () => {
          void s.reconnect()
        },
      },
    })
    const heating =
      fresh &&
      (substate === "preparingForShot"
        ? "preparing"
        : ["heating", "preheating", "booting"].includes(state!)
          ? "heating"
          : null)
    manager.condition("machine-heating", heating || null, {
      title:
        heating === "preparing"
          ? "Preparing for shot"
          : "Heating to your brew temperature",
      type: "info",
    })
    const requiresScale =
      s.active && (!!snap.settings?.blockOnNoScale || s.yieldTarget > 0)
    const scaleRisk = requiresScale && (snap.scaleLost || !s.scaleConnected)
    manager.condition(
      "shot-scale",
      scaleRisk ? String(snap.shotSequence) : null,
      {
        title: "Scale unavailable during this shot",
        description:
          "Stop-at-weight is unavailable; stop the extraction manually.",
        type: "warning",
        persistent: true,
      }
    )
    const device =
      snap.deviceErrorKind === "scaleDisconnected" ? "" : snap.deviceNotice
    manager.condition("device-error", device || null, {
      title: device,
      type: "error",
    })
    manager.condition("gateway-message", snap.message || null, {
      title: snap.message,
      type: "error",
    })
    const normalState = [
      "error",
      "needsWater",
      "espresso",
      "steam",
      "hotWater",
      "flush",
      "heating",
      "preheating",
      "booting",
    ].includes(state ?? "")
    const gate = s.connected && !snap.pending && !normalState ? s.block : ""
    manager.condition("machine-gate", gate || null, {
      title: gate,
      type: s.machineFresh ? "info" : "warning",
      action:
        state === "sleeping"
          ? {
              children: "Wake",
              onClick: () => {
                void s.wake()
              },
            }
          : undefined,
    })
  }
}
export const machineNotifications = createMachineNotifications(notifications)
