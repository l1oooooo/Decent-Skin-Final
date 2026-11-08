import { NotificationMessage } from "./notifications/feedback"
import { useEffect, useEffectEvent, useState } from "react"
import { asData } from "@/gateway/advanced"
import { pluginLaunch, type Plugin } from "@/gateway/extensions"
import { settingsBlock } from "@/gateway/daily-settings"
import type { SkinSession } from "./use-skin"
import type { ExtensionsState } from "./use-extensions"
import type { Route } from "./navigation"
import { Action } from "./primitives"
import { PageHint } from "./pages"
import { EditorField, EditorChoice } from "./editor-fields"
import { ConfirmAction, SettingInput, inputClass } from "./settings-controls"
import { Section, Facts, shown, type Ask } from "./advanced-shared"
import { HelpPage } from "./help"
export function ExtensionsPage({
  s,
  h,
  route,
  navigate,
}: {
  s: SkinSession
  h: ExtensionsState
  route: Route
  navigate: (r: Route) => void
}) {
  function refresh() {
    if (route.category === "extensions") {
      void h.read("plugins")
      if (route.plugin) void h.read(`plugin:${route.plugin}`)
    } else
      for (const path of ["info", "settings", "account/decent"])
        void h.read(path)
  }
  const load = useEffectEvent(refresh)
  useEffect(() => {
    load()
  }, [route.category, route.plugin, s.snapshot.connection])
  const [confirmation, setConfirmation] = useState<{
    title: string
    description: string
    action: () => Promise<unknown>
  } | null>(null)
  const ask: Ask = (title, description, action) =>
    setConfirmation({ title, description, action })
  const reason = settingsBlock(s.gateway),
    blocked = !!h.busy || !!reason
  return (
    <div className="mt-6">
      <Action variant="outline" disabled={!!h.busy} onClick={refresh}>
        Refresh{" "}
        {route.category === "extensions" ? "extensions" : "system status"}
      </Action>
      {Object.values(h.loading).some(Boolean) && (
        <PageHint>Reading the current gateway data…</PageHint>
      )}
      {reason && <PageHint>{reason}</PageHint>}
      {Object.entries(h.errors)
        .filter(
          ([key, error]) =>
            error &&
            (route.category === "extensions"
              ? key === "plugins" || key === `plugin:${route.plugin}`
              : !key.startsWith("plugin"))
        )
        .map(([key, error]) => (
          <NotificationMessage
            notificationKey={`extension-read-${key}`}
            key={key}
            error
          >
            {key}: {error} Refresh this section to retry; unavailable endpoints
            are not replaced with sample data.
          </NotificationMessage>
        ))}
      {route.category === "extensions" ? (
        <PluginArea
          h={h}
          blocked={blocked}
          ask={ask}
          selected={route.plugin}
          navigate={navigate}
        />
      ) : (
        <HelpPage s={s} h={h} blocked={blocked} ask={ask} navigate={navigate} />
      )}
      {confirmation && (
        <ConfirmAction
          title={confirmation.title}
          description={confirmation.description}
          cancel={() => setConfirmation(null)}
          confirm={() => {
            const action = confirmation.action
            setConfirmation(null)
            void action()
          }}
        />
      )}
    </div>
  )
}
function PluginArea({
  h,
  blocked,
  ask,
  selected,
  navigate,
}: {
  h: ExtensionsState
  blocked: boolean
  ask: Ask
  selected?: string
  navigate: (r: Route) => void
}) {
  const plugin = h.plugins?.find((p) => p.id === selected)
  const pluginDirty = Object.entries(h.drafts).some(
    ([k, v]) => k.startsWith("plugin:") && Object.keys(v).length
  )
  async function mutate(
    p: Plugin,
    action: "enable" | "disable" | "remove" | "approve"
  ) {
    await h.run("Updating plugin", async () => {
      try {
        await h.api.action(p, action)
        h.setMessage(
          "Plugin operation acknowledged. Review its returned state."
        )
      } finally {
        await h.read("plugins")
      }
    })
  }
  let launch: string | null = null,
    launchError = ""
  if (plugin)
    try {
      launch = pluginLaunch(plugin, h.api.gateway.origin, location.href)
    } catch (e) {
      launchError = String((e as Error).message)
    }
  return (
    <>
      <PageHint>
        DYE2, shot upload, Home Assistant, assisted dial-in and other extensions
        appear when installed. Select an extension to review its settings,
        permissions and update status. Running plugins with their own page can
        open in a separate tab.
      </PageHint>
      <div className="mt-4 flex flex-wrap gap-3">
        {selected && (
          <Action
            variant="outline"
            onClick={() =>
              navigate({ page: "settings", category: "extensions" })
            }
          >
            All extensions
          </Action>
        )}
        <Action
          disabled={blocked || pluginDirty || !h.plugins || !!h.errors.plugins}
          onClick={() =>
            ask(
              "Check and install plugin updates?",
              "Decaid installs managed updates that need no new permissions. Added permissions require separate approval. Some updates can succeed even if others fail; review each plugin’s result.",
              () =>
                h.run("Checking and installing plugin updates", async () => {
                  try {
                    await h.api.mutate("/api/v1/plugins/update")
                    h.setMessage(
                      "Update pass completed. Review installed versions, pending permissions and source errors below."
                    )
                  } finally {
                    await h.read("plugins")
                  }
                })
            )
          }
        >
          Check and install plugin updates
        </Action>
      </div>
      {pluginDirty && (
        <PageHint>
          Save or cancel plugin drafts before enabling, removing or updating
          plugins.
        </PageHint>
      )}
      {!h.plugins && !h.errors.plugins && (
        <PageHint>Loading installed extensions…</PageHint>
      )}
      {h.plugins?.length === 0 && (
        <PageHint>No plugins are installed.</PageHint>
      )}
      {selected && !plugin && h.plugins && (
        <NotificationMessage notificationKey={`extensions-200`} error>
          This plugin is no longer installed. Its unsaved settings are retained
          until you cancel them.
        </NotificationMessage>
      )}
      {(selected ? (plugin ? [plugin] : []) : (h.plugins ?? [])).map((p) => (
        <Section key={p.id} title={p.name}>
          <p className="text-sm break-words text-muted-foreground">
            {String(p.description ?? "No description supplied.")}
          </p>
          <Facts
            data={{
              Version: p.version,
              Runtime: p.loaded ? "Running" : "Stopped",
              "Load at startup": p.autoLoad ? "Enabled" : "Disabled",
              ID: p.id,
              Source: asData(p.source).repo ?? "Bundled or unmanaged",
              "Last checked": asData(p.source).lastChecked,
            }}
          />
          {!!asData(p.source).lastError && (
            <NotificationMessage notificationKey={`extensions-221`} error>
              {String(asData(p.source).lastError)}
            </NotificationMessage>
          )}
          <p className="my-3 text-sm break-words text-muted-foreground">
            Permissions: {p.permissions.join(", ") || "None declared"}
          </p>
          {p.pendingUpdate != null && (
            <PageHint>
              Pending version {shown(asData(p.pendingUpdate).version)} · Added
              permissions:{" "}
              {Array.isArray(asData(p.pendingUpdate).addedPermissions)
                ? (asData(p.pendingUpdate).addedPermissions as unknown[]).join(
                    ", "
                  )
                : "Unavailable; refresh before approval"}
            </PageHint>
          )}
          <div className="flex flex-wrap gap-3">
            {!selected && (
              <Action
                variant="outline"
                onClick={() =>
                  navigate({
                    page: "settings",
                    category: "extensions",
                    plugin: p.id,
                  })
                }
              >
                Settings for {p.name}
              </Action>
            )}
            <Action
              disabled={blocked || pluginDirty || !!h.errors.plugins}
              onClick={() =>
                ask(
                  p.autoLoad || p.loaded
                    ? `Disable ${p.name}?`
                    : `Enable ${p.name}?`,
                  p.autoLoad || p.loaded
                    ? "Stops the plugin and disables startup loading. Its settings remain stored."
                    : "Runs this plugin with its declared permissions and enables startup loading. It may connect devices or external services according to its settings.",
                  () => mutate(p, p.autoLoad || p.loaded ? "disable" : "enable")
                )
              }
            >
              {p.autoLoad || p.loaded ? "Disable" : "Enable"} {p.name}
            </Action>
            {p.pendingUpdate != null && (
              <Action
                disabled={
                  blocked ||
                  pluginDirty ||
                  !!h.errors.plugins ||
                  !Array.isArray(asData(p.pendingUpdate).addedPermissions)
                }
                onClick={() =>
                  ask(
                    `Approve update for ${p.name}?`,
                    "This grants the added permissions listed for the pending version and installs that update. Review them before confirming.",
                    () => mutate(p, "approve")
                  )
                }
              >
                Approve pending update
              </Action>
            )}
            <Action
              variant="outline"
              disabled={blocked || pluginDirty || !!h.errors.plugins}
              onClick={() =>
                ask(
                  `Remove ${p.name}?`,
                  "Removes the plugin and its saved settings, including credentials. This cannot be undone here; reinstalling does not restore those settings.",
                  () => mutate(p, "remove")
                )
              }
            >
              Remove {p.name}
            </Action>
          </div>
        </Section>
      ))}
      {plugin && (
        <>
          {launchError && (
            <NotificationMessage notificationKey={`extensions-307`} error>
              {launchError}
            </NotificationMessage>
          )}
          {launch && !blocked && !h.errors.plugins && (
            <a
              href={launch}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-12 items-center rounded-lg border border-border px-5 text-sm"
            >
              Open {plugin.name}
            </a>
          )}
          {launch && (
            <PageHint>
              Opens a separate plugin-owned page. Return here using its Return
              link, or close that tab. Focus stays open with your drafts. No
              credentials are added to the link.
            </PageHint>
          )}
          <PluginSettings
            plugin={plugin}
            h={h}
            blocked={blocked || !!h.errors.plugins}
            ask={ask}
          />
        </>
      )}
      {!selected && (
        <PluginInstall h={h} blocked={blocked || pluginDirty} ask={ask} />
      )}
      {selected &&
        !plugin &&
        Object.keys(h.drafts[`plugin:${selected}`] ?? {}).length > 0 && (
          <Action onClick={() => h.clear(`plugin:${selected}`)}>
            Cancel missing plugin edits
          </Action>
        )}
    </>
  )
}
function PluginSettings({
  plugin,
  h,
  blocked,
  ask,
}: {
  plugin: Plugin
  h: ExtensionsState
  blocked: boolean
  ask: Ask
}) {
  const key = `plugin:${plugin.id}`,
    draft = h.drafts[key] ?? {},
    saved = h.values[key]
  const fields = Object.entries(plugin.settings).filter(
    ([, f]) => f.hidden !== true
  )
  return (
    <Section title="Plugin settings">
      <PageHint>
        Only changed settings are saved. Hidden and unsupported fields stay
        untouched. Saving may reload a running plugin.
      </PageHint>
      {!saved && (
        <PageHint>Settings have not loaded. Refresh before editing.</PageHint>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(
            `Save ${plugin.name} settings?`,
            "Apply the changed fields to this plugin. Credentials go only to your configured Decaid gateway; the plugin may use them with its configured services.",
            () => h.save(plugin)
          )
        }}
      >
        <fieldset disabled={blocked || !saved || !!h.errors[key]}>
          {fields.map(([name, field]) => {
            const label = String(field.label || name),
              edited = Object.hasOwn(draft, name)
            const value = edited
              ? draft[name]
              : (saved?.[name] ?? field.default)
            if (
              !["string", "boolean", "enum", "number"].includes(
                String(field.type)
              ) ||
              (field.secure === true && field.type !== "string")
            )
              return (
                <PageHint key={name}>
                  {label}: this declaration is not supported here. Use the
                  plugin’s own UI or native Decaid.
                </PageHint>
              )
            if (field.secure === true)
              return (
                <div key={name} className="border-b border-border py-4">
                  <label
                    htmlFor={`secret-${name}`}
                    className="mb-2 block text-sm"
                  >
                    {label}
                  </label>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {asData(saved?.[name]).isSet === true
                      ? "Credential stored; its value is never returned."
                      : asData(saved?.[name]).isSet === false
                        ? "No credential stored."
                        : "Credential status unavailable."}{" "}
                    {String(field.description ?? "")} Leave unchanged to
                    preserve it.
                  </p>
                  <input
                    id={`secret-${name}`}
                    className={inputClass}
                    type="password"
                    autoComplete="new-password"
                    value={
                      edited && draft[name] !== null ? String(draft[name]) : ""
                    }
                    onChange={(e) => h.change(key, name, e.target.value)}
                  />
                  <Action
                    className="mt-3"
                    type="button"
                    variant="outline"
                    onClick={() => h.change(key, name, null)}
                  >
                    Clear {label} on Save
                  </Action>
                  {edited && draft[name] === null && (
                    <PageHint>Will remove this credential on Save.</PageHint>
                  )}
                </div>
              )
            if (field.type === "string" || field.type === "number")
              return (
                <div key={name} className="border-b border-border py-4">
                  <EditorField
                    label={label}
                    type={field.type === "number" ? "number" : "text"}
                    value={value ?? ""}
                    help={String(field.description ?? "")}
                    onChange={(v) => h.change(key, name, v)}
                  />
                </div>
              )
            return (
              <SettingInput
                key={name}
                field={{
                  key: name,
                  label,
                  kind:
                    field.type === "enum"
                      ? "select"
                      : (field.type as "number" | "boolean"),
                  help: String(field.description ?? ""),
                  options: Array.isArray(field.values)
                    ? field.values
                        .filter((v): v is string => typeof v === "string")
                        .map((v) => ({ label: v, value: v }))
                    : [],
                }}
                value={value ?? (field.type === "boolean" ? false : "")}
                onChange={(v) => h.change(key, name, v)}
              />
            )
          })}
        </fieldset>
        {!fields.length && (
          <PageHint>
            No settings are exposed by this manifest. Use its declared UI when
            available.
          </PageHint>
        )}
        <div className="mt-4 flex gap-3">
          <Action
            type="submit"
            disabled={
              blocked || !saved || !!h.errors[key] || !Object.keys(draft).length
            }
          >
            Save plugin settings
          </Action>
          <Action
            type="button"
            variant="outline"
            disabled={!!h.busy}
            onClick={() => h.clear(key)}
          >
            Cancel plugin edits
          </Action>
        </div>
      </form>
    </Section>
  )
}
function PluginInstall({
  h,
  blocked,
  ask,
}: {
  h: ExtensionsState
  blocked: boolean
  ask: Ask
}) {
  const d = h.drafts.pluginInstall ?? {},
    source = String(d.source ?? "github-release")
  return (
    <Section title="Install an extension">
      <PageHint>
        Install only from a repository you trust. Plugins can request device,
        network and account access and may run after installation. Local
        ZIP/folder installs use native Decaid; arbitrary URL installation is
        unsupported.
      </PageHint>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(
            "Install this plugin?",
            `Download ${String(d.repo ?? "")} from GitHub and let Decaid install its declared code and permissions. Review the returned runtime state afterward.`,
            () =>
              h.run("Installing plugin", async () => {
                const submitted = { ...d, source }
                try {
                  const result = asData(await h.api.install(submitted))
                  if (typeof result.id !== "string")
                    throw new Error(
                      "Installation result is unknown. Refresh inventory before retrying."
                    )
                  h.acknowledge("pluginInstall", d)
                  h.setMessage(
                    `Installed ${result.id}. Review its permissions and running state.`
                  )
                } finally {
                  await h.read("plugins")
                }
              })
          )
        }}
      >
        <fieldset disabled={!!h.busy} className="grid grid-cols-2 gap-4">
          <EditorChoice
            label="Plugin source"
            value={source}
            options={["github-release", "github-branch"]}
            onChange={(v) => h.change("pluginInstall", "source", v)}
          />
          <EditorField
            label="Plugin GitHub owner/repository"
            value={d.repo ?? ""}
            onChange={(v) => h.change("pluginInstall", "repo", v)}
            required
          />
          <EditorField
            label={
              source === "github-branch"
                ? "Plugin branch"
                : "Release asset name (optional)"
            }
            value={
              source === "github-branch"
                ? (d.branch ?? "main")
                : (d.assetName ?? "")
            }
            onChange={(v) =>
              h.change(
                "pluginInstall",
                source === "github-branch" ? "branch" : "assetName",
                v
              )
            }
          />
        </fieldset>
        <div className="mt-4 flex gap-3">
          <Action type="submit" disabled={blocked}>
            Install plugin
          </Action>
          <Action
            type="button"
            variant="outline"
            disabled={!!h.busy}
            onClick={() => h.clear("pluginInstall")}
          >
            Cancel installation choices
          </Action>
        </div>
      </form>
    </Section>
  )
}
