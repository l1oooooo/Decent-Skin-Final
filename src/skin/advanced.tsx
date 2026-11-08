import { PageHint } from "./pages"
import { NotificationMessage } from "./notifications/feedback"
import { useEffect, useEffectEvent, useState } from "react"
import { machineId } from "@/gateway/advanced"
import type { Advanced } from "./use-advanced"
import type { SkinSession } from "./use-skin"
import type { Route } from "./navigation"
import { Action } from "./primitives"
import { ConfirmAction } from "./settings-controls"
import { Calibration, Maintenance } from "./calibration-maintenance"
import { MachineExtras } from "./machine-advanced"
import { Updates } from "./updates-data"
export function AdvancedPage({
  category,
  s,
  h,
  navigate,
}: {
  category: string
  s: SkinSession
  h: Advanced
  navigate: (r: Route) => void
}) {
  const deviceId = machineId(s.snapshot)
  const load = useEffectEvent(() => {
    void h.load(category)
  })
  useEffect(() => {
    if (s.snapshot.connection === "online") load()
  }, [category, deviceId, s.snapshot.connection])
  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    action: () => Promise<unknown>
  } | null>(null)
  const ask = (
    title: string,
    description: string,
    action: () => Promise<unknown>
  ) => setConfirm({ title, description, action })
  const blocked =
    !!h.busy || !!h.api.block() || h.identity !== machineId(s.snapshot)
  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <Action
          variant="outline"
          disabled={!!h.busy}
          onClick={() => h.load(category)}
        >
          Refresh operation status
        </Action>
      </div>
      {h.api.block() && <PageHint>{h.api.block()}</PageHint>}
      {deviceId && h.identity !== deviceId && !h.loading["machine/info"] && (
        <NotificationMessage notificationKey={`advanced-62`}>
          Machine identity is not verified. Refresh operation status before
          applying changes.
        </NotificationMessage>
      )}
      {Object.entries(h.errors)
        .filter(
          ([path, error]) =>
            error &&
            (category === "updates"
              ? [
                  "machine/info",
                  "machine/firmware",
                  "update",
                  "webui/skins",
                  "webui/skins/default",
                ].includes(path)
              : path.startsWith("machine/"))
        )
        .map(([path, error]) => (
          <NotificationMessage
            notificationKey={`advanced-read-${path}`}
            key={path}
            error
          >
            {path.replace("machine/", "")}: {error} Refresh to retry.
          </NotificationMessage>
        ))}
      {category === "calibration" && (
        <Calibration
          s={s}
          h={h}
          blocked={blocked}
          ask={ask}
          navigate={navigate}
        />
      )}
      {category === "maintenance" && (
        <Maintenance
          s={s}
          h={h}
          blocked={blocked}
          ask={ask}
          navigate={navigate}
        />
      )}
      {category === "machine" && (
        <MachineExtras h={h} blocked={blocked} ask={ask} />
      )}
      {category === "updates" && (
        <Updates s={s} h={h} blocked={blocked} ask={ask} />
      )}
      {confirm && (
        <ConfirmAction
          title={confirm.title}
          description={confirm.description}
          cancel={() => setConfirm(null)}
          confirm={() => {
            const action = confirm.action
            setConfirm(null)
            void action()
          }}
        />
      )}
    </div>
  )
}
