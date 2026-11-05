import { asData, machineId, numberInput } from "@/gateway/advanced"
import type { Advanced } from "./use-advanced"
import { Action } from "./primitives"
import { EditorField } from "./editor-fields"
import { SettingInput } from "./settings-controls"
import { PageMessage } from "./pages"
import { Section, Facts, type Ask } from "./advanced-shared"
const advancedFields = [
  { key: "heaterPh1Flow", label: "Heater warmup flow (ml/s)", min: 0, max: 10 },
  { key: "heaterPh2Flow", label: "Heater test flow (ml/s)", min: 0, max: 10 },
  {
    key: "heaterIdleTemp",
    label: "Heater idle temperature (°C)",
    min: 0,
    max: 99,
  },
  {
    key: "heaterPh2Timeout",
    label: "Heater test timeout (s)",
    min: 0,
    max: 60,
  },
]
export function MachineExtras({
  h,
  blocked,
  ask,
}: {
  h: Advanced
  blocked: boolean
  ask: Ask
}) {
  const path = "machine/settings/advanced",
    caps = asData(h.values["machine/capabilities"]).capabilities
  const supports = (key: string) => Array.isArray(caps) && caps.includes(key)
  const saveAdvanced = () =>
    h.run("Saving advanced settings", async () => {
      const patch = { ...h.drafts[path] }
      for (const field of advancedFields)
        if (field.key in patch)
          patch[field.key] = numberInput(
            patch[field.key],
            field.min,
            field.max,
            field.label
          )
      if (
        "heaterVoltage" in patch &&
        ![120, 230].includes(Number(patch.heaterVoltage))
      )
        throw new Error("Choose 120 or 230 V.")
      if (
        "heaterPh2Timeout" in patch &&
        !Number.isInteger(patch.heaterPh2Timeout)
      )
        throw new Error("Heater timeout must be whole seconds.")
      await h.api.machineWrite(path, "POST", patch, h.identity)
      h.clear(path)
      await h.read(path)
      h.setMessage(
        "Advanced settings read back. Restart the machine after a voltage change."
      )
    })
  const color = (raw: unknown) =>
    typeof raw === "string" && /^[a-f0-9]{12}$/i.test(raw)
      ? `#${raw.slice(0, 2)}${raw.slice(4, 6)}${raw.slice(8, 10)}`
      : "#000000"
  return (
    <>
      <Section title="Advanced heater settings">
        <p className="mb-4 text-sm text-muted-foreground">
          Use service guidance for heater tuning. Voltage must match the
          machine’s supply region. Fan and refill controls remain in the Machine
          settings section below.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(
              "Apply advanced heater settings?",
              "Changes affect the connected machine’s heater behavior. Verify the voltage and measured service requirements.",
              saveAdvanced
            )
          }}
        >
          <fieldset disabled={!!h.busy} className="grid grid-cols-2 gap-4">
            {advancedFields.map((field) => (
              <SettingInput
                key={field.key}
                field={{
                  ...field,
                  kind: "number",
                  step: field.key === "heaterPh2Timeout" ? 1 : 0.1,
                }}
                value={h.value(path, field.key)}
                onChange={(v) => h.change(path, field.key, v)}
              />
            ))}
            <SettingInput
              field={{
                key: "heaterVoltage",
                label: "Mains voltage region",
                kind: "select",
                options: [
                  { label: "120 V (110 V region)", value: "120" },
                  { label: "230 V (220 V region)", value: "230" },
                ],
              }}
              value={h.value(path, "heaterVoltage")}
              onChange={(v) => h.change(path, "heaterVoltage", Number(v))}
            />
          </fieldset>
          <div className="mt-4 flex gap-3">
            <Action
              disabled={
                blocked ||
                !!h.errors[path] ||
                !Object.keys(h.drafts[path] ?? {}).length
              }
              type="submit"
            >
              Save advanced settings
            </Action>
            <Action
              type="button"
              variant="outline"
              disabled={!!h.busy}
              onClick={() => h.clear(path)}
            >
              Cancel advanced edits
            </Action>
            <Action
              type="button"
              variant="outline"
              disabled={blocked || !!h.errors[path] || !h.values[path]}
              onClick={() =>
                ask(
                  "Reset machine service settings?",
                  "Resets heater tuning, fan, refill override, flow estimation and steam purge to Decaid’s baseline. Profiles and workflow are not reset.",
                  () =>
                    h.run("Resetting service settings", async () => {
                      await h.api.gateway.settingsOperation(async (verify) => {
                        if (
                          h.identity !== machineId(h.api.gateway.getSnapshot())
                        )
                          throw new Error("Machine changed.")
                        verify()
                        await h.api.gateway.request(
                          "/api/v1/machine/settings/reset",
                          "DELETE"
                        )
                      }, true)
                      h.clear(path)
                      await h.load("machine")
                      h.setMessage(
                        "Reset acknowledged. Review all machine settings before brewing."
                      )
                    })
                )
              }
            >
              Reset service settings
            </Action>
          </div>
        </form>
      </Section>
      <Section title="Cup warmer">
        {supports("cupWarmer") ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(
                "Apply cup warmer settings?",
                "This can energize the cup-warmer mat.",
                () =>
                  h.run("Saving cup warmer", async () => {
                    const p = { ...h.drafts["machine/cupWarmer"] }
                    if ("temperature" in p) {
                      p.temperature = numberInput(
                        p.temperature,
                        0,
                        80,
                        "Cup-warmer temperature"
                      )
                      if (!Number.isInteger(p.temperature))
                        throw new Error("Use whole degrees Celsius.")
                    }
                    await h.api.machineWrite(
                      "machine/cupWarmer",
                      "PUT",
                      p,
                      h.identity,
                      "cupWarmer"
                    )
                    h.clear("machine/cupWarmer")
                    await h.read("machine/cupWarmer")
                    h.setMessage("Cup-warmer state read back.")
                  })
              )
            }}
          >
            <Facts
              data={{
                "Current mat temperature (°C)": asData(
                  h.values["machine/cupWarmer"]
                ).currentTemperature,
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <SettingInput
                disabled={!!h.busy}
                field={{
                  key: "temperature",
                  label: "Mat target (°C)",
                  kind: "number",
                  min: 0,
                  max: 80,
                }}
                value={h.value("machine/cupWarmer", "temperature")}
                onChange={(v) =>
                  h.change("machine/cupWarmer", "temperature", v)
                }
              />
              <SettingInput
                disabled={!!h.busy}
                field={{
                  key: "enabled",
                  label: "Manual mat heating",
                  kind: "boolean",
                }}
                value={h.value("machine/cupWarmer", "enabled")}
                onChange={(v) => h.change("machine/cupWarmer", "enabled", v)}
              />
            </div>
            <Action
              className="mt-4"
              type="submit"
              disabled={
                blocked ||
                !!h.errors["machine/cupWarmer"] ||
                !Object.keys(h.drafts["machine/cupWarmer"] ?? {}).length
              }
            >
              Save cup warmer
            </Action>
            <Action
              className="mt-4 ml-3"
              type="button"
              variant="outline"
              disabled={!!h.busy}
              onClick={() => h.clear("machine/cupWarmer")}
            >
              Cancel cup-warmer edits
            </Action>
          </form>
        ) : (
          <PageMessage>Cup warming is unavailable on this machine.</PageMessage>
        )}
      </Section>
      <Section title="Scheduled mat preheat">
        {supports("preheat") ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(
                "Apply mat preheat settings?",
                "The mat may heat before scheduled wake times.",
                () =>
                  h.run("Saving preheat", async () => {
                    const p = { ...h.drafts["machine/cupWarmer/preheat"] }
                    if ("leadMinutes" in p) {
                      p.leadMinutes = numberInput(
                        p.leadMinutes,
                        0,
                        120,
                        "Lead minutes"
                      )
                      if (!Number.isInteger(p.leadMinutes))
                        throw new Error("Use whole minutes.")
                    }
                    await h.api.machineWrite(
                      "machine/cupWarmer/preheat",
                      "PUT",
                      p,
                      h.identity,
                      "preheat"
                    )
                    h.clear("machine/cupWarmer/preheat")
                    await h.read("machine/cupWarmer/preheat")
                    h.setMessage("Preheat state read back.")
                  })
              )
            }}
          >
            <Facts
              data={{
                "Currently driven by schedule": asData(
                  h.values["machine/cupWarmer/preheat"]
                ).active,
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <SettingInput
                disabled={!!h.busy}
                field={{
                  key: "enabled",
                  label: "Enable scheduled preheat",
                  kind: "boolean",
                }}
                value={h.value("machine/cupWarmer/preheat", "enabled")}
                onChange={(v) =>
                  h.change("machine/cupWarmer/preheat", "enabled", v)
                }
              />
              <SettingInput
                disabled={!!h.busy}
                field={{
                  key: "leadMinutes",
                  label: "Minutes before wake",
                  kind: "number",
                  min: 0,
                  max: 120,
                }}
                value={h.value("machine/cupWarmer/preheat", "leadMinutes")}
                onChange={(v) =>
                  h.change("machine/cupWarmer/preheat", "leadMinutes", v)
                }
              />
            </div>
            <Action
              className="mt-4"
              type="submit"
              disabled={
                blocked ||
                !!h.errors["machine/cupWarmer/preheat"] ||
                !Object.keys(h.drafts["machine/cupWarmer/preheat"] ?? {}).length
              }
            >
              Save mat preheat
            </Action>
            <Action
              className="mt-4 ml-3"
              type="button"
              variant="outline"
              disabled={!!h.busy}
              onClick={() => h.clear("machine/cupWarmer/preheat")}
            >
              Cancel preheat edits
            </Action>
          </form>
        ) : (
          <PageMessage>
            Scheduled mat preheat is unavailable on this machine.
          </PageMessage>
        )}
      </Section>
      <Section title="Machine lighting">
        {supports("ledStrip") ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Save persists the front and back strip palettes. The front-switch
              color follows the front strip and cannot be edited independently.
            </p>
            <fieldset
              disabled={
                !!h.busy ||
                !!h.errors["machine/ledStrip"] ||
                !h.values["machine/ledStrip"]
              }
              className="grid grid-cols-2 gap-4"
            >
              {["frontStrip", "backStrip"].flatMap((zone) =>
                ["awake", "sleeping"].map((mode) => (
                  <EditorField
                    key={zone + mode}
                    type="color"
                    label={`${zone === "frontStrip" ? "Front" : "Back"} strip — ${mode}`}
                    value={color(
                      asData(h.value("machine/ledStrip", zone))[mode]
                    )}
                    onChange={(v) =>
                      h.change("machine/ledStrip", zone, {
                        ...asData(h.value("machine/ledStrip", zone)),
                        [mode]: v
                          .slice(1)
                          .match(/../g)!
                          .map((byte) => byte + "00")
                          .join("")
                          .toUpperCase(),
                      })
                    }
                  />
                ))
              )}
            </fieldset>
            <div className="mt-4 flex gap-3">
              <Action
                disabled={
                  blocked ||
                  !!h.errors["machine/ledStrip"] ||
                  !h.values["machine/ledStrip"] ||
                  !Object.keys(h.drafts["machine/ledStrip"] ?? {}).length
                }
                onClick={() =>
                  ask(
                    "Save lighting palette?",
                    "The machine’s stored strip colors will change.",
                    () => h.save("machine/ledStrip", "ledStrip")
                  )
                }
              >
                Save lighting
              </Action>
              <Action
                variant="outline"
                disabled={!!h.busy}
                onClick={() => h.clear("machine/ledStrip")}
              >
                Cancel lighting edits
              </Action>
            </div>
          </>
        ) : (
          <PageMessage>
            Configurable lighting is unavailable on this machine.
          </PageMessage>
        )}
      </Section>
    </>
  )
}
