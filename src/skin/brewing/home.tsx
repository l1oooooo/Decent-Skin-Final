import { type SkinSession } from "@/skin/use-skin"
import { SquarePen } from "lucide-react"
import { Action } from "@/skin/primitives"
import { ProfileNumber } from "@/skin/profile-number"
import { RecipeControls } from "@/skin/controls"
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
  showHeader = true,
  animateNumbers = true,
}: {
  animateNumbers?: boolean
  sharedChart?: boolean
  showHeader?: boolean
  s: SkinSession
  tankCalibration: TankCalibration
  onHistory: () => void
  onConnections: () => void
  onSettings: () => void
  onEdit: () => void
  onBrowse: () => void
  onAssign: (slot: number) => void
}) {
  const editable = s.allProfiles.some((p) => p.id === s.selectedId)
  return (
    <div className="focus-skin flex h-full flex-col bg-background">
      {showHeader && (
        <CandidateHeader
          tankCalibration={tankCalibration}
          s={s}
          onSettings={onSettings}
          onConnections={onConnections}
          onHistory={onHistory}
        />
      )}
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
                disabled={s.profileLocked || !editable}
                focusableWhenDisabled={s.pendingOnly && editable}
                data-pending={s.pendingOnly && editable}
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
            <div className="grid grid-cols-3 gap-6">
              {[
                {
                  key: "ratio",
                  label: "Brew ratio",
                  value:
                    s.dose > 0 && s.yieldTarget > 0
                      ? s.yieldTarget / s.dose
                      : NaN,
                  unit: "",
                  prefix: "1:",
                },
                {
                  key: "dose",
                  label: "Dose",
                  value: s.dose,
                  unit: Number.isFinite(s.dose) ? "g" : "",
                  prefix: "",
                },
                {
                  key: "yield",
                  label: s.yieldTarget === 0 ? "Weight target off" : "Drink",
                  value: s.yieldTarget === 0 ? NaN : s.yieldTarget,
                  unit: s.yieldTarget === 0 ? "" : "g",
                  prefix: "",
                },
              ].map(({ key, label, value, unit, prefix }) => (
                <div key={key}>
                  <p className="mb-3 text-[13px] text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-[40px] leading-none font-medium tracking-[-.055em] tabular-nums">
                    {Number.isFinite(value) && prefix}
                    <ProfileNumber
                      value={value}
                      profileId={s.selectedId}
                      enabled={animateNumbers}
                      unit={unit}
                      digits={1}
                    />
                    {unit && (
                      <span className="ml-2 text-[14px] font-normal tracking-normal text-muted-foreground">
                        {unit}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="focus-chart mt-6 min-h-0 flex-1">
            {sharedChart ? (
              <div className="graph-color chart-anchor" data-chart-anchor="" />
            ) : (
              <ProfileChart profile={s.rawProfile} />
            )}
          </section>
        </main>
        <aside className="focus-controls-panel flex w-[328px] shrink-0 flex-col border-l border-border bg-card p-6">
          <RecipeControls
            s={s}
            vertical
            grind
            animateNumbers={animateNumbers}
          />
        </aside>
      </div>
    </div>
  )
}
