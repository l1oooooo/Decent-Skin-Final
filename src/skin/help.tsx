import { feedbackBody, logLevels } from "@/gateway/extensions"
import type { ExtensionsState } from "./use-extensions"
import type { SkinSession } from "./use-skin"
import type { Route } from "./navigation"
import { Action } from "./primitives"
import { PageMessage } from "./pages"
import { EditorField, EditorChoice } from "./editor-fields"
import { SettingInput } from "./settings-controls"
import { Section, Facts, type Ask } from "./advanced-shared"
export function HelpPage({
  s,
  h,
  blocked,
  ask,
  navigate,
}: {
  s: SkinSession
  h: ExtensionsState
  blocked: boolean
  ask: Ask
  navigate: (r: Route) => void
}) {
  const settings = h.values.settings ?? {},
    d = h.drafts.system ?? {},
    feedback = h.drafts.feedback ?? {},
    account = h.values["account/decent"]
  const submittedUrl =
    typeof h.receipt.issueUrl === "string" &&
    /^https:\/\/github\.com\/decentespresso\/decaid\/issues\/\d+$/.test(
      h.receipt.issueUrl
    )
      ? h.receipt.issueUrl
      : null
  return (
    <>
      <Section title="About and compatibility">
        <Facts
          data={{
            "Focus skin": "0.2.0",
            "Running Decaid":
              h.values.info?.fullVersion ??
              h.values.info?.version ??
              s.snapshot.build,
            "Verified API target": "Decaid 0.9.1+3027 · 14361a94",
            "Gateway origin": s.gateway.origin,
            Connection: s.snapshot.connection,
            "Gateway mode":
              settings.gatewayMode ?? s.snapshot.settings?.gatewayMode,
          }}
        />
        <PageMessage>
          Focus is a client of Decaid. Decaid owns connections, execution,
          stop-at-weight and stored shots. Other builds may differ; a desktop
          preview does not establish Samsung WebView or hardware acceptance.
          Tracking or disabled gateway mode is required for Focus operations;
          choose the mode in native Decaid. This page never changes it
          automatically.
        </PageMessage>
      </Section>
      <Section title="System preferences">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(
              "Save system preferences?",
              "Change only the selected log level and automatic update-check preference. Enabling automatic checks allows Decaid to contact update services; it does not install an update here.",
              () =>
                h.run("Saving system preferences", async () => {
                  const patch = { ...d }
                  if (
                    "logLevel" in patch &&
                    !logLevels.includes(String(patch.logLevel))
                  )
                    throw new Error("Choose a supported log level.")
                  if (
                    "automaticUpdateCheck" in patch &&
                    typeof patch.automaticUpdateCheck !== "boolean"
                  )
                    throw new Error("Choose On or Off.")
                  await s.gateway.daily.save("settings", patch)
                  h.acknowledge("system", patch)
                  await h.read("settings")
                  h.setMessage(
                    "System preferences acknowledged. Review the returned values."
                  )
                })
            )
          }}
        >
          <fieldset
            disabled={!!h.busy || !!h.errors.settings || !h.values.settings}
          >
            <SettingInput
              field={{
                key: "logLevel",
                label: "Log level",
                kind: "select",
                options: logLevels.map((v) => ({ label: v, value: v })),
                help: "Verbose levels may include sensitive diagnostic details.",
              }}
              value={d.logLevel ?? settings.logLevel}
              onChange={(v) => h.change("system", "logLevel", v)}
            />
            <SettingInput
              field={{
                key: "automaticUpdateCheck",
                label: "Automatically check for updates",
                kind: "boolean",
              }}
              value={d.automaticUpdateCheck ?? settings.automaticUpdateCheck}
              onChange={(v) => h.change("system", "automaticUpdateCheck", v)}
            />
          </fieldset>
          <div className="mt-4 flex gap-3">
            <Action
              type="submit"
              disabled={
                blocked ||
                !!h.errors.settings ||
                !h.values.settings ||
                !Object.keys(d).length
              }
            >
              Save system preferences
            </Action>
            <Action
              type="button"
              variant="outline"
              disabled={!!h.busy}
              onClick={() => h.clear("system")}
            >
              Cancel system edits
            </Action>
          </div>
        </form>
      </Section>
      <Section title="Diagnostics and logs">
        <PageMessage>
          These reads stay on your configured Decaid gateway and do not scan or
          send machine commands. Logs and device details may contain identifiers
          or credentials; review and redact before sharing. Nothing is uploaded
          automatically.
        </PageMessage>
        <div className="flex flex-wrap gap-3">
          <Action
            variant="outline"
            disabled={!!h.busy || h.loading["diagnostics/ble"]}
            onClick={() => h.read("diagnostics/ble")}
          >
            Read BLE diagnostics
          </Action>
          <Action
            variant="outline"
            disabled={!!h.busy || h.loading["machine/info"]}
            onClick={() => h.read("machine/info")}
          >
            Read machine information
          </Action>
          <Action
            variant="outline"
            disabled={!!h.busy || h.loading["machine/capabilities"]}
            onClick={() => h.read("machine/capabilities")}
          >
            Read capabilities
          </Action>
          <Action
            variant="outline"
            disabled={!!h.busy}
            onClick={() => h.log("logs")}
          >
            Read Decaid log
          </Action>
          <Action
            variant="outline"
            disabled={!!h.busy}
            onClick={() => h.log("webview/logs")}
          >
            Read WebView log
          </Action>
        </div>
        {["diagnostics/ble", "machine/info", "machine/capabilities"].map(
          (path) =>
            h.values[path] && (
              <details key={path} className="mt-4">
                <summary className="flex min-h-12 cursor-pointer items-center">
                  {path} · returned data
                </summary>
                <pre className="max-h-80 overflow-auto rounded-lg bg-card p-4 text-xs [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {JSON.stringify(h.values[path], null, 2)}
                </pre>
              </details>
            )
        )}
        {Object.entries(h.logs).map(([path, text]) => (
          <details open key={path} className="mt-4">
            <summary className="flex min-h-12 cursor-pointer items-center">
              {path} · newest first
            </summary>
            <pre className="max-h-80 overflow-auto rounded-lg bg-card p-4 text-xs [overflow-wrap:anywhere] whitespace-pre-wrap">
              {text || "Log is empty."}
            </pre>
          </details>
        ))}
        <PageMessage>
          Android permissions, WebView composition, Bluetooth transport policy
          and native diagnostic switches are managed in Decaid or Android
          settings. Unsupported endpoints remain explicitly unavailable here.
        </PageMessage>
      </Section>
      <Section title="Quick start and troubleshooting">
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Use Connections to select your machine and scale explicitly. Resolve
            native Android permissions there; do not assume this computer’s
            localhost is the tablet.
          </li>
          <li>
            Load a profile from the library, then arrange the five favorites
            separately. Set dose, target yield and temperature on Home.
          </li>
          <li>
            Prepare the machine and cup before starting. Follow the real frame
            and readings on Focus; Stop remains on the brewing screen.
          </li>
          <li>
            If readings disappear, inspect the machine and reconnect in Decaid.
            Focus does not fabricate readings or replay a command. Check the
            actual outcome before retrying.
          </li>
          <li>
            Review saved shots in History. Repeat recipe loads recorded settings
            without starting extraction. Save or cancel edits before leaving a
            form.
          </li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          <Action
            variant="outline"
            onClick={() =>
              navigate({ page: "settings", category: "connections" })
            }
          >
            Connections
          </Action>
          <Action
            variant="outline"
            onClick={() => navigate({ page: "library" })}
          >
            Profile library
          </Action>
          <Action
            variant="outline"
            onClick={() => navigate({ page: "history" })}
          >
            Shot history
          </Action>
        </div>
      </Section>
      <Section title="Account and support">
        <Facts
          data={{
            "Decent account":
              h.errors["account/decent"] || !account
                ? "Unavailable"
                : account.loggedIn === true
                  ? "Signed in"
                  : "Not signed in",
          }}
        />
        <Action
          variant="outline"
          disabled={h.loading["account/decent"]}
          onClick={() => h.read("account/decent")}
        >
          Refresh account status
        </Action>
        <PageMessage>
          Sign in, manage credentials, account consent and support conversations
          in native Decaid’s Account screen. The public status endpoint does not
          provide login or account-management controls. Scoped account proxy
          access requires native consent and credentials; Focus does not
          request, store or share those tokens.
        </PageMessage>
      </Section>
      <Section title="Send feedback">
        <PageMessage>
          Decaid sends your reviewed text as an issue to the Decaid GitHub
          repository (normally decentespresso/decaid). Treat it as public. It
          may also link the issue to your Decent support account. Focus sends no
          log, screenshot or system-info attachments. For private account help
          or support packages, use native Decaid.
        </PageMessage>
        {account?.loggedIn !== true && (
          <PageMessage>
            Sign in through native Decaid and refresh account status before
            submitting.
          </PageMessage>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(
              "Submit this feedback?",
              "Publish the displayed description and feedback type through Decaid to its configured GitHub issue repository. Decaid may also send a support-account link. No logs, screenshots or system information are attached. Review the text for private information before confirming.",
              () =>
                h.run("Submitting feedback", async () => {
                  const draft = { ...feedback, type: feedback.type ?? "bug" }
                  feedbackBody(draft)
                  h.setReceipt({})
                  try {
                    const result = await h.api.feedback(draft)
                    h.setReceipt(result)
                    h.acknowledge("feedback", feedback)
                    h.setMessage(
                      `Feedback acknowledged${typeof result.issueNumber === "number" ? ` as issue #${result.issueNumber}` : ""}.`
                    )
                  } catch (e) {
                    throw new Error(
                      "Feedback was not confirmed. Your text is retained. Check the issue repository and support account before retrying to avoid a duplicate. " +
                        (e instanceof Error ? e.message : ""),
                      { cause: e }
                    )
                  }
                })
            )
          }}
        >
          <fieldset disabled={!!h.busy} className="space-y-4">
            <EditorChoice
              label="Feedback type"
              value={String(feedback.type ?? "bug")}
              options={["bug", "feature", "question", "other"]}
              onChange={(v) => h.change("feedback", "type", v)}
            />
            <EditorField
              label="Feedback description"
              value={feedback.description ?? ""}
              multiline
              required
              onChange={(v) => h.change("feedback", "description", v)}
              help="Review this exact text before submitting. Maximum 20,000 characters."
            />
          </fieldset>
          <div className="mt-4 flex gap-3">
            <Action
              type="submit"
              disabled={
                blocked ||
                account?.loggedIn !== true ||
                !!h.errors["account/decent"] ||
                !String(feedback.description ?? "").trim()
              }
            >
              Review and submit feedback
            </Action>
            <Action
              type="button"
              variant="outline"
              disabled={!!h.busy}
              onClick={() => h.clear("feedback")}
            >
              Cancel feedback draft
            </Action>
          </div>
        </form>
        {submittedUrl && (
          <a
            className="mt-4 inline-flex min-h-12 items-center underline"
            href={submittedUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View submitted issue
          </a>
        )}
      </Section>
    </>
  )
}
