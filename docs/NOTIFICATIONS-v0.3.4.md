# Focus v0.3.4 notification inventory and behavior matrix

Audit baseline: `114325d` (local v0.3.3 candidate). Prepared before application edits.
Scope: all production `src/` notification producers and renderers, plus the shared development brewing presentation. Permanent instructions, unavailable-feature explanations, empty results, confirmation content, recorded data and input-associated validation are content, not toast events; these remain inline without live-region announcement.

## Policy

| Class | Meaning / action | Type | Visual priority | Duration / resolution |
| --- | --- | --- | --- | --- |
| Critical state | Refill, reconnect, resolve machine fault or scale-dependent active-shot risk | warning/error | 0 | `timeout: 0`; no user dismissal; close only on confirmed resolution |
| Recoverable error | Review failure; retry explicitly | error/warning | 1 | 8 seconds; one per attempt/condition transition |
| Pending action | Wait for the particular request | loading | 2 | Same toast ID through outcome; watchdog replaces indefinite spinner with an unconfirmed-outcome warning, without cancelling/retrying transport |
| Information | Heating, preparing, neutral shot ending, capability/status update | info | 3 | 4 seconds, once per relevant transition |
| Success | Confirmed save, completion, connection | success | 4 | 4 seconds |

Base UI handles announcements, focus, hover pause, swipe, expiry and removal. Critical warnings remain visible before transient feedback; lower-priority notifications cannot displace critical conditions. Routine scale absence is represented only by the existing header. Field validation retains its field association.

## Machine, lifecycle and shared operations

| Source | Trigger / original copy | Event or state | Importance / action | Original dismissal | New policy |
| --- | --- | --- | --- | --- | --- |
| controls.tsx Notice; use-skin.ts phase | Heating / “Heating to your brew temperature.”; preparation substate | State transition | Routine; wait | Condition clears | Info 4s once per heating/preparation transition |
| Notice; gateway connection | “Machine disconnected. Check the connection in Decaid.” | State | Critical; explicit Reconnect | Connected | Persistent error; close on confirmed connection |
| Notice / commandBlock | Sleeping, stale readings, initialization, operating mode and command gates | State | Informational gate; Wake or native Decaid action | Gate clears | Info/warning once per changed gate; preserve Wake action and command gates |
| use-skin.ts notice; gateway machine.state | error / needsWater | State | Critical; machine intervention/refill | State clears | Persistent error/warning; retain through unavailable readings, clear on confirmed fresh resolved state |
| use-skin.ts refillWarningMm | “Low water · N mm. Refill the tank.” only for confirmed non-refill-kit | State | Actionable user-configured warning | Threshold clears | Persistent warning; no inferred empty state; retain on absent readings |
| use-skin.ts brewBlock | “Decaid requires a scale…” at idle | State | Configuration gate | Scale/policy changes | Header only at idle; functional gate unchanged |
| use-skin.ts scaleLost; live-view.tsx scale note | Scale lost during shot; stop-at-weight unavailable | State | Critical when active workflow requires scale | Shot ends / supported recovery | Persistent warning for required active operation; no routine disconnected toast |
| gateway deviceNotice/deviceError | Explicit connection failure; device error details | Event | Recoverable; explicit retry | Dismiss/next status | Error 8s per event; normal scale disconnection excluded |
| use-skin.ts perform | Recipe/profile/utility save, Sleep/Wake/Reconnect; exception text | Event | Pending / recoverable | Next action/dismiss | Loading → same-ID acknowledged result or error; no assertion machine changed from HTTP ack |
| live-view.tsx brew-toast; model.ts returned | “Shot completed”, “Shot stopped manually”, “Shot ended” | Event, shot ID | Success / neutral end | Custom 2400ms timer | Shared success/info 4s; preserve existing 3s hold and 500ms return |
| live-view.tsx brew-alert | Last received trace unknown / Brewing blocked / Review shot | State | Actionable review; Back to Home | Explicit dismiss | Persistent warning with original review action; resolution on leaving review |
| settings-operation.tsx useOperation | Request pending, success (default “Done.”), caught exception | Event | Pending / success / error | Next operation or page exit | Shared same-ID operation notification |
| use-daily-settings.ts | Owner loading/saving, owner error, “... saved.” | Event | Pending / success / error | Reload/next save/page exit | Shared owner operation feedback; retain field errors inline |
| use-advanced.ts | busy name, message, error; per-path read errors, procedure state | Event/state | Pending / recoverable / critical procedure uncertainty | Next action/load/page exit | Same-ID operation feedback; toast read errors; retain procedure measurements/results as page data |
| use-extensions.ts | busy name, message, error; per-path errors | Event | Pending / success / error | Next action/load/page exit | Shared operation feedback; permissions/credential confirmation remain inline |
| use-shot-history.ts | Save/delete/repeat/export results; read/caught errors | Event | Pending / success / error | Next action or page exit | Shared operation feedback; raw shot/field errors unchanged |
| use-catalog.ts | Inventory and recipe preference results/errors | Event | Pending / success / error | Next action/page exit | Shared operation feedback; validation retained |
| use-recipe-editor.ts | Save/remap/JSON errors, result.message and pending journal warnings | Event | Pending / warning / error | Next edit/action/page exit | Shared operation feedback; preserve journal recovery and field validation |
| use-favorites.ts | Favorites saved / save errors / newer unsaved edits | Event | Pending / success / error | Next edit/save | Shared operation feedback; unsaved draft status remains content |
| use-profile-transfer.ts | File errors, import counts and per-item errors, export errors | Event | Pending / success / partial failure | Next file/action | Shared operation feedback; detailed import result retained as review data |
| pages.tsx, sleeping App, utility popovers, grind editor | Duplicate s.notice renderers | Same event/state above | Same as owning producer | Same as owner | Remove duplicate visual containers; root machine/operation bridge owns feedback |

