import type { GatewaySnapshot, ShotEvent } from "./types"

export function shotOutcome(
  decision: NonNullable<ShotEvent["decision"]>,
  current: GatewaySnapshot["shotOutcome"]
): GatewaySnapshot["shotOutcome"] {
  if (!["stop", "abort", "terminal"].includes(decision.kind)) return current
  if (decision.reason === "disconnected") return "disconnected"
  if (decision.reason === "noScale") return "blocked"
  if (decision.reason === "error" || decision.kind === "abort") return "failed"
  if (current && ["failed", "disconnected", "blocked"].includes(current))
    return current
  if (["apiStop", "appStop"].includes(decision.reason)) return "manual"
  if (["targetWeight", "targetVolume"].includes(decision.reason))
    return "success"
  // DE1 reports the same reason for GHC stops and autonomous machine endings.
  // Preserve a more specific decision already observed for this shot.
  if (decision.reason === "machineEnded")
    return current && current !== "unknown" ? current : "ended"
  return current ?? "unknown"
}
