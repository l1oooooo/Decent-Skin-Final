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
import { SmallReading } from "../refined-controls"
export default function GridFocus({ s }) {
  const showingShot = s.active || s.complete
  const warning = !s.connected || s.phase === "heating"
  return (
    <div className="r2-grid flex h-full flex-col bg-background">
      <TabletHeader s={s} />
      <Favorites s={s} />
      <section className="h-[140px] shrink-0 border-b border-border py-5">
        <RecipeControls s={s} large divided />
      </section>
      <main className="grid min-h-0 flex-1 grid-cols-[1fr_332px]">
        <section className="flex min-w-0 flex-col px-8 py-5">
          <h1 className="text-[28px] leading-tight font-medium tracking-[-.04em]">
            {s.profile.name}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {s.profile.notes}
          </p>
          <div className="mt-auto pt-3">
            <Extraction s={s} height={warning ? 135 : 210} />
          </div>
          {warning && (
            <div className="mt-4">
              <Notice s={s} />
            </div>
          )}
        </section>
        <aside
          className={`border-l border-border bg-card/40 ${showingShot ? "flex flex-col justify-center px-7 py-7" : "grid grid-rows-3 divide-y divide-border"}`}
        >
          {showingShot && <Eyebrow>Extraction</Eyebrow>}
          {showingShot ? (
            <>
              <p className="mt-6 text-[13px] text-muted-foreground">
                In your cup
              </p>
              <p className="mt-3 text-[72px] leading-none tracking-[-.06em] tabular-nums">
                {s.shot.weight.toFixed(1)}
                <span className="ml-2 text-[20px] text-muted-foreground">
                  g
                </span>
              </p>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-6">
                <SmallReading
                  label="Time"
                  value={s.shot.elapsed.toFixed(1)}
                  unit="s"
                />
                <SmallReading
                  label="Pressure"
                  value={s.shot.pressure.toFixed(1)}
                  unit="bar"
                />
                <SmallReading
                  label="Flow"
                  value={s.shot.flow.toFixed(1)}
                  unit="ml/s"
                />
                <SmallReading
                  label="Target"
                  value={s.yieldTarget.toFixed(1)}
                  unit="g"
                />
              </div>
            </>
          ) : (
            [
              ["Brew ratio", `1:${(s.yieldTarget / s.dose).toFixed(1)}`, ""],
              ["Coffee in", s.dose.toFixed(1), "g"],
              ["Espresso out", s.yieldTarget.toFixed(1), "g"],
            ].map(([label, value, unit]) => (
              <div
                key={label}
                className="flex flex-col justify-center px-7 py-4"
              >
                <p className="mb-3 text-[13px] text-muted-foreground">
                  {label}
                </p>
                <p className="text-[40px] leading-none tracking-[-.045em] tabular-nums">
                  {value}
                  <span className="ml-2 text-[16px] text-muted-foreground">
                    {unit}
                  </span>
                </p>
              </div>
            ))
          )}
        </aside>
      </main>
      <BottomBar s={s} />
      <UtilityCard s={s} />
    </div>
  )
}
