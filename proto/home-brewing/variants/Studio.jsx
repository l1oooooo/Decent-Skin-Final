import { Eyebrow } from "../common"
import {
  TabletHeader,
  Favorites,
  RecipeControls,
  BottomBar,
  UtilityCard,
  SessionHistory,
  Extraction,
  ShotNumbers,
  Notice,
} from "../tablet-controls"
export default function Studio({ s }) {
  return (
    <div className="r2-studio flex h-full flex-col bg-background">
      <TabletHeader s={s} />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[228px] shrink-0 flex-col border-r border-border bg-[var(--recess)] p-4">
          <div className="mt-4 mb-6 flex items-center justify-between px-3">
            <Eyebrow>Profiles</Eyebrow>
          </div>
          <Favorites s={s} layout="rail" />
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
          <div className="mt-5 border-y border-border py-6">
            <ShotNumbers s={s} />
          </div>
          <div className="mt-6 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>
                {s.active
                  ? "Extraction trace"
                  : s.complete
                    ? "Shot record"
                    : "Profile trajectory"}
              </Eyebrow>
              <span className="text-[12px] text-muted-foreground">
                {s.active
                  ? s.paused
                    ? "Paused"
                    : "Recording"
                  : s.complete
                    ? "Complete"
                    : "30 second demo"}
              </span>
            </div>
            <Extraction
              s={s}
              height={!s.connected || s.phase === "heating" ? 145 : 205}
            />
          </div>
          <Notice s={s} />
        </main>
        <aside className="flex w-[328px] shrink-0 flex-col border-l border-border bg-card/40 p-6">
          <div className="mb-7 flex items-center justify-between">
            <Eyebrow>Recipe</Eyebrow>
          </div>
          <RecipeControls s={s} vertical grind />
          <div className="mt-auto border-t border-border pt-4">
            <SessionHistory s={s} />
          </div>
        </aside>
      </div>
      <BottomBar s={s} history={false} />
      <UtilityCard s={s} />
    </div>
  )
}
