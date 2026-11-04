import { useEffect, useRef, useState } from "react"
import { Search, X, ArrowUpRight } from "lucide-react"
import { Action } from "./common"

export function ProfileLibrary({ s }) {
  const ref = useRef(null)
  const [query, setQuery] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  useEffect(() => {
    if (!s.libraryOpen) return
    const trigger = document.activeElement
    ref.current.showModal()
    return () => {
      if (trigger?.isConnected) trigger.focus()
    }
  }, [s.libraryOpen])
  if (!s.libraryOpen) return null
  const items = s.allProfiles
    .map((p, index) => ({ ...p, index }))
    .filter(
      (p) =>
        (!favoritesOnly || p.index < s.profiles.length) &&
        `${p.name} ${p.by} ${p.kind}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase().trim())
    )
  return (
    <dialog
      ref={ref}
      aria-labelledby="library-title"
      onCancel={() => s.setLibraryOpen(false)}
      className="m-auto h-[650px] max-h-[calc(100dvh-48px)] w-[880px] max-w-[calc(100vw-48px)] rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between px-7 pt-6 pb-5">
          <div>
            <h2
              id="library-title"
              className="text-[24px] font-medium tracking-[-.035em]"
            >
              Profile library
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {s.allProfiles.length} profiles · Demo collection
            </p>
          </div>
          <Action
            variant="ghost"
            aria-label="Close profile library"
            className="!px-0"
            onClick={() => s.setLibraryOpen(false)}
          >
            <X size={20} />
          </Action>
        </header>
        <div className="flex shrink-0 gap-4 border-b border-border px-7 pb-5">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border border-input bg-card px-4 focus-within:outline-2 focus-within:outline-foreground">
            <Search
              size={18}
              className="shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              aria-label="Search profiles"
              placeholder="Search by name, author, or style…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            />
            {query && (
              <button
                aria-label="Clear profile search"
                className="-mr-3 flex size-11 shrink-0 items-center justify-center rounded-lg"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </label>
          <Action
            variant="outline"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={favoritesOnly ? "bg-foreground/15" : ""}
          >
            Favorites
          </Action>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-3"
          role="group"
          aria-label="Library profiles"
        >
          {items.length ? (
            items.map((p) => (
              <button
                key={p.index}
                aria-label={`Load ${p.name}`}
                aria-pressed={s.profileIndex === p.index}
                disabled={s.locked || p.unavailable}
                onClick={() => s.selectProfile(p.index)}
                className={`flex min-h-[82px] w-full items-center gap-6 rounded-lg px-4 py-4 text-left transition-colors duration-150 active:scale-[.96] disabled:opacity-50 ${s.profileIndex === p.index ? "bg-foreground/15" : "hover:bg-muted"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-medium">{p.name}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {p.by} · {p.kind}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
                  {p.unavailable
                    ? "Unavailable in demo"
                    : `${p.yield} g · ${p.temperature}°C`}
                </span>
                <ArrowUpRight
                  size={18}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            ))
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <h3 className="text-lg font-medium">No matching profiles</h3>
              <p className="text-sm text-muted-foreground">
                Try a different name or browse the full collection.
              </p>
              <Action
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setFavoritesOnly(false)
                }}
              >
                Show all profiles
              </Action>
            </div>
          )}
        </div>
        <footer className="shrink-0 border-t border-border px-7 py-4 text-[12px] text-muted-foreground">
          {s.locked
            ? "Profile selection is locked during an operation."
            : "Choose a profile to load its recipe. Your five favorites stay in place."}
        </footer>
      </div>
    </dialog>
  )
}
