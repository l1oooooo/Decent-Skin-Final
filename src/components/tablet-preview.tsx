import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
export function TabletPreview({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const element = container.current!
    const observer = new ResizeObserver(([entry]) =>
      setScale(
        Math.min(
          1,
          entry.contentRect.width / 1340,
          entry.contentRect.height / 800
        )
      )
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div className="flex h-dvh flex-col bg-muted p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>Tablet preview · 1340 × 800 · {Math.round(scale * 100)}%</span>
        <a
          className="flex min-h-12 items-center underline underline-offset-4"
          href="./"
        >
          Open responsive view
        </a>
      </div>
      <div
        ref={container}
        className="flex min-h-0 flex-1 items-center justify-center"
      >
        <div
          data-testid="tablet-frame"
          className="relative shrink-0 overflow-hidden rounded-xl bg-background ring-1 ring-border"
          style={{ width: 1340 * scale, height: 800 * scale }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: 1340, height: 800, transform: `scale(${scale})` }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
