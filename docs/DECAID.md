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
| Profile list | GET `/api/v1/profiles?visibility=visible&includeHidden=false` |
| Profile selection | PUT workflow with returned complete `profile`, including executable fields; positive profile target weight becomes workflow target yield |
| Favorite order | GET `/api/v1/store/decent-skin-codex/favorites`; only 404 means no stored preference |
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
