import { format, type SkinSession } from "./use-skin"
import { useRef } from "react"
import { Action, Eyebrow } from "./primitives"
import { RecipeControls, Extraction, ShotNumbers, Notice } from "./controls"
import { RevisionHeader, RevisionProfiles, RevisionBottomBar } from "./chrome"

import Focus from "./focus"

export default function FocusScreen({
  s,
  onSettings,
  onConnections,
  onHistory,
  onBrowse,
  onEdit,
  onAssign,
}: {
  s: SkinSession
  onHistory: () => void
  onSettings: () => void
  onConnections: () => void
  onEdit: () => void
  onBrowse: () => void
  onAssign: (slot: number) => void
}) {
  const recipePanel = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const showingShot = s.active || s.complete
  const warning =
    !s.connected ||
    s.phase === "heating" ||
    s.phase === "error" ||
    !!s.notice ||
    ((s.block || s.brewBlock) && !s.active && !s.operation)
  return (
    <div
      ref={surface}
      className="focus-skin flex h-full flex-col bg-background"
    >
      <RevisionHeader
        s={s}
        onSettings={onSettings}
        onHistory={onHistory}
        onConnections={onConnections}
      />
      <div className="focus-body flex min-h-0 flex-1">
        <RevisionProfiles s={s} onBrowse={onBrowse} onAssign={onAssign} />
        <main className="focus-main flex min-w-0 flex-1 flex-col px-7 py-6">
          <div className="focus-profile-heading min-h-[88px]">
            <div className="flex items-start gap-3">
              <h1
                title={s.profile.name}
                className="line-clamp-2 min-w-0 flex-1 text-[30px] leading-tight font-medium tracking-[-.045em]"
              >
                {s.profile.name}
              </h1>
              <Action
                variant="ghost"
                className="shrink-0 !px-2 text-[12px] text-muted-foreground"
                disabled={
                  s.profileLocked ||
                  !s.allProfiles.some((p) => p.id === s.selectedId)
                }
                onClick={onEdit}
              >
                Edit profile
              </Action>
            </div>
            <p
              title={s.profile.notes}
              className="mt-3 line-clamp-2 text-[13px] text-muted-foreground"
            >
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
                    s.dose > 0 && s.yieldTarget > 0
                      ? `1:${format(s.yieldTarget / s.dose)}`
                      : "—",
                    "",
                  ],
                  [
                    s.doseSource === "profile"
                      ? "Coffee · saved"
                      : s.doseSource === "default"
                        ? "Coffee · default"
                        : s.doseSource === "unset"
                          ? "No saved dose"
                          : "Coffee · current",
                    format(s.dose),
                    Number.isFinite(s.dose) ? "g" : "",
                  ],
                  [
                    s.yieldTarget === 0 ? "Weight target off" : "Drink",
                    s.yieldTarget === 0 ? "—" : format(s.yieldTarget),
                    s.yieldTarget === 0 ? "" : "g",
                  ],
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
          <section className="focus-chart mt-6 min-h-0 flex-1">
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
          className="focus-controls-panel flex w-[328px] shrink-0 flex-col border-l border-border bg-card p-6"
        >
          {showingShot ? (
            <Focus
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
