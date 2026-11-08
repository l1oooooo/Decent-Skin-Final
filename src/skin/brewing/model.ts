export interface Reading {
  elapsed: number
  pressure: number | null
  targetPressure: number | null
  flow: number | null
  groupTemperature: number | null
  weightFlow: number | null
  beverageWeight: number | null
  frame: number
  stage: string
  targetStep?: boolean
  temperatureBasis?: "coffee" | "water" | null
  breakBefore?: boolean
}
export type Outcome =
  | "success"
  | "manual"
  | "ended"
  | "blocked"
  | "disconnected"
  | "failed"
  | "unknown"
export type Phase =
  "home" | "preparing" | "active" | "complete" | "interrupted" | "returning"
export interface ExperienceState {
  phase: Phase
  shotId: string | null
  sequence: number
  profileName: string
  samples: Reading[]
  outcome: Outcome | null
  route: "home" | "away"
  autoReturn: boolean
  toast: string
}
export type BrewEvent =
  | { type: "start"; shotId: string; sequence: number; profileName: string }
  | { type: "sample"; shotId: string; reading: Reading }
  | { type: "end"; shotId: string; outcome: Outcome }
  | { type: "holdElapsed"; shotId: string }
  | { type: "returned"; shotId: string }
  | { type: "navigate"; route: "home" | "away" }
  | { type: "clearToast"; shotId: string }
  | { type: "dismiss" }

export const initialState: ExperienceState = {
  phase: "home",
  shotId: null,
  sequence: 0,
  profileName: "",
  samples: [],
  outcome: null,
  route: "home",
  autoReturn: false,
  toast: "",
}
export const isRunning = (s: ExperienceState) =>
  s.phase === "preparing" || s.phase === "active"
export const outcomeLabel: Record<Outcome, string> = {
  success: "Shot complete",
  manual: "Shot stopped manually",
  ended: "Shot ended",
  blocked: "Shot blocked",
  disconnected: "Connection lost",
  failed: "Shot interrupted",
  unknown: "Shot ended · outcome unconfirmed",
}
export function finishExperience(
  s: ExperienceState,
  result: Outcome
): ExperienceState {
  const outcome = result === "success" && !s.samples.length ? "unknown" : result
  return {
    ...s,
    outcome,
    phase: ["success", "manual", "ended"].includes(outcome)
      ? "complete"
      : "interrupted",
  }
}
export function reduceExperience(
  s: ExperienceState,
  event: BrewEvent
): ExperienceState {
  if (event.type === "start") {
    if (event.sequence <= s.sequence) return s
    return {
      ...initialState,
      phase: "preparing",
      shotId: event.shotId,
      sequence: event.sequence,
      profileName: event.profileName,
      autoReturn: true,
    }
  }
  if (event.type === "navigate") {
    if (event.route === s.route && isRunning(s)) return s
    return {
      ...s,
      phase: s.phase === "returning" ? "home" : s.phase,
      route: event.route,
      autoReturn: false,
      toast: "",
    }
  }
  if (event.type === "dismiss") {
    if (isRunning(s)) return s
    return { ...s, phase: "home", route: "home", autoReturn: false, toast: "" }
  }
  if (event.shotId !== s.shotId) return s
  switch (event.type) {
    case "sample": {
      if (!isRunning(s)) return s
      const t = event.reading.elapsed
      if (
        !Number.isFinite(t) ||
        t < 0 ||
        (s.samples.length && t <= s.samples[s.samples.length - 1].elapsed)
      )
        return s
      return { ...s, phase: "active", samples: [...s.samples, event.reading] }
    }
    case "end": {
      if (!isRunning(s)) return s
      return finishExperience(s, event.outcome)
    }
    case "holdElapsed":
      return s.phase === "complete" && s.route === "home" && s.autoReturn
        ? { ...s, phase: "returning" }
        : s
    case "returned":
      return s.phase === "returning" && s.route === "home" && s.autoReturn
        ? {
            ...s,
            phase: "home",
            toast:
              s.outcome === "success"
                ? "Shot completed"
                : s.outcome === "manual"
                  ? "Shot stopped manually"
                  : "Shot ended",
          }
        : s
    case "clearToast":
      return { ...s, toast: "" }
  }
}