## Exhaustive pre-migration page-message callsites

Each entry below records the original component, source line and exact JSX/copy (including the owning state expression). Original PageMessage messages remain until their parent condition changes or page unmounts; OperationStatus remains until the next operation/page unmount. Dynamic errors require review/explicit retry (error 8s), mutation results require no action (success/info 4s), loading states use pending lifecycle policy. Static instructions, empty states, input errors and data review use inline content, not notifications. The migration disposition table will be generated from these same original source offsets.

```tsx
advanced.tsx:54 <PageMessage> {h.busy}… Keep this page open until an outcome is reported. </PageMessage>
advanced.tsx:58 <PageMessage error>{h.error}</PageMessage>
advanced.tsx:59 <PageMessage>{h.message}</PageMessage>
advanced.tsx:60 <PageMessage>{h.api.block()}</PageMessage>
advanced.tsx:62 <PageMessage> {h.loading["machine/info"] ? "Reading the connected machine’s identity…" : "Machine identity is not verified. Refresh operation status before applying changes."} </PageMessage>
advanced.tsx:83 <PageMessage key={path} error> {path.replace("machine/", "")}: {error} Refresh to retry. </PageMessage>
calibration-maintenance.tsx:89 <PageMessage> DE1 sensor calibration is unavailable for this model. </PageMessage>
calibration-maintenance.tsx:136 <PageMessage>{prediction}</PageMessage>
calibration-maintenance.tsx:192 <PageMessage> Machine flow calibration is unavailable for this model. </PageMessage>
calibration-maintenance.tsx:199 <PageMessage> No supported load-cell calibration capability is reported. </PageMessage>
calibration-maintenance.tsx:434 <PageMessage> {!h.busy.includes("cycle") && live && ["cleaning", "descaling", "airPurge"].includes(state?.state ?? "") ? `Machine procedure: ${state?.state} / ${state?.substate}. Observed from the machine; use Stop maintenance to cancel.` : h.procedure} </PageMessage>
calibration-maintenance.tsx:449 <PageMessage error> Procedure status is unknown while readings are unavailable. Reconnect before starting or sending Stop. </PageMessage>
connection-settings.tsx:120 <PageMessage error>{s.snapshot.deviceError}</PageMessage>
connection-settings.tsx:122 <OperationStatus operation={op} />
connection-settings.tsx:128 <PageMessage> No known devices. Start an explicit scan to discover nearby devices. </PageMessage>
connection-settings.tsx:220 <PageMessage error>{wifiError}</PageMessage>
connection-settings.tsx:375 <PageMessage>No connected grinder.</PageMessage>
connection-settings.tsx:376 <PageMessage error>{error}</PageMessage>
connection-settings.tsx:429 <PageMessage> Grind setting is read-only or unavailable. </PageMessage>
connection-settings.tsx:529 <OperationStatus operation={op} />
connection-settings.tsx:530 <OperationStatus operation={stopOp} />
daily-settings.tsx:86 <PageMessage error>{infoError}</PageMessage>
daily-settings.tsx:114 <OperationStatus operation={operation} />
daily-settings.tsx:118 <PageMessage>{block} You can review and edit drafts.</PageMessage>
daily-settings.tsx:145 <PageMessage> {section?.loading ? "Loading settings…" : "Settings are unavailable."} </PageMessage>
daily-settings.tsx:187 <PageMessage error>{section.error}</PageMessage>
daily-settings.tsx:189 <PageMessage>{section.message}</PageMessage>
extensions.tsx:53 <PageMessage> {h.busy}… Keep this page open until the outcome is reported. </PageMessage>
extensions.tsx:58 <PageMessage>Reading the current gateway data…</PageMessage>
extensions.tsx:60 <PageMessage>{reason}</PageMessage>
extensions.tsx:62 <PageMessage error>{h.error} No automatic retry was sent.</PageMessage>
extensions.tsx:64 <PageMessage>{h.message}</PageMessage>
extensions.tsx:74 <PageMessage key={key} error> {key}: {error} Refresh this section to retry; unavailable endpoints are not replaced with sample data. </PageMessage>
extensions.tsx:147 <PageMessage> DYE2, shot upload, Home Assistant, assisted dial-in and other extensions appear when installed. Select an extension to review its settings, permissions and update status. Running plugins with their own page can open in a separate tab. </PageMessage>
extensions.tsx:188 <PageMessage> Save or cancel plugin drafts before enabling, removing or updating plugins. </PageMessage>
extensions.tsx:194 <PageMessage>Loading installed extensions…</PageMessage>
extensions.tsx:197 <PageMessage>No plugins are installed.</PageMessage>
extensions.tsx:200 <PageMessage error> This plugin is no longer installed. Its unsaved settings are retained until you cancel them. </PageMessage>
extensions.tsx:221 <PageMessage error> {String(asData(p.source).lastError)} </PageMessage>
extensions.tsx:229 <PageMessage> Pending version {shown(asData(p.pendingUpdate).version)} · Added permissions:{" "} {Array.isArray(asData(p.pendingUpdate).addedPermissions) ? (asData(p.pendingUpdate).addedPermissions as unknown[]).join( ", " ) : "Unavailable; refresh before approval"} </PageMessage>
extensions.tsx:307 <PageMessage error>{launchError}</PageMessage>
extensions.tsx:319 <PageMessage> Opens a separate plugin-owned page. Return here using its Return link, or close that tab. Focus stays open with your drafts. No credentials are added to the link. </PageMessage>
extensions.tsx:365 <PageMessage> Only changed settings are saved. Hidden and unsupported fields stay untouched. Saving may reload a running plugin. </PageMessage>
extensions.tsx:370 <PageMessage> Settings have not loaded. Refresh before editing. </PageMessage>
extensions.tsx:398 <PageMessage key={name}> {label}: this declaration is not supported here. Use the plugin’s own UI or native Decaid. </PageMessage>
extensions.tsx:440 <PageMessage> Will remove this credential on Save. </PageMessage>
extensions.tsx:482 <PageMessage> No settings are exposed by this manifest. Use its declared UI when available. </PageMessage>
extensions.tsx:522 <PageMessage> Install only from a repository you trust. Plugins can request device, network and account access and may run after installation. Local ZIP/folder installs use native Decaid; arbitrary URL installation is unsupported. </PageMessage>
help.tsx:54 <PageMessage> Focus is a client of Decaid. Decaid owns connections, execution, stop-at-weight and stored shots. Other builds may differ; a desktop preview does not establish Samsung WebView or hardware acceptance. Tracking or disabled gateway mode is required for Focus operations; choose the mode in native Decaid. This page never changes it automatically. </PageMessage>
help.tsx:73 <PageMessage> Read these values inside Decaid on the tablet, in landscape with the keyboard closed. The layout viewport is the space available to this skin; a Mac browser reports the Mac's viewport instead. Send the layout viewport and device pixel ratio when reporting a fit issue. </PageMessage>
help.tsx:158 <PageMessage> These reads stay on your configured Decaid gateway and do not scan or send machine commands. Logs and device details may contain identifiers or credentials; review and redact before sharing. Nothing is uploaded automatically. </PageMessage>
help.tsx:224 <PageMessage> Android permissions, WebView composition, Bluetooth transport policy and native diagnostic switches are managed in Decaid or Android settings. Unsupported endpoints remain explicitly unavailable here. </PageMessage>
help.tsx:298 <PageMessage> Sign in, manage credentials, account consent and support conversations in native Decaid’s Account screen. The public status endpoint does not provide login or account-management controls. Scoped account proxy access requires native consent and credentials; Focus does not request, store or share those tokens. </PageMessage>
help.tsx:307 <PageMessage> Decaid sends your reviewed text as an issue to the Decaid GitHub repository (normally decentespresso/decaid). Treat it as public. It may also link the issue to your Decent support account. Focus sends no log, screenshot or system-info attachments. For private account help or support packages, use native Decaid. </PageMessage>
help.tsx:315 <PageMessage> Sign in through native Decaid and refresh account status before submitting. </PageMessage>
history.tsx:99 <PageMessage>{h.message}</PageMessage>
history.tsx:100 <PageMessage>Loading shots…</PageMessage>
history.tsx:103 <PageMessage error>{h.listError}</PageMessage>
history.tsx:153 <PageMessage> No shots match these filters. Change the filters or refresh history. </PageMessage>
history.tsx:201 <PageMessage error> No shot ID was supplied. Open a record from history. </PageMessage>
history.tsx:208 <PageMessage error={!!h.detailError}> {h.detailLoading ? "Loading shot…" : h.detailError || "Shot unavailable."} </PageMessage>
history.tsx:280 <PageMessage> Repeat loads the recorded profile and coffee/equipment context. It does not start a shot or change utility settings. Save or cancel annotations before repeating or deleting. </PageMessage>
history.tsx:285 <PageMessage>{repeatError}</PageMessage>
history.tsx:287 <PageMessage error> {h.detailError} The last loaded record is still shown. </PageMessage>
history.tsx:292 <PageMessage> {h.message} {h.dirty && h.message === "Annotations saved." ? " Newer edits are still unsaved." : ""} </PageMessage>
history.tsx:354 <PageMessage> No usable recorded measurements are available. A recipe preview is not substituted. </PageMessage>
history.tsx:390 <PageMessage>No executable stages were recorded.</PageMessage>
inventory.tsx:87 <PageMessage> Keep coffee, roast batches and equipment records with your recipe. Grinder records are separate from connected devices. Archiving preserves historical shot context. </PageMessage>
inventory.tsx:92 <PageMessage>{c.message}</PageMessage>
inventory.tsx:95 <PageMessage> {c.busy ? "Loading inventory…" : "Inventory unavailable."} </PageMessage>
inventory.tsx:340 <PageMessage>No matching records.</PageMessage>
inventory.tsx:363 <PageMessage> Saved adjustments apply when you load this profile. Blank fields use the profile target; a blank dose stays Not set. A blank grind retains the current setting. These preferences never move a connected grinder. </PageMessage>
inventory.tsx:368 <PageMessage>{c.message}</PageMessage>
inventory.tsx:370 <PageMessage> {c.busy ? "Loading recipe preferences…" : "Recipe preferences unavailable. Reopen this page to retry."} </PageMessage>
machine-advanced.tsx:257 <PageMessage>Cup warming is unavailable on this machine.</PageMessage>
machine-advanced.tsx:352 <PageMessage> Scheduled mat preheat is unavailable on this machine. </PageMessage>
machine-advanced.tsx:424 <PageMessage> Configurable lighting is unavailable on this machine. </PageMessage>
pages.tsx:169 <PageMessage error>{s.notice}</PageMessage>
pages.tsx:270 <PageMessage> These controls are not available yet. Manage them in Decaid for now. </PageMessage>
pages.tsx:305 <PageMessage>No matching settings. Try a different search.</PageMessage>
pages.tsx:322 <PageMessage error> {s.snapshot.favoritesIssue} The Home rail will change only after you explicitly Save. </PageMessage>
pages.tsx:327 <PageMessage>Loading profiles…</PageMessage>
pages.tsx:328 <PageMessage error>{s.libraryError}</PageMessage>
presence-settings.tsx:58 <OperationStatus operation={op} />
presence-settings.tsx:102 <PageMessage error>{loadError}</PageMessage>
presence-settings.tsx:140 <PageMessage>No wake schedules.</PageMessage>
presence-settings.tsx:254 <OperationStatus operation={op} />
profile-editor.tsx:26 <PageMessage> {editor.message || "This profile is unavailable. Return to the library or retry loading it."} </PageMessage>
profile-editor.tsx:75 <PageMessage> {editor.source?.isDefault ? "Bundled defaults are read-only. Change a stage or target, then Save as new to create your own recipe." : "Edit the stored recipe here. Saving does not change the active workflow or start the machine."}{" "} Temperatures in this editor use °C. </PageMessage>
profile-editor.tsx:103 <PageMessage> Apply or discard your structured JSON before editing the stage forms. </PageMessage>
profile-editor.tsx:108 <PageMessage error={!!editor.pending || Object.keys(editor.errors).length > 0} > {editor.message} </PageMessage>
profile-editor.tsx:270 <PageMessage error>{editor.errors.steps}</PageMessage>
profile-library.tsx:134 <PageMessage> {result.imported} imported · {result.skipped} skipped ·{" "} {result.failed} failed {result.errors.length > 0 && ( <span className="block whitespace-pre-wrap"> {result.errors.join("\n")} </span> )} </PageMessage>
profile-library.tsx:144 <PageMessage error>{error}</PageMessage>
profile-library.tsx:233 <PageMessage error={!!s.libraryError}> {s.libraryLoading ? "Loading profiles…" : s.libraryError} </PageMessage>
profile-library.tsx:301 <PageMessage> {s.allProfiles.length ? "No matching profiles. Try another search or visibility filter." : "No profiles saved. Import a Decaid profile export to get started."} </PageMessage>
profile-library.tsx:325 <PageMessage>Loading profile…</PageMessage>
profile-library.tsx:329 <PageMessage error> {s.libraryError || "This profile is unavailable. Its favorite assignment has been preserved."} </PageMessage>
profile-library.tsx:390 <PageMessage error>{error}</PageMessage>
profile-library.tsx:435 <PageMessage> Preview uses profile targets. Hiding a profile preserves its favorite position as unavailable and does not change the loaded recipe. </PageMessage>
settings-operation.tsx:33 <PageMessage error>{operation.error}</PageMessage>
settings-operation.tsx:34 <PageMessage>{operation.message}</PageMessage>
updates-data.tsx:141 <PageMessage> Firmware catalog unavailable. Refresh to retry. </PageMessage>
updates-data.tsx:173 <PageMessage error>{String(app.error)}</PageMessage>
updates-data.tsx:528 <PageMessage error key={i}> {e} </PageMessage>
updates-data.tsx:533 <PageMessage key={i}>{w}</PageMessage>
updates-data.tsx:547 <PageMessage> Legacy Decaid ZIPs without metadata are accepted by the server when they contain recognized sections. de1app/Tcl migration and unsupported legacy formats require Decaid’s native data-management flow; this skin does not reinterpret them. </PageMessage>
```

