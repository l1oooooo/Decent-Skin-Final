import { memo, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Profile } from "@/gateway/types"
import { BrewingChart } from "./chart"
import { completeProfilePreview } from "./planned-profile"

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
  const plan = useMemo(() => completeProfilePreview(profile), [profile])
  return (
    <div className="graph-color planned-chart" ref={element}>
      <BrewingChart
        samples={plan.samples}
        {...size}
        plannedDuration={plan.duration}
        plannedKeys={plan.visibleKeys}
      />
      {(!plan.visibleKeys.length || plan.incomplete || plan.conditional) && (
        <p className={plan.visibleKeys.length ? "sr-only" : "planned-empty"}>
          {!plan.visibleKeys.length
            ? "No complete target curve available for this profile."
            : "Complete configured targets only · step exits may shorten the shot"}
        </p>
      )}
    </div>
  )
})
