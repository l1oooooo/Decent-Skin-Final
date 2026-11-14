# Phase 6 repeatable QA and acceptance record

Candidate: **0.3.10-rc.1**, based on approved v0.3.9.
Review status: **local audit complete; release gate not met**.
No physical DE1 commands, tablet installation, deployment or GitHub publication
are part of this run.

## Automated checks

Record the source commit and archive checksum alongside each final run. Logs,
screenshots, traces and JSON reports live under ignored `artifacts/phase6/`.

| Check | Command | Result |
| --- | --- | --- |
| Types, ESLint, gateway/domain tests, package-version tests, production build | `npm run check` | Passed: TypeScript, ESLint, 205 gateway/domain tests, 2 package-version tests and production build |
| Preview model and production isolation | `npm run check:brewing` | 18 model tests; production module audit passed |
| Main regression | `npm run test:e2e` | Full run: 57/84 passed. Latest result per case after targeted reruns/additions: 85/86 passed; one unresolved case. Not a green full-suite run. |
| Development preview | `npm run test:brewing` | 11 cases covered: 8 passed in the full run, 3 passed after correcting stale header/wrapping assertions |
| Repeated shots/navigation | `npx playwright test tests/phase6-stability.spec.ts` | 20 cycles passed at 1007 × 601; bounded resource checks, five sockets, no page errors or command writes |
| Browser startup profile | `npx playwright test tests/phase6-performance.spec.ts` | Measurement collected; slow startup remains an open finding, not a performance pass |
| Chart computation | `node scripts/profile-chart.mjs` | Completed; excludes browser paint and Android |
| Static package | `npm run package:skin && npm run verify:skin` | Passed: 11 files, 624,366 bytes; checksum in release notes |

Run browser checks only against `tests/fixtures/decaid.mjs`. The configured
runner builds a separate app with a loopback API override. Never package that
fixture build. Parallel suites need distinct `FOCUS_FIXTURE_PORT` and
`FOCUS_TEST_PORT`, output directories and JSON report paths; they must not
share fixture state. Performance measurements should be repeated alone.

## Functional coverage map and repeatable procedure

The entries below identify test coverage, not an assertion that an unfinished
suite passed. Final run results take precedence over this coverage map.

| Area | Repeatable check | Automated coverage |
| --- | --- | --- |
| Home | Select each favorite; inspect actual title, Dose, Drink, ratio and preview segments/legend; exercise missing and mixed targets | focus, recipes, refinement-031, release-feedback; planned-profile unit tests |
| Recipe controls | Save/reload each field; switch profiles; validate grind 0, 20.5 and 50; reject out-of-range values; retain named settings | release-feedback, v038-grind, gateway recipes/workflow tests |
| Stable paint | Hold a write pending and tap +/− rapidly; retain labels, buttons, favorite name, Edit Profile, chart and focus; reject duplicate activation | v035-refinements, v036-rendering, v038-rendering |
| Numeric motion | Switch profiles in both directions and mid-animation; direct edits and telemetry must update directly; labels/units stay fixed | v036-motion and v038-rendering |
| Navigation | Visit profiles, editor, inventory, settings and history; preserve drafts and one shared header; test back/focus and long labels | pages, history, recipes, settings, header-feedback |
| Header | Ready/heating/disconnected, read-only live values, explicit scale reconnection, intrinsic wrapping, popover tabs and keyboard focus | header-feedback, tablet-fixes, refinement-031, v033-refinements |
| Machine settings | Steam switch and targets reflect acknowledged settings; rejected/pending writes remain safe; tabs issue no commands | refinement-031, settings and gateway tests |
| Shot lifecycle | Start, preinfusion/extraction, normal/manual end, 3-second hold, one toast and return; replay/duplicate/fault/late events stay distinct | brewing-integration, v032-motion, v033-refinements, preview browser/model tests |
| Title | Capture selected profile at start; keep it stable through mutable profile updates, stage changes and long names; new shot gets a new title | v037-title |
| Chart | 20/25/30/34/35/39/40/45/60/120 s, five series, retained DOM, exact sample coordinates, stable dimensions and new-shot reset | v039-timeline plus chart/model unit tests |
| Motion | Header/panels/chart share the transition clock; reverse and interrupt safely; reduced motion, hidden views and resizing settle | v032-motion, v036-motion, preview browser tests |
| Notifications | One completion/manual-stop result, quiet routine actions, retained faults/refill conditions, deduplication, watchdog uncertainty | v034-notifications, v035-refinements and notification unit tests |
| Connections | Disconnect/stale readings blank values and block commands; retain trace; reconnect does not retry writes or replay shot navigation | tablet-fixes, brewing-integration and gateway tests |
| Advanced pages | Read-only entry; explicit confirm/cancel, firmware terminal verification, calibration read-back, partial transfers and permission boundaries | advanced, extensions and gateway advanced/extensions tests |
| Packaging | Nested skin path, relative assets, fonts/artwork, honest disconnected startup, no fixture/simulator/private origin in archive | release.spec.ts and package/isolation scripts |
| Extended use | Repeated 20-shot/navigation cycle, inspect post-GC heap/listeners/DOM and socket count | phase6-stability |

