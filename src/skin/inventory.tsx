import { useState } from "react"
import type { InventoryKind, InventoryRecord } from "@/gateway/recipes"
import { Action } from "./primitives"
import { PageHint, SearchField } from "./pages"
import { EditorChoice, EditorField } from "./editor-fields"
import { ConfirmAction, SettingSelect } from "./settings-controls"
import type { Catalog } from "./use-catalog"
import type { SkinSession } from "./use-skin"

type Field = [
  string,
  string,
  "text" | "number" | "date" | "list" | "boolean" | "notes" | "integer-list",
]
const fields: Record<InventoryKind, Field[]> = {
  beans: [
    ["name", "Coffee name", "text"],
    ["roaster", "Roaster", "text"],
    ["species", "Species", "text"],
    ["decaf", "Decaffeinated", "boolean"],
    ["decafProcess", "Decaf process", "text"],
    ["country", "Country", "text"],
    ["region", "Region", "text"],
    ["producer", "Producer", "text"],
    ["variety", "Varieties (comma separated)", "list"],
    ["altitude", "Altitude range (metres, comma separated)", "integer-list"],
    ["processing", "Processing", "text"],
    ["notes", "Coffee notes", "notes"],
  ],
  "bean-batches": [
    ["roastDate", "Roast date", "date"],
    ["roastLevel", "Roast level", "text"],
    ["harvestDate", "Harvest season", "text"],
    ["weight", "Batch weight (g)", "number"],
    ["weightRemaining", "Remaining weight (g)", "number"],
    ["qualityScore", "Quality score", "number"],
    ["price", "Price", "number"],
    ["currency", "Currency", "text"],
    ["buyDate", "Purchase date", "date"],
    ["openDate", "Opened date", "date"],
    ["bestBeforeDate", "Best before", "date"],
    ["freezeDate", "Frozen date", "date"],
    ["unfreezeDate", "Thawed date", "date"],
    ["frozen", "Frozen", "boolean"],
    ["notes", "Batch notes", "notes"],
  ],
  grinders: [
    ["model", "Grinder model", "text"],
    ["burrs", "Burrs", "text"],
    ["burrSize", "Burr size (mm)", "number"],
    ["burrType", "Burr type", "text"],
    ["settingValues", "Preset settings (comma separated)", "list"],
    ["settingSmallStep", "Small setting step", "number"],
    ["settingBigStep", "Large setting step", "number"],
    ["rpmSmallStep", "Small RPM step", "number"],
    ["rpmBigStep", "Large RPM step", "number"],
    ["notes", "Grinder notes", "notes"],
  ],
}
const labels: Record<InventoryKind, string> = {
  beans: "Beans",
  "bean-batches": "Roast batches",
  grinders: "Grinder records",
}
export function InventoryPage({
  catalog: c,
  s,
}: {
  catalog: Catalog
  s: SkinSession
}) {
  const [tab, setTab] = useState<InventoryKind>("beans")
  const [query, setQuery] = useState("")
  const [archived, setArchived] = useState(false)
  const [confirm, setConfirm] = useState<{
    kind: InventoryKind
    record: InventoryRecord
  } | null>(null)
  const name = (kind: InventoryKind, r: InventoryRecord) =>
    kind === "beans"
      ? `${r.name} · ${r.roaster}`
      : kind === "grinders"
        ? r.model
        : `${c.data?.beans.find((b) => b.id === r.beanId)?.name ?? "Unavailable bean"} · ${String(r.roastDate ?? "Undated").slice(0, 10)}`
  return (
    <>
      <PageHint>
        Keep coffee, roast batches and equipment records with your recipe.
        Grinder records are separate from connected devices. Archiving preserves
        historical shot context.
      </PageHint>
      {!c.data && (
        <>
          <PageHint>
            {c.busy ? "Loading inventory…" : "Inventory unavailable."}
          </PageHint>
          <Action disabled={c.busy} onClick={c.refresh}>
            Retry inventory
          </Action>
        </>
      )}
      {c.draft ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void c.save()
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              e.currentTarget.requestSubmit()
            }
          }}
        >
          <h2 className="mb-5 text-lg">
            {c.record ? "Edit" : "New"} {labels[c.kind].toLowerCase()}
          </h2>
          <fieldset
            disabled={c.busy}
            className="grid min-w-0 grid-cols-2 gap-4"
          >
            {c.kind === "bean-batches" && !c.record && (
              <div className="col-span-2">
                <label className="mb-2 block text-sm" htmlFor="batch-bean">
                  Bean
                </label>
                <SettingSelect
                  id="batch-bean"
                  label="Batch bean"
                  value={c.beanId}
                  onChange={c.setBeanId}
                  options={[
                    { label: "Choose a bean", value: "" },
                    ...(c.data?.beans
                      .filter((b) => !b.archived)
                      .map((b) => ({
                        label: `${b.name} · ${b.roaster}`,
                        value: b.id,
                      })) ?? []),
                  ]}
                />
              </div>
            )}
            {c.kind === "grinders" && (
              <EditorChoice
                label="Setting type"
                value={c.draft.settingType ?? "numeric"}
                options={["numeric", "preset"]}
                onChange={(v) => c.change("settingType", v)}
              />
            )}
            {fields[c.kind]
              .filter(([key]) => key !== "weightRemaining" || c.record)
              .map(([key, label, type]) => {
                const value = c.draft![key]
                if (type === "boolean")
                  return (
                    <EditorChoice
                      key={key}
                      label={label}
                      value={value ? "Yes" : "No"}
                      options={["No", "Yes"]}
                      onChange={(v) => c.change(key, v === "Yes")}
                    />
                  )
                return (
                  <EditorField
                    key={key}
                    label={label}
                    multiline={type === "notes"}
                    type={type === "number" || type === "date" ? type : "text"}
                    value={
                      Array.isArray(value)
                        ? value.join(", ")
                        : type === "date"
                          ? String(value ?? "").slice(0, 10)
                          : value
                    }
                    required={
                      key === "name" || key === "roaster" || key === "model"
                    }
                    onChange={(v) =>
                      c.change(
                        key,
                        type === "number"
                          ? v === ""
                            ? null
                            : Number(v)
                          : type === "list" || type === "integer-list"
                            ? v
                            : v || null
                      )
                    }
                  />
                )
              })}
          </fieldset>
          <div className="my-5 flex gap-3">
            <Action type="submit" disabled={c.busy || !c.dirty}>
              {c.busy ? "Saving…" : "Save record"}
            </Action>
            <Action
              type="button"
              variant="outline"
              disabled={c.busy}
              onClick={c.cancelInventory}
            >
              Close editor
            </Action>
          </div>
        </form>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            {(Object.keys(labels) as InventoryKind[]).map((kind) => (
              <Action
                key={kind}
                variant="outline"
                aria-pressed={tab === kind}
                onClick={() => setTab(kind)}
              >
                {labels[kind]}
              </Action>
            ))}
          </div>
          <div className="mb-5 flex items-end gap-3">
            <SearchField
              label="Search inventory"
              value={query}
              onChange={setQuery}
            />
            <Action
              variant="outline"
              aria-pressed={archived}
              onClick={() => setArchived(!archived)}
            >
              {archived ? "Show active" : "Show archived"}
            </Action>
            <Action
              disabled={c.busy || !c.data}
              onClick={() => c.edit(tab, null)}
            >
              Add{" "}
              {tab === "beans"
                ? "bean"
                : tab === "grinders"
                  ? "grinder"
                  : "batch"}
            </Action>
            <Action variant="outline" disabled={c.busy} onClick={c.refresh}>
              Refresh
            </Action>
          </div>
          <div className="mb-5 border-y border-border py-4 text-sm">
            <p>
              Current coffee:{" "}
              {String(
                s.snapshot.workflow?.context?.coffeeName ?? "Not selected"
              )}
            </p>
            <p className="mt-2">
              Current grinder record:{" "}
              {String(
                s.snapshot.workflow?.context?.grinderModel ?? "Not selected"
              )}
            </p>
            <div className="mt-3 flex gap-3">
              <Action
                variant="outline"
                disabled={c.busy || s.profileLocked}
                onClick={() => c.assign("bean-batches", null)}
              >
                Clear coffee selection
              </Action>
              <Action
                variant="outline"
                disabled={c.busy || s.profileLocked}
                onClick={() => c.assign("grinders", null)}
              >
                Clear grinder selection
              </Action>
            </div>
          </div>
          <div className="divide-y divide-border">
            {c.data?.[tab]
              .filter(
                (r) =>
                  !!r.archived === archived &&
                  String(name(tab, r))
                    .toLowerCase()
                    .includes(query.toLowerCase())
              )
              .map((record) => (
                <div
                  key={record.id}
                  role="group"
                  aria-label={String(name(tab, record))}
                  className="flex items-center gap-3 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{name(tab, record)}</p>
                    <p className="mt-2 text-xs break-all text-muted-foreground">
                      {record.id}
                      {tab === "bean-batches" && record.weight != null
                        ? ` · ${record.weight} g`
                        : ""}
                    </p>
                  </div>
                  <Action
                    disabled={c.busy}
                    variant="outline"
                    onClick={() => c.edit(tab, record)}
                  >
                    Edit record
                  </Action>
                  <Action
                    disabled={c.busy}
                    variant="outline"
                    onClick={() => setConfirm({ kind: tab, record })}
                  >
                    {record.archived ? "Restore" : "Archive"}
                  </Action>
                  {tab !== "beans" && (
                    <Action
                      disabled={c.busy || !!record.archived || s.profileLocked}
                      onClick={() => c.assign(tab, record.id)}
                    >
                      Use in recipe
                    </Action>
                  )}
                </div>
              ))}
          </div>
          {c.data &&
            !c.data[tab].some(
              (r) =>
                !!r.archived === archived &&
                String(name(tab, r)).toLowerCase().includes(query.toLowerCase())
            ) && <PageHint>No matching records.</PageHint>}
        </>
      )}
      {confirm && (
        <ConfirmAction
          title={
            confirm.record.archived ? "Restore record?" : "Archive record?"
          }
          description="Existing workflow selections and historical shots retain their recorded context."
          cancel={() => setConfirm(null)}
          confirm={async () => {
            await c.archive(confirm.kind, confirm.record)
            setConfirm(null)
          }}
        />
      )}
    </>
  )
}
export function RecipePreferences({ catalog: c }: { catalog: Catalog }) {
  const p = c.preference
  return (
    <>
      <PageHint>
        Saved adjustments apply when you load this profile. Blank fields use the
        profile target; a blank dose stays Not set. A blank grind retains the
        current setting. These preferences never move a connected grinder.
      </PageHint>
      {!p ? (
        <PageHint>
          {c.busy
            ? "Loading recipe preferences…"
            : "Recipe preferences unavailable. Reopen this page to retry."}
        </PageHint>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void c.savePreference()
          }}
        >
          <div className="mb-5 flex items-center gap-4">
            <Action
              type="button"
              variant="outline"
              disabled={c.busy}
              onClick={c.copyStreamline}
            >
              Copy from Streamline
            </Action>
            <p className="text-sm text-muted-foreground">
              Read this profile’s saved Home adjustments from the same Decaid
              installation, then review and save below.
            </p>
          </div>
          <fieldset disabled={c.busy} className="grid grid-cols-2 gap-4">
            {[
              ["targetDoseWeight", "Dose (g)"],
              ["targetYield", "Target yield (g)"],
              ["temperature", "First-stage temperature (°C)"],
              ["grinderSetting", "Grind setting"],
            ].map(([key, label]) => (
              <EditorField
                key={key}
                label={label}
                type={key === "grinderSetting" ? "text" : "number"}
                value={p[key]}
                onChange={(v) => {
                  const next = { ...p }
                  if (v === "") delete next[key]
                  else next[key] = key === "grinderSetting" ? v : Number(v)
                  c.setPreference(next)
                }}
              />
            ))}
          </fieldset>
          <div className="mt-5 flex gap-3">
            <Action type="submit" disabled={c.busy || !c.preferenceDirty}>
              Save recipe preferences
            </Action>
            <Action
              type="button"
              variant="outline"
              disabled={c.busy}
              onClick={c.cancelPreference}
            >
              Cancel preferences
            </Action>
          </div>
        </form>
      )}
    </>
  )
}
