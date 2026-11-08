# Decent Focus

Focus is the locked Home and brewing screen for the Decaid skin. Settings, profile library/details, favorite management and shot history share its visual system. The locked Monochrome Studio design uses surface tone **0.16**, the Cover profile rail and the rolling Focus brewing status. It is rendered directly at the requested **1340 × 800** landscape viewport; no exploration picker, appearance controls or simulated data ships in the application.

## Run and build

For the isolated brewing redesign, run `npm run dev:brewing` and open
[the design preview](http://127.0.0.1:5174/). Its simulated GHC and telemetry
are development-only. The approved presentation is shared from `src/skin/brewing`;
production uses the live Decaid adapter. See the
[review guide](docs/design/BREWING-PREVIEW.md) and
[Streamline chart audit](docs/design/BREWING-CHART-RESEARCH.md).

```sh
npm ci
npm run dev
npm run check
npm run test:e2e
npm run package:skin
```

`npm run package:skin` builds and inspects `artifacts/decent-skin-codex-0.3.2.zip` with `index.html`, `manifest.json`, fonts and assets at the archive root. It rejects development API overrides and writes a checksum/inventory report to `artifacts/skin-release.json`. Use `npm run verify:skin` to inspect an existing archive again. Install that archive through Decaid's skin management during supervised tablet acceptance. No Node server is required on the tablet. `dist/` and generated archives are not committed.

An installed skin connects to its serving hostname on API port **8080**, independent of its skin port. For desktop development, set `VITE_DECAID_URL` in `.env.local` (see `.env.example`) to the tablet's gateway origin, then restart Vite. This is a build-time setting: a release intended for installation on the tablet should normally be built without an override. Do not publish a build that points to the isolated test fixture.

## Install and update from GitHub

After testing a release on the tablet, post feedback using the
[release feedback procedure](docs/RELEASE-FEEDBACK.md). It covers clarification,
fixes, local validation and publishing the next update.

In native Decaid skin management, choose **Install from GitHub Release**.
Use repository `l1oooooo/Decent-Skin-Final` and asset name `decent-focus.zip`,
then select **Decent Focus**. Future releases retain that asset name; use
Decaid’s skin update function to install them. Source-code archives and Git
pushes alone are not compiled skin updates.

The 0.3.2 refinement candidate uses the physical group-head controller for all daily starts
and stops. Home groups Steam, Hot Water and Flush in one **Machine Setting** popover
with tabs and a persistent Steam enable switch. It has no footer or daily
start/stop commands in the popover. There are
no on-screen daily Start/Stop buttons or Escape stop shortcut. Advanced maintenance
procedures retain their explicit controls.

Home fits landscape CSS viewports down to 800 × 480 without scrolling its
panels, using compact spacing and a responsive chart while preserving 44px
minimum touch targets. At 1340 × 800 the approved three-column Home expands into the five-trace
brewing view with its rolling stage title. On the tablet, open **Settings → System and help → Screen and
viewport** to read the actual layout dimensions and device pixel ratio. These
are WebView CSS measurements, not the panel's advertised resolution.

Loading a profile applies its temperature and weight target plus any saved
Focus recipe preferences. Dose uses the saved Focus preference, then profile
metadata, then the chosen **18g default**, labeled **Coffee · default**. The
executable profile format has no dose field, so the fallback is not a profile
author's recommendation. A missing/zero weight target shows **Off**. Neither
value is inherited from the previous profile. Initial display does not write
to Decaid; selecting a profile or editing its recipe applies the fallback.
Home dose, yield, temperature and grind changes—including +/−—save per profile
and survive switching profiles and reloading. They remain separate from stage
definitions. If the workflow changes but preference storage fails, the error
explains the partial save; retry explicitly before switching profiles.

Tap a dose, yield, temperature or numeric grind value to open the built-in
keypad, then **Save** or **Cancel**. Digits, decimal point, Backspace and Clear
work without the tablet's system keyboard; physical keyboard input also works.
Values are validated before saving; a failed save keeps the draft. Named grinder
settings still use text entry.
The header shows the actual live steam temperature beside the brew reading,
even with steam heating disabled. It is read-only; missing/stale/disconnected
readings show a dash. Open the top-navigation **Steam** menu to enable steam or
adjust its target (quick range 135–160 °C).

The top-right power icon / Sleep button puts the machine to **Sleep** with one tap while idle.
It uses Decaid's standby action, not a mains-power switch or brewing stop.
It is disabled during operations, pending requests or unavailable connections.
The Sleeping screen appears only after Decaid reports that state.
The scale status uses text only. **Edit profile** beside the Home title opens
the existing stage editor; bundled defaults still require Save as new.

To copy Home adjustments from Streamline in the same Decaid installation, open
**All profiles → Details → Recipe preferences → Copy from Streamline**.
Review dose, yield, grind and first-stage temperature, then **Save recipe
preferences** and load the profile. This matches the exact profile ID and reads
Streamline's saved overrides or legacy metadata. It does not import steam,
flow calibration or machine settings, and never writes back to Streamline.
Missing or invalid settings are reported instead of inventing values.

**Connect scale** opens Connections for explicit device selection. Scale-free
brewing remains governed by **Settings → Brew and utilities → Require a scale
before brewing**. Without a scale, weight-based stopping is unavailable. The
skin never changes Decaid's policy automatically. Tablet acceptance remains
pending for this update.

## Integration

The adapter is verified against the published contract at installed Decaid **0.9.1+3027**, commit `14361a94b32888f6a81182e9e239f513d39d060c`. Workflow, profiles, machine controls, utilities, shot history and independent device/machine/scale/shot-state streams are wired to REST/WebSocket endpoints. There is no fallback to demo readings and no automatic discovery or machine command on load.

Decaid must own shot sequencing, stop-at-weight and history. Use **tracking** mode (or the native managed `disabled` gateway mode). The skin blocks new operations in full gateway mode, where gateway-owned sequencing is not assured. It never changes gateway mode automatically. Daily starts and stops use the physical group-head controller; no command is replayed.

The five favorite positions use a nullable ID array in Decaid's `decent-skin-codex/favorites` KV value. Only confirmed key absence suggests the first five visible profiles; Decaid’s 200/null response is checked against the namespace key list. Saved empty positions and unavailable IDs remain in place. Use **Browse profiles → Manage favorites** to replace, swap, reorder or clear positions, then Save. Loading a library profile changes the workflow independently. Failed saves retain both the last acknowledged rail and the editor draft.

**Settings** sits beside History. Static query routes support direct entry, reload and browser Back: `?page=settings`, `?page=library`, `?page=favorites`, and `?page=profile&profile=<encoded ID>`. All pages share one session. A newly observed machine shot start returns to Focus, closes overlays and retains settings and favorite drafts and staged imports; return to Manage favorites or Profile library to recover them. Ordinary navigation away from that editor prompts before discarding changes. Reload/unload prompts for unsaved changes where the browser supports it; drafts do not persist across a completed reload.

The library supports search, sorting, visible/hidden views, details/target preview, hide/restore and JSON profile-record import/export. Imports show imported, skipped and failed counts; existing IDs are skipped by Decaid. Profile editing includes stage forms, JSON, draft previews, default forks, version restoration and recoverable ID remapping. Daily-use settings cover connections, utility recipes and stop policies, machine/power, display/presence, wake schedules and supported connected grinders. Each settings section has its own Save/Cancel and retains rejected changes. Unsupported capabilities are unavailable. Later-phase categories expose no placeholder hardware controls. Artwork is decorative, bundled and independent of recipe data.

See [integration contract](docs/DECAID.md), [locked design](docs/design/FOCUS.md), and [verification and device acceptance](docs/VERIFICATION.md).

The [skin completion roadmap](docs/SKIN-ROADMAP.md) records the planned screens, settings inventory, Decaid API ownership, and implementation phases. Phases 2–8 are implemented. Phase 9 local release checks and packaging are available; supervised tablet acceptance remains pending. Follow the [tablet acceptance checklist](docs/TABLET-ACCEPTANCE.md). See the verification record for fixture and device status.

## Tests and limits

Gateway unit tests cover command gating, malformed data, workflow preservation, failed writes, sequencing, scale loss and stale samples. Browser tests build the same app against an isolated local API fixture on port 18081. The fixture does not forward requests and is not packaged in the skin. Run `npm run check` or `npm run build` before the browser suite: its release smoke test also reads `dist/`, serves it under a nested skin path, and blocks all API/WebSocket traffic before loading it.

Desktop validation does **not** establish Samsung WebView or machine acceptance. Read-only tablet checks on November 6 confirmed the installed assets, REST reads, telemetry streams and desktop browser navigation. Actual tablet CSS viewport, background/resume, physical group-head operation, stop-at-weight and device behavior still need on-tablet verification. Do not describe this release candidate as hardware verified.

## Source layout

- `src/skin/`: the sole Focus UI, assets and fixed visual tokens.
- `src/gateway/`: contract-based wire types, normalization, commands and subscriptions.
- `src/components/ui/`: existing Base UI / shadcn primitives.
- `tests/`: isolated contract fixture and browser acceptance checks.
- `docs/design/HISTORY.md`: historical exploration decisions. Retired screen source is available in Git history at `5f3ce07`.

### Daily-use settings

Open `?page=settings&category=connections`, `brew`, `machine` or `display`.
Device discovery and all operational actions are explicit. Focus never scans on
page load or sends grinder commands when a recipe changes. The optional recipe
Send permission starts off on every Connections visit and device change; the
Send button sends once. Runtime grinder IDs and recipe grind text remain separate.
Temperature units change presentation only; Decaid continues to receive Celsius.
Sleep shows a minimal wake view without altering the ready/brewing layout.

Settings category navigation retains drafts. Save/Cancel applies to the current
section; failed sections retain their edits independently. Shot interruption
retains drafts in memory. Reload does not persist drafts.

To run browser checks while another fixture preview is open, use separate ports:

```sh
FOCUS_FIXTURE_PORT=18082 FOCUS_TEST_PORT=4176 npm run test:e2e
```

Test API origins are always loopback and the runner starts the isolated fixture.
No hardware validation is implied by these tests.

### Recipes, coffee and equipment

Open a profile's **Details → Edit profile** for metadata, ordered stages,
transitions, limits and exit conditions. Save updates a user profile; **Save as
new** forks a default or user profile. Decaid deduplicates executable content:
changing only a title cannot create a separate copy. Edits never start a shot or
replace the loaded workflow. Load the saved record explicitly when ready.
**Lineage and revert** restores a version into the draft for review before Save.
The editor's temperature fields explicitly use Celsius; Home follows the unit preference.

**Recipe preferences** saves dose, yield, grind text and first-stage temperature
in Focus-owned storage. Loading that profile restores those adjustments while
preserving coffee/equipment context and relative stage temperatures. Adjusting
Home still changes the current workflow; it does not silently overwrite saved
per-profile preferences or move a grinder.

**Coffee & equipment** manages beans, roast batches (including remaining weight)
and grinder records. Use a batch or equipment record in the active recipe,
archive/restore records, and edit their descriptive fields. Connected grinder
controls remain under Connections; equipment IDs are not device IDs.

Routes are `?page=edit&profile=<ID>`, `?page=edit` for a new recipe,
`?page=recipe&profile=<ID>` and `?page=inventory`. Editor drafts are held above page
navigation and survive shot interruption in memory. Confirming discard or completing a
reload loses unsaved edits. A pending profile save has a separate durable
recovery record: **Retry pending save** finds an already saved profile and
finishes outstanding reference updates without blindly resubmitting content.


### Shot history

The existing **History** button opens a shared full-page list. Search and filter
by profile title, coffee, roaster or grinder model; browse 20 records per page.
Open a shot for recorded curves, recipe stages, context and its stored stop
reason. Missing measurements remain gaps; incomplete records never substitute
a current recipe or simulated trace.

Edit actual dose/yield, TDS, extraction yield, enjoyment (0–10) and shot notes.
Save changes only annotations; numeric blanks clear values. Failed saves and
edits made during a save remain in the draft. Refresh preserves unsaved fields;
Cancel restores acknowledged annotations. Shot interruption retains the draft
in memory, while a completed reload discards unsaved changes.

**Repeat recipe** loads the recorded profile and coffee/equipment context only;
it never starts extraction or changes utility settings. **Export saved shot**
and **Export this page** download arrays of complete saved JSON records,
excluding unsaved edits. Deletion requires confirmation and has no Undo.
Routes are `?page=history` and `?page=shot&shot=<encoded ID>`.

### Advanced operations

Settings now includes **Calibration**, **Maintenance**, and **Updates and data**.
Machine and power also includes advanced heater/voltage tuning, service reset,
and capability-dependent cup warmer, scheduled mat preheat and lighting.
Focus Home and brewing retain their locked design.

Calibration keeps sensor corrections, flow estimation and integrated load-cell
procedures separate. Record paired measured values, confirm once, then inspect
the returned calibration. Sensor readings clear after an attempt because
resending a correction can apply it twice. Steam temperature/flow stays under
Brew and utilities; no separate steam-sensor API exists in the installed target.

Maintenance starts only from fresh idle state after explicit preparation.
Descaling requires the steam heater off and a measured boiler temperature of
60 °C or below. There is no delayed automatic start after cooling. Stop waits
for an outstanding start request to settle, then sends idle. Reconnect displays
actual machine state; a missing stream or elapsed timeout never means success.
Restore steam settings explicitly after descaling.

Updates are separate tabs for machine firmware, the Decaid app and installed
skins. Firmware installs only applicable bundled artifacts and requires the
stream's verified `done` result. App installation may require native Android
prompts. **Check and install skin updates** really installs updates; successful
skin updates remain if another fails. The current serving URL is preserved.

Full ZIP backup/import uses Decaid's archive API. Browser exports are bounded to
128 MiB; larger exports use native Decaid data management. File imports support
Decaid's 2 GiB request ceiling without decoding the archive in JavaScript.
Choose skip/overwrite conflicts explicitly and inspect all section outcomes.
Section selection is available for instance-to-instance sync; the installed
HTTP ZIP handlers always export all sections and import those present. Two-way
sync stops after an incomplete pull. Unsupported de1app/Tcl migration remains
in the native data-management flow.

Routes: `?page=settings&category=calibration`, `maintenance`, `machine`, or
`updates`. Operation state and drafts live above page navigation. Hardware and
Samsung WebView acceptance remain required before deployment.

### Extensions and support

**Settings → Extensions** lists installed plugins, runtime/startup state,
permissions and update outcomes. Open a plugin’s settings to edit its exposed
manifest fields. Save sends only changed fields; secure credentials remain
masked and clearing one requires Save. Plugin pages open separately with a
return address to this skin. DYE2, shot upload, Home Assistant and assisted
dial-in appear only when their installed manifests provide the needed UI.

Enable, disable, remove, install and update are explicit actions. **Check and
install plugin updates** can install updates immediately; added permissions need
separate approval. Partial successes remain installed. GitHub releases/branches
are supported; local ZIP/folder installation remains in native Decaid.

**Settings → System and help** includes versions, log/update-check preferences,
quick start, diagnostics, logs, account status and reviewed feedback. Feedback
sends only your description/type through Decaid to its configured GitHub issue
repository and may link to Decent support. It attaches no logs, screenshots or
system information. Login, credentials, account consent and private support
packages remain native. No feedback or diagnostic upload happens on page load.

Direct routes are `?page=settings&category=extensions`, optionally with
`&plugin=<encoded ID>`, and `?page=settings&category=help`. Drafts survive page
navigation and shot interruption within the session, but not a reload. Device
acceptance remains phase 9.

## Phase 5 integration candidate

The approved Phase 4.1 Home and brewing experience is integrated on
`codex/phase-5-production-integration` as version 0.3.0. It uses the existing
Decaid gateway and guarded navigation/writes. See [the integration audit and
validation record](docs/PHASE-5-INTEGRATION.md). The isolated design preview still
runs with `npm run dev:brewing`; no preview controls enter the production build.
This candidate is not deployed and requires supervised tablet/machine acceptance.


## 0.3.1 refinement candidate

The four v0.3.0 feedback corrections are on `codex/focus-0.3.1-refinements`.
The Home preview hides incomplete target series and keeps its legend in sync;
mixed pressure/flow profiles may display only temperature. Live brewing is
unchanged. See [changes, validation and tablet recheck](docs/REFINEMENT-0.3.1.md).
This is a local candidate; installing or replacing the working v0.3.0 skin
requires approval.


## 0.3.2 refinement candidate

This pending-review candidate is on `codex/focus-0.3.2-refinements`. Header groups
wrap only when their contents cannot fit. Home displays meaningful partial
Pressure/Flow/Temperature targets without joining gaps. Brewing time-range
expansions zoom smoothly, and one shared transition slides both panels while
expanding or contracting the chart. Preview targets and live telemetry remain
separate graphics. See [implementation and validation](docs/REFINEMENT-0.3.2.md).
The installed v0.3.1 skin has not been replaced.
