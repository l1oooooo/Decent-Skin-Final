import { useState, useEffect, useSyncExternalStore } from "react"
import { createDemoGateway } from "../../src/gateway/demo"

export const profiles = [
  {
    name: "D-Flow / default",
    short: "D-Flow",
    by: "Damian Brakel",
    kind: "Flow profile",
    temperature: 88,
    yield: 50,
    notes: "A gentle fill, an unhurried infusion, then a steady flow.",
  },
  {
    name: "80's Espresso",
    short: "80's Espresso",
    by: "Decent",
    kind: "Pressure profile",
    temperature: 82,
    yield: 24,
    notes: "A traditional, textured espresso for medium to dark roasts.",
  },
  {
    name: "Easy blooming — active pressure decline",
    short: "Easy blooming",
    by: "Stéphane Ribes",
    kind: "Blooming profile",
    temperature: 88,
    yield: 40,
    notes: "A forgiving bloom that adapts to the resistance of the puck.",
  },
]
export function useSession(
  initial = "ready",
  longName = false,
  profileOptions = profiles
) {
  const [gateway] = useState(() => {
    const instance = createDemoGateway()
    instance.setScenario(initial)
    return instance
  })
  const snapshot = useSyncExternalStore(gateway.subscribe, gateway.getSnapshot)
  const [profileIndex, setProfileIndex] = useState(longName ? 2 : 0)
  const [dose, setDose] = useState(18)
  const [yieldTarget, setYield] = useState(longName ? 40 : 50)
  const [temperature, setTemperature] = useState(88)
  const [grind, setGrind] = useState("1.8")
  const [paused, setPaused] = useState(initial === "brewing")
  const [modal, setModalState] = useState(null)
  const [operation, setOperation] = useState(null)
  const [notice, setNotice] = useState("")
  const [rated, setRated] = useState(null)
  const [history, setHistory] = useState([])
  const [scaleReconnected, setScaleReconnected] = useState(false)
  const phase = snapshot.scenario
  useEffect(() => {
    if (phase !== "brewing" || paused) return
    const id = setInterval(() => {
      if (!document.hidden) gateway.advance(0.25)
    }, 250)
    return () => clearInterval(id)
  }, [gateway, phase, paused])
  useEffect(() => {
    if (!operation) return
    const id = setTimeout(() => {
      setOperation(null)
      setNotice(`${operation} finished`)
    }, 8000)
    return () => clearTimeout(id)
  }, [operation])
  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(""), 2600)
    return () => clearTimeout(id)
  }, [notice])
  const connected = phase !== "disconnected" && phase !== "error"
  const scaleConnected = snapshot.scaleConnected || scaleReconnected
  const ready = phase === "ready" || phase === "completed"
  const active = phase === "brewing"
  const complete = phase === "completed"
  const shot = {
    ...snapshot.shot,
    weight: (snapshot.shot.weight / 36) * yieldTarget,
    temperature: phase === "heating" ? 78 : temperature,
  }
  const samples = snapshot.samples.map((point) => ({
    ...point,
    weight: (point.weight / 36) * yieldTarget,
    temperature,
  }))
  function setModal(next) {
    if (complete && (next === "profiles" || next === "recipe")) reset()
    setModalState(next)
  }
  function selectProfile(index) {
    if (active || operation) return
    if (complete) reset()
    setProfileIndex(index)
    setYield(profileOptions[index].yield)
    setTemperature(profileOptions[index].temperature)
    setModal(null)
  }
  function start() {
    if (!ready || operation) return
    if (complete)
      setHistory((value) =>
        [
          {
            weight: shot.weight,
            time: shot.elapsed,
            name: profileOptions[profileIndex].name,
          },
          ...value,
        ].slice(0, 5)
      )
    gateway.startShot()
    setPaused(false)
    setRated(null)
  }
  function reset() {
    if (complete)
      setHistory((value) =>
        [
          {
            weight: shot.weight,
            time: shot.elapsed,
            name: profileOptions[profileIndex].name,
          },
          ...value,
        ].slice(0, 5)
      )
    gateway.setScenario("ready")
    setPaused(false)
    setOperation(null)
  }
  function utility(name) {
    if (active || !ready) return
    if (operation === name) {
      setOperation(null)
      setNotice(`${name} stopped`)
    } else if (!operation) setOperation(name)
  }
  const status =
    operation ||
    {
      ready: "Ready to brew",
      brewing: shot.elapsed < 7 ? "Preinfusion" : "Extracting",
      completed: "Shot complete",
      heating: "Heating to target",
      disconnected: "Machine disconnected",
      error: "Check water tank",
    }[phase]
  return {
    gateway,
    phase,
    profile: profileOptions[profileIndex],
    profileIndex,
    selectProfile,
    dose,
    setDose,
    yieldTarget,
    setYield,
    temperature,
    setTemperature,
    grind,
    setGrind,
    paused,
    setPaused,
    modal,
    setModal,
    operation,
    notice,
    setNotice,
    rated,
    setRated,
    history: complete
      ? [
          {
            weight: shot.weight,
            time: shot.elapsed,
            name: profileOptions[profileIndex].name,
          },
          ...history,
        ].slice(0, 5)
      : history,
    shot,
    samples,
    connected,
    waterLevel: snapshot.machineConnected ? (phase === "error" ? 8 : 75) : null,
    scaleConnected,
    scaleWeight: scaleConnected ? shot.weight : null,
    retryScale: () => {
      setScaleReconnected(true)
      setNotice("Demo scale reconnected")
    },
    ready,
    active,
    complete,
    status,
    start,
    reset,
    utility,
  }
}
