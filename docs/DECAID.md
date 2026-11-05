# Decaid integration contract

## Verified source version

The tablet's `/api/v1/info` reported Decaid **0.9.1+3027**, commit **14361a94b32888f6a81182e9e239f513d39d060c**, build time 2026-10-28T06:20:27Z, local IP 192.168.50.13. Its network address was not reachable from the development computer. API compatibility below is a source/schema review, not a successful hardware session.

Authoritative references:

- [Installed REST schema](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/assets/api/rest_v1.yml)
- [Installed WebSocket schema](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/assets/api/websocket_v1.yml)
- [Installed workflow handler](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/services/webserver/workflow_handler.dart)
- [Installed profile model](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/models/data/profile.dart)
- [Official skin guide](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/doc/Skins.md)

The fields used here were also checked against main commit c9e2650; the installed version is the acceptance target.

## Ownership and origin

Decaid owns device discovery/pairing, connections, workflow uploads, execution, stop-at-weight and shot storage. This UI issues explicit commands and displays the returned state. It does not implement a competing shot sequencer, silently scan for hardware, retry machine commands or simulate measurements.

Skin entry is port 3000, which redirects to an assigned origin. The API origin is the serving hostname on 8080 unless `VITE_DECAID_URL` explicitly supplies another HTTP(S) origin. Assets use relative URLs and are fully bundled. There is no service worker or cached command queue.

The adapter requires the managed sequencing modes `tracking` or `disabled`. Full gateway mode is blocked for new operations: the official shot-state channel documents that no sequencer runs in background full mode. The skin does not silently change this setting. Decaid remains responsible for tare, weight stops, utility duration limits and recording.

## UI bindings

| Control/data | Contract |
| --- | --- |
| Current recipe | GET `/api/v1/workflow` |
| Dose / yield | PUT workflow with `context.targetDoseWeight` / `context.targetYield` |
| Grind | PUT workflow with string `context.grinderSetting`; it records the setting, not a motor command |
| Temperature | PUT complete preserved profile with equal offset applied to each step's `temperature`; preserve relative step temperatures |
| Profile list | GET `/api/v1/profiles?includeHidden=true`; visible/hidden views use returned record metadata |
| Profile selection | PUT workflow with returned complete `profile`, including executable fields; positive profile target weight becomes workflow target yield |
| Favorite order | GET/POST `/api/v1/store/decent-skin-codex/favorites`; POST a five-element nullable ID array, acknowledge on 204; only GET 404 means no stored preference |
| Hide / restore profile | PUT `/api/v1/profiles/{id}/visibility` with `{ "visibility": "hidden" }` or `"visible"`; use returned record, preserve favorites and workflow |
| Profile import | POST `/api/v1/profiles/import` with exported record array; imported/skipped/failed/errors are separate, existing IDs are skipped |
| Profile export | GET `/api/v1/profiles/export?includeHidden=true&includeDeleted=false`; preserve complete records |
| Steam enable/time | `steamSettings.targetTemperature` (0 disables, 140 enables), `duration` |
| Water temperature/time | `hotWaterData.targetTemperature`, `duration` |
| Flush time | `rinseData.duration` |
| Brew/steam/water/flush/stop | Explicit PUT `/api/v1/machine/state/{espresso,steam,hotWater,flush,idle}` |
| Scale reconnect | Explicit PUT `/api/v1/devices/connect?deviceId=…` for a known scale; no automatic scan |
| History / details | GET `/api/v1/shots?limit=20&offset=…`, `/api/v1/shots/{id}` |
| Device connections | GET `/api/v1/devices` plus `/ws/v1/devices` |
| Readings / rolling stage | `/ws/v1/machine/snapshot`; `profileFrame` is zero-based into actual profile steps |
| Scale | `/ws/v1/scale/snapshot`, separate status and weight frames |
| Water | `/ws/v1/machine/waterLevels`, `currentLevel` in **mm**, not percent |
| Completion / stop reason | `/ws/v1/machine/shotState`; terminal reasons preserve manual stop vs completed shot |
| Compatibility | GET `/api/v1/info`, `/api/v1/settings` |

Workflow writes are partial patches, preserving unrelated context and operation settings. A successful response replaces the acknowledged workflow. Failed writes remain visible and do not pretend to apply. Writes are not retried. Start controls require a connected machine, fresh readings, a valid managed mode, idle state, no pending write or device error, and a profile; Decaid's no-scale policy is respected.

## Lifecycle and data accuracy

