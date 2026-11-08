import { NotificationMessage } from "./notifications/feedback"
import { useEffect, useState } from "react"
import {
  fields,
  getField,
  ownerLabels,
  settingsBlock,
  type DisplayState,
  type SettingsCategory,
  type SettingsOwner,
  type SettingsRecord,
} from "@/gateway/daily-settings"
import { object } from "@/gateway/model"
import type { SkinSession } from "./use-skin"
import type { DailySettingsEditor } from "./use-daily-settings"
import { Action } from "./primitives"
import { PageHint } from "./pages"
import { useOperation } from "./settings-operation"
import { ConfirmAction, SettingInput, SettingsGroup } from "./settings-controls"
import { Connections } from "./connection-settings"
import { WakeLock, Schedules } from "./presence-settings"
export function DailySettingsPage({
  category,
  s,
  editor,
}: {
  category: SettingsCategory
  s: SkinSession
  editor: DailySettingsEditor
}) {
  const [info, setInfo] = useState<SettingsRecord | null>(null)
  const [infoError, setInfoError] = useState("")
  const { load } = editor
  const connectedId = s.snapshot.devices.find(
    (d) => d.type === "machine" && d.state === "connected"
  )?.id
  useEffect(() => {
    for (const owner of Object.keys(fields[category]) as SettingsOwner[])
      void load(owner)
    if (category !== "machine" && category !== "brew") return
    let alive = true
    s.gateway
      .request("/api/v1/machine/info")
      .then((value) => {
        if (alive) {
          const record = object(value)
          setInfo(record)
          s.gateway.acceptMachineInfo(record)
          setInfoError("")
        }
      })
      .catch((e) => {
        if (alive) {
          setInfo(null)
          setInfoError(e.message)
        }
      })
    return () => {
      alive = false
    }
  }, [category, load, s.gateway, s.snapshot.connection, connectedId])
  const bengle = String(info?.model ?? "")
    .toLowerCase()
    .includes("bengle")
  const operation = useOperation()
  const block = settingsBlock(s.gateway)
  const unit = s.snapshot.preferences?.temperatureUnit ?? "C"
  const [confirmSleep, setConfirmSleep] = useState(false)
  return (
    <>
      {category === "connections" && <Connections s={s} />}
      {category === "machine" && (
        <SettingsGroup title="Machine information">
          <div className="py-4 text-sm leading-7 text-muted-foreground">
            <p>Decaid · {s.snapshot.build || "Unavailable"}</p>
            {info &&
              ["model", "serialNumber", "firmwareVersion"].map((key) => (
                <p key={key}>
                  {key === "serialNumber"
                    ? "Serial number"
                    : key === "firmwareVersion"
                      ? "Firmware"
                      : "Model"}{" "}
                  · {String(info[key] ?? "Unavailable")}
                </p>
              ))}
            {infoError && (
              <NotificationMessage notificationKey={`daily-settings-86`} error>
                {infoError}
              </NotificationMessage>
            )}
            <p>State · {s.snapshot.machine?.state.state ?? "Disconnected"}</p>
          </div>
          <div className="flex gap-3">
            <Action
              variant="outline"
              disabled={
                operation.busy ||
                !!settingsBlock(
                  s.gateway,
                  true,
                  s.snapshot.machine?.state.state === "sleeping"
                )
              }
              onClick={() =>
                s.snapshot.machine?.state.state === "sleeping"
                  ? void operation.run(() => s.gateway.daily.power(false), "")
                  : setConfirmSleep(true)
              }
            >
              {s.snapshot.machine?.state.state === "sleeping"
                ? "Wake machine"
                : "Sleep machine"}
            </Action>
          </div>
        </SettingsGroup>
      )}
      {block && <PageHint>{block} You can review and edit drafts.</PageHint>}
      {(
        Object.entries(fields[category]) as [
          SettingsOwner,
          typeof fields.brew.settings,
        ][]
      ).map(([owner, definitions]) => {
        const section = editor.sections[owner]
        const actionLabel =
          owner === "settings" || owner === "preferences"
            ? ownerLabels[owner]
            : ownerLabels[owner].toLowerCase()
        const display = section?.value as DisplayState | undefined
        const unavailable =
          owner === "display" && !display?.platformSupported?.brightness
        return (
          <SettingsGroup
            key={owner}
            title={ownerLabels[owner]}
            description={
              owner === "workflow"
                ? "Saved here and on Home as the same recipe. Milk-temperature stopping is unavailable on this Decaid version."
                : undefined
            }
          >
            {!section?.value && (
              <PageHint>
                {section?.loading
                  ? "Loading settings…"
                  : "Settings are unavailable."}
              </PageHint>
            )}
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void editor.save(owner, category, bengle)
              }}
            >
              {section?.value &&
                definitions?.map((field) => (
                  <SettingInput
                    key={field.key}
                    field={
                      field.key === "steamSettings.targetTemperature" && bengle
                        ? { ...field, max: 165 }
                        : field
                    }
                    unit={unit}
                    value={
                      field.key in section.edits
                        ? section.edits[field.key]
                        : getField(section.value!, field.key)
                    }
                    onChange={(value) => editor.edit(owner, field.key, value)}
                    error={section.errors[field.key]}
                    disabled={unavailable}
                  />
                ))}
              {owner === "display" && display && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Applied brightness · {display.brightness ?? "Unavailable"}
                  {display.lowBatteryBrightnessActive
                    ? " · Limited by battery policy"
                    : ""}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-3">
                <Action
                  variant="ghost"
                  disabled={section?.loading || section?.saving}
                  onClick={() => void editor.load(owner)}
                >
                  Refresh {actionLabel}
                </Action>
                <Action
                  variant="outline"
                  disabled={
                    section?.saving ||
                    !definitions?.some((f) => f.key in (section?.edits ?? {}))
                  }
                  onClick={() => editor.cancel(owner, category)}
                >
                  Cancel
                </Action>
                <Action
                  type="submit"
                  disabled={
                    !!block ||
                    section?.saving ||
                    !section?.value ||
                    unavailable ||
                    !definitions?.some((f) => f.key in section.edits)
                  }
                >
                  {section?.saving ? "Saving…" : `Save ${actionLabel}`}
                </Action>
              </div>
            </form>
          </SettingsGroup>
        )
      })}
      {category === "display" && (
        <>
          <WakeLock s={s} />
          <Schedules s={s} editor={editor} />
        </>
      )}
      {confirmSleep && (
        <ConfirmAction
          title="Put the machine to sleep?"
          description="The machine will stop heating. Wake it from this screen when you need it."
          cancel={() => setConfirmSleep(false)}
          confirm={() => {
            setConfirmSleep(false)
            void operation.run(() => s.gateway.daily.power(true), "")
          }}
        />
      )}
    </>
  )
}
