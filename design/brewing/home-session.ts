import type { SkinSession } from "@/skin/use-skin"
import type { GatewaySnapshot, Profile } from "@/gateway/types"
import { previewSamples } from "@/gateway/model"

const profile: Profile = {
  title: "D-Flow / default",
  author: "Damian Brakel",
  notes: "A gentle fill, an unhurried infusion, then a steady flow.",
  target_weight: 50,
  steps: [
    {
      name: "Preinfusion",
      pump: "flow",
      flow: 2,
      transition: "fast",
      seconds: 7,
      temperature: 88,
    },
    {
      name: "Extraction",
      pump: "flow",
      flow: 1.6,
      transition: "fast",
      seconds: 11,
      temperature: 88,
    },
    {
      name: "Pressure decline",
      pump: "pressure",
      pressure: 7.4,
      transition: "smooth",
      seconds: 12,
      temperature: 88,
    },
  ],
}
const names = [
  profile.title,
  "80's Espresso",
  "Easy blooming — active pressure decline",
  "Rao Allongé",
  "Gentle & sweet",
]
export interface Recipe {
  dose: number
  yield: number
  temperature: number
  grind: number
}
export const defaultRecipe: Recipe = {
  dose: 18,
  yield: 50,
  temperature: 88,
  grind: 1.8,
}
const noAction = async () => false
// Home components never access this member; fail closed if that contract changes.
const unavailableGateway = new Proxy({} as SkinSession["gateway"], {
  get(target, key, receiver) {
    if (typeof key === "symbol") return Reflect.get(target, key, receiver)
    throw new Error("The design preview has no gateway")
  },
})
export function homeSession(
  selected: number,
  recipe: Recipe,
  select: (index: number) => void,
  change: (key: string, value: number) => void
): SkinSession {
  const records = names.map((title, i) => ({
    id: `design-profile-${i}`,
    profile: {
      ...profile,
      title,
      author: "Focus design fixture",
      notes: "Local profile configuration for design review.",
      steps:
        i === 0
          ? profile.steps
          : i === 1
            ? [
                {
                  name: "Preinfusion",
                  pump: "pressure" as const,
                  pressure: 3,
                  seconds: 6,
                  transition: "fast" as const,
                  temperature: 88,
                },
                {
                  name: "Extraction",
                  pump: "pressure" as const,
                  pressure: 9,
                  seconds: 16,
                  transition: "fast" as const,
                  temperature: 87,
                },
                {
                  name: "Decline",
                  pump: "pressure" as const,
                  pressure: 6,
                  seconds: 8,
                  transition: "smooth" as const,
                  temperature: 87,
                },
              ]
            : i === 2
              ? [
                  {
                    name: "Fill",
                    pump: "flow" as const,
                    flow: 4,
                    seconds: 5,
                    transition: "fast" as const,
                    temperature: 88,
                  },
                  {
                    name: "Bloom",
                    pump: "pressure" as const,
                    pressure: 1,
                    seconds: 12,
                    transition: "fast" as const,
                    temperature: 88,
                  },
                  {
                    name: "Extraction",
                    pump: "pressure" as const,
                    pressure: 7,
                    seconds: 15,
                    transition: "fast" as const,
                    temperature: 87,
                  },
                  {
                    name: "Decline",
                    pump: "pressure" as const,
                    pressure: 4,
                    seconds: 8,
                    transition: "smooth" as const,
                    temperature: 87,
                  },
                ]
              : i === 3
                ? [
                    {
                      name: "Fill",
                      pump: "flow" as const,
                      flow: 6,
                      seconds: 7,
                      transition: "fast" as const,
                      temperature: 88,
                    },
                    {
                      name: "Extraction",
                      pump: "flow" as const,
                      flow: 4.8,
                      seconds: 25,
                      transition: "smooth" as const,
                      temperature: 88,
                    },
                  ]
                : [
                    {
                      name: "Preinfusion",
                      pump: "pressure" as const,
                      pressure: 3,
                      seconds: 8,
                      transition: "fast" as const,
                      temperature: 88,
                    },
                    {
                      name: "Extraction",
                      pump: "pressure" as const,
                      pressure: 6,
                      seconds: 12,
                      transition: "fast" as const,
                      temperature: 88,
                    },
                    {
                      name: "Decline",
                      pump: "pressure" as const,
                      pressure: 4,
                      seconds: 10,
                      transition: "smooth" as const,
                      temperature: 86,
                    },
                  ],
    },
  }))
  for (const record of records) {
    record.profile.steps = record.profile.steps.map((step) => ({
      ...step,
      sensor: "coffee",
    }))
  }
  const allProfiles = records.map((record) => ({
    id: record.id,
    name: record.profile.title,
    short: record.profile.title.split(" / ")[0].replace(/ — .*/, ""),
    by: "Focus design fixture",
    notes: record.profile.notes!,
    kind: "Planned targets",
    raw: record.profile,
    record,
  }))
  const selectedProfile = allProfiles[selected]
  const raw = {
    ...selectedProfile.raw,
    steps: selectedProfile.raw.steps.map((step) => ({
      ...step,
      temperature:
        step.temperature +
        recipe.temperature -
        selectedProfile.raw.steps[0].temperature,
    })),
  }
  const workflow = {
    profile: raw,
    context: {
      targetDoseWeight: recipe.dose,
      targetYield: recipe.yield,
      grinderSetting: recipe.grind.toFixed(1),
    },
  }
  const snapshot: GatewaySnapshot = {
    connection: "online",
    message: "",
    pending: false,
    workflow,
    profiles: records,
    favorites: records.map((r) => r.id),
    favoritesLoaded: true,
    favoritesIssue: "",
    observedShot: 0,
    shotSequence: 0,
    shotOutcome: null,
    scaleReceived: 0,
    devices: [],
    deviceError: "",
    deviceErrorKind: "",
    deviceNotice: "",
    machine: {
      timestamp: "2026-11-06T12:00:00Z",
      state: { state: "idle", substate: "idle" },
      flow: 0,
      pressure: 0,
      mixTemperature: 90,
      groupTemperature: 88,
      profileFrame: 0,
    },
    machineReceived: 0,
    scale: { weight: 0, timestamp: "2026-11-06T12:00:00Z" },
    scaleConnected: true,
    water: 75,
    settings: null,
    preferences: null,
    preferencesIssue: "",
    refillKit: false,
    presenceEnabled: false,
    build: "Design preview",
    samples: [],
    elapsedKnown: true,
    shotFrame: 0,
    shotStart: null,
    shotId: null,
    complete: false,
    stopped: false,
    scaleLost: false,
    shotProfile: null,
  }
  return {
    gateway: unavailableGateway,
    snapshot,
    temperatureUnit: "C",
    displayTemperature: (value) => value ?? NaN,
    celsius: (value) => value,
    workflow,
    profile: { ...selectedProfile, raw },
    profiles: allProfiles,
    allProfiles,
    selectedId: selectedProfile.id,
    rawProfile: raw,
    active: false,
    complete: false,
    operation: null,
    ready: true,
    connected: true,
    machineFresh: true,
    locked: false,
    pendingOnly: false,
    profileLocked: false,
    block: "",
    brewBlock: "",
    phase: "ready",
    status: "Ready to brew",
    shot: { elapsed: 0, weight: 0, pressure: 0, flow: 0, temperature: 88 },
    samples: [],
    preview: previewSamples(raw),
    steps: raw.steps,
    frame: 0,
    stopped: false,
    paused: false,
    dose: recipe.dose,
    doseSource: "current",
    yieldTarget: recipe.yield,
    temperature: recipe.temperature,
    grind: recipe.grind,
    grindText: recipe.grind.toFixed(1),
    waterLevel: 75,
    scaleConnected: true,
    scaleWeight: 0,
    settings: null,
    setSettings: () => {},
    modal: null,
    setModal: () => {},
    libraryLoading: false,
    libraryError: "",
    reloadLibrary: async () => {},
    notice: "",
    change: async (key, value) => {
      change(key, value)
      return true
    },
    selectProfile: async (id) => {
      const i = records.findIndex((r) => r.id === id)
      if (i >= 0) select(i)
      return i >= 0
    },
    perform: noAction,
    setGrindText: noAction,
    reset: () => {},
    reconnect: noAction,
    wake: noAction,
    sleep: noAction,
    liveSteamTemperature: 50,
    steamEnabled: true,
    steamTemperature: 140,
    setSteamTemperature: noAction,
    steamTime: 30,
    waterTime: 15,
    flushTime: 5,
    waterTemperature: 90,
    setSteamTime: noAction,
    setWaterTime: noAction,
    setFlushTime: noAction,
    setWaterTemperature: noAction,
    toggleSteam: noAction,
  }
}
