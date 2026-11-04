import { useState } from "react"
export const defaults = {
  duration: 220,
  speed: 1,
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
  travel: 8,
  reduced: false,
}
export function applyMotion(root, config) {
  if (!root) return
  root.style.setProperty(
    "--motion-duration",
    `${config.duration / config.speed}ms`
  )
  root.style.setProperty("--motion-ease", config.easing)
  root.style.setProperty("--visual-speed", config.speed)
  root.style.setProperty("--travel", `${config.travel}px`)
  root.dataset.reducedMotion = String(config.reduced)
  if (config.reduced)
    root
      .getAnimations({ subtree: true })
      .forEach((animation) => animation.cancel())
}
export default function MotionControls({ root, config, direction }) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  function update(key, value, event) {
    setCopied(false)
    setCopyFailed(false)
    config.current = { ...config.current, [key]: value }
    applyMotion(root.current, config.current)
    const output = event?.currentTarget
      .closest("label")
      ?.querySelector("output")
    if (output)
      output.textContent = `${value}${key === "duration" ? "ms" : key === "travel" ? "px" : "×"}`
  }
  function json() {
    return JSON.stringify({ direction, ...config.current }, null, 2)
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(json())
      setCopied(true)
      setCopyFailed(false)
    } catch {
      setCopied(false)
      setCopyFailed(true)
    }
  }
  function save() {
    const url = URL.createObjectURL(
      new Blob([json()], { type: "application/json" })
    )
    const a = document.createElement("a")
    a.href = url
    a.download = `brewing-${direction.toLowerCase()}-motion.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <aside className="study-panel motion-controls" aria-label="Motion controls">
      <h2>Motion controls</h2>
      {[
        ["duration", "Transition", 0, 400, 10, "ms"],
        ["travel", "Stage travel", 0, 20, 1, "px"],
      ].map(([key, label, min, max, step, suffix]) => (
        <label key={key}>
          {label}
          <output>
            {config.current[key]}
            {suffix}
          </output>
          <input
            type="range"
            aria-label={label}
            min={min}
            max={max}
            step={step}
            defaultValue={config.current[key]}
            onInput={(e) => update(key, Number(e.target.value), e)}
          />
        </label>
      ))}
      <label>
        Motion speed
        <select
          aria-label="Motion speed"
          defaultValue={config.current.speed}
          onChange={(e) => update("speed", Number(e.target.value))}
        >
          <option value="1">1×</option>
          <option value="0.5">0.5×</option>
          <option value="0.25">0.25×</option>
        </select>
      </label>
      <label>
        Easing
        <select
          aria-label="Motion easing"
          defaultValue={config.current.easing}
          onChange={(e) => update("easing", e.target.value)}
        >
          <option value="cubic-bezier(0.65, 0, 0.35, 1)">Smooth roll</option>
          <option value="cubic-bezier(0.32, 0.72, 0, 1)">Soft settle</option>
          <option value="cubic-bezier(0.645, 0.045, 0.355, 1)">
            Symmetric
          </option>
          <option value="linear">Linear</option>
        </select>
      </label>
      <label className="motion-check">
        <input
          type="checkbox"
          defaultChecked={config.current.reduced}
          onChange={(e) => update("reduced", e.target.checked)}
        />
        Reduce motion preview
      </label>
      <div className="flex gap-2">
        <button onClick={copy}>{copied ? "Copied" : "Copy config"}</button>
        <button onClick={save}>Save JSON</button>
      </div>
      {copyFailed && <p role="status">Copy unavailable. Use Save JSON.</p>}
      <p>
        Speed changes motion, not the shot clock. Stage travel adjusts Ribbon's
        title changes. Rolling titles retain their fixed spacing. Demo data
        only.
      </p>
    </aside>
  )
}
