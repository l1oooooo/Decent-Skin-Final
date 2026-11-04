import { useRef, useState } from "react"
import { previewSamples } from "@/gateway/model"
import type { ProfileTransfer } from "./use-profile-transfer"
import { Action } from "./primitives"
import { format, type SkinSession } from "./use-skin"
import { PageMessage, SearchField } from "./pages"
import { Extraction } from "./trace"
import type { Route } from "./navigation"

export function ProfileLibrary({
  s,
  navigate,
  assignment,
  onAssign,
  transfer,
}: {
  s: SkinSession
  navigate: (route: Route) => void
  assignment: number | null
  onAssign: (id: string) => void
  transfer: ProfileTransfer
}) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState("visible")
  const [sort, setSort] = useState("name")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const { selection, operation, error, result } = transfer
  const busy = operation !== null
  const file = useRef<HTMLInputElement>(null)
  const items = s.allProfiles
    .filter(
      (p) =>
        (p.record.visibility ?? "visible") ===
          (assignment === null ? view : "visible") &&
        (!favoritesOnly || s.snapshot.favorites.includes(p.id)) &&
        `${p.name} ${p.by} ${p.id}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    )
    .sort((a, b) =>
      sort === "author"
        ? a.by.localeCompare(b.by) || a.name.localeCompare(b.name)
        : sort === "updated"
          ? (b.record.updatedAt ?? "").localeCompare(
              a.record.updatedAt ?? ""
            ) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name)
    )
  return (
    <>
      {assignment === null && (
        <div className="mb-5 flex flex-wrap gap-3">
          <Action onClick={() => navigate({ page: "favorites" })}>
            Manage favorites
          </Action>
          <Action
            variant="outline"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            Import profiles
          </Action>
          <Action
            variant="outline"
            disabled={busy}
            onClick={transfer.exportProfiles}
          >
            Export profiles
          </Action>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            aria-label="Profile import file"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0]
              e.target.value = ""
              if (selected) void transfer.choose(selected)
            }}
          />
        </div>
      )}
      {assignment === null && selection && (
        <section
          aria-label="Review import"
          className="mb-5 border-y border-border py-4"
        >
          <h2 className="text-lg [overflow-wrap:anywhere]">
            Import {selection.records.length} profiles from {selection.name}?
          </h2>
          <p className="my-3 text-sm text-muted-foreground">
            Existing IDs, including default profiles, are skipped. Each record
            imports independently; failed records are reported.
          </p>
          <div className="flex gap-3">
            <Action disabled={busy} onClick={transfer.importProfiles}>
              {busy ? "Importing…" : "Confirm import"}
            </Action>
            <Action variant="outline" disabled={busy} onClick={transfer.cancel}>
              Cancel import
            </Action>
          </div>
        </section>
      )}
      {result && (
        <PageMessage>
          {result.imported} imported · {result.skipped} skipped ·{" "}
          {result.failed} failed
          {result.errors.length > 0 && (
            <span className="block whitespace-pre-wrap">
              {result.errors.join("\n")}
            </span>
          )}
        </PageMessage>
      )}
      {error && <PageMessage error>{error}</PageMessage>}
      <div className="mb-5 flex items-end gap-4">
        <SearchField
          label="Search profiles"
          value={query}
          onChange={setQuery}
        />
        {assignment === null && (
          <label className="flex flex-col gap-2 text-[13px] text-muted-foreground">
            Visibility
            <select
              aria-label="Profile visibility"
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="h-12 rounded-lg border border-input bg-card px-3 text-[16px] text-foreground"
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-2 text-[13px] text-muted-foreground">
          Sort
          <select
            aria-label="Sort profiles"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-12 rounded-lg border border-input bg-card px-3 text-[16px] text-foreground"
          >
            <option value="name">Name</option>
            <option value="author">Author</option>
            <option value="updated">Recently updated</option>
          </select>
        </label>
        <Action
          variant="outline"
          aria-pressed={favoritesOnly}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          Favorites
        </Action>
      </div>
      {s.notice && <PageMessage error>{s.notice}</PageMessage>}
      {s.libraryLoading || s.libraryError ? (
        <>
          <PageMessage error={!!s.libraryError}>
            {s.libraryLoading ? "Loading profiles…" : s.libraryError}
          </PageMessage>
          <Action
            variant="outline"
            disabled={s.libraryLoading}
            onClick={s.reloadLibrary}
          >
            Retry
          </Action>
        </>
      ) : (
        <div
          aria-label="Library profiles"
          className="divide-y divide-border border-y border-border"
        >
          {items.map((p) => (
            <div
              key={p.id}
              role="group"
              aria-label={`Profile ${p.name} (${p.id})`}
              className="flex min-h-[90px] items-center gap-4 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium [overflow-wrap:anywhere]">
                  {p.name}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {p.by || "Unknown author"} · {p.kind} ·{" "}
                  {format(p.raw.target_weight)} g
                  {p.record.isDefault ? " · Default" : ""}
                </p>
                <p className="mt-1 truncate text-[12px] text-muted-foreground">
                  {p.id}
                </p>
              </div>
              {assignment === null ? (
                <>
                  <Action
                    variant="outline"
                    aria-label={`Details ${p.name}`}
                    onClick={() => navigate({ page: "profile", id: p.id })}
                  >
                    Details
                  </Action>
                  <Action
                    aria-label={`Load ${p.name}`}
                    aria-pressed={s.selectedId === p.id}
                    disabled={s.profileLocked || view === "hidden"}
                    onClick={async () => {
                      if (await s.selectProfile(p.id))
                        navigate({ page: "home" })
                    }}
                  >
                    Load
                  </Action>
                </>
              ) : (
                <Action
                  aria-label={`Assign ${p.name}`}
                  onClick={() => onAssign(p.id)}
                >
                  Assign
                </Action>
              )}
            </div>
          ))}
          {!items.length && (
            <PageMessage>
              {s.allProfiles.length
                ? "No matching profiles. Try another search or visibility filter."
                : "No profiles saved. Import a Decaid profile export to get started."}
            </PageMessage>
          )}
        </div>
      )}
    </>
  )
}

export function ProfileDetail({
  s,
  id,
  navigate,
}: {
  s: SkinSession
  id?: string
  navigate: (route: Route) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const p = s.allProfiles.find((p) => p.id === id)
  if (s.libraryLoading) return <PageMessage>Loading profile…</PageMessage>
  if (!p || s.libraryError)
    return (
      <>
        <PageMessage error>
          {s.libraryError ||
            "This profile is unavailable. Its favorite assignment has been preserved."}
        </PageMessage>
        <Action variant="outline" onClick={s.reloadLibrary}>
          Retry
        </Action>
      </>
    )
  const hidden = p.record.visibility === "hidden"
  return (
    <>
      <div className="flex gap-3">
        <Action variant="outline" onClick={() => navigate({ page: "library" })}>
          Back to library
        </Action>
        <Action
          disabled={s.profileLocked || hidden}
          onClick={async () => {
            if (await s.selectProfile(p.id)) navigate({ page: "home" })
          }}
        >
          Load profile
        </Action>
        <Action
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError("")
            try {
              await s.gateway.setProfileVisibility(
                p.id,
                hidden ? "visible" : "hidden"
              )
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Could not change visibility"
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? "Saving…" : hidden ? "Restore profile" : "Hide profile"}
        </Action>
        <Action
          variant="outline"
          disabled
          title="Profile editing is not available yet"
        >
          Edit profile
        </Action>
      </div>
      {(error || s.notice) && (
        <PageMessage error>{error || s.notice}</PageMessage>
      )}
      <dl className="my-6 grid grid-cols-[120px_1fr] gap-x-5 gap-y-3 border-y border-border py-5 text-sm">
        <dt className="text-muted-foreground">Author</dt>
        <dd>{p.by || "Not provided"}</dd>
        <dt className="text-muted-foreground">Record</dt>
        <dd className="break-all">{p.id}</dd>
        <dt className="text-muted-foreground">Source</dt>
        <dd>
          {p.record.isDefault
            ? "Bundled default · content is read-only"
            : "User profile"}
        </dd>
        <dt className="text-muted-foreground">Visibility</dt>
        <dd>{hidden ? "Hidden · restore to load or assign" : "Visible"}</dd>
        <dt className="text-muted-foreground">Notes</dt>
        <dd className="[overflow-wrap:anywhere] whitespace-pre-wrap">
          {p.notes || "No notes"}
        </dd>
      </dl>
      <Extraction
        s={{
          ...s,
          active: false,
          complete: false,
          preview: previewSamples(p.raw),
        }}
        height={180}
      />
      <h2 className="mt-6 text-lg font-medium">Profile stages</h2>
      <ol className="mt-3 divide-y divide-border">
        {p.raw.steps.map((step, i) => (
          <li key={i} className="flex min-h-12 gap-4 py-3 text-sm">
            <span className="w-6 text-muted-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1 break-words">{step.name}</span>
            <span className="text-muted-foreground tabular-nums">
              {format(step.seconds)}s max · {format(step.temperature)}°C ·{" "}
              {step.pump === "flow"
                ? `${format(step.flow)} ml/s`
                : `${format(step.pressure)} bar`}
            </span>
          </li>
        ))}
      </ol>
      <PageMessage>
        Preview uses profile targets. Hiding a profile preserves its favorite
        position as unavailable and does not change the loaded recipe.
      </PageMessage>
    </>
  )
}
