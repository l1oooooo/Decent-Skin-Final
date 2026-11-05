# Focus skin completion roadmap

Approved November 4, 2026. Baseline: [`34b4ef6`](https://github.com/l1oooooo/Decent-Skin-Final/commit/34b4ef6), Focus skin 0.2.0. This document defines the phased scope. The implementation status below distinguishes completed software work from remaining device acceptance.

## Current implementation status — November 4, 2026

| Phase | Software status | Acceptance |
| --- | --- | --- |
| 1 — Baseline and roadmap | Completed baseline/planning checkpoint | Existing baseline evidence retained |
| 2 — Shared page system | Implemented: one persistent session, query routes, Settings entry/categories/search, shared page shell, draft protection and shot interruption | Fixture-verified; device acceptance pending |
| 3 — Favorites and library | Implemented: five nullable positions, assignment/swaps/reorder/clear, acknowledged Save/Cancel, ID-safe selection, details/preview/sorting, hide/restore and import/export | Fixture-verified; device acceptance pending |
| 4 — Daily-use settings | Implemented: explicit connections, utility/policy drafts, machine power, display/presence, schedules, units and descriptor-gated grinder commands | Fixture-verified; device acceptance pending |
| 5 — Recipes, coffee and equipment | Implemented: stage/JSON editors, default forks, lineage/revert, ID recovery, recipe preferences and bean/batch/grinder inventory | Fixture-verified; device acceptance pending |
| 6 — History | Implemented: filtered/paged list, recorded curves/context, canonical annotations, recipe repeat, saved-record export and confirmed deletion | Fixture-verified; device acceptance pending |
| 7 — Advanced operations | Implemented: measured calibration, maintenance tracking/cancellation, supported accessories, firmware/app/skin updates, backup/import and sync outcomes | Fixture-verified; device acceptance pending |
| 8 — Extensions and support | Planned; Settings category descriptions identify future scope | Not implemented or accepted |
| 9 — Tablet acceptance | Pending | No hardware operations performed in phases 2–7 |

The library now uses the shared full-page layout. Daily-use Settings categories are operational where the installed API and returned capabilities support them. Later-phase categories remain informational. Profile content editing and coffee/equipment inventory are available. Favorite, recipe, inventory, history annotation and settings drafts and staged profile imports are held above navigation; shot interruption retains them. A completed reload does not retain unsaved drafts. Profile-save recovery records persist until outstanding reference updates finish. See [integration details](DECAID.md) and [verification evidence](VERIFICATION.md).

## 1. Deliverables, decisions, and evidence

The immediate deliverable is to commit and push the approved Focus baseline, then commit and push this roadmap separately. Future screen development is a separate implementation phase. Generated output and the pre-existing historical export script are excluded from these commits.

Complete the surrounding skin in phases while preserving the approved Focus Home and brewing screen. Decaid owns device connections, execution, persistence, and updates. Streamline is the functional reference, not a runtime dependency or a visual template to copy.

Confirmed decisions:

- Complete phased coverage, including advanced operations inside Focus where Decaid exposes working APIs.
- Explicit favorite management in the profile library; no long-press-only interaction.
- Five stable favorite positions. Loading a library profile is independent of assigning a favorite.
- English first. Organize UI strings for future localization, without an empty language selector.
- Extensions have a separate area and cannot inject tiles, controls, or overlays into Home.
- The locked appearance remains surface tone **0.16**, Geist, 8px controls, and the approved Focus spacing and motion. No appearance picker or alternate dashboard.
- No automatic Decaid upgrade. Installed-version compatibility and real device acceptance remain release gates.

### Research baseline and source order

| Source | Pinned version | Use |
| --- | --- | --- |
| Focus | `34b4ef6` | Current behavior, reusable components, and locked appearance; see [design](design/FOCUS.md), [integration](DECAID.md), and [validation](VERIFICATION.md). |
| Streamline JS | `65460d41e47bac266a9b3e25bcfa966217f7e90e` | [Settings tree][settings-tree], [settings implementations][settings-source], [profiles/favorites][profile-notes], [workflow ownership][workflow-notes], and [API wrappers][streamline-api]. |
| Installed Decaid | `0.9.1+3027`, `14361a94b32888f6a81182e9e239f513d39d060c` | [REST schema][rest], [WebSocket schema][ws], [skin architecture][skins], and native handlers/models. |

Recheck the installed version before each integration phase. Streamline's newer UI must not override the installed Decaid contract. A schema field alone is not proof of working hardware behavior. In particular, installed `SteamSettings.stopAtTemperature` is documented as scaffolding: do not offer functional milk-temperature stopping until actual support is verified.

### Reusable baseline and known gaps

Reuse the existing typed gateway, single subscribed session, workflow patching, reconnect/disposal handling, command gates, profile preview/trace, UI primitives, dialogs, and isolated test fixture.

At baseline `34b4ef6`, Home already had real recipe adjustments, profile loading, brewing/stopping, utility controls, status telemetry, completion handling, and basic shot history. Favorites were read-only: the loader filtered to string IDs and fell back to visible profiles when empty. It did **not** preserve intentional empty slots or unavailable assignments, and the active-profile lookup used title matching. Phase 3 replaces these behaviors as recorded in the current status table.

No Settings route, favorite editor, profile editor, inventory manager, service workflow, update manager, or extension manager exists in this baseline.

## 2. Screen and feature matrix

All REST paths below are relative to `/api/v1`; socket paths are relative to `/ws/v1`. Phase numbers correspond to section 6. “Partial” describes code available now, not completed device acceptance.

| Screen / area | Current behavior | Required additions | Owning API / source | Capability / constraint | Phase | Acceptance criterion |
| --- | --- | --- | --- | --- | --- | --- |
| Home and brewing | Locked Focus, real telemetry, recipe controls, utility start/stop | Settings entry, stable empty favorite positions, sleep/wake access, navigation interruption on actual shot start | `workflow`, `machine/state/{state}`, machine/scale/shot sockets; [skin guide][skins] | Preserve existing command gates and geometry | 2–4 | Home reference regions unchanged; physical start returns to Focus without losing drafts |
| Profile library and details | Search, favorites filter, load visible profiles | Preview/details, sorting, visible/hidden views, assignment, import/export, hide/restore, editing entry | `profiles`, `profiles/{id}`, visibility, import/export, defaults, lineage; [profile behavior][profile-notes] | Default content is immutable; IDs can change after edits | 3, 5 | Library load changes workflow only; hidden/default/duplicate-title cases remain unambiguous |
| Manage five favorites | Reads ID array from KV | Replace, reorder, clear, fill, save/cancel, unavailable assignments | GET/POST `store/decent-skin-codex/favorites`; [favorites implementation][profile-manager] | Exactly five nullable IDs; no duplicates | 3 | Saves survive reload; all-empty stays empty; failed saves leave acknowledged rail unchanged |
| Settings shell | Absent | Search, categories, route history, draft controls, field errors, return to Home | Focus UI and preferences KV; [Streamline settings tree][settings-tree] | No second gateway/session | 2 | Back/direct-entry/reload work; unsaved changes and late responses are handled correctly |
| Connections | Device status and known-scale reconnect | Inventory, explicit scan/connect/disconnect/forget, preferred devices, manual Wi-Fi endpoints, diagnostics | `devices`, `devices/{scan,connect,disconnect,forget,wifi}`, `settings`, device socket, `diagnostics/ble`; [REST][rest] | Decaid owns BLE/USB/plugin transport; no silent scans | 4 | Connection failures/conflicts are visible; no command starts on page load |
| Brew and utility settings | Dose/yield/grind/temperature; basic utility parameters | Scale policies, stop compensation, complete steam/water/flush settings, tank/refill settings | `workflow`, `settings`, `machine/settings`, `machine/settings/advanced`; [settings source][settings-source] | Respect machine-specific bounds and acknowledged writes | 4 | Home and Settings show the same saved values; unrelated workflow fields survive edits |
| Machine and power | Status only | Sleep/wake, charging/night schedule, fan/refill configuration, information; supported cup warmer/lighting | `machine/state/{state}`, `settings`, `machine/info`, `machine/capabilities`, `machine/cupWarmer`, `machine/ledStrip`; [REST][rest] | Model/capability gates; controls do not imply unsupported hardware | 4, 7 | Correct settings on DE1 and capability-equipped models; unavailable features stay unavailable |
| Display and presence | Fixed dark appearance; reduced motion | Brightness, wake lock, battery brightness policy, sleep timeout, wake schedules, temperature units, minimal sleep screen, optional shortcuts | `display`, `display/brightness`, `display/wakelock`, `presence/settings`, `presence/schedules`, `machine/heartbeat`, `settings`, Focus KV; [settings tree][settings-tree] | Brightness 100 means OS-managed; actual brightness may be capped | 4 | Reflect requested/applied values; interaction heartbeats do not keep an idle tablet awake indefinitely |
| Profile editor | Absent | Recipe metadata, stages, targets, transitions, limits/exits, chart preview, save/save-as, lineage/revert, structured editing | `profiles`, `profiles/{id}`, visibility/lineage, `workflow`; [profile behavior][profile-notes] | Preserve unknown fields; editing never starts a shot | 5 | Default fork and user edit work; changed IDs remap references with recoverable failures |
| Coffee and equipment | Workflow can preserve existing context, no management UI | Beans, roast batches, inventory, grinder records, archive/restore, workflow assignment | `beans`, `beans/{id}/batches`, `bean-batches/{id}`, `grinders`, `workflow.context`; [API wrappers][streamline-api] | Equipment record ID differs from connected grinder device ID | 5 | Context survives profile changes; archival does not destroy historical shot context |
| Connected grinder controls | No motor commands; grind is a recipe string | Runtime info, supported setting/RPM/start/stop; explicit optional follow/send behavior | `grinder/info`, `grinder/setting`, `grinder/rpm`, `grinder/state/{state}`, grinder socket; [grinder reference][grinders] | Plugin/device descriptors govern commands, bounds, and read-only status | 4, 5 | Recipe editing never moves a grinder without opted-in behavior; no feedback loops |
| Shot history and detail | Recent list, paging, basic result detail | Filters, recorded curves, context, notes, dose/yield/TDS/EY/enjoyment annotations, repeat recipe, export/delete | `shots`, `shots/{id}`, `data/export`; [REST][rest] | Measurements are read-only; enjoyment is 0–10; unavailable records remain explicit | 6 | Saved annotations round-trip; repeat loads a recipe without starting a shot |
| Calibration | Absent | Guided flow, pressure/temperature, steam, supported load-cell calibration; voltage/refill/fan and resets | `machine/calibration`, `machine/calibration/{target}`, `machine/scaleCalibration`, machine settings; [calibration reference][calibration] | Idle/fresh-state gates and actual model/firmware support | 7 | Preparation, measured values, result, rejection, abort, and recovery are tested |
| Maintenance | Absent | Cleaning, descaling, transport/drain instructions and live procedure states | `machine/state/{cleaning,descaling,airPurge,idle}`, machine socket, workflow steam settings; [maintenance source][maintenance] | Observe real state; temperature/preparation prerequisites; no guessed completion timer | 7 | Cancel cannot allow a delayed start; reconnect shows the actual running procedure |
| Machine firmware | Absent | Catalog/eligibility, managed update, verification, supported cancel/recovery | `machine/firmware`, `machine/firmware/apply` NDJSON; [REST][rest] | Progress 100% is not success; terminal `done` confirms verification | 7 | Ineligible artifacts blocked; interrupted/failed verification never reports success |
| Decaid and skin updates | Build string only | Distinct app/skin versions, checks, install/update progress, supported skin management | `info`, `update`, update socket, `webui/skins` and update/install endpoints; [REST][rest] | Platform installability; preserve serving host/port/path; never auto-upgrade | 7 | App, firmware, and skin cannot be confused; return/reload recovery works |
| Backup and data | Absent | Export/import, section/conflict choices, partial results; supported legacy/sync import | `data/export`, `data/import`, `data/sync`; [native data management][native-data] | Large files/partial failure; only supported transfer mechanisms | 7 | User sees skipped/overwritten/failed sections; retry does not imply rollback |
| Extensions | Absent | Plugin inventory, install/update/enable, manifest settings, separate launch surfaces | `plugins`, settings/enable/disable/install/update endpoints, declared plugin routes; [plugin settings][plugin-settings] | Installed manifest/API support; no Home injections or implicit credential sharing | 8 | Unsupported/missing plugins cannot masquerade as native features; safe return to Focus |
| Help, diagnostics, About | Inline errors and build data | Quick start, versions/capabilities, logs, troubleshooting, feedback, supported account/support flows | `info`, `machine/info`, `diagnostics/ble`, `logs`, `webview/logs`, `feedback`, `account/decent`, supported support routes; [settings source][settings-source] | No background feedback/upload; sensitive data reviewed before submission | 8 | Diagnostic reads send no machine command; failed feedback remains retryable without duplicate claims |

## 3. Settings inventory and boundaries

Use one canonical category definition to drive navigation, search, routing, and availability. Related settings share a page shell. Do not reproduce Streamline's visual styling or its internal storage namespace.

| Focus category | Contents and owner |
| --- | --- |
| Connections | Machine/scale/grinder inventory and preferences; manual Wi-Fi endpoints; connection detail, tare when permitted, diagnostics. Device changes go through Decaid. |
| Brew and utilities | Weight/volume/hot-water stop compensation, no-scale blocking, tare-during-shot policy, scale power policy, hot-water stop-at-weight; workflow steam temperature/duration/flow, hot-water temperature/duration/volume/flow, flush temperature/duration/flow. |
| Machine and power | Machine information, sleep/wake, tank temperature, Focus refill warning in mm, fan, refill-kit override, smart charging and night schedule. Supported cup warmer/preheat and lighting follow in phase 7. |
| Display and presence | Brightness and applied limit, keep-awake/override, idle sleep, wake schedules, user-activity heartbeat, Celsius/Fahrenheit display conversion, minimal sleep screen, optional keyboard shortcuts. |
| Calibration | Flow multiplier and guided flow procedure; sensor calibration; model-appropriate steam/load-cell procedures; heater warmup/test flow, idle temperature, timeout, voltage, fan/refill and documented reset access. Avoid duplicate writable owners when linking from Machine. |
| Maintenance | Clean, descale, transport/drain. Preparation, start, active, stop, completion, error, and recovery are distinct states. |
| Updates and data | Machine firmware, Decaid updates, Focus/installed-skin management, backup/export/import and supported legacy transfer. These are separate operations, not one Update button. |
| Extensions | Manifest-driven plugin settings and launch links. Include DYE2, shot upload, Home Assistant, assisted dial-in, and calibrated-steam features only when the relevant installed plugin declares support. |
| System and help | Gateway compatibility/mode, log level, automatic update-check preference, diagnostics, About, quick start, feedback, and supported account/support flows. Full gateway mode still blocks Focus operations; never change it automatically. |

### Streamline features requiring a deliberate classification

- **Capability-dependent:** connected grinder commands, integrated scales/load cells, cup warmer, lighting, preheat, probes, and automatic steam. Check returned capabilities and plugin contracts, not just a product name.
- **Native-only without a public API:** Android WebView composition, OS permission prompts, BLE transport internals such as MTU policy, and native diagnostic switches. Explain the native path; do not display dummy controls or invent endpoints.
- **Excluded by the approved design:** theme/surface pickers, alternate dashboards, Home plugin tile/overlay injection, decorative screensaver customization, and arbitrary layout scaling. Active-skin management is an administrative function, not a Focus theme picker.
- **Deferred:** additional languages. English is the only initial language; later translations require copy and layout review.
- **Not part of the normal user skin:** simulated-device toggles, raw hardware messages, debug replay, and unverified developer/recovery flashing. Keep these in appropriate developer/native tools.
- **Unverified functionality:** milk-temperature stopping in the installed version. A round-tripping value must not be presented as an effective stop control. Water remains mm unless an accurate machine-specific conversion is separately established.

## 4. Interaction and design contract

### Favorites and profile selection

1. Add **Manage favorites** to the library. Show five ordered slots with Replace, Move up/down, and Clear; Save and Cancel are explicit.
2. Replace opens library selection in assignment mode. If the chosen ID exists in another slot, swap the two assignments. Selecting the same slot's current ID is a no-op.
3. Save writes favorites only, using POST `store/decent-skin-codex/favorites`. It never loads a workflow, connects a device, or starts an operation.
4. Continue to load any library profile through the existing workflow path without changing favorites. Preview/browsing alone sends no workflow write.
5. Keep all five rail positions. An empty slot opens assignment; an unavailable ID stays labeled unavailable with replacement/clear access, rather than silently loading another recipe.
6. Read old string arrays in their original order and normalize to five nullable positions in memory. Only missing-key 404 permits initial visible-profile suggestions; a saved empty array or five nulls is intentionally empty. Malformed data is a recoverable error, not permission to overwrite it.
7. Persist normalization only on explicit Save. Prevent duplicate IDs; preserve the first existing occurrence in malformed duplicate input and flag the later slot for correction. Failed writes preserve the last acknowledged rail and retain the editor draft.
8. Loading/profile editing must retain actual IDs and resolve workflow-to-record ambiguity without guessing by title. If there is no unambiguous record, show the active recipe without incorrectly highlighting a favorite.
9. Profile edits that change IDs remap favorites, per-profile preferences, and other Focus-owned references such as a wake-profile preference where used. Since these are separate API writes, record outstanding remaps and offer retry after partial success; never claim the entire operation was atomic.

### Shared visual system and navigation

- Reuse [locked Focus tokens and geometry](design/FOCUS.md): surface tone 0.16, Geist, 8px controls, muted borders, Lucide icons, tabular metrics, 150ms feedback, existing rolling motion and reduced-motion behavior.
- Preserve Home's 72px header, 220px Cover rail, 792px center, 328px right panel, and 96px footer at 1340 × 800. Add a 48px Settings entry beside History without moving the main columns.
- New full-page views reuse the header, 220px navigation rail, content padding, and 96px action footer. Their content uses the remaining width; do not force Home's right column onto every form.
- Use grouped rows and dividers, consistent field labels and help text, shared numeric/string editors, and the existing button/dialog vocabulary. Avoid unrelated card grids, decorative gradients, or page-specific visual themes.
- Add query-based routes compatible with static hosting, browser Back, direct entry, and reload. Unknown routes return to Home. No server rewrites or new application server.
- Keep one gateway/session mounted above page navigation. UI pages subscribe to that session instead of opening independent machine streams.
- A newly observed physical shot start takes the user to Focus. Retain unsaved drafts for recovery; do not block access to live Stop behind an unsaved-changes prompt. Prompt before ordinary navigation discards a draft.
- Primary touch controls target 48px and never fall below 44px. Preserve focus restoration, keyboard use, dialog focus, overflow containment, and on-screen keyboard usability.

### Forms, preferences, and public interfaces

Extend the existing typed gateway with domain operations rather than spreading fetch calls through components. Keep wire models separate from drafts and presentation models. Add typed profile-record metadata/visibility/lineage, nullable favorite slots, settings/capability/display/presence records, inventory, shot annotations, plugin manifests, and operation-progress results as their phases land.

- Separate Decaid settings, machine settings, workflow fields, and Focus-only KV preferences. Each field has one owner.
- Settings pages hold a draft and save only changed fields to the owning API. Cancel discards unsaved changes. Refreshes cannot overwrite dirty fields; saves cannot discard newer edits made while a request was pending.
- Apply acknowledged responses, then refresh authoritative state as needed. Errors remain attached to the relevant section. Multi-endpoint saves report which sections succeeded and retain failed changes; do not pretend to roll back hardware.
- Store per-profile recipe adjustments in Focus-owned KV, separate from executable definitions and Streamline preferences. Loading another profile restores its saved adjustments when available, without starting a shot. Preserve unknown profile/workflow fields.
- Default profiles require a user fork for content edits. Save-as-new leaves the source and its favorites intact. Save/revert flows must use actual returned IDs and lineage.
- Connected grinder readings and recipe grind text remain separate. Optional Follow/Send controls default off; only exposed writable descriptors permit a motor-setting command, and echoed values must not loop.
- New operation controls require appropriate live state and capability checks. Never queue/replay commands across reconnect, silently scan, enable plugins, or substitute simulated readings.
- Plugins use Focus-styled manifest settings and separate plugin-owned pages. Validate navigation/return destinations. Do not rewrite third-party pages or allow plugin settings to alter Home's structure.
- Maintenance/calibration/firmware use operation-specific state machines, timeouts, cancellation and reconnect recovery. They are not generic settings forms. Dangerous or destructive operations require clear, contextual confirmation and a visible outcome.

## 5. Compatibility details that must survive implementation

- Decaid remains the shot sequencer and stop-at-weight owner. Continue to support native-managed tracking/disabled modes and block new Focus operations in full gateway mode.
- The workflow endpoint has no revision/ETag conflict control. Send owned-field patches, serialize related writes, fence stale reads, and resynchronize after outside changes; do not claim cross-client transactional consistency. See [workflow ownership][workflow-notes].
- Profile content edits can change IDs; default content cannot be overwritten. Metadata updates and executable changes have different semantics.
- Display brightness 100 requests OS-managed brightness. Show requested versus actual values when a battery policy caps the result.
- Shot measurements/timestamps are not editable. Use canonical annotations; enjoyment is 0–10. Repeating a shot loads its recipe and context, never starts it.
- Firmware progress must track the NDJSON operation through verification to terminal `done`; an upload reaching 100% is not sufficient. Reconnect must inspect available operation state and show uncertainty when it cannot be recovered.
- Decaid application updates use their own state/socket interface and platform installability. Skin installation/update has a separate API and can replace the currently running page.
- Descaling requires preparation and appropriate steam temperature handling. An interrupted wake/cooldown sequence must not issue a delayed start after cancellation. Restoration is explicit and failure-visible, not a blind command replay on page mount.
- Embedded WebViews can unload after prolonged backgrounding. Persist durable user preferences via Decaid, resynchronize on resume, and never infer a new shot start from replay timestamps.
- Platform/native-only features stay documented as such. Do not copy an upstream UI action whose installed handler/capability is absent.

## 6. Implementation and creation sequence

For each phase: specify screens and states, implement one Focus-consistent design, review fidelity, wire verified APIs, test success/failure/recovery, package, and record acceptance. Do not restart multiple visual explorations.

### Phase 1 — Baseline and roadmap

1. Review/stage the approved implementation, excluding generated output and the unrelated export script.
2. Run required checks; commit and push the baseline to existing `main` without force.
3. Add this roadmap and feature matrix; commit/push documentation separately.
4. Record baseline evidence without presenting desktop checks as device acceptance.

**Completion:** baseline `34b4ef6` is pushed; this document is the separate planning deliverable. At that checkpoint, no future screen was marked implemented.

### Phase 2 — Shared page system

1. Add persistent app/session ownership and query navigation, including Back/direct-entry behavior.
2. Add Settings entry, page shell, category/search definitions, shared form/list/detail components, and section draft handling.
3. Handle physical-shot navigation while preserving drafts and keeping Stop accessible.
4. Capture Home before/after and prove unchanged layout except the approved Settings entry.

**Exit gate:** shell navigation, loading/error/empty states, focus, dirty drafts, and shot interruption pass isolated browser tests.

### Phase 3 — Favorites and library

1. Add five-slot nullable persistence and acknowledge-only Save behavior.
2. Build explicit management and assignment modes, including swaps, reordering, clear, unavailable slots, and Cancel.
3. Remove ambiguous title-based selection and add profile detail/preview and sorting.
4. Add import/export and hide/restore with appropriate source/default restrictions; editor entry is enabled when phase 5 is ready.

**Exit gate:** library loading never changes favorites; reload, all-empty, malformed/missing IDs, duplicate swaps, and failed writes pass.

### Phase 4 — Daily-use settings

1. Build explicit device management and connectivity diagnostics.
2. Add complete workflow utility settings and Decaid scale/stop policies, reusing Home's field ownership.
3. Add machine information, sleep/wake, tank/refill preferences, charging and night schedule.
4. Add display/brightness, presence/idle sleep/wake schedules, units, minimal sleep view, and optional shortcuts.
5. Add capability-driven connected grinder controls; keep automatic recipe/device synchronization disabled until deliberately enabled.

**Exit gate:** dirty/failed/partial writes remain truthful; Home and Settings agree; unsupported controls are unavailable; page visits send no operational commands.

### Phase 5 — Recipes, coffee, and equipment

1. Build profile detail editing, ordered stage forms, exit/limit validation, structured editing, and shared chart preview.
2. Implement default forks, save-as-new, user-profile updates, lineage/revert, ID remapping, and retryable partial failures.
3. Add per-profile recipe preferences and context preservation.
4. Add bean/roast-batch inventory and grinder records, archive/restore, and workflow selection.

**Exit gate:** default/user/duplicate-title profiles remain distinct; unknown fields survive round-trip; historical records remain meaningful after inventory changes.

### Phase 6 — History

1. Expand the existing recent-shot dialog into the shared list/detail shell with filters and paging.
2. Reuse trace rendering for recorded curves and show the recorded recipe/context and real stop reason.
3. Add canonical notes and annotations, repeat recipe, export, and confirmed deletion.

**Exit gate:** measurements remain read-only; annotations round-trip; repeat never sends a start command; missing/partial records are honest.

### Phase 7 — Advanced operations

1. Implement each calibration procedure separately with prerequisites, measured inputs, actual results, and recovery states.
2. Implement cleaning, descaling, and transport/drain with real machine-state tracking and cancellation.
3. Add supported cup warmer/preheat/lighting and advanced machine settings.
4. Implement firmware catalog/eligibility/update/verification/cancellation separately from Decaid and skin updates.
5. Add backup/import/export and supported legacy/sync transfers with explicit conflict choices and section-level outcomes.

**Exit gate:** fixture operation scenarios pass before supervised hardware use; no “done” label based only on elapsed time or upload percentage.

### Phase 8 — Extensions and support

1. Build plugin inventory and manifest-derived settings, enable/disable, installation/update management, and safe launch/return behavior.
2. Add capability-dependent launch points for DYE2, shot upload, Home Assistant, assisted dial-in, and other installed plugins.
3. Add diagnostics, About, quick start, logs, feedback, and supported account/support flows. Keep native-only instructions explicit.

**Exit gate:** no plugin alters Home; unsupported endpoints are handled; external submissions are explicit and failures visible.

### Phase 9 — Tablet acceptance and release

1. Build and inspect the static skin archive with relative assets and no fixture endpoint or test code.
2. Install through Decaid's skin manager in a supervised device session.
3. Measure actual CSS viewport, pixel ratio, visual viewport, WebView version, font loading, touch/keyboard behavior, and background/resume.
4. Validate physical shot start, real frames, manual stop, stop-at-weight, scale loss, reconnect, utilities, stored shots, and each enabled service operation.
5. Record device evidence and unresolved constraints; only then mark the covered feature set production-accepted.

**Exit gate:** desktop tests and actual device acceptance are both recorded. Unsupported or unverified procedures remain gated.

## 7. Validation and tracking

| Area | Required cases |
| --- | --- |
| Visual | 1340 × 800 reference comparison; unchanged Home regions; shared typography/colors/spacing; long labels/values; no clipping or accidental scaling |
| Favorites | Existing arrays, missing key, all-empty, nullable slots, duplicates/swaps, unavailable IDs, reload persistence, failed Save, Cancel, library load independence |
| Forms and navigation | Field errors, save/cancel, late reads, edit during save, partial writes, Back/reload/direct entry, shot-start interruption, focus return, keyboard and touch |
| Integration | Stale/disconnected devices, unsupported capabilities, mode restrictions, workflow preservation, changed profile IDs, duplicate titles, reconnect/resume, no command replay |
| Operations | Rejected start, in-flight stop/cancel, delayed-start cancellation, interrupted maintenance/calibration, firmware verification failure, unknown recovery state, import partial results |
| Accessibility | At least 44px hit areas/48px primary controls, named controls, keyboard focus, dialog containment, screen-reader status, reduced motion, on-screen keyboard |
| Packaging | Root index/manifest, relative assets, bundled font/artwork, no source/tests/fixture origin/secrets, no Node requirement on tablet |
| Device | Installed Samsung WebView, measured viewport, physical controls and stop policies, scale loss, background/unload/reload, utilities, history and enabled service functions |

Run `npm run check` for application/configuration work. Run the isolated-fixture browser suite for new UI/integration behavior, plus relevant targeted regressions. Package and inspect release candidates. Never aim tests at a real machine.

At the baseline checkpoint, `npm run check` passed TypeScript, lint, all 18 gateway tests, and the production build. Prior validation includes six browser scenarios and the focused first-sample chart regression; see [verification record](VERIFICATION.md). No application code changed while writing this roadmap.

The tablet API was unreachable from the development computer during baseline validation. Installation, Samsung WebView acceptance, and physical machine operations remain unverified. The locked Stop label also retains its documented contrast shortfall; do not claim WCAG AA conformance or silently change its approved color.

For future work, track every phase as **planned**, **implemented**, **fixture-verified**, then **device-accepted** where applicable. Update the matrix and validation evidence as work lands; do not equate a saved plan or a passing static build with completed features.

## References

[settings-tree]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/src/settings/settings-tree.js
[settings-source]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/src/settings/settings.js
[profile-notes]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/docs/AI_PROFILES_NOTES.md
[profile-manager]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/src/modules/profileManager.js
[workflow-notes]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/docs/AI_WORKFLOW_NOTES.md
[streamline-api]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/src/modules/api.js
[grinders]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/docs/grinders.md
[calibration]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/docs/calibration-endpoints.md
[maintenance]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/src/settings/categories/maintenance.js
[plugin-settings]: https://github.com/decentespresso/streamline-js/blob/65460d41e47bac266a9b3e25bcfa966217f7e90e/docs/plugin-settings-ui.md
[rest]: https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/assets/api/rest_v1.yml
[ws]: https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/assets/api/websocket_v1.yml
[skins]: https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/doc/Skins.md
[native-data]: https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/settings/data_management_page.dart
