import { Eyebrow } from "../common"
import {
  TabletHeader,
  Favorites,
  RecipeControls,
  BottomBar,
  UtilityCard,
  Extraction,
  Notice,
} from "../tablet-controls"
import { Preparation, SmallReading } from "../refined-controls"
export default function MonochromeStudio({ s }) {
  const showingShot = s.active || s.complete
  const warning = !s.connected || s.phase === "heating"
  return (
    <div className="r2-grid r3-monochrome flex h-full flex-col bg-background">
      <TabletHeader s={s} />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-[var(--recess)] p-4">
          <div className="flex h-12 items-center justify-between px-3">
            <Eyebrow>Favorites</Eyebrow>
          </div>
          <div className="mt-3">
            <Favorites s={s} layout="rail" />
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col px-8 py-6">
          <div className="flex items-center justify-between">
            <Eyebrow>
              {s.complete
                ? "Your last shot"
                : s.active
                  ? "Brewing now"
                  : "Next espresso"}
            </Eyebrow>
          </div>
          <h1 className="mt-4 min-h-[68px] text-[30px] leading-[1.15] font-medium tracking-[-.045em]">
            {s.profile.name}
          </h1>
          <section className="mt-4 min-h-[128px] border-y border-border py-5">
            {showingShot ? (
              <div className="grid grid-cols-[1.25fr_1fr_1fr] items-end gap-6">
                <div>
                  <p className="mb-3 text-[12px] text-muted-foreground">
                    In the cup
                  </p>
                  <p className="text-[64px] leading-none font-medium tracking-[-.06em] tabular-nums">
                    {s.shot.weight.toFixed(1)}
                    <span className="ml-2 text-[18px] text-muted-foreground">
                      g
                    </span>
                  </p>
                </div>
                <SmallReading
                  label="Elapsed"
                  value={s.shot.elapsed.toFixed(1)}
                  unit="s"
                />
                <SmallReading
                  label="Pressure"
                  value={s.shot.pressure.toFixed(1)}
                  unit="bar"
                />
              </div>
            ) : (
              <Preparation s={s} />
            )}
          </section>
          <section className="mt-5 min-h-0 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>
                {showingShot ? "Extraction trace" : "Profile preview"}
              </Eyebrow>
              <span className="text-[12px] text-muted-foreground">
                {showingShot
                  ? `${s.shot.flow.toFixed(1)} ml/s · ${s.shot.temperature.toFixed(1)}°C`
                  : s.profile.kind}
              </span>
            </div>
            <Extraction s={s} height={warning ? 145 : 230} />
          </section>
          <Notice s={s} />
        </main>
        <aside className="flex w-[328px] shrink-0 flex-col border-l border-border bg-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <Eyebrow>Recipe</Eyebrow>
          </div>
          <RecipeControls s={s} vertical grind />
        </aside>
      </div>
      <BottomBar s={s} centeredUtilities />
      <UtilityCard s={s} />
    </div>
  )
}
