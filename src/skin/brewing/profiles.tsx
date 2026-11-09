import { Library } from "lucide-react"
import type { SkinSession } from "@/skin/use-skin"
import { Action } from "@/skin/primitives"
import dFlow from "@/skin/assets/d-flow.jpg"
import espresso from "@/skin/assets/80s-espresso.jpg"
import blooming from "@/skin/assets/easy-blooming.jpg"
import allonge from "@/skin/assets/rao-allonge.jpg"
import gentle from "@/skin/assets/gentle-sweet.jpg"

const artwork = [dFlow, espresso, blooming, allonge, gentle]
const artworkNames = [
  "d-flow",
  "80's espresso",
  "easy blooming",
  "rao allong",
  "gentle",
]

export function CandidateProfiles({
  s,
  onBrowse,
  onAssign,
}: {
  s: SkinSession
  onBrowse: () => void
  onAssign: (slot: number) => void
}) {
  const image =
    artwork[
      artworkNames.findIndex((name) =>
        s.profile.name.toLowerCase().startsWith(name)
      )
    ] ?? dFlow
  return (
    <aside
      aria-label="Profile selection"
      className="flex w-[220px] shrink-0 flex-col gap-4 border-r border-border bg-[var(--recess)] p-4"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div
          role="group"
          aria-label="Favorite profiles"
          className="flex shrink-0 flex-col gap-1"
        >
          {s.profiles.map((profile, index) => (
            <button
              key={index}
              type="button"
              aria-label={
                profile
                  ? `Select ${profile.name}`
                  : `${s.snapshot.favorites[index] ? "Unavailable" : "Empty"} favorite ${index + 1}`
              }
              aria-pressed={s.selectedId === profile?.id}
              disabled={profile ? s.profileLocked : !s.snapshot.favoritesLoaded}
              data-pending={!!profile && s.pendingOnly}
              onClick={() =>
                profile ? s.selectProfile(profile.id) : onAssign(index)
              }
              className={`flex h-12 min-h-12 shrink-0 items-center justify-between gap-2 rounded-[var(--control-radius)] px-3 text-left text-[14px] font-medium focus-visible:outline-offset-2 ${s.selectedId === profile?.id ? "bg-foreground/15 text-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]">
                {profile?.short ??
                  (s.snapshot.favorites[index]
                    ? "Unavailable profile"
                    : `Add favorite ${index + 1}`)}
              </span>
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${s.selectedId === profile?.id ? "bg-foreground" : "bg-border"}`}
              />
            </button>
          ))}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--control-radius)] bg-muted">
          {image ? (
            <img
              src={image}
              width={768}
              height={768}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover outline-1 -outline-offset-1 outline-white/10 select-none"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full items-center justify-center text-muted-foreground"
            >
              <Library size={40} strokeWidth={1} />
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-border pt-3">
        <Action
          variant="ghost"
          aria-label="All profiles"
          className="w-full justify-start !px-3 text-muted-foreground"
          onClick={() => {
            s.setSettings(null)
            onBrowse()
          }}
        >
          All profiles
        </Action>
      </div>
    </aside>
  )
}
