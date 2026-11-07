import type { Profile } from "@/gateway/types"
import type { Reading } from "./model"

const finite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

export function plannedProfile(profile: Profile | null) {
  const samples: Reading[] = []
  let duration = 0
  let incomplete = false
  let conditional = false
  let previous: Reading | undefined
  for (const [frame, step] of (profile?.steps ?? []).entries()) {
    const seconds = finite(step.seconds)
    if (seconds === null || seconds < 0) {
      incomplete = true
      break // Later boundaries cannot be placed without this duration.
    }
    conditional ||=
      !!step.exit || Number(step.weight) > 0 || Number(step.volume) > 0
    if (seconds === 0) {
      incomplete = true
      break
    }
    const pressure = step.pump === "pressure" ? finite(step.pressure) : null
    const flow = step.pump === "flow" ? finite(step.flow) : null
    // A mix-water target is not a group-temperature target.
    const groupTemperature =
      step.sensor === "coffee" ? finite(step.temperature) : null
    incomplete ||=
      (step.pump === "pressure" ? pressure : flow) === null ||
      groupTemperature === null
    const target: Reading = {
      elapsed: duration + seconds,
      pressure,
      flow,
      groupTemperature,
      targetPressure: null,
      weightFlow: null,
      beverageWeight: null,
      frame,
      stage: step.name || `Step ${frame + 1}`,
    }
    const start = { ...target, elapsed: duration }
    for (const key of ["pressure", "flow"] as const) {
      if (step.transition === "smooth" && target[key] !== null) {
        // Interpolate only from a known configured target, never a made-up
        // measurement at a pump-mode switch or the beginning of the shot.
        start[key] = previous?.[key] ?? null
        if (start[key] === null) incomplete = true
      }
    }
    samples.push(start, target)
    previous = target
    duration += seconds
  }
  return { samples, duration, incomplete, conditional }
}