- Machine sockets remain open across hardware disconnects. Device state, not socket openness, controls machine connectivity.
- Actual socket closure uses bounded exponential reconnect delay with jitter. Reconnect reads state again and never replays operations.
- Five-second reads refresh workflow, settings, version and device state. Resume/online/page-show trigger resynchronization; stale workflow reads cannot overwrite a newer acknowledged edit.
- Each request has an eight-second timeout; subscription disposal aborts outstanding requests and removes listeners.
- Simultaneous stream updates publish to React in a 100ms batch; command guards read the latest state immediately. Explicit actions publish immediately.
- Samples are bounded to 3,600 points; plots are clipped to the approved axes. A profile preview plots only actual pressure/flow targets, not fabricated values for an axis the step does not control. Timed segments are maximum durations, not predictions of exit-condition timing.
- A newly attached client cannot recover an exact in-progress start time from the shot-state replay timestamp. It shows `—` for Time until a start is observed or the completed stored record supplies it. The chart covers the observed portion. This avoids displaying an invented elapsed time after a mid-shot reload.
- Finished shots can hydrate from Decaid's saved measurements, with bounded retries if persistence is not yet ready. An interrupted/aborted shot may not have a stored record; observed data remains available.
- No assumed connected-device weight, water level or temperature is substituted when unavailable.

## Installation and device acceptance

Build using `npm run package:skin`; install the generated archive through Decaid's skin manager. Verify that API mode and installed version match the contract before machine testing. Check actual `innerWidth`, `innerHeight`, `devicePixelRatio`, `visualViewport`, Android System WebView version, font loading, relative assets, native dialogs, touch, reduced motion and background reload.

Physical operations require a supervised device session: idle → heat → group-head start, profile-frame transitions, stop command, target-weight stop, disconnect/reconnect, steam/water/flush, and shot persistence. Automated tests use only an isolated fixture; they do not operate hardware.

## Shared pages and favorites (phases 2–3)

Rechecked against the local upstream checkout at exact installed-target commit `14361a94b32888f6a81182e9e239f513d39d060c`: REST schema, `profile_handler.dart`, `kv_store_handler.dart` and `ProfileController.importProfiles`. No live device version or operation was queried during this implementation.

`App` owns one gateway and the favorite editor above query navigation. Pages never create sockets. The gateway exposes a monotonically increasing observed-shot counter only after a locally observed machine-stream transition from a non-espresso state to espresso; attachment to a replayed active shot does not trigger a false start. Both a new start and the Home stop path bypass discard prompts. The page footer also exposes Stop when joining a running shot directly on another page.

Favorites are normalized to five nullable positions in memory. Duplicate IDs keep their first occurrence and report a correction; invalid types report an error. Missing, hidden and deleted records do not collapse positions or load replacements. No normalization writes occur until explicit Save. Acknowledgement updates the rail; overlapping saves are rejected, older reads are fenced, and a response cannot erase newer editor changes. This is not cross-client conflict control: the KV API has no revision/ETag write precondition.

Active profile identity uses an unambiguous comparison of the entire workflow profile with record contents, independent of object-key order. A title match alone is never enough. An adjusted or otherwise unmatched active recipe remains displayed without claiming a library ID. Content editing and ID remapping remain phase 5 work.

Import uses Decaid's profile-record format, not arbitrary legacy `.shot` files. The UI limits a selected JSON export to 10 MB, requests explicit confirmation, preserves unknown fields and displays partial results. Default profiles can be hidden/restored; their executable content cannot be edited here. File pickers and downloads still need Samsung WebView acceptance.

## Daily-use settings (phase 4)

Rechecked against the local Decaid source at installed-target commit
`14361a94b32888f6a81182e9e239f513d39d060c`: REST schema, settings, devices,
workflow, display, presence, grinder and DE1 handlers, plus workflow/native form
bounds. No live tablet or hardware operation was used for this work.

| Area | Owning API and behavior |
| --- | --- |
| Device inventory | Existing session inventory/socket; explicit GET `devices/scan?connect=false&quick=true`, PUT connect/disconnect/forget with JSON deviceId; connection outcome is checked |
| Wi-Fi scales | GET/POST/DELETE `devices/wifi`, explicit host registration/removal |
| Device preferences | POST `settings`, nullable preferredMachineId/preferredScaleId/preferredGrinderDeviceId |
| Diagnostics/tare | Explicit GET `diagnostics/ble`; idle-gated PUT `scale/tare` |
| Stop/scale policies | POST `settings`, changed fields only; authoritative reread updates the session |
| Utilities | Existing serialized PUT `workflow`, nested owned-field patches for steam, water and flush; no duplicate machine-setting owner |
| Machine/power | GET `machine/info`; POST `machine/settings` for tank/fan, POST advanced for refillKitSetting; explicit idle-gated sleep/wake; charging/night fields in settings |
| Display | GET `display`, PUT brightness; requested and applied values are distinct; platformSupported gates controls; explicit POST/DELETE wakelock override |
| Presence | GET/POST `presence/settings`; GET/POST/PUT/DELETE schedules with local time, weekday and duration validation |
| Focus preferences | GET/POST `store/decent-skin-codex/preferences`, preserves unknown keys; only 404 supplies defaults; Celsius/Fahrenheit, refill warning mm and optional shortcuts |
| Grinder | GET info/state on Connections only; capability and writable descriptor gates; PUT setting/rpm/grinding/idle; identity and a newly fetched idle state checked before commands |