Timeline acceptance uses the latest approved **35-second** default. At 35 s the
domain grows to 40; at 40 it grows to 50, then advances by ten seconds at each
boundary. The Phase 6 brief's older 40-second wording does not change v0.3.9.

## Test maintenance and failures

Preserve failed-run evidence; distinguish a corrected test from a product fix.
Older assertions found during this run expected `Ready to brew`, inline command
errors, visible navigation while brewing, routine scale/heating notices,
pre-concise Drink/temperature formatting, or unqualified dialog/text matches
after toasts were introduced. These are updated to the already-approved
Ready label, shared toast region, quiet routine states and hidden/inert header.
The completion test now observes the current four-second toast duration;
utility-save interruption sends a confirmed ending rather than bare idle.
Production notification and machine-state policies are unchanged. Error text
matching also accounts for the existing adapter's whitespace around section
names; a retained trace showed `plugins : 503` while the old test expected
`plugins: 503`. Brewing's decorative status layer is focused for keyboard
checks rather than clicked through its intentional `pointer-events: none`.
The library retry fixture now retains its simulated read failure until explicit
Retry; the prior one-response failure could be superseded by a reconnect read,
as confirmed by the retained 503-then-200 trace.

Cold local Chrome startup also exceeded some old 30-second readiness waits.
The main runner now allows 90-second assertions and a 240-second default test
duration; multi-navigation tests can allow longer. This is a harness adjustment
for the measured local cold load, not evidence that startup performance passed.
It does not change production network timeouts, freshness or
command gating. See the startup evidence in [the audit](PHASE-6-AUDIT.md).

A separate deterministic before-fix test reproduced a recipe deep link that
never initialized after its missing profile became available. The route guard
was corrected; `phase6-recovery.spec.ts` checks recovery without any writes.

The four isolated full-suite shards exercised **84 cases: 57 passed and 27
failed**. This is not a green full-suite result. Targeted reruns follow corrected
assertions and the two functional fixes; they do not erase the failed-run
record. The editor-arrival and motion-measurement cases bring the current
inventory to 86 tests.

Full-run reports: `artifacts/phase6/final-{1,2,3,4}.json`.
Each runner had separate fixture state and build/preview ports. Concurrent
runs provide functional evidence, not controlled performance comparisons.

### Targeted results

