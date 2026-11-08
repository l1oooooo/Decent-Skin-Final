import { NotificationMessage } from "./notifications/feedback"
import { useEffect, useRef, useState } from "react"
import {
  annotationFields,
  annotations,
  recordContext,
  recordObject,
  recordedTrace,
  recordTitle,
  repeatPatch,
} from "@/gateway/shot-history"
import { Action } from "./primitives"
import { EditorField } from "./editor-fields"
import { ConfirmAction, SettingSelect } from "./settings-controls"
import { PageHint } from "./pages"
import { Extraction } from "./trace"
import { format, type SkinSession } from "./use-skin"
import type { Route } from "./navigation"
import type { ShotHistory } from "./use-shot-history"
const date = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString()
    : "Unknown recorded time"
const text = (value: unknown) =>
  typeof value === "string" && value ? value : "Not recorded"
export function HistoryPage({
  history: h,
  navigate,
}: {
  history: ShotHistory
  navigate: (route: Route) => void
}) {
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void h.list(h.filters, 0)
        }}
        className="mb-6 border-y border-border py-5"
      >
        <div className="grid grid-cols-3 gap-4">
          {[
            ["search", "Search shots"],
            ["profileTitle", "Profile title"],
            ["coffeeName", "Coffee name"],
            ["coffeeRoaster", "Roaster"],
            ["grinderModel", "Grinder model"],
          ].map(([key, label]) => (
            <EditorField
              key={key}
              label={label}
              value={h.filters[key as keyof typeof h.filters]}
              onChange={(value) => h.setFilters({ ...h.filters, [key]: value })}
            />
          ))}
          <div>
            <label
              htmlFor="history-order"
              className="mb-2 block text-sm text-muted-foreground"
            >
              Order
            </label>
            <SettingSelect
              id="history-order"
              label="History order"
              value={h.filters.order}
              options={[
                { label: "Newest first", value: "desc" },
                { label: "Oldest first", value: "asc" },
              ]}
              onChange={(order) =>
                h.setFilters({ ...h.filters, order: order as "asc" | "desc" })
              }
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Action type="submit" disabled={h.loading}>
            Apply filters
          </Action>
          <Action
            type="button"
            variant="outline"
            disabled={h.loading}
            onClick={() => h.list()}
          >
            Refresh history
          </Action>
          <Action
            type="button"
            variant="outline"
            disabled={h.busy || h.loading || !h.items.length || !!h.listError}
            onClick={() => h.exportRecords(h.items.map((r) => r.id))}
          >
            Export this page
          </Action>
        </div>
      </form>
      {h.loading && <PageHint>Loading shots…</PageHint>}
      {h.listError && (
        <>
          <NotificationMessage notificationKey={`history-103`} error>
            {h.listError}
          </NotificationMessage>
          <Action
            variant="outline"
            disabled={h.loading}
            onClick={() => h.list(h.filters, 0)}
          >
            Retry history
          </Action>
        </>
      )}
      {!h.loading && !h.listError && h.loaded && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {h.total} matching shot{h.total === 1 ? "" : "s"} ·{" "}
            {h.items.length
              ? `${h.offset + 1}–${h.offset + h.items.length}`
              : "No records on this page"}
          </p>
          <div className="divide-y divide-border border-y border-border">
            {h.items.map((shot) => (
              <button
                key={shot.id}
                onClick={() => navigate({ page: "shot", id: shot.id })}
                className="flex min-h-24 w-full items-center gap-5 py-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base break-words">{recordTitle(shot)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {date(shot.timestamp)} ·{" "}
                    {text(recordContext(shot).coffeeName)}
                  </p>
                  <p className="mt-1 text-xs break-all text-muted-foreground">
                    {shot.id}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>
                    {format(
                      typeof annotations(shot).actualYield === "number"
                        ? Number(annotations(shot).actualYield)
                        : null
                    )}{" "}
                    g annotated yield
                  </p>
                  <p className="mt-2">{text(shot.stopReason)}</p>
                </div>
              </button>
            ))}
          </div>
          {!h.items.length && (
            <PageHint>
              No shots match these filters. Change the filters or refresh
              history.
            </PageHint>
          )}
          <div className="mt-5 flex gap-3">
            <Action
              variant="outline"
              disabled={h.offset === 0}
              onClick={() => h.list(h.applied, Math.max(0, h.offset - 20))}
            >
              Previous page
            </Action>
            <Action
              variant="outline"
              disabled={h.offset + 20 >= h.total}
              onClick={() => h.list(h.applied, h.offset + 20)}
            >
              Next page
            </Action>
          </div>
        </>
      )}
    </>
  )
}
export function ShotDetail({
  s,
  history: h,
  id,
  navigate,
}: {
  s: SkinSession
  history: ShotHistory
  id?: string
  navigate: (route: Route) => void
}) {
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [confirm, setConfirm] = useState(false)
  const record = h.record?.id === id ? h.record : null
  if (!id)
    return (
      <NotificationMessage notificationKey={`history-201`} error>
        No shot ID was supplied. Open a record from history.
      </NotificationMessage>
    )
  if (!record)
    return (
      <>
        <NotificationMessage notificationKey="history-detail-read" error>
          {h.detailError}
        </NotificationMessage>
        <PageHint>
          {h.detailLoading ? "Loading shot…" : "Shot unavailable."}
        </PageHint>
        <Action
          disabled={h.detailLoading}
          variant="outline"
          onClick={() => h.open(id, true)}
        >
          Retry shot
        </Action>
        {h.dirty && h.record && (
          <Action onClick={() => navigate({ page: "shot", id: h.record!.id })}>
            Return to unsaved shot
          </Action>
        )}
        <Action variant="outline" onClick={() => navigate({ page: "history" })}>
          Back to history
        </Action>
      </>
    )
  const trace = recordedTrace(record),
    context = recordContext(record),
    profile = recordObject(recordObject(record.workflow).profile)
  let repeatError = ""
  try {
    repeatPatch(record)
  } catch (error) {
    repeatError = error instanceof Error ? error.message : "Recipe unavailable."
  }
  const value = (key: string) =>
    typeof context[key] === "number" ? Number(context[key]) : null
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <Action variant="outline" onClick={() => navigate({ page: "history" })}>
          Back to history
        </Action>
        <Action
          variant="outline"
          disabled={h.busy || h.detailLoading}
          onClick={() => h.open(id, true)}
        >
          Refresh shot
        </Action>
        <Action
          variant="outline"
          disabled={h.busy || h.detailLoading}
          onClick={() => h.exportRecords([id])}
        >
          Export saved shot
        </Action>
        <Action
          disabled={h.busy || h.dirty || s.profileLocked || !!repeatError}
          onClick={async () => {
            if (await h.repeat()) navigate({ page: "home" })
          }}
        >
          Repeat recipe
        </Action>
        <Action
          variant="outline"
          disabled={h.busy || h.dirty}
          onClick={() => setConfirm(true)}
        >
          Delete shot
        </Action>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {date(record.timestamp)} · {record.id}
      </p>
      <PageHint>
        Repeat loads the recorded profile and coffee/equipment context. It does
        not start a shot or change utility settings. Save or cancel annotations
        before repeating or deleting.
      </PageHint>
      {repeatError && (
        <NotificationMessage notificationKey={`history-285`}>
          {repeatError}
        </NotificationMessage>
      )}
      {h.detailError && (
        <NotificationMessage notificationKey={`history-287`} error>
          {h.detailError} The last loaded record is still shown.
        </NotificationMessage>
      )}
      <section
        aria-label="Recorded shot"
        className="border-y border-border py-5"
      >
        <h2 className="text-xl font-medium break-words">
          {recordTitle(record)}
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          {[
            ["Stop reason", text(record.stopReason)],
            ["Recorded span", `${format(trace.span)} s`],
            ["Last recorded scale weight", `${format(trace.finalWeight)} g`],
            ["Target dose", `${format(value("targetDoseWeight"))} g`],
            ["Target yield", `${format(value("targetYield"))} g`],
            ["Grind setting", text(context.grinderSetting)],
            ["Coffee", text(context.coffeeName)],
            ["Roaster", text(context.coffeeRoaster)],
            ["Equipment", text(context.grinderModel)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs break-all text-muted-foreground">
          Batch: {text(context.beanBatchId)} · Grinder record:{" "}
          {text(context.grinderId)}
        </p>
        <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
          {text(profile.notes)}
        </p>
      </section>
      <section className="my-6" aria-label="Recorded curves">
        <h2 className="mb-3 text-lg">Recorded curves</h2>
        {trace.samples.length ? (
          <>
            <Extraction
              s={{
                ...s,
                active: false,
                complete: true,
                samples: trace.samples,
              }}
              height={230}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Time is relative to the first recorded sample; the recorded span
              may omit part of the shot. Missing readings remain gaps.
              {trace.invalid
                ? ` ${trace.invalid} invalid or out-of-order samples were omitted.`
                : ""}
            </p>
          </>
        ) : (
          <PageHint>
            No usable recorded measurements are available. A recipe preview is
            not substituted.
          </PageHint>
        )}
      </section>
      <section aria-label="Recorded recipe stages" className="mb-6">
        <h2 className="text-lg">Recorded stages</h2>
        <ol className="mt-3 divide-y divide-border">
          {(Array.isArray(profile.steps) ? profile.steps : []).map((raw, i) => {
            const step = recordObject(raw)
            return (
              <li key={i} className="flex gap-4 py-3 text-sm">
                <span>{i + 1}</span>
                <span className="min-w-0 flex-1 break-words">
                  {text(step.name)}
                </span>
                <span>
                  {format(
                    typeof step.seconds === "number" ? step.seconds : null
                  )}{" "}
                  s max ·{" "}
                  {format(
                    s.displayTemperature(
                      typeof step.temperature === "number"
                        ? step.temperature
                        : null
                    )
                  )}
                  °{s.temperatureUnit}
                </span>
              </li>
            )
          })}
        </ol>
        {!Array.isArray(profile.steps) || !profile.steps.length ? (
          <PageHint>No executable stages were recorded.</PageHint>
        ) : null}
      </section>
      {h.draft && (
        <form
          id="shot-annotations"
          onSubmit={(e) => {
            e.preventDefault()
            void h.save()
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              e.currentTarget.requestSubmit()
            }
          }}
          className="border-t border-border py-5"
        >
          <h2 className="mb-3 text-lg">Annotations</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            These are your recorded assessments. Measured curves remain
            read-only. Blank numeric fields clear the annotation.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {annotationFields.map(([key, label]) => (
              <EditorField
                key={key}
                label={label}
                type="number"
                value={h.draft![key]}
                error={h.errors[key]}
                onChange={(value) => h.change(key, value)}
              />
            ))}
          </div>
          <div className="mt-4">
            <EditorField
              label="Shot notes"
              value={h.draft.espressoNotes}
              multiline
              error={h.errors.espressoNotes}
              onChange={(value) => h.change("espressoNotes", value)}
            />
          </div>
        </form>
      )}
      {confirm && (
        <ConfirmAction
          title="Permanently delete this shot?"
          description="The recorded curves, recipe and annotations will be removed from Decaid. This cannot be undone. Export the saved shot first if you want a copy."
          cancel={() => setConfirm(false)}
          confirm={async () => {
            setConfirm(false)
            if ((await h.remove()) && mounted.current)
              navigate({ page: "history" })
          }}
        />
      )}
    </>
  )
}
export function ShotActions({ history: h }: { history: ShotHistory }) {
  if (!h.record || !h.draft) return null
  return (
    <>
      <Action
        variant="outline"
        disabled={h.busy || !h.dirty}
        onClick={h.cancel}
      >
        Cancel annotations
      </Action>
      <Action
        type="submit"
        form="shot-annotations"
        disabled={h.busy || h.detailLoading || !h.dirty}
      >
        Save annotations
      </Action>
    </>
  )
}
