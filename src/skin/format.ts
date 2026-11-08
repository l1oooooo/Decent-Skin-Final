export function conciseNumber(
  value: number | null | undefined,
  digits?: number
) {
  if (value == null || !Number.isFinite(value)) return "—"
  return String(digits === undefined ? value : Number(value.toFixed(digits)))
}

export function elapsedTime(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) return "—"
  const seconds = Math.floor(value)
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}
