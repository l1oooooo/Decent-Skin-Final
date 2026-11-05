# Decent Focus

Focus is the locked Home and brewing screen for the Decaid skin. Settings, profile library/details, favorite management and shot history share its visual system. The locked Monochrome Studio design uses surface tone **0.16**, the Cover profile rail and the rolling Focus brewing status. It is rendered directly at the requested **1340 × 800** landscape viewport; no exploration picker, appearance controls or simulated data ships in the application.

## Run and build

```sh
npm ci
npm run dev
npm run check
npm run test:e2e
npm run package:skin
```

`npm run package:skin` creates `artifacts/decent-skin-codex-0.2.0.zip` with `index.html`, `manifest.json`, fonts and assets at the archive root. Install that archive through Decaid's skin management. No Node server is required on the tablet. `dist/` and generated archives are not committed.

An installed skin connects to its serving hostname on API port **8080**, independent of its skin port. For desktop development, set `VITE_DECAID_URL` in `.env.local` (see `.env.example`) to the tablet's gateway origin, then restart Vite. This is a build-time setting: a release intended for installation on the tablet should normally be built without an override. Do not publish a build that points to the isolated test fixture.

## Integration

The adapter is verified against the published contract at installed Decaid **0.9.1+3027**, commit `14361a94b32888f6a81182e9e239f513d39d060c`. Workflow, profiles, machine controls, utilities, shot history and independent device/machine/scale/shot-state streams are wired to REST/WebSocket endpoints. There is no fallback to demo readings and no automatic discovery or machine command on load.

Decaid must own shot sequencing, stop-at-weight and history. Use **tracking** mode (or the native managed `disabled` gateway mode). The skin blocks new operations in full gateway mode, where gateway-owned sequencing is not assured. It never changes gateway mode automatically. Stop remains an explicit, unreplayed request.

The five favorite positions use a nullable ID array in Decaid's `decent-skin-codex/favorites` KV value. Only a missing-key 404 suggests the first five visible profiles. Saved empty positions and unavailable IDs remain in place. Use **Browse profiles → Manage favorites** to replace, swap, reorder or clear positions, then Save. Loading a library profile changes the workflow independently. Failed saves retain both the last acknowledged rail and the editor draft.

**Settings** sits beside History. Static query routes support direct entry, reload and browser Back: `?page=settings`, `?page=library`, `?page=favorites`, and `?page=profile&profile=<encoded ID>`. All pages share one session. A newly observed machine shot start returns to Focus, closes overlays and retains settings and favorite drafts and staged imports; return to Manage favorites or Profile library to recover them. Ordinary navigation away from that editor prompts before discarding changes. Reload/unload prompts for unsaved changes where the browser supports it; drafts do not persist across a completed reload.

The library supports search, sorting, visible/hidden views, details/target preview, hide/restore and JSON profile-record import/export. Imports show imported, skipped and failed counts; existing IDs are skipped by Decaid. Profile editing includes stage forms, JSON, draft previews, default forks, version restoration and recoverable ID remapping. Daily-use settings cover connections, utility recipes and stop policies, machine/power, display/presence, wake schedules and supported connected grinders. Each settings section has its own Save/Cancel and retains rejected changes. Unsupported capabilities are unavailable. Later-phase categories expose no placeholder hardware controls. Artwork is decorative, bundled and independent of recipe data.

See [integration contract](docs/DECAID.md), [locked design](docs/design/FOCUS.md), and [verification and device acceptance](docs/VERIFICATION.md).

The [skin completion roadmap](docs/SKIN-ROADMAP.md) records the planned screens, settings inventory, Decaid API ownership, and implementation phases. Phases 2–7 are implemented; phase 8 remains planned and phase 9 is device acceptance. See the verification record for fixture and device status.

## Tests and limits

Gateway unit tests cover command gating, malformed data, workflow preservation, failed writes, sequencing, scale loss and stale samples. Browser tests build the same app against an isolated local API fixture on port 18081. The fixture does not forward requests and is not packaged in the skin.

Desktop validation does **not** establish Samsung WebView or machine acceptance. The tablet reported gateway `http://192.168.50.13:8080`, but it was unreachable from the development computer. Installation, actual CSS viewport, background/resume, physical group-head operation, stop-at-weight and device behavior still need on-tablet verification. Do not describe this release candidate as hardware verified.

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
