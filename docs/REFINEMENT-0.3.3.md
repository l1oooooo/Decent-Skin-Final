# Focus v0.3.3 refinement candidate

Based on v0.3.2 (`8ae8a2a`). This is a local review candidate, not a published
release or tablet installation. Approved layout, chart rendering, colors,
500ms coordinated panel/chart transitions and 420ms time-domain motion remain.

## Home chart-area notification investigation

The matching visible source is `Notice` in `src/skin/controls.tsx`, mounted by
`CandidateHome` immediately after the profile-chart section in the center panel.
It is a Focus-owned persistent status panel, not a Decaid-native notification,
chart tooltip, debug overlay or the shot-result toast. In compact layouts its
12px text is near the bottom of the chart. Without the exact text from the
reported occurrence, its specific triggering condition cannot be identified.

`Notice` selects the first nonempty message in this order:

1. `useSkin().notice`, itself the first available of:
   - A failed explicit action caught by `perform`: the exception's message, or
     “Decaid could not complete this action”. Recipe/profile changes, utility
     settings, Sleep and other actions using this helper can trigger it.
   - “Low water · N mm. Refill the tank.” when refill-kit status is explicitly
     false, water level is available, a nonzero refill threshold is configured,
     and the reported level is below that threshold.
   - `snapshot.message`: gateway parsing/HTTP/synchronization errors, or a
     failed/disconnected/blocked shot decision's details; absent details become
     “Shot stopped: REASON”. Error details are dynamic, not a finite copy list.
   - `snapshot.deviceNotice`: Decaid's device-connection error message, keyed by
     kind/device/timestamp/message. Missing error text becomes
     “Device connection needs attention”.
   - “Scale disconnected during this shot. Stop-at-weight is unavailable; stop
     the extraction manually.” when `snapshot.scaleLost` is true.
2. “Machine disconnected. Check the connection in Decaid.” when the machine
   connection is unavailable.
3. “Heating to your brew temperature.” while the session is heating.
4. When neither brewing nor a utility is active, `commandBlock` or `brewBlock`:
   - “Waiting for current machine readings.” (missing or older than 5 seconds).
   - “Waiting for Decaid to finish the previous request.” (a pending operation).
   - “Waiting for Decaid settings.”
   - “Use Decaid's tracking mode for gateway-owned shot control and stop-at-weight.”
   - A non-scale device error, or “Machine is STATE.” for a non-idle machine.
   - “Decaid requires a scale. Connect one, or turn off Require a scale before
     brewing in Settings → Brew and utilities.” when that policy is enabled.

There is no timer. Derived messages disappear when their conditions clear or a
higher-priority message replaces them. Local action errors clear on the next
`perform` action or Dismiss. Gateway messages clear on successful sync, explicit
Dismiss, or relevant operations. Device notices clear when the observed error
clears; Dismiss suppresses that exact event identity until another error arrives.
Low-water and scale-loss warnings are derived and may immediately reappear after
Dismiss while the condition remains. Scale loss normally resets with a new shot.
The existing Reconnect button here only resynchronizes the gateway; it does not
choose or connect a scale. Sleeping uses the existing gated Wake action.

The independent `.brew-toast` shows the result after returning Home for 2400ms.
It does not create this persistent notice. Both can coexist: for example, an
ended shot can leave a missing-scale warning. Utility settings also repeat the
current `s.notice` inside their popover, and brewing has a separate notice mount.
This is contextual duplication of warning content, not duplicate shot toasts.

Decision: retain the persistent notice and its existing presentation. Its
messages can require action, and a short-lived toast would lose that information.
No warning was removed or suppressed. The chart's own no-target message is
“No configured targets available for this profile.”; partial/conditional target
explanation is screen-reader-only. Neither is a toast. The unused `.planned-note`
CSS selector has no mounted element in v0.3.2.

## Stop classification and shared return lifecycle

Verified against the local official Decaid checkout at installed commit
`14361a94b32888f6a81182e9e239f513d39d060c`, specifically
`lib/src/models/data/shot_state_event.dart` and
`lib/src/controllers/shot_sequencer.dart`.

The sequencer uses `apiStop` / `appStop` for explicit recorded stop intent.
Without that intent, a machine-reported pouringDone/idle produces `machineEnded`.
The physical GHC and autonomous machine completion are not distinguished by
that reason. v0.3.2 classified it as unknown, which kept the interrupted screen
open. It already auto-returned explicitly classified API/app stops.

