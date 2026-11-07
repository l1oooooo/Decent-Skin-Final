import { useEffect, useMemo, useReducer } from "react"
import type { GatewaySnapshot } from "@/gateway/types"
import { connected } from "@/gateway/model"
import { initialState, isRunning, reduceExperience } from "./model"
import type { BrewEvent, ExperienceState, Reading } from "./model"

export function readings(
  snapshot: Pick<GatewaySnapshot, "samples" | "shotProfile">
): Reading[] {
  const steps = snapshot.shotProfile?.steps ?? []
  return snapshot.samples.map((sample, i, samples) => ({
    elapsed: sample.elapsed,
    pressure: sample.pressure,
    targetPressure: sample.targetPressure ?? null,
    flow: sample.flow,
    groupTemperature: sample.groupTemperature ?? null,
    weightFlow: sample.weightFlow ?? null,
    beverageWeight: sample.weight,
    frame: sample.frame ?? 0,
    stage: steps[sample.frame ?? 0]?.name ?? "Brewing",
    targetStep: i > 0 && sample.frame !== samples[i - 1].frame,
    breakBefore: sample.breakBefore,
  }))
}
type Observation = {
  type: "observe"
  snapshot: GatewaySnapshot
  samples: Reading[]
  fresh: boolean
}
export function liveReducer(
  s: ExperienceState,
  e: BrewEvent | Observation
): ExperienceState {
  if (e.type !== "observe") return reduceExperience(s, e)
  const snapshot = e.snapshot
  if (!snapshot.shotSequence || snapshot.shotSequence < s.sequence) return s
  let next = s
  if (snapshot.shotSequence > s.sequence) {
    // Socket replays can arrive before the initial connection/readings are ready.
    // Attach only once fresh telemetry is available; a terminal replay alone
    // must not create a completion animation or success toast.
    if (!connected(snapshot) || !e.fresh)
      return isRunning(s)
        ? reduceExperience(s, {
            type: "end",
            shotId: s.shotId!,
            outcome: "disconnected",
          })
        : s
    if (snapshot.complete) return { ...s, sequence: snapshot.shotSequence }
    next = reduceExperience(s, {
      type: "start",
      sequence: snapshot.shotSequence,
      shotId: `live-${snapshot.shotSequence}`,
      profileName: snapshot.shotProfile?.title ?? "",
    })
  }
  if (isRunning(next)) {
    next = {
      ...next,
      samples: e.samples,
      phase: e.samples.length ? "active" : "preparing",
    }
    const lost = !connected(snapshot)
    const error = snapshot.machine?.state.state === "error"
    if (lost || error || snapshot.complete) {
      next = reduceExperience(next, {
        type: "end",
        shotId: next.shotId!,
        outcome: lost
          ? "disconnected"
          : error
            ? "failed"
            : (snapshot.shotOutcome ?? "unknown"),
      })
    }
  } else if (
    next.phase === "interrupted" &&
    next.outcome === "disconnected" &&
    connected(snapshot) &&
    e.fresh &&
    !snapshot.complete &&
    snapshot.shotOutcome !== "disconnected" &&
    snapshot.machine?.state.state === "espresso"
  ) {
    next = {
      ...next,
      phase: e.samples.length ? "active" : "preparing",
      samples: e.samples,
      outcome: null,
    }
  } else if (
    next.phase === "interrupted" &&
    next.outcome === "unknown" &&
    snapshot.shotOutcome &&
    snapshot.shotOutcome !== "unknown"
  ) {
    // Machine idle can precede the authoritative shot decision on another socket.
    const outcome = snapshot.shotOutcome
    next = {
      ...next,
      outcome,
      phase:
        ["success", "manual"].includes(outcome) && next.samples.length
          ? "complete"
          : "interrupted",
    }
  }
  return next
}

export function useLiveBrewing(
  snapshot: GatewaySnapshot,
  fresh: boolean,
  home: boolean
) {
  const [state, dispatch] = useReducer(liveReducer, initialState)
  const samples = useMemo(
    () =>
      readings({
        samples: snapshot.samples,
        shotProfile: snapshot.shotProfile,
      }),
    [snapshot.samples, snapshot.shotProfile]
  )
  useEffect(() => {
    dispatch({ type: "observe", snapshot, samples, fresh })
  }, [snapshot, samples, fresh])
  useEffect(() => {
    if (!home) dispatch({ type: "navigate", route: "away" })
    else dispatch({ type: "navigate", route: "home" })
  }, [home])
  useEffect(() => {
    if (!state.shotId || !home || !state.autoReturn) return
    const type =
      state.phase === "complete"
        ? "holdElapsed"
        : state.phase === "returning"
          ? "returned"
          : null
    if (!type) return
    const timer = setTimeout(
      () => dispatch({ type, shotId: state.shotId! }),
      state.phase === "complete" ? 3000 : 280
    )
    return () => clearTimeout(timer)
  }, [state.shotId, state.phase, state.autoReturn, home])
  useEffect(() => {
    if (!state.toast || !state.shotId) return
    const timer = setTimeout(
      () => dispatch({ type: "clearToast", shotId: state.shotId! }),
      2400
    )
    return () => clearTimeout(timer)
  }, [state.toast, state.shotId])
  return { state, dispatch }
}