## API sources

- [Official shadcn Base UI Toast](https://ui.shadcn.com/docs/components/base/toast), base-nova registry component.
- [Base UI Toast API](https://base-ui.com/react/components/toast): timeout 0 prevents expiry; stable IDs update/close a toast. Announcement priority is distinct from visual ordering.

## Migration disposition by original callsite

| Original source | Disposition |
| --- | --- |
| advanced.tsx:54 | Producer-owned toast |
| advanced.tsx:58 | Producer-owned toast |
| advanced.tsx:59 | Producer-owned toast |
| advanced.tsx:60 | View-local toast |
| advanced.tsx:62 | View-local toast |
| advanced.tsx:83 | View-local toast |
| calibration-maintenance.tsx:89 | Inline content / validation |
| calibration-maintenance.tsx:136 | Inline content / validation |
| calibration-maintenance.tsx:192 | Inline content / validation |
| calibration-maintenance.tsx:199 | Inline content / validation |
| calibration-maintenance.tsx:434 | View-local toast |
| calibration-maintenance.tsx:449 | View-local toast |
| connection-settings.tsx:120 | Producer-owned toast |
| connection-settings.tsx:128 | Inline content / validation |
| connection-settings.tsx:220 | View-local toast |
| connection-settings.tsx:375 | Inline content / validation |
| connection-settings.tsx:376 | View-local toast |
| connection-settings.tsx:429 | Inline content / validation |
| daily-settings.tsx:86 | View-local toast |
| daily-settings.tsx:118 | Inline content / validation |
| daily-settings.tsx:145 | Inline content / validation |
| daily-settings.tsx:187 | Producer-owned toast |
| daily-settings.tsx:189 | Producer-owned toast |
| extensions.tsx:53 | Producer-owned toast |
| extensions.tsx:58 | Inline content / validation |
| extensions.tsx:60 | View-local toast |
| extensions.tsx:62 | Producer-owned toast |
| extensions.tsx:64 | Producer-owned toast |
| extensions.tsx:74 | View-local toast |
| extensions.tsx:147 | Inline content / validation |
| extensions.tsx:188 | Inline content / validation |
| extensions.tsx:194 | Inline content / validation |
| extensions.tsx:197 | Inline content / validation |
| extensions.tsx:200 | View-local toast |
| extensions.tsx:221 | View-local toast |
| extensions.tsx:229 | Inline content / validation |
| extensions.tsx:307 | View-local toast |
| extensions.tsx:319 | Inline content / validation |
| extensions.tsx:365 | Inline content / validation |
| extensions.tsx:370 | Inline content / validation |
| extensions.tsx:398 | Inline content / validation |
| extensions.tsx:440 | Inline content / validation |
| extensions.tsx:482 | Inline content / validation |
| extensions.tsx:522 | Inline content / validation |
| help.tsx:54 | Inline content / validation |
| help.tsx:73 | Inline content / validation |
| help.tsx:158 | Inline content / validation |
| help.tsx:224 | Inline content / validation |
| help.tsx:298 | Inline content / validation |
| help.tsx:307 | Inline content / validation |
| help.tsx:315 | Inline content / validation |
| history.tsx:99 | Producer-owned toast |
| history.tsx:100 | Inline content / validation |
| history.tsx:103 | View-local toast |
| history.tsx:153 | Inline content / validation |
| history.tsx:201 | View-local toast |
| history.tsx:208 | Read error → error toast; loading/unavailable placeholder stays inline |
| history.tsx:280 | Inline content / validation |
| history.tsx:285 | View-local toast |
| history.tsx:287 | View-local toast |
| history.tsx:292 | Producer-owned toast |
| history.tsx:354 | Inline content / validation |
| history.tsx:390 | Inline content / validation |
| inventory.tsx:87 | Inline content / validation |
| inventory.tsx:368 | Producer-owned toast |
| inventory.tsx:95 | Inline content / validation |
| inventory.tsx:340 | Inline content / validation |
| inventory.tsx:363 | Inline content / validation |
| inventory.tsx:368 | Producer-owned toast |
| inventory.tsx:370 | Inline content / validation |
| machine-advanced.tsx:257 | Inline content / validation |
| machine-advanced.tsx:352 | Inline content / validation |
| machine-advanced.tsx:424 | Inline content / validation |
| pages.tsx:270 | Inline content / validation |
| pages.tsx:305 | Inline content / validation |
| pages.tsx:322 | View-local toast |
| pages.tsx:327 | Inline content / validation |
| pages.tsx:328 | View-local toast |
| presence-settings.tsx:102 | View-local toast |
| presence-settings.tsx:140 | Inline content / validation |
| profile-editor.tsx:26 | Inline content / validation |
| profile-editor.tsx:75 | Inline content / validation |
| profile-editor.tsx:103 | Inline content / validation |
| profile-editor.tsx:108 | Producer-owned toast |
| profile-editor.tsx:270 | Inline content / validation |
| profile-library.tsx:134 | Inline content / validation |
| profile-library.tsx:144 | Producer-owned transfer error toast |
| profile-library.tsx:233 | Read error → error toast; loading/unavailable placeholder stays inline |
| profile-library.tsx:301 | Inline content / validation |
| profile-library.tsx:325 | Inline content / validation |
| profile-library.tsx:329 | View-local toast |
| profile-library.tsx:390 | View-local toast |
| profile-library.tsx:435 | Inline content / validation |
| updates-data.tsx:141 | Inline content / validation |
| updates-data.tsx:173 | View-local toast |
| updates-data.tsx:528 | View-local toast |
| updates-data.tsx:533 | View-local toast |
| updates-data.tsx:547 | Inline content / validation |

## Implementation and cleanup

- `src/components/ui/toast.tsx` is adapted from the official base-nova registry source: local imports, Lucide icons and Focus styling. It uses Base UI Provider, Portal, Viewport, Root, Content, Title, Description, Action and Close. Existing dependencies were reused; none were installed or upgraded.
- `src/skin/notifications/manager.ts` owns types, duration, stable keys, condition fingerprints, request updates, a 45-second UI-only watchdog and priority queue. Base UI owns rendered cards, timers, announcements, focus and swipe. The queue shows every critical condition plus up to the remaining three-card budget (at least one transient slot). Cards are expanded for touch use; urgent cards sort before transient feedback. Hidden queued cards start their Base UI lifetime only when admitted. Repeated identical telemetry does not update an active card or reset its timer.
- `machine.ts` maps actual gateway state. `needsWater` means refill required; the installed model does not establish a separate “tank removed” versus “empty” reason, so the copy does not invent one. Fresh known operating states resolve the refill/fault latch. Missing readings and reconnecting retain it. User-configured low-water warnings require the existing non-refill-kit check; unknown sensor/kit/preferences do not invent or resolve an existing warning.
- Root `useSkin` request feedback and `useFeedback` keep operation outcomes alive across page navigation. Settings owners use independent keys. View-local read failures use an effect-only adapter. Toast actions call the existing guarded handlers; no transport, retry, execution or stop-at-weight logic changed.
- Removed `Notice`, all duplicate `s.notice` paragraphs, `OperationStatus`, `.brew-toast`, `.brew-alert`, `.brew-scale-note`, `.brew-operation-notice` and `.utility-note`. Removed both custom 2400ms result-display timers; shot result signals are consumed once by the shared renderer. The existing 3-second completion hold and 500ms Home transition are unchanged.
- Renamed permanent `PageMessage` content to `PageHint`, removed its automatic status announcement, retained field-validation alerts and full import/transfer result data for inspection. Removed redundant inline mutation-result presentations. Toasts use 8px radius, the 0.16 surface tone, 44px actions, 150ms transitions and reduced-motion overrides.
- One Toaster wraps each entry point: production App or the separate development preview. Production never imports the preview.

## Validation scope

QA uses the loopback-only Decaid API fixture and development simulator. No hardware operations, device discovery, production deployment, Git push, GitHub release or tablet installation are part of this candidate. Browser timer tests explicitly advance the adapter’s existing 100ms notification batch; they do not alter production timing or freshness gates. Final results are recorded below after verification.

## Local QA results — November 7, 2026

| Check | Result |
| --- | --- |
| `npm run check` | Passed: TypeScript, ESLint, 179 gateway/unit tests across 13 files, production build |
| `npm run check:brewing` | Passed: development TypeScript, 18 brewing-model tests, production module-graph isolation |
| Notification fixture browser tests | 4 passed: heating/preparation/completion and expiry; refill persistence, Escape protection and confirmed resolution; idle scale silence and same-ID manual connection success/failure; active scale-dependent warning and manual-stop result |
| Existing operation regressions | 3 passed: utility partial writes and retained failed drafts; favorites edits during Save; annotation failure/newer edits and unchanged recorded measurements |
| Queue and watchdog unit coverage | Passed: repeated telemetry deduplication, priority admission, simultaneous critical conditions, timeout warning, late outcome and duplicate gateway/operation errors |
| Production isolation | 2,458 modules checked; no preview/simulator modules or simulation content in production |
| Static archive | `package:skin` and `verify:skin` passed; 11 files, relative assets and root `index.html`, no development API override |
| Target viewport | Notification lifecycle checks at 1007 × 601 CSS pixels; captured simultaneous refill/connection warnings at `artifacts/v034/critical-1007.png`. Other operation regressions use 1340 × 800 |

The first history regression run matched both Base UI's visible title and its accessible announcement. The selector now targets the visible toast; the rerun passed. The simulated clock advances the existing adapter batch and toast lifecycle explicitly; production timers and machine gates were not changed.

Save feedback retains the distinction between the submitted version and edits made while saving. Starting a new shot or leaving its view clears the previous shot-result toast. Notification IDs do not require secure-context browser crypto APIs.

The complete browser suite was not rerun. Samsung WebView, physical device behavior and assistive-technology acceptance remain unverified. Vite reports the existing large-chunk advisory; the build succeeds. No hardware command was sent, no real device was discovered, and this candidate was not pushed, published or installed.

The development preview at `http://127.0.0.1:5174/` was opened for review. This working-tree candidate is based on `114325d`; generated screenshots, ZIP and verification report remain ignored. The unrelated `scripts/export-current-designs.mjs` was preserved.

The separate development-preview regression also passed: manual stop, duplicate completion, rapid restart, navigation away during a shot, return to review, and F6 keyboard access to the review action. This brings the focused browser checks to eight. Base UI intentionally excludes urgent visual cards from the accessibility tree until keyboard focus while announcing their content separately; the test checks the visible card and then uses its supported F6 navigation. No notification-lifecycle workaround was retained.

Final local archive: 623,081 bytes; SHA-256 `6b3962ae45bca8540669cb40d634389a91bbecb5ac509aa19615e26571aee358`. Final sequential `check`, `check:brewing`, `package:skin` and `verify:skin` all passed. The earlier overlapping build/verify attempt was superseded by this sequential pass.
