import { format, type SkinSession } from "@/skin/use-skin"
import { SquarePen } from "lucide-react"
import { Action } from "@/skin/primitives"
import { RecipeControls, Notice } from "@/skin/controls"
import { CandidateProfiles } from "./profiles"
import { CandidateHeader } from "./header"
import { ProfileChart } from "./profile-chart"
import type { TankCalibration } from "./tank"

export default function CandidateHome({
  s,
  onSettings,
  onConnections,
  onHistory,
  onBrowse,
  onEdit,
  onAssign,
  tankCalibration,
  sharedChart = false,
}: {
  sharedChart?: boolean
  s: SkinSession
  tankCalibration: TankCalibration
  onHistory: () => void
  onConnections: () => void
  onSettings: () => void
  onEdit: () => void
  onBrowse: () => void
  onAssign: (slot: number) => void
}) {
  return (
    <div className="focus-skin flex h-full flex-col bg-background">
      <CandidateHeader
        key={s.snapshot.shotSequence}
        tankCalibration={tankCalibration}
        s={s}
        onSettings={onSettings}
        onConnections={onConnections}
        onHistory={onHistory}
      />
      <div className="focus-body flex min-h-0 flex-1">
        <CandidateProfiles s={s} onBrowse={onBrowse} onAssign={onAssign} />
        <main className="focus-main flex min-w-0 flex-1 flex-col px-7 py-6">
          <div className="focus-profile-heading">
            <div className="flex items-center gap-3">
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
                <SquarePen size={14} aria-hidden="true" />
                Edit profile
              </Action>
            </div>
          </div>
          <section
            aria-label="Recipe summary"
            className="mt-5 border-y border-border py-6"
          >
            {
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
            }
          </section>
          <section className="focus-chart mt-6 min-h-0 flex-1">
            {sharedChart ? (
              <div className="graph-color chart-anchor" data-chart-anchor="" />
            ) : (
              <ProfileChart profile={s.rawProfile} />
            )}
          </section>
          <Notice s={s} />
        </main>
        <aside className="focus-controls-panel flex w-[328px] shrink-0 flex-col border-l border-border bg-card p-6">
          <RecipeControls s={s} vertical grind />
        </aside>
      </div>
    </div>
  )
}