| Report under `artifacts/phase6/` | Result | Meaning |
| --- | --- | --- |
| `focus-settled.json` | 1 passed | Shot-entry focus fix; interrupted favorite draft retained |
| `notification-diagnostics.json` | 2 passed / 1 failed | Steam and display passed; utility test was subsequently corrected and passed |
| `history-diagnostics.json` | 3 passed / 2 failed | Firmware cancellation/verification, brewing completion and history repeat/export/delete passed; cold history cases failed |
| `current-behavior.json` | 4 passed | Utility save plus three corrected tablet layout/recipe/scale cases |
| `editor-recovery.json` | 6 passed / 1 failed | Both new recovery cases and editor/journal/draft checks passed; inventory initial loading stalled |
| `remaining-a.json` | 3 passed / 3 failed | Extension credential preservation, disconnected/error gating and reduced-motion/long-label checks passed; three assertions subsequently corrected |
| `remaining-b.json` | 6 passed / 1 failed | Ready-session history, missing-data recovery, malformed favorites, viewport reporting, rejected scale connection and manual-stop hold passed; library fixture subsequently corrected |
| `final-corrections.json` | 2 passed / 1 failed | Extension failure/credential clearing and library retry passed; lifecycle worker had loaded the old click assertion |
| `last-guards.json` | 1 passed / 1 failed | Hidden-header Sleep gate passed; inventory archive notification assertion failed |
| `isolated-motion.json` | 3 passed | Fresh lifecycle test, motion measurement workflow and profile numerical-animation regression passed |

The latest per-case result is **85 passed / 1 failed across 86 cases**, assembled
from the full run and targeted reruns. `latest-case-results.json` records the
source report for every case. This is coverage across runs, not a claim that one
final 86-case run was green. The history-list workflow was explicitly changed
to start from a ready Home session; its earlier cold direct-entry failure is
still an open finding, not erased by that pass.

### Unresolved observations and release blockers

1. **Inventory workflow check:** `tests/recipes.spec.ts`, “inventory selection
   and recipe preferences survive profile loading and archive.” One rerun
   stalled waiting for Use in recipe after cold entry. The last rerun reached
   archive, removed the active record, then timed out waiting for its success
   notification. Later recipe-preference assertions were not reached in that
   last run. Do not interpret this as proven data loss or a proven failed
   archive. Keep the trace in `last-guards/recipes-inventory-selectio-0feb8-profile-loading-and-archive/`.
2. **Cold startup/read reliability:** 66.58 s measured startup, plus failed
   cold history direct entry despite a successful wire response. Later warm
   history and missing-shot recovery passed. Root cause remains unconfirmed;
   production request/freshness limits were preserved.
3. **Motion performance:** the isolated workflow measurement completed, but
   recorded large RAF gaps and 82 long tasks. Functional completion is not a
   frame-rate pass. See the exact measurements in the audit. Profile-counter
   intermediate-value assertions passed when rerun alone after failing under
   concurrent load.
4. **Device acceptance:** actual embedded WebView dimensions, compatibility,
   startup/frame pacing, Android flashing, physical GHC operation and
   long-duration use remain unperformed. The checklist below is the approval
   gate for supervised device work.

Static logs are retained as `final-check.log`, `final-isolation.log` and
`final-package.log`. Preview results are in `preview.log` and
`preview-corrected.log`. Failed traces were retained rather than overwritten.

## Manual verification status

Manual operation on the Samsung/DE1: **not performed**.

Desktop visual inspection completed for Home and Brewing at 1007 × 601,
the two-line long/unbroken title at 800 × 480, a fresh RC brewing capture at
1007 × 601, and the 120-second trace at
1007 × 601. The inspected controls, metrics, legend and chart remain contained.
Evidence: `artifacts/v036/{home,brewing}-1007.png`,
`artifacts/v037/long-title-800.png`, `artifacts/v039/live-120-1007.png`,
`artifacts/phase6/brewing-1007.png`. The new `phase6/home-1007.png` was
captured before favorites finished loading and is retained as startup evidence,
not as the fully-loaded Home visual acceptance image.
Desktop screenshots and automated geometric/motion assertions can establish
local framing and DOM behavior; they cannot prove the absence of Android
compositor flashes or establish hardware safety acceptance.

## Remaining supervised tablet checklist

