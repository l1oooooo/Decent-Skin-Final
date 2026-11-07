import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { DecaidGateway } from "@/gateway/client"
import {
  activeProfileId,
  commandBlock,
  connected,
  finite,
  previewSamples,
} from "@/gateway/model"
import { recipeDose } from "@/gateway/recipes"
import type { MachineCommand, Profile } from "@/gateway/types"

export const format = (value: number | null | undefined, digits = 1) =>
  value != null && Number.isFinite(value) ? value.toFixed(digits) : "—"
const operations: Record<string, MachineCommand> = {
  Steam: "steam",
  "Hot water": "hotWater",
  Flush: "flush",
}
export function useSkin(gateway: DecaidGateway) {
  const snapshot = useSyncExternalStore(gateway.subscribe, gateway.getSnapshot)
  const [expiredMachineReading, setExpiredMachineReading] = useState(0)
  useEffect(() => {
    const received = snapshot.machineReceived
    if (!received) return
    const timer = setTimeout(
      () => setExpiredMachineReading(received),
      Math.max(0, received + 5001 - Date.now())
    )
    return () => clearTimeout(timer)
  }, [snapshot.machineReceived])
  const [expiredScaleReading, setExpiredScaleReading] = useState(0)
  useEffect(() => {
    const received = snapshot.scaleReceived
    if (!received) return
    const timer = setTimeout(
      () => setExpiredScaleReading(received),
      Math.max(0, received + 5001 - Date.now())
    )
    return () => clearTimeout(timer)
  }, [snapshot.scaleReceived])
  const [settings, setSettings] = useState<string | null>(null)
  const [modal, setModal] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState("")
  const libraryAttempt = useRef(0)
  useEffect(() => {
    gateway.start()
    return gateway.stop
  }, [gateway])
  useEffect(() => {
    if (snapshot.connection !== "online") return
    const attempt = ++libraryAttempt.current
    let cancelled = false
    gateway
      .loadProfiles()
      .then(() => {
        if (!cancelled && attempt === libraryAttempt.current)
          setLibraryError("")
      })
      .catch((error) => {
        if (!cancelled && attempt === libraryAttempt.current)
          setLibraryError(String(error.message))
      })
      .finally(() => {
        if (!cancelled && attempt === libraryAttempt.current)
          setLibraryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [gateway, snapshot.connection])
  async function perform(action: () => Promise<unknown>) {
    setNotice("")
    try {
      await action()
      return true
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Decaid could not complete this action"
      )
      return false
    }
  }
  const temperatureUnit = snapshot.preferences?.temperatureUnit ?? "C"
  const displayTemperature = (value: number | null | undefined) =>
    value == null ? NaN : temperatureUnit === "F" ? (value * 9) / 5 + 32 : value
  const celsius = (value: number) =>
    temperatureUnit === "F" ? ((value - 32) * 5) / 9 : value
  const workflow = snapshot.workflow
  const rawProfile = workflow?.profile ?? null
  const matchedProfileId = useMemo(
    () =>
      activeProfileId(
        rawProfile,
        snapshot.profiles,
        (workflow?.context?.extras as Record<string, unknown> | undefined)
          ?.focusProfileId
      ),
    [rawProfile, snapshot.profiles, workflow?.context?.extras]
  )
  const machine = snapshot.machine
  const active = machine?.state.state === "espresso" && !snapshot.complete
  const complete = snapshot.complete
  const operation =
    Object.entries(operations).find(
      ([, value]) => value === machine?.state.state
    )?.[0] ?? null
  const isConnected = connected(snapshot)
  const machineFresh =
    isConnected &&
    snapshot.machineReceived > 0 &&
    snapshot.machineReceived !== expiredMachineReading
  const scaleFresh =
    isConnected &&
    snapshot.scaleConnected &&
    snapshot.scaleReceived > 0 &&
    snapshot.scaleReceived !== expiredScaleReading
  const block = commandBlock(snapshot)
  const ready =
    !block &&
    !!rawProfile &&
    !(snapshot.settings?.blockOnNoScale && !snapshot.scaleConnected)
  const fallbackDose = recipeDose(
    undefined,
    snapshot.profiles.find((p) => p.id === matchedProfileId)
  )
  const dose = rawProfile
    ? (workflow?.context?.targetDoseWeight ?? fallbackDose.value)
    : NaN
  const yieldTarget = workflow?.context?.targetYield ?? NaN
  const temperature = rawProfile?.steps[0]?.temperature ?? NaN
  const grindText = workflow?.context?.grinderSetting ?? ""
  const grind = grindText.trim() ? Number(grindText) : NaN
  function displayProfile(profile: Profile, id: string) {
    return {
      id,
      name: profile.title,
      short: profile.title.split(" / ")[0].replace(/ — .*/, ""),
      by: profile.author ?? "",
      notes: profile.notes ?? "",
      kind: profile.steps.every((s) => s.pump === "flow")
        ? "Flow profile"
        : "Pressure profile",
      raw: profile,
    }
  }
  const allProfiles = snapshot.profiles.map((p) => ({
    ...displayProfile(p.profile, p.id),
    record: p,
  }))
  const profiles = snapshot.favorites.map(
    (id) =>
      allProfiles.find(
        (p) =>
          p.id === id &&
          (!p.record.visibility || p.record.visibility === "visible")
      ) ?? null
  )
  const profile = rawProfile
    ? displayProfile(rawProfile, matchedProfileId ?? "active")
    : {
        id: "",
        name: "Choose a profile",
        short: "",
        notes: "Select a profile from your Decaid library.",
        kind: "",
        by: "",
        raw: null,
      }
  const last = snapshot.samples.at(-1)
  const shot = {
    elapsed: snapshot.elapsedKnown ? (last?.elapsed ?? 0) : null,
    weight: snapshot.scaleLost
      ? null
      : ((active ? snapshot.scale?.weight : last?.weight) ?? null),
    pressure: complete ? 0 : (machine?.pressure ?? null),
    flow: complete ? 0 : (machine?.flow ?? null),
    temperature: machine?.mixTemperature ?? null,
  }
  const phase = !isConnected
    ? "disconnected"
    : machine?.state.state === "error" || machine?.state.state === "needsWater"
      ? "error"
      : ["heating", "preheating", "booting"].includes(
            machine?.state.state ?? ""
          ) || machine?.state.substate === "preparingForShot"
        ? "heating"
        : active
          ? "brewing"
          : complete
            ? "completed"
            : "ready"
  const steps =
    (active || complete ? (snapshot.shotProfile ?? rawProfile) : rawProfile)
      ?.steps ?? []
  const frame = Math.max(0, Math.min(steps.length - 1, snapshot.shotFrame))
  const status = !isConnected
    ? "Disconnected"
    : phase === "error"
      ? "Machine needs attention"
      : phase === "heating"
        ? "Heating"
        : active
          ? (steps[frame]?.name ?? "Brewing")
          : complete
            ? snapshot.stopped
              ? "Shot stopped"
              : "Shot complete"
            : machine?.state.state === "sleeping"
              ? "Sleeping"
              : operation || "Ready to brew"
  async function change(key: string, value: number) {
    if (!workflow || !finite(value)) return false
    return perform(() =>
      gateway.recipes.adjust(
        matchedProfileId,
        key === "dose"
          ? "targetDoseWeight"
          : key === "yield"
            ? "targetYield"
            : key === "temperature"
              ? "temperature"
              : "grinderSetting",
        key === "grind" ? value.toFixed(1) : value
      )
    )
  }

  async function selectProfile(id: string) {
    const selected = snapshot.profiles.find((p) => p.id === id)
    if (!selected) return
    const ok = await perform(() => gateway.recipes.load(id))
    return ok
  }
  async function reloadLibrary() {
    const attempt = ++libraryAttempt.current
    setLibraryLoading(true)
    setLibraryError("")
    try {
      await gateway.loadProfiles()
    } catch (error) {
      if (attempt === libraryAttempt.current)
        setLibraryError(
          error instanceof Error ? error.message : "Could not load profiles"
        )
    } finally {
      if (attempt === libraryAttempt.current) setLibraryLoading(false)
    }
  }
  const utilityChange = (
    field: "steamSettings" | "hotWaterData" | "rinseData",
    key: string,
    value: number
  ) => {
    const current = workflow?.[field]
    if (!current) return Promise.resolve(false)
    return perform(() =>
      gateway.updateWorkflow({ [field]: { ...current, [key]: value } })
    )
  }
  return {
    gateway,
    snapshot,
    temperatureUnit,
    displayTemperature,
    celsius,
    workflow,
    profile,
    profiles,
    allProfiles,
    selectedId: profile.id,
    rawProfile,
    active,
    complete,
    operation,
    ready,
    connected: isConnected,
    machineFresh,
    locked: !!block || !rawProfile,
    profileLocked: !!block,
    block,
    brewBlock:
      snapshot.settings?.blockOnNoScale && !snapshot.scaleConnected
        ? "Decaid requires a scale. Connect one, or turn off Require a scale before brewing in Settings → Brew and utilities."
        : "",
    phase,
    status,
    shot,
    samples: snapshot.samples,
    preview: previewSamples(rawProfile),
    steps,
    frame,
    stopped: snapshot.stopped,
    paused: !isConnected,
    dose,
    doseSource: !finite(dose)
      ? "unset"
      : workflow?.context?.targetDoseWeight == null
        ? fallbackDose.source
        : ((workflow.context.extras as Record<string, unknown> | undefined)
            ?.focusDoseSource ?? "current"),
    yieldTarget,
    temperature,
    grind,
    grindText,
    waterLevel: machineFresh ? snapshot.water : null,
    scaleConnected: scaleFresh,
    scaleWeight: scaleFresh ? (snapshot.scale?.weight ?? null) : null,
    settings,
    setSettings,
    modal,
    setModal,
    libraryLoading: libraryLoading && snapshot.connection !== "offline",
    libraryError:
      libraryError ||
      (snapshot.connection === "offline"
        ? "Cannot reach Decaid. Check the connection, then retry."
        : ""),
    reloadLibrary,
    notice:
      notice ||
      (snapshot.refillKit === false &&
      snapshot.water !== null &&
      snapshot.preferences?.refillWarningMm &&
      snapshot.water < snapshot.preferences.refillWarningMm
        ? `Low water · ${snapshot.water.toFixed(0)} mm. Refill the tank.`
        : "") ||
      snapshot.message ||
      snapshot.deviceNotice ||
      (snapshot.scaleLost
        ? "Scale disconnected during this shot. Stop-at-weight is unavailable; stop the extraction manually."
        : ""),
    dismissNotice: () => {
      setNotice("")
      gateway.clearMessage()
    },
    change,
    selectProfile,
    perform,
    setGrindText: (value: string) =>
      perform(() =>
        gateway.recipes.adjust(matchedProfileId, "grinderSetting", value)
      ),
    reset: gateway.dismissShot,
    reconnect: () => gateway.sync(),
    wake: () => perform(() => gateway.command("idle")),
    sleep: () => perform(() => gateway.daily.power(true)),
    liveSteamTemperature:
      isConnected &&
      snapshot.machineReceived > 0 &&
      snapshot.machineReceived !== expiredMachineReading &&
      finite(machine?.steamTemperature)
        ? machine.steamTemperature
        : null,
    steamEnabled: (workflow?.steamSettings?.targetTemperature ?? 0) >= 135,
    steamTemperature: workflow?.steamSettings?.targetTemperature ?? NaN,
    setSteamTemperature: (value: number) =>
      utilityChange("steamSettings", "targetTemperature", value),
    steamTime: workflow?.steamSettings?.duration ?? NaN,
    waterTime: workflow?.hotWaterData?.duration ?? NaN,
    flushTime: workflow?.rinseData?.duration ?? NaN,
    waterTemperature: workflow?.hotWaterData?.targetTemperature ?? NaN,
    setSteamTime: (value: number) =>
      utilityChange("steamSettings", "duration", value),
    setWaterTime: (value: number) =>
      utilityChange("hotWaterData", "duration", value),
    setFlushTime: (value: number) =>
      utilityChange("rinseData", "duration", value),
    setWaterTemperature: (value: number) =>
      utilityChange("hotWaterData", "targetTemperature", value),
    toggleSteam: (enabled: boolean) =>
      utilityChange("steamSettings", "targetTemperature", enabled ? 140 : 0),
  }
}
export type SkinSession = ReturnType<typeof useSkin>
