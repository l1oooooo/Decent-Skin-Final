import { useEffect, useState } from "react"

function measureViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
    visualWidth: window.visualViewport?.width ?? window.innerWidth,
    visualHeight: window.visualViewport?.height ?? window.innerHeight,
    scale: window.visualViewport?.scale ?? 1,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  }
}

export function useViewport() {
  const [viewport, setViewport] = useState(measureViewport)
  useEffect(() => {
    const update = () => setViewport(measureViewport())
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])
  return viewport
}
