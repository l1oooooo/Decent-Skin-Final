import { useEffect, useRef, useState } from "react"
import libraryProfiles from "./library-profiles.json"
import { profiles, useSession } from "./use-session"

export const tabletProfiles = [
  ...profiles,
  {
    name: "Rao Allongé DA Earthworld o.bourbon",
    short: "Rao Allongé",
    by: "Decent",
    kind: "Flow profile",
    temperature: 88,
    yield: 95,
    notes: "A long, high-flow extraction for light roasts.",
  },
  {
    name: "Mild und süßlich",
    short: "Gentle & sweet",
    by: "Decent",
    kind: "Pressure profile",
    temperature: 88,
    yield: 40,
    notes: "A gentle pressure decline for an easy, balanced cup.",
  },
]
export function useTabletSession(initial, longName) {
  const allProfiles = [...tabletProfiles, ...libraryProfiles]
  const base = useSession(initial, longName, allProfiles)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [steamEnabled, setSteamEnabled] = useState(true)
  const [steamTime, setSteamTime] = useState(45)
  const [waterTime, setWaterTime] = useState(12)
  const [waterTemperature, setWaterTemperature] = useState(85)
  const [flushTime, setFlushTime] = useState(5)
  const [operation, setOperation] = useState(null)
  const [settings, setSettings] = useState(null)
  const recipes = useRef(new Map())
  useEffect(() => {
    if (!operation) return
    const timer = setInterval(() => {
      if (!document.hidden)
        setOperation((op) =>
          op
            ? { ...op, elapsed: Math.min(op.duration, op.elapsed + 0.25) }
            : null
        )
    }, 250)
    return () => clearInterval(timer)
  }, [operation?.name])
  useEffect(() => {
    if (operation && operation.elapsed >= operation.duration) {
      base.setNotice(`${operation.name} finished`)
      setOperation(null)
    }
  }, [operation, base.setNotice])
  const locked = base.active || !!operation
  function change(key, value) {
    if (locked) return
    if (base.complete) base.reset()
    const bounds = {
      grind: [0, 20],
      dose: [8, 30],
      yield: [10, 120],
      temperature: [60, 98],
    }
    const [min, max] = bounds[key]
    const safe = Math.max(min, Math.min(max, Math.round(value * 10) / 10))
    ;({
      grind: base.setGrind,
      dose: base.setDose,
      yield: base.setYield,
      temperature: base.setTemperature,
    })[key](safe)
  }
  function selectProfile(index) {
    if (locked || allProfiles[index]?.unavailable) return
    setLibraryOpen(false)
    recipes.current.set(base.profileIndex, {
      grind: Number(base.grind),
      dose: base.dose,
      yield: base.yieldTarget,
      temperature: base.temperature,
    })
    base.selectProfile(index)
    const saved = recipes.current.get(index)
    base.setGrind(saved?.grind ?? 1.8)
    if (saved) {
      base.setDose(saved.dose)
      base.setYield(saved.yield)
      base.setTemperature(saved.temperature)
    }
  }
  function utility(name) {
    if (operation?.name === name) {
      setOperation(null)
      base.setNotice(`${name} stopped`)
      return
    }
    if (
      base.active ||
      !base.ready ||
      operation ||
      (name === "Steam" && !steamEnabled)
    )
      return
    const duration = {
      Steam: steamTime,
      "Hot water": waterTime,
      Flush: flushTime,
    }[name]
    setOperation({ name, duration, elapsed: 0 })
  }
  function toggleSteam(enabled) {
    setSteamEnabled(enabled)
    if (!enabled && operation?.name === "Steam") {
      setOperation(null)
      base.setNotice("Steam disabled")
    }
  }
  function reset() {
    base.reset()
    setOperation(null)
    setSettings(null)
  }
  return {
    ...base,
    profiles: tabletProfiles,
    allProfiles,
    libraryOpen,
    setLibraryOpen,
    profileYield: (index) =>
      index === base.profileIndex
        ? base.yieldTarget
        : (recipes.current.get(index)?.yield ?? allProfiles[index].yield),
    selectProfile,
    change,
    locked,
    grind: Number(base.grind),
    steamEnabled,
    toggleSteam,
    steamTime,
    setSteamTime,
    waterTime,
    setWaterTime,
    waterTemperature,
    setWaterTemperature,
    flushTime,
    setFlushTime,
    operation: operation?.name || null,
    remaining: operation
      ? Math.ceil(operation.duration - operation.elapsed)
      : 0,
    settings,
    setSettings,
    utility,
    reset,
    status: operation
      ? `${operation.name} · ${Math.ceil(operation.duration - operation.elapsed)}s remaining`
      : base.status,
    start: () => {
      if (!operation) base.start()
    },
  }
}
