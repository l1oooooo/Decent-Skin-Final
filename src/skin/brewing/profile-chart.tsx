import { memo, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Profile } from "@/gateway/types"
import { BrewingChart } from "./chart"
import { plannedProfile } from "./planned-profile"

export const ProfileChart = memo(function ProfileChart({
  profile,
}: {
  profile: Profile | null
}) {
  const element = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 700, height: 360 })
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    )
    if (element.current) observer.observe(element.current)
    return () => observer.disconnect()
  }, [])
  const plan = useMemo(() => plannedProfile(profile), [profile])
  return (
    <div className="graph-color planned-chart" ref={element}>
      <BrewingChart
        samples={plan.samples}
        {...size}
        plannedDuration={plan.duration}
      />
      {(!plan.samples.length || plan.incomplete || plan.conditional) && (
        <p className={plan.samples.length ? "sr-only" : "planned-note"}>
          {!plan.samples.length
            ? "Profile configuration unavailable"
            : plan.incomplete
              ? "Unspecified targets remain gaps · configured duration"
              : "Configured duration · step exits may shorten the shot"}
        </p>
      )}
    </div>
  )
})