Do not perform calibration, firmware updates or unattended physical operations
as part of everyday UI acceptance. Any advanced hardware exercise needs its own
explicit scope and Decaid's operating procedure.

- [ ] Record Decaid version, Android/WebView version, device model and actual
  embedded WebView CSS width/height from System and help. The known 1007 × 601
  measurement is from the tablet browser; 1340 × 800 is the screenshot/design
  size. Check safe-area insets, orientation and display/font scaling.
- [ ] After approval, install the candidate manually. Confirm 0.3.10-rc.1,
  relative assets, bundled fonts/artwork, no simulator, and cold/warm load time.
  Reload and restart Decaid; check retained settings without issuing commands.
- [ ] Compare Home, header, recipe rows, chart and popover with v0.3.9 at the
  actual viewport. Check long profile names, disconnected Scale and wrap
  thresholds; no clipping, hidden controls or panel scrolling.
- [ ] Tap each +/− repeatedly and rapidly, immediately after selecting a
  profile and during a pending save. Inspect labels, values, buttons, Sleep,
  selected profile, Edit Profile and chart for flashes or remounts. Confirm
  persisted acknowledged values after reload; no queued duplicate changes.
- [ ] Switch profiles with different values; confirm 350 ms counting only for
  profile changes. Direct adjustments and return from brewing must not count.
- [ ] Open Machine Settings and switch tabs. Verify Steam enable and target
  changes against native Decaid; measured header steam remains independent.
  Steam/hot-water/flush daily start and stop remain on the physical GHC.
- [ ] Explicitly choose the intended scale in Connections. Check fresh weight,
  disconnected text and reconnect behavior; no discovery/connection replay.
- [ ] Under supervision, start a normal shot using the GHC. Compare all five
  plotted series and metrics with Decaid; observe preinfusion/extraction,
  stable captured profile title and hidden navigation.
- [ ] Observe approved forward/reverse transitions and completion hold/toast.
  Separately verify physical manual stop; do not infer the stop reason from a
  bare idle event. Confirm selected profile/recipe remains correct afterward.
- [ ] Confirm the 35-second initial axis and boundary expansion with normal
  usage. Use safe replay/simulation for 60/120-second chart checks; do not
  prolong a real extraction just to satisfy a chart test.
- [ ] Check a new shot during a completion hold, page visibility/resume and
  orientation/viewport changes when safe. No stale return or flash should win.
- [ ] Verify routine heating/preparation/save/Sleep/Wake remains quiet. Verify
  real confirmed water/fault/connection conditions and recovery only when
  safely available; never create a dangerous condition just to test a toast.
- [ ] Check one-tap Sleep from confirmed idle, then wake/return through the
  supported flow; neither action acts as a shot stop or queues a retry.
- [ ] Measure cold/warm load and transition frame pacing on the actual WebView.
  Run an extended everyday session; compare heap, listeners, socket count and
  responsiveness after repeated use. Desktop CPU/path timings are not a
  substitute for these measurements.
- [ ] Verify rollback availability before accepting the candidate. Record
  pass/fail, version, viewport and evidence for each item; leave untested cases
  explicitly pending.

## Release gate

| Criterion | Evidence / status |
| --- | --- |
| Approved design, 35 s domain, easing/duration and telemetry | Preserved in production source; desktop framing and timeline checks passed |
| Static build, relative assets, simulator isolation | Passed; no physical installation performed |
| Complete major regression pass | Not established: retain full-run failures and targeted results below |
| Flash-free rendering on Samsung | Pending actual WebView observation; desktop DOM/paint assertions are not device acceptance |
| Long-session stability | 20-cycle desktop bound passed; multi-hour/device use unperformed |
| Startup and performance acceptance | Open: slow cold startup and intermittent read failures need diagnosis |
| Final production approval | Not granted; candidate is for review only |


Review the architecture/performance findings, final automated results and all
remaining hardware items together. A ZIP that passes static validation is not
the same as a production-approved release. Publication, merge and installation
require explicit user approval.
