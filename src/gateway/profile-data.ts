import type { Profile, ProfileStep } from "./types"

type Json = Record<string, unknown>
const profileKeys =
  "version title notes author beverage_type steps target_volume target_weight target_volume_count_start tank_temperature".split(
    " "
  )
const stepKeys =
  "name pump transition exit volume seconds weight temperature sensor pressure flow limiter".split(
    " "
  )
function extras(value: Json, keys: string[]) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key))
  )
}
export function profileExtensions(profile: Profile) {
  return {
    ...extras(profile, profileKeys),
    steps: profile.steps.map((step) => ({
      ...extras(step, stepKeys),
      ...(step.exit && typeof step.exit === "object"
        ? { exit: extras(step.exit as Json, ["type", "condition", "value"]) }
        : {}),
      ...(step.limiter && typeof step.limiter === "object"
        ? { limiter: extras(step.limiter as Json, ["value", "range"]) }
        : {}),
    })),
  }
}
export function restoreExtensions(profile: Profile, value: unknown): Profile {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return profile
  const extension = value as Json
  const steps = Array.isArray(extension.steps) ? extension.steps : []
  return {
    ...extras(extension, profileKeys),
    ...profile,
    steps: profile.steps.map((step, i) => {
      const extra =
        steps[i] && typeof steps[i] === "object" ? (steps[i] as Json) : {}
      return {
        ...extras(extra, stepKeys),
        ...step,
        ...(step.exit
          ? {
              exit: { ...((extra.exit as Json) ?? {}), ...(step.exit as Json) },
            }
          : {}),
        ...(step.limiter
          ? {
              limiter: {
                ...((extra.limiter as Json) ?? {}),
                ...(step.limiter as Json),
              },
            }
          : {}),
      }
    }),
  }
}
export const newStep = (): ProfileStep => ({
  name: "New stage",
  pump: "pressure",
  pressure: 6,
  transition: "fast",
  seconds: 10,
  temperature: 93,
  sensor: "coffee",
  volume: 0,
})
export const newProfile = (): Profile => ({
  version: "2",
  title: "New profile",
  author: "",
  notes: "",
  beverage_type: "espresso",
  target_weight: 36,
  target_volume: 0,
  target_volume_count_start: 0,
  tank_temperature: 0,
  steps: [newStep()],
})
export function validateProfile(profile: Profile): Record<string, string> {
  const errors: Record<string, string> = {}
  const number = (
    key: string,
    value: unknown,
    min: number,
    max: number,
    optional = false
  ) => {
    if (optional && value == null) return
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      errors[key] = `Enter a number from ${min} to ${max}.`
  }
  if (typeof profile.title !== "string" || !profile.title.trim())
    errors.title = "Enter a profile name."
  if (
    !Array.isArray(profile.steps) ||
    !profile.steps.length ||
    profile.steps.length > 20
  )
    errors.steps = "Use 1–20 stages."
  number("target_weight", profile.target_weight, 0, 1000, true)
  number("target_volume", profile.target_volume, 0, 1000, true)
  number("tank_temperature", profile.tank_temperature, 0, 100)
  number(
    "target_volume_count_start",
    profile.target_volume_count_start,
    0,
    Math.max(0, (profile.steps?.length ?? 1) - 1)
  )
  if (!Number.isInteger(profile.target_volume_count_start))
    errors.target_volume_count_start =
      "Enter a whole stage index (starting at 0)."
  if (
    !["espresso", "calibrate", "cleaning", "manual", "pourover"].includes(
      String(profile.beverage_type)
    )
  )
    errors.beverage_type = "Choose a supported beverage type."
  for (const [i, step] of (Array.isArray(profile.steps)
    ? profile.steps
    : []
  ).entries()) {
    const key = `steps.${i}.`
    if (!step || typeof step !== "object") {
      errors[key] = "Invalid stage."
      continue
    }
    if (typeof step.name !== "string" || !step.name.trim())
      errors[key + "name"] = "Enter a stage name."
    if (!["pressure", "flow"].includes(step.pump))
      errors[key + "pump"] = "Choose pressure or flow."
    if (!["fast", "smooth"].includes(step.transition))
      errors[key + "transition"] = "Choose fast or smooth."
    if (!["coffee", "water"].includes(String(step.sensor)))
      errors[key + "sensor"] = "Choose coffee or water."
    number(key + "seconds", step.seconds, 0, 127)
    number(key + "temperature", step.temperature, 0, 100)
    number(key + "volume", step.volume, 0, 1023)
    number(key + "weight", step.weight, 0, 1000, true)
    number(
      key + step.pump,
      step[step.pump],
      0,
      step.pump === "pressure" ? 12 : 10
    )
    if (step.exit != null) {
      const exit = step.exit as Json
      if (!["pressure", "flow"].includes(String(exit.type)))
        errors[key + "exit.type"] = "Choose pressure or flow."
      if (!["over", "under"].includes(String(exit.condition)))
        errors[key + "exit.condition"] = "Choose over or under."
      number(
        key + "exit.value",
        exit.value,
        0,
        exit.type === "pressure" ? 12 : 10
      )
    }
    if (step.limiter != null) {
      const limit = step.limiter as Json
      number(
        key + "limiter.value",
        limit.value,
        0,
        step.pump === "pressure" ? 10 : 12
      )
      number(key + "limiter.range", limit.range, 0, 10)
    }
  }
  return errors
}

export function executableKey(profile: Profile): string {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, canonical(v)])
          )
        : value
  return JSON.stringify(
    canonical({
      ...Object.fromEntries(
        profileKeys
          .filter((k) => !["title", "author", "notes", "steps"].includes(k))
          .map((k) => [k, profile[k] ?? null])
      ),
      steps: profile.steps.map((step) =>
        Object.fromEntries(
          stepKeys
            .filter((k) => !["pressure", "flow"].includes(k) || k === step.pump)
            .map((k) => [
              k,
              k === "exit" && step.exit
                ? Object.fromEntries(
                    ["type", "condition", "value"].map((key) => [
                      key,
                      (step.exit as Json)[key],
                    ])
                  )
                : k === "limiter" && step.limiter
                  ? Object.fromEntries(
                      ["value", "range"].map((key) => [
                        key,
                        (step.limiter as Json)[key],
                      ])
                    )
                  : (step[k] ?? null),
            ])
        )
      ),
    })
  )
}
