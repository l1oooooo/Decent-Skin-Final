import { useState } from "react"
import { asData, numberInput } from "@/gateway/advanced"
import type { Advanced } from "./use-advanced"
import { Action } from "./primitives"
import { EditorField, EditorChoice } from "./editor-fields"
import { PageMessage } from "./pages"
import { Section, Facts, Prepared, shown, type Ask } from "./advanced-shared"
import type { SkinSession } from "./use-skin"
import type { Route } from "./navigation"
import {
  freshMachine,
  sensorCorrection,
  type Sensor,
  type Procedure,
} from "@/gateway/advanced"
import { finite } from "@/gateway/model"
export function Calibration({
  s,
  h,
  blocked,
  ask,
  navigate,
}: {
  s: SkinSession
  h: Advanced
  blocked: boolean
  ask: Ask
  navigate: (r: Route) => void
}) {
  const [sensor, setSensor] = useState<Sensor>("pressure"),
    [prepared, setPrepared] = useState(false),
    [scalePrepared, setScalePrepared] = useState(false)
  const path = `machine/calibration/${sensor}`,
    draft = h.drafts[path] ?? {},
    current = asData(h.values[path]),
    factory = asData(h.values[`${path}?source=factory`])
  const reported = Number(draft.reported),
    measured = Number(draft.measured)
  let prediction =
    "Enter paired instrument readings from the same stable observation."
  try {
    prediction = `Expected saved calibration: ${sensorCorrection(sensor, Number(current.measuredValue), reported, measured).toFixed(4)}`
  } catch (e) {
    if (draft.reported !== undefined && draft.measured !== undefined)
      prediction = e instanceof Error ? e.message : prediction
  }
  const de1 = String(asData(h.values["machine/info"]).model)
    .toLowerCase()
    .startsWith("de1")
  const caps = asData(h.values["machine/capabilities"]).capabilities
  const scaleSupported =
    Array.isArray(caps) && caps.includes("scaleCalibration")
  const scale = Object.keys(h.scale).length
    ? h.scale
    : asData(h.values["machine/scaleCalibration"])
  const applySensor = (reset = false) =>
    h.run(
      reset ? "Restoring sensor calibration" : "Applying sensor correction",
      async () => {
        try {
          const value = await h.api.sensor(
            sensor,
            reported,
            measured,
            h.identity,
            reset
          )
          await h.read(path)
          h.setMessage(
            `Returned ${sensor} calibration: ${shown(asData(value).measuredValue)}. Take new measurements before any further correction.`
          )
        } finally {
          h.clear(path)
          setPrepared(false)
        }
      }
    )
  return (
    <>
      <Section title="Sensor calibration">
        <p className="mb-4 text-sm text-muted-foreground">
          Measure with a trusted instrument while the machine holds stable
          conditions. Record the DE1 sensor reading and instrument reading from
          the same observation, then return to idle before applying. Temperature
          readings here are Celsius. A correction is applied once; another
          attempt requires new measurements.
        </p>
        {!de1 ? (
          <PageMessage>
            DE1 sensor calibration is unavailable for this model.
          </PageMessage>
        ) : (
          <>
            <EditorChoice
              label="Sensor"
              value={sensor}
              options={["pressure", "temperature", "flow"]}
              onChange={(v) => {
                setSensor(v as Sensor)
                setPrepared(false)
              }}
            />
            <Facts
              data={{
                "Saved calibration": current.measuredValue,
                "Factory calibration": factory.measuredValue,
                "Current sensor reading": freshMachine(s.snapshot)
                  ? sensor === "temperature"
                    ? s.snapshot.machine?.groupTemperature
                    : s.snapshot.machine?.[sensor]
                  : undefined,
              }}
            />
            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(`Apply ${sensor} correction?`, prediction, () =>
                  applySensor()
                )
              }}
            >
              <fieldset disabled={!!h.busy} className="grid grid-cols-2 gap-4">
                <EditorField
                  label="DE1 observed reading"
                  type="number"
                  value={draft.reported ?? ""}
                  onChange={(v) => h.change(path, "reported", v)}
                />
                <EditorField
                  label="Measured instrument reading"
                  type="number"
                  value={draft.measured ?? ""}
                  onChange={(v) => h.change(path, "measured", v)}
                />
              </fieldset>
              <PageMessage>{prediction}</PageMessage>
              <Prepared
                label="I recorded stable paired measurements and checked the instrument."
                value={prepared}
                onChange={setPrepared}
              />
              <div className="mt-4 flex gap-3">
                <Action
                  type="submit"
                  disabled={
                    blocked ||
                    !prepared ||
                    !prediction.startsWith("Expected") ||
                    !!h.errors[path]
                  }
                >
                  Apply sensor correction
                </Action>
                <Action
                  type="button"
                  variant="outline"
                  disabled={blocked || !finite(factory.measuredValue)}
                  onClick={() =>
                    ask(
                      `Restore factory ${sensor} calibration?`,
                      "Read the current value and restore the factory calibration. This changes the connected machine.",
                      () => applySensor(true)
                    )
                  }
                >
                  Restore factory sensor
                </Action>
                <Action
                  type="button"
                  variant="outline"
                  onClick={() => h.clear(path)}
                  disabled={!!h.busy}
                >
                  Clear readings
                </Action>
              </div>
            </form>
          </>
        )}
      </Section>
      <Section title="Flow estimation calibration">
        <p className="mb-4 text-sm text-muted-foreground">
          Collect an open-flow sample using the machine controls and a graduated
          vessel. Record the machine-estimated volume and the measured volume
          for that same sample. Stop the flow and return to idle before
          applying. This changes the machine flow multiplier, separate from stop
          compensation in Brew and utilities.
        </p>
        {de1 ? (
          <FlowCalibration h={h} blocked={blocked} ask={ask} />
        ) : (
          <PageMessage>
            Machine flow calibration is unavailable for this model.
          </PageMessage>
        )}
      </Section>
      <Section title="Integrated scale calibration">
        {!scaleSupported ? (
          <PageMessage>
            No supported load-cell calibration capability is reported.
          </PageMessage>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              First zero the unloaded scale. For gain calibration, remove the
              platform and place a known mass on one isolated load cell. Run
              Latch once per cell; the firmware reports which cell it detected.
              Follow the machine service instructions for access and handling.
            </p>
            <Facts
              data={{
                Step: scale.step,
                Phase: scale.subState,
                "Detected cell": scale.detectedCell,
                Result: scale.status,
                "Reported seconds remaining": scale.secondsRemaining,
              }}
            />
            <EditorField
              label="Known mass (g)"
              type="number"
              value={h.drafts.scale?.weight ?? ""}
              onChange={(v) => h.change("scale", "weight", v)}
            />
            <Prepared
              label="The platform and known mass are prepared for the selected step."
              value={scalePrepared}
              onChange={setScalePrepared}
            />
            <div className="mt-4 flex gap-3">
              {(["zero", "latch"] as const).map((command) => (
                <Action
                  key={command}
                  disabled={blocked || !scalePrepared}
                  onClick={() =>
                    ask(
                      `Start scale ${command}?`,
                      command === "zero"
                        ? "The scale must be unloaded."
                        : "The platform must be removed and the known mass isolated on one cell.",
                      () =>
                        h.run(`Scale ${command}`, async (signal) => {
                          const result = await h.api.scale(
                            command,
                            Number(h.drafts.scale?.weight),
                            h.identity,
                            h.setScale,
                            signal
                          )
                          h.setMessage(
                            command === "zero"
                              ? "Zero step reported complete. Proceed to isolated-cell latches."
                              : `Latch result: ${result.status}; cell ${result.detectedCell}. Both cells must be calibrated.`
                          )
                          setScalePrepared(false)
                          h.clear("scale")
                        })
                    )
                  }
                >
                  {command === "zero"
                    ? "Zero unloaded scale"
                    : "Latch known mass"}
                </Action>
              ))}
              <Action variant="outline" onClick={() => h.cancel("scale")}>
                Abort scale calibration
              </Action>
              <Action
                variant="outline"
                disabled={!!h.busy}
                onClick={async () => {
                  h.setScale({})
                  await h.read("machine/scaleCalibration")
                }}
              >
                Read scale state
              </Action>
            </div>
          </>
        )}
      </Section>
      <Section title="Steam and service settings">
        <p className="mb-4 text-sm text-muted-foreground">
          Steam calibration on the installed reference uses the workflow’s steam
          temperature and flow controls. Keep that single owner under Brew and
          utilities. No separate steam-sensor calibration endpoint is exposed.
        </p>
        <div className="flex gap-3">
          <Action
            variant="outline"
            onClick={() => navigate({ page: "settings", category: "brew" })}
          >
            Steam temperature and flow
          </Action>
          <Action
            variant="outline"
            onClick={() => navigate({ page: "settings", category: "machine" })}
          >
            Heater, voltage and reset settings
          </Action>
        </div>
      </Section>
    </>
  )
}
function FlowCalibration({
  h,
  blocked,
  ask,
}: {
  h: Advanced
  blocked: boolean
  ask: Ask
}) {
  const path = "machine/calibration",
    d = h.drafts.flowSample ?? {},
    saved = asData(h.values[path]).flowMultiplier
  const next = (Number(saved) * Number(d.actual)) / Number(d.estimated),
    valid =
      finite(next) &&
      next >= 0.13 &&
      next <= 2 &&
      Number(d.actual) > 0 &&
      Number(d.estimated) > 0
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        ask(
          "Apply flow estimation calibration?",
          `Machine multiplier changes from ${shown(saved)} to ${next.toFixed(4)}.`,
          () =>
            h.run("Applying flow calibration", async () => {
              numberInput(next, 0.13, 2, "Multiplier")
              const result = await h.api.machineWrite(
                path,
                "POST",
                { flowMultiplier: next },
                h.identity
              )
              await h.read(path)
              h.clear("flowSample")
              h.setMessage(
                `Read-back flow multiplier: ${shown(asData(result).flowMultiplier)}.`
              )
            })
        )
      }}
    >
      <Facts
        data={{
          "Saved multiplier": saved,
          "Calculated multiplier": valid ? next.toFixed(4) : undefined,
        }}
      />
      <fieldset disabled={!!h.busy} className="grid grid-cols-2 gap-4">
        <EditorField
          label="Machine-estimated sample volume (ml)"
          type="number"
          value={d.estimated ?? ""}
          onChange={(v) => h.change("flowSample", "estimated", v)}
        />
        <EditorField
          label="Measured sample volume (ml)"
          type="number"
          value={d.actual ?? ""}
          onChange={(v) => h.change("flowSample", "actual", v)}
        />
      </fieldset>
      <div className="mt-4 flex gap-3">
        <Action disabled={blocked || !valid || !!h.errors[path]} type="submit">
          Apply flow multiplier
        </Action>
        <Action
          type="button"
          variant="outline"
          disabled={!!h.busy}
          onClick={() => h.clear("flowSample")}
        >
          Cancel flow readings
        </Action>
      </div>
    </form>
  )
}
export function Maintenance({
  s,
  h,
  blocked,
  ask,
  navigate,
}: {
  s: SkinSession
  h: Advanced
  blocked: boolean
  ask: Ask
  navigate: (r: Route) => void
}) {
  const [prepared, setPrepared] = useState<Record<string, boolean>>({})
  const live = freshMachine(s.snapshot),
    state = s.snapshot.machine?.state
  const procedures: [Procedure, string, string][] = [
    [
      "cleaning",
      "Cleaning",
      "Prepare the machine according to the Decent cleaning instructions. Fit the blind basket, use the specified cleaning dose, check water supply and empty the drip tray.",
    ],
    [
      "descaling",
      "Descaling",
      "Follow the manufacturer’s descaling procedure and dilution. Disable the steam heater, wait for a measured steam boiler temperature at or below 60 °C, and prepare the reservoir and catch vessel.",
    ],
    [
      "airPurge",
      "Transport / drain",
      "Follow the transport procedure. Prepare the water supply and collection vessel, remove the portafilter and keep clear of hot discharge. Inspect for remaining water before packing.",
    ],
  ]
  return (
    <>
      <Facts
        data={{
          "Machine state": live ? state?.state : "Unavailable",
          "Procedure phase": live ? state?.substate : "Unavailable",
          "Steam boiler (°C)": live
            ? s.snapshot.machine?.steamTemperature
            : undefined,
          "Steam target (°C)":
            s.snapshot.workflow?.steamSettings?.targetTemperature,
        }}
      />
      {h.procedure && (
        <PageMessage>
          {!h.busy.includes("cycle") &&
          live &&
          ["cleaning", "descaling", "airPurge"].includes(state?.state ?? "")
            ? `Machine procedure: ${state?.state} / ${state?.substate}. Observed from the machine; use Stop maintenance to cancel.`
            : h.procedure}
        </PageMessage>
      )}
      {(["cleaning", "descaling", "airPurge"].includes(state?.state ?? "") ||
        h.busy.includes("cycle")) && (
        <Action onClick={() => h.cancel("maintenance")}>
          Stop maintenance
        </Action>
      )}
      {!live && (
        <PageMessage error>
          Procedure status is unknown while readings are unavailable. Reconnect
          before starting or sending Stop.
        </PageMessage>
      )}
      {procedures.map(([kind, title, prep]) => (
        <Section key={kind} title={title}>
          <p className="mb-4 text-sm text-muted-foreground">{prep}</p>
          {kind === "descaling" && (
            <div className="mb-4 flex gap-3">
              <Action
                disabled={blocked}
                variant="outline"
                onClick={() =>
                  ask(
                    "Disable the steam heater?",
                    "The workflow steam target will be set to 0. Restore your preferred target in Brew and utilities after descaling.",
                    () =>
                      h.run("Disabling steam heater", async () => {
                        await s.gateway.updateWorkflow({
                          steamSettings: {
                            ...s.snapshot.workflow?.steamSettings,
                            targetTemperature: 0,
                            duration:
                              s.snapshot.workflow?.steamSettings?.duration ?? 0,
                          },
                        })
                        h.setMessage(
                          "Steam heater disabled. Wait for cool readings, then explicitly start descaling."
                        )
                      })
                  )
                }
              >
                Disable steam heater
              </Action>
              <Action
                variant="outline"
                onClick={() => navigate({ page: "settings", category: "brew" })}
              >
                Restore steam settings
              </Action>
            </div>
          )}
          <Prepared
            label={`I have completed the ${title.toLowerCase()} preparation.`}
            value={!!prepared[kind]}
            onChange={(value) =>
              setPrepared((prev) => ({ ...prev, [kind]: value }))
            }
          />
          <Action
            className="mt-4"
            disabled={
              blocked ||
              !prepared[kind] ||
              (kind === "descaling" &&
                (!finite(s.snapshot.machine?.steamTemperature) ||
                  s.snapshot.machine.steamTemperature > 60 ||
                  s.snapshot.workflow?.steamSettings?.targetTemperature !== 0))
            }
            onClick={() =>
              ask(`Start ${title.toLowerCase()}?`, prep, () =>
                h.run(`${title} cycle`, async (signal) => {
                  await h.api.maintenance(
                    kind,
                    h.identity,
                    h.setProcedure,
                    signal
                  )
                  setPrepared((prev) => ({ ...prev, [kind]: false }))
                })
              )
            }
          >
            Start {title.toLowerCase()}
          </Action>
        </Section>
      ))}
    </>
  )
}
