import { NotificationMessage } from "./notifications/feedback"
import { useCallback, useEffect, useState } from "react"
import {
  settingsBlock,
  type DisplayState,
  type WakeSchedule,
} from "@/gateway/daily-settings"
import type { SkinSession } from "./use-skin"
import type { DailySettingsEditor } from "./use-daily-settings"
import { Action } from "./primitives"
import { PageHint } from "./pages"
import { useOperation } from "./settings-operation"
import {
  ConfirmAction,
  inputClass,
  SettingInput,
  SettingsGroup,
} from "./settings-controls"
export function WakeLock({ s }: { s: SkinSession }) {
  const op = useOperation()
  const [state, setState] = useState<DisplayState | null>(null)
  useEffect(() => {
    s.gateway.daily
      .read("display")
      .then((v) => setState(v as DisplayState))
      .catch(() => setState(null))
  }, [s.gateway])
  return (
    <SettingsGroup
      title="Wake-lock override"
      description="An explicit override keeps the screen awake until released. It is separate from the saved keep-awake preference."
    >
      <p className="my-4 text-sm text-muted-foreground">
        {state
          ? `Wake lock ${state.wakeLockEnabled ? "active" : "inactive"} · Override ${state.wakeLockOverride ? "active" : "inactive"}`
          : "Display state unavailable."}
      </p>
      <Action
        variant="outline"
        disabled={
          op.busy ||
          !!settingsBlock(s.gateway) ||
          !state?.platformSupported?.wakeLock
        }
        onClick={() =>
          void op.run(async () => {
            setState(
              (await s.gateway.daily.wakeLock(
                !state?.wakeLockOverride
              )) as DisplayState
            )
          }, "")
        }
      >
        {state?.wakeLockOverride
          ? "Release override"
          : "Keep awake temporarily"}
      </Action>
    </SettingsGroup>
  )
}
export function Schedules({
  s,
  editor,
}: {
  s: SkinSession
  editor: DailySettingsEditor
}) {
  const op = useOperation()
  const [schedules, setSchedules] = useState<WakeSchedule[]>([])
  const [loadError, setLoadError] = useState("")
  const [remove, setRemove] = useState<string | null>(null)
  const draft = editor.scheduleDraft
  const refresh = useCallback(async () => {
    try {
      setSchedules(await s.gateway.daily.schedules())
      setLoadError("")
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }, [s.gateway])
  useEffect(() => {
    let alive = true
    s.gateway.daily
      .schedules()
      .then((value) => {
        if (alive) setSchedules(value)
      })
      .catch((e) => {
        if (alive) setLoadError(e.message)
      })
    return () => {
      alive = false
    }
  }, [s.gateway])
  const set = editor.setScheduleDraft
  return (
    <SettingsGroup
      title="Wake schedules"
      description="Enable presence above to activate schedules. Times use Decaid's local clock. Select no weekdays for every day. A hold of 0 uses normal idle sleep."
    >
      {loadError && (
        <NotificationMessage notificationKey={`presence-settings-102`} error>
          {loadError}
        </NotificationMessage>
      )}
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="flex items-center gap-3 border-b border-border py-4"
        >
          <p className="flex-1 text-sm">
            {schedule.time} ·{" "}
            {schedule.daysOfWeek.length
              ? schedule.daysOfWeek
                  .map(
                    (d) =>
                      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1]
                  )
                  .join(", ")
              : "Every day"}{" "}
            · {schedule.enabled ? "On" : "Off"}
            {schedule.keepAwakeFor
              ? ` · Hold ${schedule.keepAwakeFor} min`
              : ""}
          </p>
          <Action
            variant="outline"
            disabled={op.busy || draft !== null}
            onClick={() => set({ ...schedule })}
          >
            Edit schedule
          </Action>
          <Action
            variant="ghost"
            disabled={op.busy || draft !== null}
            onClick={() => setRemove(schedule.id)}
          >
            Delete schedule
          </Action>
        </div>
      ))}
      {!schedules.length && !loadError && (
        <PageHint>No wake schedules.</PageHint>
      )}
      {!draft ? (
        <div className="mt-4 flex gap-3">
          <Action
            variant="outline"
            disabled={op.busy || !!loadError}
            onClick={() =>
              set({
                id: "",
                time: "07:00",
                daysOfWeek: [],
                enabled: true,
                keepAwakeFor: 0,
              })
            }
          >
            Add wake schedule
          </Action>
          <Action
            variant="ghost"
            disabled={op.busy}
            onClick={() => void refresh()}
          >
            Refresh schedules
          </Action>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const submitted = draft
            void op.run(async () => {
              await s.gateway.daily.saveSchedule(
                submitted,
                submitted.id || undefined
              )
              set(null)
              await refresh()
            }, "Wake schedule saved.")
          }}
        >
          <label className="mt-5 flex max-w-[240px] flex-col gap-2 text-sm">
            Wake time
            <input
              type="time"
              required
              className={inputClass}
              value={draft.time}
              disabled={op.busy}
              onChange={(e) => set({ ...draft, time: e.target.value })}
            />
          </label>
          <div aria-label="Weekdays" className="mt-4 flex flex-wrap gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (label, i) => (
                <Action
                  key={label}
                  variant="outline"
                  aria-pressed={draft.daysOfWeek.includes(i + 1)}
                  disabled={op.busy}
                  onClick={() =>
                    set({
                      ...draft,
                      daysOfWeek: draft.daysOfWeek.includes(i + 1)
                        ? draft.daysOfWeek.filter((d) => d !== i + 1)
                        : [...draft.daysOfWeek, i + 1],
                    })
                  }
                >
                  {label}
                </Action>
              )
            )}
          </div>
          <SettingInput
            field={{
              key: "hold",
              label: "Keep awake after waking (minutes)",
              kind: "number",
              min: 0,
              max: 720,
            }}
            value={draft.keepAwakeFor ?? 0}
            disabled={op.busy}
            onChange={(v) => set({ ...draft, keepAwakeFor: Number(v) })}
          />
          <SettingInput
            field={{
              key: "enabled",
              label: "Schedule enabled",
              kind: "boolean",
            }}
            value={draft.enabled}
            disabled={op.busy}
            onChange={(v) => set({ ...draft, enabled: v === true })}
          />
          <div className="mt-4 flex justify-end gap-3">
            <Action
              variant="outline"
              disabled={op.busy}
              onClick={() => set(null)}
            >
              Cancel schedule
            </Action>
            <Action
              type="submit"
              disabled={op.busy || !!settingsBlock(s.gateway)}
            >
              {op.busy ? "Saving…" : "Save schedule"}
            </Action>
          </div>
        </form>
      )}
      {remove && (
        <ConfirmAction
          title="Delete wake schedule?"
          description="The machine will no longer wake for this schedule."
          cancel={() => setRemove(null)}
          confirm={() => {
            const id = remove
            setRemove(null)
            void op.run(async () => {
              await s.gateway.daily.deleteSchedule(id)
              await refresh()
            }, "Schedule deleted.")
          }}
        />
      )}
    </SettingsGroup>
  )
}
