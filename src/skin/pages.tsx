import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Home,
  Library,
  Settings,
  Star,
  Coffee,
  History,
} from "lucide-react"
import { RevisionHeader } from "./chrome"
import { Action } from "./primitives"
import type { Route } from "./navigation"
import type { SkinSession } from "./use-skin"
import type { FavoritesEditor } from "./use-favorites"

export const settingsCategories = [
  {
    id: "profiles",
    title: "Profiles and favorites",
    description:
      "Browse recipes, import and export, and arrange the five Home favorites.",
    phase: 3,
  },
  {
    id: "inventory",
    title: "Coffee and equipment",
    description: "Beans, roast batches, inventory and grinder records.",
    phase: 5,
  },
  {
    id: "connections",
    title: "Connections",
    description:
      "Machine, scale and grinder connections, pairing and diagnostics.",
    phase: 4,
  },
  {
    id: "brew",
    title: "Brew and utilities",
    description:
      "Scale policies, stop compensation, steam, hot water and flush.",
    phase: 4,
  },
  {
    id: "machine",
    title: "Machine and power",
    description:
      "Machine information, sleep, charging, tank and refill settings.",
    phase: 4,
  },
  {
    id: "display",
    title: "Display and presence",
    description:
      "Brightness, wake lock, idle sleep, schedules and temperature units.",
    phase: 4,
  },
  {
    id: "calibration",
    title: "Calibration",
    description:
      "Guided flow, pressure, temperature and supported scale calibration.",
    phase: 7,
  },
  {
    id: "maintenance",
    title: "Maintenance",
    description: "Cleaning, descaling and transport procedures.",
    phase: 7,
  },
  {
    id: "updates",
    title: "Updates and data",
    description:
      "Machine firmware, Decaid and skin updates, backups and data import.",
    phase: 7,
  },
  {
    id: "extensions",
    title: "Extensions",
    description: "Installed plugin settings and separate launch surfaces.",
    phase: 8,
  },
  {
    id: "help",
    title: "System and help",
    description: "Compatibility, diagnostics, About and quick start.",
    phase: 8,
  },
]