Steam is 0 (disabled), 135–160 °C on DE1, or through 165 °C on Bengle.
The installed milk-temperature stop remains unavailable. Fan/tank use the
reference's conservative DE1 bounds (0–50 / 10–40 °C); unsupported returned
fields are not writable. Other utility ranges follow the installed native forms.
The refill warning is Focus-only and requires explicit preference plus confirmed
`machine/info.extra.refillKit=false`; water remains mm.

Drafts live above routes, keep newer edits during saves, fence late reads, and
cannot be saved to a different machine identity. Each owner is saved separately;
failures retain drafts and reread state without automatic retries. Acknowledged
writes whose verification fails are reported as uncertain. This provides no
cross-client transaction or rollback guarantee.

Activity heartbeats are sent only after real pointer/keyboard activity while
presence is enabled and the machine is idle, at most once per 30 seconds. There
is no idle heartbeat timer, page-load heartbeat, automatic wake or reconnect
command replay. Display wake-lock override is explicit and must be released.
Grinder recipe Send is an opt-in, one-shot action; there is no automatic Follow
loop. Native permission and transport controls remain in Decaid.

Grinder snapshots are event publications, not a guaranteed periodic heartbeat.
Commands reread the current info/state and recheck the selected connected device;
a stable idle publication is not rejected solely for its old timestamp. Numeric
and enumerated descriptors are validated before use. Presence idle timeout uses
the installed 0–240 minute range; schedule hold duration uses 0–720 minutes.

## Recipes, coffee and equipment (phase 5)

Source checked at installed-target commit `14361a94`: `profile_handler.dart`,
`profile_controller.dart`, `profile_hash.dart`, `profile.dart`,
`beans_handler.dart`, `grinders_handler.dart`, `workflow_context.dart` and
`kv_store_handler.dart`. These are repository checks, not live device calls.

| Surface | Contract and ownership |
| --- | --- |
| Create/fork | POST `profiles` with complete `profile`, optional `parentId`, preserved `metadata` |
| Update user profile | PUT `profiles/{id}` with complete profile/metadata; use returned ID |
| Lineage | GET `profiles/{id}/lineage`; restore a version into a draft, then Save explicitly |
| Unknown profile fields | `metadata.focusExtensions`; hydrate only unknown keys, never overwrite returned executable values |
| Previous user version | `metadata.focusPrevious` holds the previous ID/profile; restoration is a reviewed edit |
| Save recovery | GET/POST/DELETE `store/decent-skin-codex/profile-save` |
| Recipe preferences | GET/POST `store/decent-skin-codex/recipes`, keyed by actual profile ID |
| Beans | GET/POST `beans`; GET/PUT `beans/{id}` |
| Roast batches | GET `bean-batches?includeArchived=true`; POST `beans/{id}/batches`; GET/PUT `bean-batches/{id}` |
| Equipment | GET/POST `grinders`; GET/PUT `grinders/{id}` |
| Archive/restore | PUT the inventory record with `archived: true/false`; no deletion of inventory or shot records |
| Workflow selection | PUT `workflow.context`: batch ID plus coffee name/roaster, or equipment ID plus model/burrs |

Decaid's profile hash excludes title, author and notes. Create can return an
existing recipe rather than a new record; Focus checks for identical executable
content before offering a copy. A default fork must change executable content.
User edits that change IDs journal the intent before writing, then remap current
favorites and recipe preferences. Each request is independent: partial outcomes
remain visible, malformed favorites block remapping, and explicit retry checks
for the operation marker or returned ID before writing content again. The
journal survives reload. Cancel of an unacknowledged save is allowed only if no
saved record is found; it cannot undo a timed-out write. No save is automatically
retried on reconnect. These APIs do not provide cross-client transactions.

The installed model serializes known executable keys only. Focus preserves
unknown profile, step, exit and limiter keys in its metadata sidecar, including
through stage reordering and JSON editing. This preserves data; it does not make
an unknown field executable by Decaid. Other metadata is retained. Editor
validation rejects non-finite or out-of-range values, invalid exits/transitions,
invalid volume-counting indices and empty profiles. The editor uses conservative
limits (20 stages, 127 seconds per stage, 12 bar, 10 ml/s and 0–100°C); device
acceptance remains required.

Recipe preference loads use a fresh KV read and patch the current workflow,
preserving coffee/equipment and unrelated context. Only explicitly saved
adjustments are restored. Temperature offsets apply equally to all stages.
`context.extras.focusProfileId` records the explicit loaded ID; highlighting
still checks executable content with its temperature offset instead of guessing
by title. An edited library record never silently replaces an active recipe.
No recipe preference sends a connected-grinder command.

Inventory updates send only changed fields, preserving extras and untouched
metadata. Batch creation initializes remaining weight from initial weight;
remaining weight is separately editable on existing batches. Selecting a batch
snapshots coffee labels into workflow context; selecting a grinder records its
equipment ID/model/burrs. Archiving leaves active and historical context intact,
and archived items cannot be newly selected until restored. A batch belonging
to an archived bean is also blocked from selection.
