import { useRef } from "react"
import { Eyebrow } from "../common"
import {
  RecipeControls,
  Extraction,
  ShotNumbers,
  Notice,
} from "../tablet-controls"
import {
  RevisionHeader,
  RevisionProfiles,
  RevisionBottomBar,
} from "../revision-controls"

export default function MotionFrame({ s, Status }) {
  const recipePanel = useRef(null)
  const surface = useRef(null)
  const showingShot = s.active || s.complete
  const warning = !s.connected || s.phase === "heating"
  return (
    <div
      ref={surface}
      className="r2-grid r3-monochrome flex h-full flex-col bg-background"
    >
      <RevisionHeader s={s} />
      <div className="flex min-h-0 flex-1">
        <RevisionProfiles s={s} />
        <main className="flex min-w-0 flex-1 flex-col px-7 py-6">
          <div className="min-h-[88px]">
            <h1 className="text-[30px] leading-tight font-medium tracking-[-.045em]">
              {s.profile.name}
            </h1>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {s.profile.notes}
            </p>
          </div>
          <section
            aria-label={showingShot ? "Shot readings" : "Recipe summary"}
            className="mt-5 border-y border-border py-6"
          >
            {showingShot ? (
              <ShotNumbers s={s} />
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {[
                  [
                    "Brew ratio",
                    `1:${(s.yieldTarget / s.dose).toFixed(1)}`,
                    "",
                  ],
                  ["Coffee", s.dose.toFixed(1), "g"],
                  ["Drink", s.yieldTarget.toFixed(1), "g"],
                ].map(([label, value, unit]) => (
                  <div key={label}>
                    <p className="mb-3 text-[13px] text-muted-foreground">
                      {label}
                    </p>
                    <p className="text-[40px] leading-none font-medium tracking-[-.055em] tabular-nums">
                      {value}
                      {unit && (
                        <span className="ml-2 text-[14px] font-normal tracking-normal text-muted-foreground">
                          {unit}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="mt-6 min-h-0 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>
                {s.complete
                  ? "Shot record"
                  : s.active
                    ? "Extraction trace"
                    : "Profile preview"}
              </Eyebrow>
              <span className="text-[12px] text-muted-foreground">
                {s.complete
                  ? "Complete"
                  : s.active
                    ? s.paused
                      ? "Paused"
                      : "Recording"
                    : s.profile.kind}
              </span>
            </div>
            <Extraction
              s={s}
              height={warning ? 145 : 205}
              temperature
              compactLegend
            />
          </section>
          <Notice s={s} />
        </main>
        <aside
          ref={recipePanel}
          className="flex w-[328px] shrink-0 flex-col border-l border-border bg-card p-6"
        >
          {showingShot ? (
            <Status
              s={s}
              onAdjust={() => {
                s.reset()
                requestAnimationFrame(() =>
                  recipePanel.current?.querySelector("button")?.focus()
                )
              }}
            />
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <Eyebrow>Profile settings</Eyebrow>
              </div>
              <RecipeControls s={s} vertical grind />
            </>
          )}
        </aside>
      </div>
      <RevisionBottomBar s={s} container={surface} />
    </div>
  )
}
