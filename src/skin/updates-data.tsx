import { NotificationMessage } from "./notifications/feedback"
import { useState, useEffect, useEffectEvent } from "react"
import {
  asData,
  dataSections,
  transferRows,
  type Data,
} from "@/gateway/advanced"
import type { Advanced } from "./use-advanced"
import { Action } from "./primitives"
import { EditorField, EditorChoice } from "./editor-fields"
import { PageHint } from "./pages"
import { Section, Facts, Prepared, shown, type Ask } from "./advanced-shared"
import type { SkinSession } from "./use-skin"
import { finite } from "@/gateway/model"
export function Updates({
  s,
  h,
  blocked,
  ask,
}: {
  s: SkinSession
  h: Advanced
  blocked: boolean
  ask: Ask
}) {
  const [tab, setTab] = useState("Machine firmware")
  const catalog = asData(h.values["machine/firmware"]),
    app = asData(h.values.update),
    skins = Array.isArray(h.values["webui/skins"])
      ? h.values["webui/skins"].map(asData)
      : []
  const poll = useEffectEvent(() => {
    if (tab === "Decaid app") void h.read("update")
  })
  useEffect(() => {
    if (tab !== "Decaid app") return
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [tab])
  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const draft = h.drafts.transfer ?? {},
    sections = Array.isArray(draft.sections)
      ? (draft.sections as string[])
      : ["profiles", "shots", "beans", "grinders"],
    conflict = String(draft.conflict ?? "skip")
  const result = asData(h.result),
    rows = h.result ? transferRows(h.result) : []
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-3">
        {["Machine firmware", "Decaid app", "Skins", "Backup and transfer"].map(
          (name) => (
            <Action
              key={name}
              variant={tab === name ? "default" : "outline"}
              onClick={() => setTab(name)}
            >
              {name}
            </Action>
          )
        )}
      </div>
      {tab === "Machine firmware" && (
        <Section title="Machine firmware">
          <p className="mb-4 text-sm text-muted-foreground">
            Use stable power and keep Decaid connected. Only applicable catalog
            artifacts can be installed. Upload progress is not verification. A
            lost stream leaves the result unknown until the machine is
            inspected.
          </p>
          <Facts
            data={{
              "Connected model": asData(catalog.machine).model,
              "Installed build": asData(catalog.machine).build,
              "Device update state": asData(catalog.operation).state,
              "Stream state": h.firmware.status,
              "Upload progress": finite(h.firmware.progress)
                ? `${Math.round(h.firmware.progress * 100)}%`
                : undefined,
            }}
          />
          {Array.isArray(catalog.artifacts) ? (
            catalog.artifacts.map(asData).map((artifact) => (
              <div
                key={String(artifact.id)}
                className="flex items-center justify-between gap-4 border-t border-border py-4"
              >
                <div className="min-w-0">
                  <h3 className="break-words">
                    {shown(artifact.id)} · build {shown(artifact.build)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {shown(asData(artifact.eligibility).status)} ·{" "}
                    {Array.isArray(asData(artifact.eligibility).reasons)
                      ? (
                          asData(artifact.eligibility).reasons as unknown[]
                        ).join(", ")
                      : ""}
                  </p>
                </div>
                <Action
                  disabled={
                    blocked ||
                    !!h.errors["machine/firmware"] ||
                    asData(artifact.eligibility).status !== "applicable" ||
                    asData(catalog.operation).state !== "idle"
                  }
                  onClick={() =>
                    ask(
                      "Install machine firmware?",
                      `Install ${artifact.id} on ${shown(asData(catalog.machine).model)}. Keep power and connectivity stable.`,
                      () =>
                        h.run("Updating machine firmware", async (signal) => {
                          h.setFirmware({})
                          await h.api.firmware(
                            String(artifact.id),
                            h.identity,
                            h.setFirmware,
                            signal
                          )
                          h.setMessage(
                            "Decaid reported verified firmware completion. Refresh the installed build after the machine reconnects."
                          )
                          await h.read("machine/firmware")
                        })
                    )
                  }
                >
                  Install firmware
                </Action>
              </div>
            ))
          ) : (
            <PageHint>Firmware catalog unavailable. Refresh to retry.</PageHint>
          )}
          <Action
            className="mt-4"
            variant="outline"
            disabled={
              !h.busy.includes("firmware") &&
              !["erasing", "uploading", "verifying", "cancelling"].includes(
                String(asData(catalog.operation).state)
              )
            }
            onClick={() => h.cancel("firmware")}
          >
            Cancel firmware update
          </Action>
        </Section>
      )}
      {tab === "Decaid app" && (
        <Section title="Decaid application update">
          <Facts
            data={{
              "Running Decaid": app.currentVersion,
              "Offered version": app.latestVersion,
              Phase: app.phase,
              "Installable here": app.installable,
              "Download progress": finite(app.progress)
                ? `${Math.round(app.progress * 100)}%`
                : undefined,
            }}
          />
          {!!app.error && (
            <NotificationMessage notificationKey={`updates-data-173`} error>
              {String(app.error)}
            </NotificationMessage>
          )}
          <p className="mb-4 text-sm whitespace-pre-wrap text-muted-foreground">
            {shown(app.releaseNotes)}
          </p>
          <div className="flex gap-3">
            <Action
              variant="outline"
              disabled={
                !!h.busy ||
                ["checking", "downloading", "installing"].includes(
                  String(app.phase)
                )
              }
              onClick={() =>
                h.run("Checking Decaid update", async () => {
                  await s.gateway.appUpdateCommand("check")
                  await h.read("update")
                  h.setMessage(
                    "Check requested. The returned app status is shown above."
                  )
                })
              }
            >
              Check Decaid update
            </Action>
            <Action
              disabled={
                !!h.busy ||
                app.installable !== true ||
                app.phase !== "available"
              }
              onClick={() =>
                ask(
                  "Install the Decaid app update?",
                  "The native Android installer may require your action. The skin cannot confirm installation from download progress; reopen and check the running version afterward.",
                  () =>
                    h.run("Requesting Decaid install", async () => {
                      await s.gateway.appUpdateCommand("install")
                      await h.read("update")
                      h.setMessage(
                        "Install requested. Complete any native prompts, then verify the running version."
                      )
                    })
                )
              }
            >
              Install Decaid update
            </Action>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Native installation and OS permissions remain in Decaid. This
            operation does not install machine firmware or change skins.
          </p>
          {typeof app.releaseUrl === "string" &&
            /^https:\/\//.test(app.releaseUrl) && (
              <a
                className="mt-3 inline-flex min-h-12 items-center underline"
                href={app.releaseUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open official app release
              </a>
            )}
        </Section>
      )}
      {tab === "Skins" && (
        <Section title="Installed skins">
          <p className="mb-4 text-sm text-muted-foreground">
            Updating skins installs available updates from their recorded
            sources. It can partially succeed. This page keeps its current host,
            port and path; reload only after reviewing the outcome.
          </p>
          <Facts
            data={{
              "Default skin": asData(h.values["webui/skins/default"]).name,
            }}
          />
          {skins.map((skin) => (
            <div
              key={String(skin.id)}
              className="flex items-center justify-between gap-4 border-t border-border py-4"
            >
              <div className="min-w-0">
                <p className="break-words">
                  {shown(skin.name)} · {shown(skin.version)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {skin.isBundled ? "Bundled" : "Installed"} ·{" "}
                  {shown(asData(skin.reaMetadata).sourceUrl)}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <Action
                  variant="outline"
                  disabled={!!h.busy}
                  onClick={() =>
                    ask(
                      "Set the default skin?",
                      `Use ${skin.name} on the next skin entry. This page will stay open.`,
                      () =>
                        h.run("Setting default skin", async () => {
                          const value = asData(
                            await h.api.skin("/default", "PUT", {
                              skinId: skin.id,
                            })
                          )
                          if (value.success !== true)
                            throw new Error(
                              "Default skin was not acknowledged."
                            )
                          await h.read("webui/skins/default")
                          h.setMessage(
                            "Default skin saved. The current preview remains open."
                          )
                        })
                    )
                  }
                >
                  Set default
                </Action>
                <Action
                  variant="outline"
                  disabled={
                    !!h.busy ||
                    skin.isBundled === true ||
                    skin.id === "decent-skin-codex"
                  }
                  onClick={() =>
                    ask(
                      "Uninstall this skin?",
                      `Permanently remove ${skin.name}. Bundled skins and this Focus skin cannot be removed here.`,
                      () =>
                        h.run("Removing skin", async () => {
                          const value = asData(
                            await h.api.skin(
                              `/${encodeURIComponent(String(skin.id))}`,
                              "DELETE"
                            )
                          )
                          if (value.success !== true)
                            throw new Error(
                              "Skin removal was not acknowledged."
                            )
                          await h.read("webui/skins")
                          h.setMessage("Skin removed.")
                        })
                    )
                  }
                >
                  Uninstall
                </Action>
              </div>
            </div>
          ))}
          <div className="mt-4 flex gap-3">
            <Action
              disabled={!!h.busy}
              onClick={() =>
                ask(
                  "Update installed skins?",
                  "Decaid will check remote sources and immediately install available updates. Successful updates remain if another skin fails. Export a backup first if needed.",
                  () =>
                    h.run("Updating installed skins", async () => {
                      try {
                        await h.api.skin("/update", "POST")
                        h.setMessage(
                          "Skin update request completed. Review installed versions, then reload this page if Focus changed."
                        )
                      } finally {
                        await h.read("webui/skins")
                      }
                    })
                )
              }
            >
              Check and install skin updates
            </Action>
            <Action
              variant="outline"
              disabled={!!h.busy || h.dirty}
              onClick={() => location.reload()}
            >
              Reload current skin
            </Action>
          </div>
          <SkinInstall h={h} ask={ask} />
        </Section>
      )}
      {tab === "Backup and transfer" && (
        <Section title="Backup and data transfer">
          <p className="mb-4 text-sm text-muted-foreground">
            Backups contain all persistent Decaid sections. Browser downloads
            are limited to 128 MiB; use native Decaid data management for larger
            exports. The installed ZIP endpoint has no section selector; import
            processes sections present in the archive. Sync supports selected
            sections. Successful sections are never rolled back when another
            fails. A disconnected upload can have an unknown outcome; inspect
            before retrying.
          </p>
          <Action
            disabled={!!h.busy}
            variant="outline"
            onClick={() =>
              h.run("Exporting backup", async () => {
                download(await h.api.backup(), "decaid-backup.zip")
                h.setMessage(
                  "Backup download prepared. Verify the saved archive before relying on it."
                )
              })
            }
          >
            Export full backup
          </Action>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault()
              ask(
                "Import this Decaid backup?",
                `Import ${h.file?.name} with conflict policy ${conflict}. All recognized archive sections may change, including settings, workflow and device preferences.`,
                () =>
                  h.run("Importing backup", async () => {
                    if (!h.file) throw new Error("Choose a ZIP file.")
                    h.setResult(null)
                    h.setResult(await h.api.importBackup(h.file, conflict))
                    h.setFile(null)
                    h.setMessage(
                      `Import response received (${conflict} conflicts). Imported totals include replacements when overwrite is selected. Review every section below; changes are not transactional.`
                    )
                  })
              )
            }}
          >
            <label className="block text-sm text-muted-foreground">
              Backup ZIP
              <input
                aria-label="Backup ZIP"
                type="file"
                accept=".zip,application/zip"
                disabled={!!h.busy}
                className="mt-2 block min-h-12 w-full rounded-lg border border-input p-3 text-base"
                onChange={(e) => h.setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="mt-4">
              <EditorChoice
                label="Conflict policy"
                value={conflict}
                options={["skip", "overwrite"]}
                onChange={(v) => h.change("transfer", "conflict", v)}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Action disabled={!!h.busy || !h.file} type="submit">
                Import backup
              </Action>
              <Action
                disabled={!!h.busy}
                type="button"
                variant="outline"
                onClick={() => {
                  h.setFile(null)
                  h.clear("transfer")
                }}
              >
                Cancel transfer choices
              </Action>
            </div>
          </form>
          <form
            className="mt-6 border-t border-border pt-5"
            onSubmit={(e) => {
              e.preventDefault()
              ask(
                "Transfer data with another Decaid?",
                `${String(draft.mode ?? "pull")} with ${String(draft.target ?? "")}; sections: ${sections.join(", ")}; conflicts: ${conflict}. Two-way stops after an incomplete pull.`,
                () =>
                  h.run("Synchronizing data", async () => {
                    h.setResult(null)
                    h.setResult(
                      await h.api.sync(
                        String(draft.target ?? ""),
                        String(draft.mode ?? "pull"),
                        conflict,
                        sections
                      )
                    )
                    h.setMessage(
                      `Sync response received (${String(draft.mode ?? "pull")}, ${conflict} conflicts). Review phase and section results before retrying.`
                    )
                  })
              )
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <EditorField
                label="Other Decaid origin"
                type="url"
                value={draft.target ?? ""}
                onChange={(v) => h.change("transfer", "target", v)}
              />
              <EditorChoice
                label="Transfer direction"
                value={draft.mode ?? "pull"}
                options={["pull", "push", "two_way"]}
                onChange={(v) => h.change("transfer", "mode", v)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {dataSections.map((section) => (
                <Prepared
                  key={section}
                  label={`Transfer ${section}`}
                  value={sections.includes(section)}
                  onChange={(checked) =>
                    h.change(
                      "transfer",
                      "sections",
                      checked
                        ? [...sections, section]
                        : sections.filter((s) => s !== section)
                    )
                  }
                />
              ))}
            </div>
            <Action
              className="mt-4"
              type="submit"
              disabled={!!h.busy || !sections.length}
            >
              Start data sync
            </Action>
          </form>
          {h.result !== null && (
            <div className="mt-5">
              <h3 className="text-lg">Transfer outcomes</h3>
              <Facts
                data={{
                  Status:
                    result.status ??
                    (rows.some((r) => r.errors.length)
                      ? "partial / failed"
                      : "section results received"),
                  "Complete flag": result.complete,
                }}
              />
              {rows.map((row) => (
                <div key={row.section} className="border-t border-border py-3">
                  <p>
                    {row.section}: {row.imported} imported · {row.skipped}{" "}
                    skipped
                  </p>
                  {row.errors.map((e, i) => (
                    <NotificationMessage
                      notificationKey={`updates-data-${row.section}-error-${i}`}
                      error
                      key={i}
                    >
                      {e}
                    </NotificationMessage>
                  ))}
                  {row.warnings.map((w, i) => (
                    <NotificationMessage
                      notificationKey={`updates-data-${row.section}-warning-${i}`}
                      type="warning"
                      key={i}
                    >
                      {w}
                    </NotificationMessage>
                  ))}
                </div>
              ))}
              <details className="mt-4">
                <summary className="flex min-h-12 cursor-pointer items-center">
                  Full section and phase results
                </summary>
                <pre className="max-w-full overflow-auto rounded-lg bg-card p-4 text-sm break-words whitespace-pre-wrap">
                  {JSON.stringify(h.result, null, 2)}
                </pre>
              </details>
            </div>
          )}
          <PageHint>
            Legacy Decaid ZIPs without metadata are accepted by the server when
            they contain recognized sections. de1app/Tcl migration and
            unsupported legacy formats require Decaid’s native data-management
            flow; this skin does not reinterpret them.
          </PageHint>
        </Section>
      )}
    </>
  )
}
function SkinInstall({ h, ask }: { h: Advanced; ask: Ask }) {
  const d = h.drafts.skinInstall ?? {},
    source = String(d.source ?? "github-release")
  return (
    <form
      className="mt-6 border-t border-border pt-5"
      onSubmit={(e) => {
        e.preventDefault()
        ask(
          "Install a skin from this source?",
          "Decaid will download and install the specified skin. Use a source you trust. The current page stays on its existing origin.",
          () =>
            h.run("Installing skin", async () => {
              let body: Data
              if (source === "url") {
                const url = new URL(String(d.url))
                if (
                  !["http:", "https:"].includes(url.protocol) ||
                  url.username ||
                  url.password
                )
                  throw new Error("Use an HTTP(S) ZIP URL without credentials.")
                body = { url: url.href }
              } else {
                if (!/^[\w.-]+\/[\w.-]+$/.test(String(d.repo)))
                  throw new Error("Enter owner/repository.")
                body =
                  source === "github-branch"
                    ? { repo: d.repo, branch: d.branch || "main" }
                    : {
                        repo: d.repo,
                        ...(d.asset ? { asset: d.asset } : {}),
                        prerelease: false,
                      }
              }
              const result = asData(
                await h.api.skin(`/install/${source}`, "POST", body)
              )
              if (result.success !== true)
                throw new Error("Skin installation was not acknowledged.")
              h.clear("skinInstall")
              await h.read("webui/skins")
              h.setMessage(
                "Skin installed. Review its version before selecting it."
              )
            })
        )
      }}
    >
      <h3 className="mb-4 text-lg">Install a skin</h3>
      <fieldset disabled={!!h.busy} className="grid grid-cols-2 gap-4">
        <EditorChoice
          label="Skin source"
          value={source}
          options={["github-release", "github-branch", "url"]}
          onChange={(v) => h.change("skinInstall", "source", v)}
        />
        {source === "url" ? (
          <EditorField
            label="Skin ZIP URL"
            type="url"
            value={d.url ?? ""}
            onChange={(v) => h.change("skinInstall", "url", v)}
          />
        ) : (
          <>
            <EditorField
              label="GitHub owner/repository"
              value={d.repo ?? ""}
              onChange={(v) => h.change("skinInstall", "repo", v)}
            />
            <EditorField
              label={
                source === "github-branch"
                  ? "Branch"
                  : "Release asset (optional)"
              }
              value={
                source === "github-branch"
                  ? (d.branch ?? "main")
                  : (d.asset ?? "")
              }
              onChange={(v) =>
                h.change(
                  "skinInstall",
                  source === "github-branch" ? "branch" : "asset",
                  v
                )
              }
            />
          </>
        )}
      </fieldset>
      <div className="mt-4 flex gap-3">
        <Action disabled={!!h.busy} type="submit">
          Install skin
        </Action>
        <Action
          type="button"
          variant="outline"
          disabled={!!h.busy}
          onClick={() => h.clear("skinInstall")}
        >
          Cancel installation choices
        </Action>
      </div>
    </form>
  )
}
