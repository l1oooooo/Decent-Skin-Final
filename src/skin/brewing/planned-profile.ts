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

export const previewKeys = ["pressure", "flow", "groupTemperature"] as const
export type PreviewKey = (typeof previewKeys)[number]

export function completeProfilePreview(profile: Profile | null) {
  const plan = plannedProfile(profile)
  const steps = profile?.steps ?? []
  const fullTimeline =
    steps.length > 0 && plan.samples.length === steps.length * 2
  const sensor = steps[0]?.sensor
  const sameTemperatureBasis =
    (sensor === "coffee" || sensor === "water") &&
    steps.every((step) => step.sensor === sensor)
  const samples = plan.samples.map((sample) => ({
    ...sample,
    // Home shows the configured temperature target, not a measured group value.
    groupTemperature: sameTemperatureBasis
      ? finite(steps[sample.frame].temperature)
      : null,
  }))
  const visibleKeys = previewKeys.filter(
    (key) =>
      fullTimeline &&
      samples.every(
        (sample) => sample[key] !== null && Number.isFinite(sample[key])
      )
  )
  return {
    ...plan,
    visibleKeys,
    samples: samples.map((sample) => ({
      ...sample,
      pressure: visibleKeys.includes("pressure") ? sample.pressure : null,
      flow: visibleKeys.includes("flow") ? sample.flow : null,
      groupTemperature: visibleKeys.includes("groupTemperature")
        ? sample.groupTemperature
        : null,
    })),
  }
}
