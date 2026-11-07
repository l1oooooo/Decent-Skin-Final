# Phase 5 production integration

## Approved reference and rollback

The November 6 Phase 4.1 preview is the approved visual reference, including the
latest All profiles label, SquarePen edit icon and pressure/flow area gradients.
Surface tone remains 0.16. No new renderer dependency is required.

Branch: `codex/phase-5-production-integration`. Previous production: `fec7ad1`
(v0.2.5). Local archives before promotion:
`artifacts/phase-5/approved-phase-4.1.tgz` and
`artifacts/phase-5/rollback-source-fec7ad1.zip`. Existing installed skin is untouched.

## Pre-integration audit

- Production `App` already owns one gateway and guarded query navigation,
  profiles, recipe persistence, settings, history, advanced procedures and
  extensions. Physical starts/stops are observed, never triggered by Home.
- The approved preview used a mock SkinSession, synthetic telemetry and local
  navigation placeholders. It cannot be shipped by changing its entry point.
- Production previously kept only pressure, flow, mix temperature and cup weight
  in its samples. The five-trace chart needs group temperature, target pressure
  and scale weight flow retained separately.
- The old Home had a different chart, title, bottom utilities and persistent
  completion panel. Its presentation is superseded by the approved components.
- The production graph must exclude `design/brewing`, its mock session, simulator,
  navigation placeholders and dock. Shared presentation is promoted into `src`;
  the preview imports that presentation, not the reverse.

## Verified contract

Inspected the local official Decaid checkout at exact installed-target commit
`14361a94b32888f6a81182e9e239f513d39d060c`:

- `lib/src/models/device/machine.dart`: actual pressure/flow, targetPressure,
  groupTemperature, mixTemperature, steamTemperature, profileFrame.
- `assets/api/websocket_v1.yml`, ScaleSnapshot: `weightFlow` is emitted by Decaid
  (device supplied or Decaid-estimated). Focus adds no smoothing or derivative.
- `lib/src/models/data/shot_state_event.dart` and
  `lib/src/controllers/shot_sequencer.dart`: preparation/pouring/stopping/finished;
  explicit targetWeight/targetVolume/apiStop/appStop/noScale/error/disconnected.
  `machineEnded` does not distinguish physical manual stopping from profile end.
  Such endings must remain unclassified rather than claim successful completion.
- The user confirmed the standard removable Decent tank. Its CAD-derived mm→mL
  conversion is enabled for this build; refill-kit machines do not display tank mL.

No commands were sent to hardware during this work. Android WebView and physical
GHC behavior require supervised acceptance; local fixtures cannot prove them.

## Integration behavior

`App` owns the presentation lifecycle alongside its existing gateway and navigation.
The approved components live in `src/skin/brewing`; the design preview imports
those components and supplies its own development-only simulator. The old Home
and rolling-list renderers were removed. No dependency was added.

- Machine readiness stays independent of the shot-stage title. Group temperature
  is not substituted with mix temperature. Scale readings expire separately.
- Live chart points retain the received pressure, target pressure, flow, group
  temperature and scale weight flow. Missing signals produce gaps. Only the Home
  configuration illustration uses smooth curves. The final chart freezes while
  the cup-weight metric can continue receiving Decaid's final scale settling.
- A monotonic local shot generation separates sessions. A late server shot ID
  adopts existing observations; retired IDs and old terminal events cannot end a
  newer shot. Reconnect replays retain identity and do not initiate navigation.
  Fresh telemetry can resume monitoring the same active shot; a shot that ended
  while disconnected cannot replay success. The chart breaks across lost
  telemetry rather than drawing a connecting line over the missing interval.
- Initial active replays wait for a fresh connection before attaching. A shot
  already terminal before attachment does not create a completion toast. Elapsed
  time remains unavailable when its start was not observed.
- Confirmed target-weight/volume completion holds for three seconds, transitions
  Home and shows one success toast. Explicit app/API stops are classified as
  manual. Missing-scale blocks, errors, disconnection and unclassified endings
  remain distinct. New shots cancel old holds; leaving Home cancels auto-return.
- Chart points are bounded to 3,600; retired IDs and hydration-attempt records
  are bounded to 32. Resize observers, visibility subscriptions, animation
  instances and presentation timers have cleanup paths. Home's configuration
  chart is memoized independently from continuous telemetry.
- Utility popovers reuse the existing guarded workflow writes. Sleep retains
  its single acknowledged request and observed-state confirmation. No Home
  interaction starts or stops espresso, steam, hot water or flush.

## Local verification — November 7, 2026

- `npm run check`: TypeScript, ESLint, 137 gateway/lifecycle unit tests and the
  production build passed. The stream test feeds 10,000 observations and verifies
  bounded retention and clean session reset without issuing commands.
- `npm run check:brewing`: 18 preview/model tests passed; the build audit checked
  2,370 modules and found no design-preview modules or simulation content.
- All seven design-preview browser cases passed across the initial run and a
  focused rerun after updating the Hot water accessible-name query.
- All 55 production browser cases have passing results across the initial suite
  and focused reruns, using only isolated loopback API fixtures. This is aggregate
  coverage, not a single uninterrupted clean run. The per-case evidence index is
  `artifacts/phase-5/browser-validation.json`; its referenced logs retain initial
  failures as well as successful reruns. Cold-start waits were extended on this
  host, and short completion transitions are observed inside the browser so test
  driver latency cannot miss the toast. Functional assertions remain in place.
- Browser checks cover five live traces, completion/rapid restart, missing scale,
  stale/disconnected data, navigation/draft preservation, failed writes, settings,
  history, profiles, advanced procedures, extensions and nested static loading.
  Landscape framing and 44px minimum targets passed at 1340 × 800, 1340 × 700,
  1280 × 720, 1024 × 600, 893 × 533 and 800 × 480. Home and brewing captures were
  also visually inspected at the reference and compact sizes.
- `npm run package:skin`: verified 11 files in the 604,352-byte archive. SHA-256:
  `bb5b4a4c9bdbbffdd02a97c4f3510e7f234e5a44fb749821af89f59c320f6802`.
- The production JavaScript remains approximately 682 kB before compression and
  triggers Vite's existing 500 kB advisory. Desktop checks do not establish
  acceptable tablet startup time, animation performance or memory behavior.

## Artifact and rollback

The candidate is `artifacts/decent-skin-codex-0.3.0.zip`. Its archive root contains
`index.html`, `manifest.json`, `skin.svg` and relative bundled assets/fonts.
`artifacts/skin-release.json` identifies the exact SHA-256 and source state.
No development API override or fixture is packaged. The installed origin uses
API port 8080; the skin requires no Node server on the tablet.

The previous installation archive was preserved as
`artifacts/phase-5/rollback-decent-skin-codex-0.2.5.zip`. Retain it separately before
any supervised installation. If acceptance fails, select/reinstall that prior
skin through Decaid's skin management. Source can be recovered from `fec7ad1`
in a separate checkout or `artifacts/phase-5/rollback-source-fec7ad1.zip`; do not
reset a checkout containing unrelated work. The approved preview is also frozen
in `artifacts/phase-5/approved-phase-4.1.tgz`.

No deployment, release publication, main-branch push or machine operation was
performed. See [TABLET-ACCEPTANCE.md](TABLET-ACCEPTANCE.md) for the supervised
0.3.0 checklist. Physical GHC classification, real scale behavior, tank-volume
accuracy, Android WebView rendering/performance and sleep/wake remain unverified.
