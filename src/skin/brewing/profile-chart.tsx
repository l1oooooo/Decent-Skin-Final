import { profileFingerprint } from "@/gateway/model"
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Profile } from "@/gateway/types"
import { BrewingChart } from "./chart"
import { profilePreview } from "./planned-profile"

export const ProfileChart = memo(
  function ProfileChart({ profile }: { profile: Profile | null }) {
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
    const plan = useMemo(() => profilePreview(profile), [profile])
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
              ? "No configured targets available for this profile."
              : "Configured target segments only · gaps have no defined target; unknown durations limit the preview and step exits may shorten the shot"}
          </p>
        )}
      </div>
    )
  },
  (previous, next) =>
    profileFingerprint(previous.profile) === profileFingerprint(next.profile)
)
