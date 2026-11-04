import {
  TabletHeader,
  Favorites,
  Stepper,
  BottomBar,
  UtilityCard,
  Extraction,
  Notice,
} from "../tablet-controls"
import { Eyebrow } from "../common"
export default function Grid({ s }) {
  return (
    <div className="r2-grid flex h-full flex-col bg-background">
      <TabletHeader s={s} />
      <Favorites s={s} />
      <div className="flex h-[88px] shrink-0 items-center justify-between gap-8 px-8">
        <h1 className="text-[26px] font-medium tracking-[-.04em]">
          {s.profile.name}
        </h1>
      </div>
      <div className="grid shrink-0 grid-cols-3 divide-x divide-border border-y border-border">
        {[
          ["Dose", s.dose, "g", 0.1, 8, 30, "dose"],
          ["Target yield", s.yieldTarget, "g", 0.5, 10, 120, "yield"],
          ["Temperature", s.temperature, "°C", 0.5, 60, 98, "temperature"],
        ].map(([label, value, unit, step, min, max, key]) => (
          <div className="px-7 py-5" key={key}>
            <Stepper
              {...{ label, value, unit, step, min, max }}
              large
              disabled={s.locked}
              onChange={(v) => s.change(key, v)}
            />
          </div>
        ))}
      </div>
      <main
        className={`grid min-h-0 flex-1 ${s.active ? "grid-cols-[340px_1fr]" : "grid-cols-1"}`}
      >
        {s.active && (
          <section className="grid grid-cols-2 content-center gap-x-5 gap-y-8 border-r border-border p-8">
            {[
              ["Time", s.shot.elapsed.toFixed(1), "s"],
              ["Yield", s.connected ? s.shot.weight.toFixed(1) : "—", "g"],
              [
                "Pressure",
                s.connected ? s.shot.pressure.toFixed(1) : "—",
                "bar",
              ],
              ["Flow", s.connected ? s.shot.flow.toFixed(1) : "—", "ml/s"],
            ].map(([label, value, unit]) => (
              <div key={label}>
                <p className="mb-3 text-[13px] text-muted-foreground">
                  {label}
                </p>
                <p className="text-[46px] leading-none font-medium tracking-[-.05em] tabular-nums">
                  {value}
                  <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                    {unit}
                  </span>
                </p>
              </div>
            ))}
          </section>
        )}
        <section className="flex min-w-0 flex-col justify-center px-8 py-5">
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow>Extraction graph</Eyebrow>
          </div>
          <Extraction
            s={s}
            height={!s.connected || s.phase === "heating" ? 140 : 205}
          />
          <Notice s={s} />
        </section>
      </main>
      <BottomBar s={s} />
      <UtilityCard s={s} />
    </div>
  )
}
