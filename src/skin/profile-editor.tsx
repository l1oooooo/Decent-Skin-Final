import { useState } from "react"
import type { Profile, ProfileStep } from "@/gateway/types"
import { newStep, validateProfile } from "@/gateway/profile-data"
import { previewSamples } from "@/gateway/model"
import { Action } from "./primitives"
import { PageHint } from "./pages"
import { EditorChoice, EditorField } from "./editor-fields"
import { ConfirmAction, inputClass } from "./settings-controls"
import type { RecipeEditor } from "./use-recipe-editor"
import type { SkinSession } from "./use-skin"
import { Extraction } from "./trace"

export function ProfileEditor({
  s,
  editor,
}: {
  s: SkinSession
  editor: RecipeEditor
}) {
  const [cancelRecovery, setCancelRecovery] = useState(false)
  const [view, setView] = useState<"form" | "json">("form")
  const p = editor.draft
  if (!p)
    return (
      <>
        <PageHint>
          This profile is unavailable. Return to the library or retry loading
          it.
        </PageHint>
        <Action
          variant="outline"
          disabled={editor.busy}
          onClick={editor.recover}
        >
          Check pending save
        </Action>
        {editor.pending && (
          <Action disabled={editor.busy} onClick={editor.retry}>
            Retry pending save
          </Action>
        )}
      </>
    )
  const field = (key: string, value: unknown) =>
    editor.change({ ...p, [key]: value })
  const step = (index: number, patch: Partial<ProfileStep>) =>
    field(
      "steps",
      p.steps.map((s, i) => (i === index ? { ...s, ...patch } : s))
    )
  const move = (index: number, delta: number) => {
    const steps = [...p.steps]
    ;[steps[index], steps[index + delta]] = [steps[index + delta], steps[index]]
    field("steps", steps)
  }
  const number = (
    label: string,
    key: string,
    value: unknown,
    onChange: (value: number | null) => void,
    optional = false
  ) => (
    <EditorField
      label={label}
      type="number"
      value={value}
      error={editor.errors[key]}
      onChange={(v) => onChange(v === "" ? (optional ? null : NaN) : Number(v))}
    />
  )
  const previous = editor.source?.metadata?.focusPrevious as
    { id?: string; profile?: Profile } | undefined
  return (
    <>
      <PageHint>
        {editor.source?.isDefault
          ? "Bundled defaults are read-only. Change a stage or target, then Save as new to create your own recipe."
          : "Edit the stored recipe here. Saving does not change the active workflow or start the machine."}{" "}
        Temperatures in this editor use °C.
      </PageHint>
      <div className="mb-5 flex flex-wrap gap-3">
        <Action
          variant="outline"
          disabled={editor.busy}
          aria-pressed={view === "form"}
          onClick={() => setView("form")}
        >
          Stage forms
        </Action>
        <Action
          variant="outline"
          disabled={editor.busy}
          aria-pressed={view === "json"}
          onClick={() => {
            setView("json")
            if (editor.json === null) editor.setJson(JSON.stringify(p, null, 2))
          }}
        >
          Structured JSON
        </Action>
      </div>
      {editor.json !== null && view === "form" && (
        <PageHint>
          Apply or discard your structured JSON before editing the stage forms.
        </PageHint>
      )}
      {editor.pending && (
        <div className="mb-5 flex items-center gap-4">
          <p className="text-sm">
            A profile save needs recovery. Your recipe and reference updates may
            have completed separately.
          </p>
          <Action disabled={editor.busy} onClick={editor.retry}>
            Retry pending save
          </Action>
          {!editor.pending.savedId && (
            <Action
              variant="outline"
              disabled={editor.busy}
              onClick={() => setCancelRecovery(true)}
            >
              Cancel pending save
            </Action>
          )}
        </div>
      )}
      {cancelRecovery && (
        <ConfirmAction
          title="Cancel this pending save?"
          description="Only the recovery record is cleared if no saved profile is found. This cannot undo a timed-out write; review the library before saving again."
          cancel={() => setCancelRecovery(false)}
          confirm={() => {
            setCancelRecovery(false)
            void editor.cancelPending()
          }}
        />
      )}
      <form
        id="profile-edit-form"
        onSubmit={(e) => {
          e.preventDefault()
          void editor.save(
            editor.source && !editor.source.isDefault ? "update" : "new"
          )
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault()
            e.currentTarget.requestSubmit()
          }
        }}
      >
        <fieldset
          disabled={
            editor.busy ||
            !!editor.pending ||
            (view === "form" && editor.json !== null)
          }
          className="min-w-0"
        >
          {view === "json" ? (
            <section className="mb-6">
              <label className="mb-2 block text-sm" htmlFor="profile-json">
                Profile JSON
              </label>
              <textarea
                id="profile-json"
                spellCheck={false}
                className={`${inputClass} h-[360px] py-3 font-mono`}
                value={editor.json ?? JSON.stringify(p, null, 2)}
                onChange={(e) => editor.setJson(e.target.value)}
              />
              <div className="mt-3 flex gap-3">
                <Action type="button" onClick={editor.applyJson}>
                  Apply JSON to draft
                </Action>
                <Action
                  type="button"
                  variant="outline"
                  onClick={() => {
                    editor.setJson(null)
                    setView("form")
                  }}
                >
                  Discard JSON changes
                </Action>
              </div>
              {Object.entries(editor.errors).map(([key, error]) => (
                <p key={key} role="alert" className="mt-2 text-sm">
                  {key}: {error}
                </p>
              ))}
            </section>
          ) : (
            <>
              <section
                aria-label="Profile metadata"
                className="grid grid-cols-2 gap-4 border-y border-border py-5"
              >
                <EditorField
                  label="Profile name"
                  value={p.title}
                  error={editor.errors.title}
                  required
                  onChange={(v) => field("title", v)}
                />
                <EditorField
                  label="Author"
                  value={p.author}
                  onChange={(v) => field("author", v)}
                />
                <EditorChoice
                  label="Beverage type"
                  value={p.beverage_type}
                  options={[
                    "espresso",
                    "pourover",
                    "manual",
                    "calibrate",
                    "cleaning",
                  ]}
                  onChange={(v) => field("beverage_type", v)}
                />
                {number(
                  "Target weight (g)",
                  "target_weight",
                  p.target_weight,
                  (v) => field("target_weight", v),
                  true
                )}
                {number(
                  "Target volume (ml)",
                  "target_volume",
                  p.target_volume,
                  (v) => field("target_volume", v),
                  true
                )}
                {number(
                  "Start volume counting at stage",
                  "target_volume_count_start",
                  Number(p.target_volume_count_start) + 1,
                  (v) =>
                    field(
                      "target_volume_count_start",
                      v === null ? null : v - 1
                    )
                )}
                {number(
                  "Tank temperature (°C; 0 disables)",
                  "tank_temperature",
                  p.tank_temperature,
                  (v) => field("tank_temperature", v)
                )}
                <EditorField
                  label="Notes"
                  value={p.notes}
                  multiline
                  onChange={(v) => field("notes", v)}
                />
              </section>
              <h2 className="mt-6 text-lg">Stages</h2>
              {editor.errors.steps && (
                <PageHint error>{editor.errors.steps}</PageHint>
              )}
              {p.steps.map((item, index) => {
                const prefix = `steps.${index}.`
                const patch = (key: string, value: unknown) =>
                  step(index, { [key]: value })
                const exit = item.exit as Record<string, unknown> | null
                const limiter = item.limiter as Record<string, unknown> | null
                return (
                  <section
                    key={index}
                    aria-label={`Stage ${index + 1}`}
                    className="border-b border-border py-5"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <h3 className="min-w-0 flex-1 text-lg break-words">
                        {index + 1}. {item.name}
                      </h3>
                      <Action
                        type="button"
                        variant="outline"
                        aria-label={`Move stage ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        Move up
                      </Action>
                      <Action
                        type="button"
                        variant="outline"
                        aria-label={`Move stage ${index + 1} down`}
                        disabled={index === p.steps.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        Move down
                      </Action>
                      <Action
                        type="button"
                        variant="outline"
                        disabled={p.steps.length === 1}
                        onClick={() =>
                          field(
                            "steps",
                            p.steps.filter((_, i) => i !== index)
                          )
                        }
                      >
                        Remove stage
                      </Action>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <EditorField
                        label={`Stage ${index + 1} name`}
                        value={item.name}
                        error={editor.errors[prefix + "name"]}
                        required
                        onChange={(v) => patch("name", v)}
                      />
                      <EditorChoice
                        label={`Stage ${index + 1} pump`}
                        value={item.pump}
                        options={["pressure", "flow"]}
                        onChange={(v) => patch("pump", v)}
                      />
                      <EditorChoice
                        label={`Stage ${index + 1} transition`}
                        value={item.transition}
                        options={["fast", "smooth"]}
                        onChange={(v) => patch("transition", v)}
                      />
                      {number(
                        `Stage ${index + 1} ${item.pump} (${item.pump === "pressure" ? "bar" : "ml/s"})`,
                        prefix + item.pump,
                        item[item.pump],
                        (v) => patch(item.pump, v)
                      )}
                      {number(
                        `Stage ${index + 1} maximum time (s)`,
                        prefix + "seconds",
                        item.seconds,
                        (v) => patch("seconds", v)
                      )}
                      {number(
                        `Stage ${index + 1} temperature (°C)`,
                        prefix + "temperature",
                        item.temperature,
                        (v) => patch("temperature", v)
                      )}
                      <EditorChoice
                        label={`Stage ${index + 1} temperature sensor`}
                        value={item.sensor}
                        options={["coffee", "water"]}
                        onChange={(v) => patch("sensor", v)}
                      />
                      {number(
                        `Stage ${index + 1} volume (ml; 0 disables)`,
                        prefix + "volume",
                        item.volume,
                        (v) => patch("volume", v)
                      )}
                      {number(
                        `Stage ${index + 1} weight (g; blank disables)`,
                        prefix + "weight",
                        item.weight,
                        (v) => patch("weight", v),
                        true
                      )}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Action
                        type="button"
                        variant="outline"
                        onClick={() =>
                          patch(
                            "exit",
                            exit
                              ? null
                              : {
                                  type: "pressure",
                                  condition: "over",
                                  value: 4,
                                }
                          )
                        }
                      >
                        {exit ? "Remove exit condition" : "Add exit condition"}
                      </Action>
                      <Action
                        type="button"
                        variant="outline"
                        onClick={() =>
                          patch(
                            "limiter",
                            limiter ? null : { value: 4, range: 1 }
                          )
                        }
                      >
                        {limiter ? "Remove limiter" : "Add limiter"}
                      </Action>
                    </div>
                    {exit && (
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <EditorChoice
                          label={`Stage ${index + 1} exit measurement`}
                          value={exit.type}
                          options={["pressure", "flow"]}
                          onChange={(v) => patch("exit", { ...exit, type: v })}
                        />
                        <EditorChoice
                          label={`Stage ${index + 1} exit condition`}
                          value={exit.condition}
                          options={["over", "under"]}
                          onChange={(v) =>
                            patch("exit", { ...exit, condition: v })
                          }
                        />
                        {number(
                          `Stage ${index + 1} exit threshold`,
                          prefix + "exit.value",
                          exit.value,
                          (v) => patch("exit", { ...exit, value: v })
                        )}
                      </div>
                    )}
                    {limiter && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {number(
                          `Stage ${index + 1} ${item.pump === "pressure" ? "flow" : "pressure"} limit`,
                          prefix + "limiter.value",
                          limiter.value,
                          (v) => patch("limiter", { ...limiter, value: v })
                        )}
                        {number(
                          `Stage ${index + 1} limiter range`,
                          prefix + "limiter.range",
                          limiter.range,
                          (v) => patch("limiter", { ...limiter, range: v })
                        )}
                      </div>
                    )}
                  </section>
                )
              })}
              <Action
                type="button"
                variant="outline"
                className="my-5"
                disabled={p.steps.length >= 20}
                onClick={() => field("steps", [...p.steps, newStep()])}
              >
                Add stage
              </Action>
            </>
          )}
        </fieldset>
      </form>
      <section className="my-6" aria-label="Draft chart preview">
        <h2 className="mb-3 text-lg">Draft preview</h2>
        <Extraction
          s={{
            ...s,
            active: false,
            complete: false,
            preview: Object.keys(validateProfile(p)).length
              ? []
              : previewSamples(p),
          }}
          height={180}
        />
      </section>
      <section
        aria-label="Profile lineage"
        className="border-t border-border py-5"
      >
        <h2 className="mb-3 text-lg">Lineage and revert</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Restore into the draft for review, then save explicitly. Decaid
          identifies profiles by executable content, so a title-only copy cannot
          create a separate recipe.
        </p>
        {previous?.profile && (
          <Action
            disabled={editor.busy || !!editor.pending}
            variant="outline"
            onClick={() => editor.change(structuredClone(previous.profile!))}
          >
            Restore previous version to draft
          </Action>
        )}
        <ol className="divide-y divide-border">
          {editor.lineage.map((record) => (
            <li key={record.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p>{record.profile.title}</p>
                <p className="text-sm break-all text-muted-foreground">
                  {record.id}
                </p>
              </div>
              <Action
                disabled={editor.busy || !!editor.pending}
                variant="outline"
                onClick={() => editor.change(structuredClone(record.profile))}
              >
                Use version in draft
              </Action>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

export function ProfileEditorActions({ editor }: { editor: RecipeEditor }) {
  if (!editor.draft) return null
  const blocked = editor.busy || !!editor.pending
  return (
    <>
      <Action variant="outline" disabled={blocked} onClick={editor.cancel}>
        Cancel edits
      </Action>
      {editor.source && !editor.source.isDefault && (
        <Action
          variant="outline"
          disabled={blocked || editor.json !== null}
          onClick={() => editor.save("new")}
        >
          Save as new
        </Action>
      )}
      <Action
        type="submit"
        form="profile-edit-form"
        disabled={blocked || editor.json !== null || !editor.dirty}
      >
        {editor.busy
          ? "Saving…"
          : editor.source?.isDefault || !editor.source
            ? "Save as new"
            : "Save profile"}
      </Action>
    </>
  )
}