export function PageShell({
  s,
  route,
  navigate,
  title,
  description,
  children,
  actions,
}: {
  s: SkinSession
  route: Route
  navigate: (route: Route) => void
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [route.page, route.id, route.category, route.slot])
  return (
    <div className="focus-page flex h-full flex-col bg-background">
      <RevisionHeader
        s={s}
        onSettings={() => navigate({ page: "settings" })}
        onHistory={() => navigate({ page: "history" })}
      />
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Skin pages"
          className="w-[220px] shrink-0 overflow-y-auto border-r border-border bg-[var(--recess)] p-4"
        >
          {(
            [
              ["home", "Home", Home],
              ["settings", "Settings", Settings],
              ["library", "Profile library", Library],
              ["favorites", "Manage favorites", Star],
              ["inventory", "Coffee & equipment", Coffee],
              ["history", "Shot history", History],
            ] as const
          ).map(([page, label, Icon]) => (
            <Action
              key={page}
              variant="ghost"
              aria-current={route.page === page ? "page" : undefined}
              onClick={() => navigate({ page })}
              className={`mb-1 w-full justify-start !px-3 ${route.page === page ? "bg-foreground/15" : "text-muted-foreground"}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Action>
          ))}
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6">
          <header className="mb-6">
            <h1
              ref={heading}
              tabIndex={-1}
              className="text-[30px] leading-tight font-medium tracking-[-.045em] [overflow-wrap:anywhere] outline-none"
            >
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-[14px] text-muted-foreground">
                {description}
              </p>
            )}
          </header>
          {children}
        </main>
      </div>
      <footer className="flex h-[96px] shrink-0 items-center gap-3 border-t border-border px-7">
        <Action variant="outline" onClick={() => navigate({ page: "home" })}>
          Return to Home
        </Action>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          {actions}
          {(s.active || s.operation) && (
            <Action onClick={s.stop}>
              {s.active ? "Stop extraction" : "Stop operation"}
            </Action>
          )}
        </div>
      </footer>
    </div>
  )
}

export function PageMessage({
  children,
  error = false,
}: {
  children: ReactNode
  error?: boolean
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className="my-4 text-[14px] leading-relaxed [overflow-wrap:anywhere] text-muted-foreground"
    >
      {children}
    </p>
  )
}
export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className="min-w-0 flex-1"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-2 text-[13px] text-muted-foreground">
        {label}
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="h-12 min-w-0 rounded-[var(--control-radius)] border border-input bg-card px-4 text-[16px] text-foreground"
        />
      </label>
    </form>
  )
}
export function SettingsPage({
  category,
  navigate,
}: {
  category?: string
  navigate: (route: Route) => void
}) {
  const [query, setQuery] = useState("")
  const selected = settingsCategories.find((c) => c.id === category)
  if (selected)
    return (
      <>
        <Action
          variant="outline"
          onClick={() => navigate({ page: "settings" })}
        >
          All settings
        </Action>

        <p className="mt-3 text-sm text-muted-foreground">
          {selected.description}
        </p>
        {selected.id === "profiles" ? (
          <div className="mt-6 flex gap-3">
            <Action
              variant="outline"
              onClick={() => navigate({ page: "library" })}
            >
              Browse profiles
            </Action>
            <Action onClick={() => navigate({ page: "favorites" })}>
              Manage favorites
            </Action>
          </div>
        ) : selected.id === "inventory" ? (
          <Action
            className="mt-5"
            onClick={() => navigate({ page: "inventory" })}
          >
            Open coffee and equipment
          </Action>
        ) : ![4, 7].includes(selected.phase) ? (
          <PageMessage>
            These controls are not available yet. Manage them in Decaid for now.
          </PageMessage>
        ) : null}
      </>
    )
  const items = settingsCategories.filter((c) =>
    `${c.title} ${c.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  )
  return (
    <>
      <SearchField label="Search settings" value={query} onChange={setQuery} />
      <div className="mt-5 divide-y divide-border border-y border-border">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate({ page: "settings", category: c.id })}
            className="flex min-h-[80px] w-full items-center gap-5 py-4 text-left hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-medium">{c.title}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {c.description}
              </p>
            </div>
            <span className="text-[12px] text-muted-foreground">
              {c.phase <= 7 ? "Available" : "Planned"}
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
      {!items.length && (
        <PageMessage>No matching settings. Try a different search.</PageMessage>
      )}
    </>
  )
}
export function FavoritesPage({
  s,
  editor,
  assign,
}: {
  s: SkinSession
  editor: FavoritesEditor
  assign: (slot: number) => void
}) {
  return (
    <>
      {s.snapshot.favoritesIssue && (
        <PageMessage error>
          {s.snapshot.favoritesIssue} The Home rail will change only after you
          explicitly Save.
        </PageMessage>
      )}
      {s.libraryLoading && <PageMessage>Loading profiles…</PageMessage>}
      {s.libraryError && <PageMessage error>{s.libraryError}</PageMessage>}
      <Action
        variant="outline"
        onClick={s.reloadLibrary}
        disabled={s.libraryLoading}
      >
        Refresh library
      </Action>
      <ol
        aria-label="Favorite positions"
        className="mt-4 divide-y divide-border border-y border-border"
      >
        {editor.slots.map((id, index) => {
          const profile = s.allProfiles.find((p) => p.id === id)
          const unavailable =
            id &&
            (!profile ||
              profile.record.visibility === "hidden" ||
              profile.record.visibility === "deleted")
          return (
            <li
              key={index}
              className="flex min-h-[88px] items-center gap-4 py-4"
            >
              <span className="w-6 text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[16px] font-medium [overflow-wrap:anywhere]">
                  {unavailable
                    ? "Unavailable profile"
                    : (profile?.name ?? "Empty position")}
                </p>
                <p className="mt-1 truncate text-[12px] text-muted-foreground">
                  {id
                    ? `${profile?.record.visibility === "hidden" ? "Hidden · " : ""}${id}`
                    : "Choose a profile for this position."}
                </p>
              </div>
              <Action
                variant="ghost"
                aria-label={`Move favorite ${index + 1} up`}
                disabled={index === 0}
                onClick={() => editor.move(index, -1)}
                className="!px-0"
              >
                <ArrowUp size={18} />
              </Action>
              <Action
                variant="ghost"
                aria-label={`Move favorite ${index + 1} down`}
                disabled={index === 4}
                onClick={() => editor.move(index, 1)}
                className="!px-0"
              >
                <ArrowDown size={18} />
              </Action>
              <Action
                variant="outline"
                aria-label={`${id ? "Replace" : "Fill"} favorite ${index + 1}`}
                disabled={s.libraryLoading || !!s.libraryError}
                onClick={() => assign(index)}
              >
                {id ? "Replace" : "Fill"}
              </Action>
              <Action
                variant="ghost"
                aria-label={`Clear favorite ${index + 1}`}
                disabled={!id}
                onClick={() => editor.clear(index)}
              >
                Clear
              </Action>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">
        Loading a recipe does not change these five positions.
      </p>
    </>
  )
}
export function ConfirmNavigation({
  stay,
  leave,
  saving,
  onStop,
}: {
  onStop?: () => void
  stay: () => void
  leave: () => void
  saving: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => {
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby="discard-title"
      onCancel={stay}
      className="m-auto w-[480px] rounded-lg border border-border bg-background p-7 text-foreground backdrop:bg-black/70"
    >
      <h2 id="discard-title" className="text-xl font-medium">
        {saving ? "Changes are saving" : "Discard unsaved changes?"}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {saving
          ? "Wait for the saved result before leaving. You can keep editing your draft."
          : "Acknowledged settings, favorites and library profiles will stay as they are."}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {onStop && (
          <Action variant="outline" onClick={onStop}>
            Stop extraction
          </Action>
        )}
        <Action variant="outline" onClick={stay}>
          Keep editing
        </Action>
        <Action disabled={saving} onClick={leave}>
          Discard and leave
        </Action>
      </div>
    </dialog>
  )
}
