export const TIME_ZOOM_MS = 420

export function timeRangeAt(from: number, to: number, elapsed: number) {
  const progress = Math.min(1, Math.max(0, elapsed / TIME_ZOOM_MS))
  return from + (to - from) * (1 - (1 - progress) ** 3)
}
