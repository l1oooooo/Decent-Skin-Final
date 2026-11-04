import { useRef } from "react"
import { History } from "lucide-react"
import { Action, Eyebrow } from "../common"
import {
  TabletHeader,
  Favorites,
  RecipeControls,
  BottomBar,
  UtilityCard,
  Extraction,
  ShotNumbers,
  Notice,
} from "../tablet-controls"
function ShotRecipe({ s, onAdjust }) {
  const remaining = Math.max(0, s.yieldTarget - s.shot.weight)
  return (
    <section aria-label="Shot recipe" className="flex min-h-0 flex-1 flex-col">
      <Eyebrow>{s.complete ? "Shot complete" : "Shot recipe"}</Eyebrow>
      <div className="mt-7 border-b border-border pb-7">
        <p className="text-[13px] text-muted-foreground">Target yield</p>
        <p className="mt-3 text-[40px] leading-none font-medium tracking-[-.055em] tabular-nums">
          {s.yieldTarget.toFixed(1)}
          <span className="ml-2 text-[14px] font-normal tracking-normal text-muted-foreground">
            g
          </span>
        </p>
        <p className="mt-4 min-h-5 text-[13px] text-muted-foreground tabular-nums">
          {s.complete
            ? remaining > 0.1
              ? `Stopped ${remaining.toFixed(1)} g before target`
              : "Target reached"
            : `${remaining.toFixed(1)} g to target`}
        </p>
      </div>
      <dl className="divide-y divide-border">
        {[
          ["Coffee", `${s.dose.toFixed(1)} g`],
          ["Grind size", s.grind.toFixed(1)],
          ["Temperature", `${s.temperature.toFixed(1)}°C`],
          ["Brew ratio", `1:${(s.yieldTarget / s.dose).toFixed(1)}`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex min-h-16 items-center justify-between gap-4"
          >
            <dt className="text-[13px] text-muted-foreground">{label}</dt>
            <dd className="text-[18px] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto pt-6">
        {s.complete ? (
          <Action variant="outline" className="w-full" onClick={onAdjust}>
            Adjust recipe
          </Action>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            Recipe locked during extraction
          </p>
        )}
      </div>
    </section>
  )
}

export default function MonochromeStudio({ s }) {
  const recipePanel = useRef(null)
  const showingShot = s.active || s.complete
  const warning = !s.connected || s.phase === "heating"
  return (
    <div className="r2-grid r3-monochrome flex h-full flex-col bg-background">
      <TabletHeader s={s}>
        <Action
          variant="ghost"
          aria-label="History"
          aria-haspopup="dialog"
          title="History"
          className="!size-12 !px-0 text-muted-foreground"
          onClick={() => s.setModal("history")}
        >
          <History size={16} aria-hidden="true" />
        </Action>
      </TabletHeader>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-[var(--recess)] p-4">
          <div className="flex h-12 items-center justify-between px-3">
            <Eyebrow>Favorites</Eyebrow>
          </div>
          <div className="mt-3">
            <Favorites s={s} layout="rail" />
          </div>
        </aside>
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
            <Extraction s={s} height={warning ? 145 : 205} />
          </section>
          <Notice s={s} />
        </main>
        <aside
          ref={recipePanel}
          className="flex w-[328px] shrink-0 flex-col border-l border-border bg-card p-6"
        >
          {showingShot ? (
            <ShotRecipe
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
                <Eyebrow>Recipe</Eyebrow>
              </div>
              <RecipeControls s={s} vertical grind />
            </>
          )}
        </aside>
      </div>
      <BottomBar s={s} history={false} dividers={false} />
      <UtilityCard s={s} />
    </div>
  )
}