| Evidence | Presentation and return |
| --- | --- |
| targetWeight / targetVolume with samples | 3s hold → existing return → “Shot completed” |
| apiStop / appStop, non-abort | Same lifecycle → “Shot stopped manually” |
| machineEnded, non-abort | Same lifecycle → neutral “Shot ended” |
| Bare idle or an unfamiliar reason | Outcome unconfirmed; review remains required |
| Abort, noScale, error, disconnected | Existing interruption/warning handling; no success toast |

`finishExperience` normalizes outcomes and is shared by initial and delayed
completion decisions. Both manual and neutral endings preserve frozen samples,
selected profile, recipe and mounted Home state. A late more-specific reason
can refine neutral copy without restarting the hold. Explicit outcomes survive
less-specific machineEnded/finalize messages. Shot identity/sequence guards
reject retired and duplicate events; navigation and new shots cancel stale
returns. Disconnection or faults during a pending hold/return interrupt it.

The existing timer and animation lifecycle remain presentation-only. No stop
command or new machine control was added. A preheat abort stays an abort;
preinfusion/pouring stops follow the table above. Physical GHC confirmation on
the actual tablet remains a device-acceptance step.

## Header and scale connection

Only the left readout group's font weight changes to Geist Medium (500), for
both labels and values. Existing sizes, colors, spacing and right navigation
weights remain. Disconnected scale text becomes a semantic keyboard-accessible
button with identical resting appearance and a 44px vertical hit area that does
not alter layout. Its focus outline is visible only for keyboard focus.

The button opens the existing Settings → Connections route. It does not guess
which remembered scale to use, scan automatically or issue a connection request
on navigation. The user explicitly selects Connect beside the intended scale.
That existing action calls `DailySettingsGateway.device("connect", id)` →
`PUT /api/v1/devices/connect` with `{deviceId}`. It verifies the acknowledgement,
then syncs; displayed weight comes from actual device/scale events.
`useOperation` and gateway pending gates prevent duplicate writes; the existing
8-second request timeout and failure handling remain. No automatic retry,
optimistic connected state, API addition or device preference change was added.

## Validation

- `npm run check`: TypeScript, ESLint, 172 gateway/unit tests and static build passed.
- `npm run check:brewing`: 18 model tests and production isolation passed
  (2411 modules; no simulator modules or test content in production).
- Five focused isolated production browser checks passed: Medium header/44px
  text hit area at 1007 × 601; explicit scale selection and one connect request;
  rejected connection; persistent heating notice clearing at Ready; machineEnded
  in preinfusion and explicit API stop in pouring, each with frozen traces,
  the 3-second hold, one return/toast and unchanged selected profile.
- The existing normal-completion production browser regression passed: five
  traces, frozen completion, one automatic return and one successful toast.
- Seven existing preview browser regressions passed: normal/manual completion,
  duplicate/late events, restart during hold/return, navigation cancellation,
  disconnects, missing scale/outliers/reduced motion, intrinsic header wrapping,
  synchronized chart/panels and exact Home bounds restoration. Together with the
  six production checks, this is 13 focused checks, not a full-app E2E suite.
  The Medium Ready header fits 1007 × 601 and the 1340 × 800 reference. Its
  measured intrinsic threshold is 855px in the preview fixture (854px wraps,
  800px remains contained); this is not a hardcoded breakpoint.
- Archive verification passed: 11 files, 614348 bytes. SHA-256:
  `253884e63a3cfa2d59f587b73d11ebc04faba2f6d98dc2ca007d1c4bb8601551`.

Initial unit checks exposed the old machineEnded expectation, a unit test calling
browser cleanup without a DOM, and the timeout test's missing mode fixture / wrong
error-text expectation. These test issues were corrected; production timeout and
connection gates were not relaxed. The first browser attempt could not bind a
sandboxed local port; the authorized isolated-server run passed all five checks.
The existing Vite bundle-size advisory remains. Real-time preview callbacks were
again delayed on this host (a configured 3-second hold was observed at about
4.5 seconds in one geometry run); controlled-clock lifecycle checks retain the
exact hold assertions. No production timer was extended to accommodate tests.
Smoothness and timing on the Samsung WebView remain unverified.

Logs: `artifacts/v033-check-passed.log`, `v033-isolation.log`,
`v033-browser.log`, `v033-normal-completion.log`,
`v033-preview-regressions.log`, `v033-package.log`. Captures under `artifacts/v033` were
visually reviewed at 1007 × 601 and 1340 × 800. Test events and connection writes
use only the isolated fixture. Actual Samsung WebView fit, physical GHC behavior
and Bluetooth reconnection remain device checks.
