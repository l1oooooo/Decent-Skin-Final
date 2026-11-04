import { useRef } from "react"
import { Check } from "lucide-react"
import { Action, Eyebrow } from "../common"
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

const stages = [
  { name: "Preinfusion", detail: "Saturating the coffee", start: 0, end: 7 },
  { name: "Extraction", detail: "Holding pressure", start: 7, end: 18 },
  {
    name: "Pressure decline",
    detail: "Finishing the shot",
    start: 18,
    end: 30,
  },
]

function BrewingStages({ s, onAdjust }) {
  const remaining = Math.max(0, s.yieldTarget - s.shot.weight)
  const finished = s.complete && s.shot.elapsed >= 30
  const current = s.shot.elapsed < 7 ? 0 : s.shot.elapsed < 18 ? 1 : 2
  const title = s.complete
    ? finished
      ? "Shot complete"
      : "Shot stopped"
    : stages[current].name
  return (
    <section
      aria-label="Brewing stages"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="h-[144px] shrink-0 border-b border-border">
        <Eyebrow>Brewing progress</Eyebrow>
        <div role="status" aria-live="polite">
          <h2 className="mt-6 text-[28px] leading-tight font-medium tracking-[-.04em]">
            {title}
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {s.complete
              ? finished
                ? "Target reached"
                : `Stopped during ${stages[current].name.toLowerCase()}`
              : stages[current].detail}
          </p>
        </div>
      </div>
      <ol aria-label="Shot stages" className="divide-y divide-border">
        {stages.map((stage, index) => {
          const done = s.shot.elapsed >= stage.end
          const active = !s.complete && index === current
          const stopped = s.complete && !finished && index === current
          return (
            <li
              key={stage.name}
              aria-current={active ? "step" : undefined}
              className={`flex h-[72px] items-center gap-3 ${active || stopped ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-[12px] tabular-nums ${active ? "border-foreground bg-foreground text-background" : "border-border"}`}
              >
                {done ? <Check size={14} /> : `0${index + 1}`}
              </span>
              <span className="min-w-0 flex-1 text-[14px]">{stage.name}</span>
              <span className="text-[11px]">
                {done
                  ? "Done"
                  : stopped
                    ? "Stopped"
                    : active
                      ? "Now"
                      : s.complete
                        ? "Not reached"
                        : "Next"}
              </span>
            </li>
          )
        })}
      </ol>
      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-6">
        <div>
          <dt className="text-[13px] text-muted-foreground">Target yield</dt>
          <dd className="mt-3 text-[32px] leading-none font-medium tracking-[-.045em] tabular-nums">
            {s.yieldTarget.toFixed(1)}
            <span className="ml-1 text-[13px] font-normal text-muted-foreground">
              g
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">
            {s.complete ? "In the cup" : "Remaining"}
          </dt>
          <dd className="mt-3 text-[32px] leading-none font-medium tracking-[-.045em] tabular-nums">
            {(s.complete ? s.shot.weight : remaining).toFixed(1)}
            <span className="ml-1 text-[13px] font-normal text-muted-foreground">
              g
            </span>
          </dd>
        </div>
      </dl>
      <div className="mt-auto pt-6">
        {s.complete ? (
          <Action variant="outline" className="w-full" onClick={onAdjust}>
            Adjust profile settings
          </Action>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {s.paused ? "Simulation paused" : "Simulated shot in progress"}
          </p>
        )}
      </div>
    </section>
  )
}

export default function MonochromeRevision({ s }) {
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
            <BrewingStages
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
