# Focus release-candidate verification

## 0.3.10-rc.1 — local Phase 6 review candidate

Prepared on November 13, 2026, from approved v0.3.9 on the dedicated
`codex/focus-phase-6-hardening` branch. The user subsequently authorized GitHub
publication as a release candidate with the documented findings unresolved.
Publish `v0.3.10-rc.1` as a prerelease with `decent-focus.zip`; keep v0.3.9 as
the latest stable release. No main merge, installation or physical machine
operation is included. The latest approved 35-second
initial timeline is preserved despite the older 40-second wording in the brief.

- Corrected delayed profile-route initialization and shot-entry keyboard focus.
  Removed confirmed unused legacy presentation code; no dependency changes.
- TypeScript, ESLint, 205 gateway/domain tests, two package-version tests,
  production build, 18 preview-model tests and the 2,458-module isolation audit
  passed. The archive contains 11 production files with relative assets.
- The full main regression run had 57 passes and 27 failures across 84 cases.
  Many failures were stale test expectations; latest results across reruns are
  85/86 passing, with the inventory notification case unresolved. Exact results
  and additional checks are recorded in the linked QA report. This
  is not represented as a green full-suite run.
- Twenty repeated shot/navigation cycles passed bounded resource checks.
  Cold browser startup remains slow, and cold-read/notification observations
  require follow-up. No tablet performance or physical-device acceptance is
  claimed.

See [architecture and measured performance](PHASE-6-AUDIT.md),
[exact regression results and hardware checklist](PHASE-6-QA.md), and
[candidate artifact, checksum and rollback](RELEASE-0.3.10-rc.1.md).
Final production approval remains pending.

## 0.3.9 — thirty-five-second live timeline candidate

Publication of the final 35s build was explicitly authorized on November 10,
2026. Tag `v0.3.9` uses `decent-focus.zip` in `l1oooooo/Decent-Skin-Focus`.
Samsung WebView acceptance and Phase 6 QA remain pending.

The user revised the initial range from 40s to 35s. The range remains at 35s
through 34.999s, expands to 40s at 35s, then follows the existing 50s, 60s and
subsequent ten-second boundaries. Only the domain calculation changed.
The open port-5174 simulator was refreshed and directly confirmed with a 35s
displayed domain and 0s–35s ticks.

- The complete check passed TypeScript, lint, 205 unit tests and production build.
- The model/isolation audit passed 18 tests and 2,458 production modules.
- The revised duration matrix passed at 1007 × 601: no expansion at 25, 30 or
  34s; 35s targets 40s, followed by the unchanged longer ranges through 120s.
  It retained chart identity/bounds, sample geometry, metrics, the Home preview
  on return and the 35s new-shot reset, with no hardware-command requests.
- The retargeting/reduced-motion check passed on rerun with 33 aligned,
  monotonic frames through 35 → 40 → 50. Its initial run missed the first
  intermediate range; the test could sample while Home/Brewing was still
  resizing. It now waits for the layout animation to finish and for the 34s
  reading before starting the zoom audit. No production timing was changed.
- The refreshed package contains 11 files, 624,524 bytes. SHA-256:
  `b4774c2e58517a4c4a99c7ebac8f4be4e584a113963add3ed3f6d242b4986a62`.

### Initial 40s candidate validation (superseded range)

Prepared locally for tablet review before Phase 6. See
[the exact scope and boundary table](REFINEMENTS-v0.3.9.md).

- Two production lines change the live minimum to 40s and select the next 10s
  boundary. No expansion occurs through 39s; 40s targets 50s, 60s targets 70s,
  and 120s targets 130s. Home retains its profile-derived preview duration.
- The 420ms ease-out, raw samples/gaps, Y domains, chart layout/style, metrics,
  600ms Home/Brewing transition and completion lifecycle are unchanged.
- `npm run check` passed TypeScript, ESLint, 202 unit tests and production build.
  The original chart-markup snapshots included the previous 30s X coordinates
  and ticks; both C/F snapshots were updated for the intended 40s coordinates.
  The initial check stopped at that expected mismatch; the complete rerun passed.
- `npm run check:brewing` passed 18 model tests and the 2,458-module simulator
  isolation audit. The existing bundle-size advisory remains.
- Five focused production-fixture browser tests passed: live range retargeting,
  the existing four-region Home/Brewing transition and completion regression,
  and duration matrices at 1007 × 601, 1340 × 800 and 800 × 480. Each matrix
  checked 25, 35, 39, 40, 45, 50, 60, 70, 80, 90, 100, 110 and 120 seconds,
  fixed bounds/node identity, five nonempty curves, latest-point coordinates
  and right-edge headroom, unchanged pressure metrics, identical Home preview
  paths/bounds on return, new-shot reset, and zero hardware-command requests.
- The retargeting audit observed 35 monotonic frames with aligned ticks while
  samples arrived. The separate continuous simulator regression passed with
  403 → 409 samples during the 40 → 50 expansion, plus new-shot reset and
  reduced-motion checks. Both production and simulator browser runs passed on
  their first run. This is focused coverage, not a full E2E suite.
- Long-shot captures at the tablet-reported and compact sizes were visually
  inspected. Curves and metrics remain visible, with the 120s sample inside
  the expanded 130s plot. No chart styling or motion implementation was changed.
- The package passed static verification: 11 files, 624,522 bytes. SHA-256:
  `b9fc4ada338308ba79b28a5d2fa5ce1b0d453bb83bfdde1b8e9ad8d0d52af996`.
- Actual embedded Samsung WebView and hardware acceptance remain pending.

## 0.3.8 — targeted rendering and Home recipe refinement

GitHub publication was explicitly authorized on November 9, 2026. The release
uses tag `v0.3.8` and the stable `decent-focus.zip` asset name. Tablet review and
Phase 6 QA remain pending; publication includes no merge, installation or
hardware operation. See
[the cause analysis and scope](REFINEMENTS-v0.3.8.md).

- Baseline frame instrumentation reproduced both remaining flashes in 88 frames:
  Edit Profile gained a border/card background and a background transition;
  selected favorite text changed from white to muted. Node identity, bounds,
  visibility and theme variables stayed stable. Neighboring grind output and
  DE1 status retained paint. Evidence is in ignored `artifacts/v038`.
- Existing pending-only treatment now covers those two controls. They remain
  blocked during workflow and preference saves; genuine unavailability remains
  visually distinct. No CSS, animation, delay or unrelated rendering refactor
  was introduced.
- Home numeric grind uses shared 0–50 bounds and 0.1 stepping. Numeric state
  changes and explicit recipe writes reject out-of-range input; serialization
  stays text and named settings remain supported. Installed Decaid context and
  handler source were checked at commit `14361a94`; there is no 20-point cap on
  this recipe field. Physical grinder descriptor limits remain unchanged.
- Home summary Coffee/source text becomes Dose; Home Target yield controls read
  Drink. Internal fields, source/default selection, units and calculations stay.
- `npm run check` passed TypeScript, ESLint, 190 unit tests and production build.
  New unit cases cover 0, 20, 20.5, 35 and 50 through workflow/KV/load, preservation
  of other fields, no motor writes, and rejection of -0.1, 50.1 and Infinity.
- `npm run check:brewing` passed 18 model tests and the 2,458-module production
  isolation audit. The existing bundle-size advisory remains.
- Targeted rendering checks passed on D-Flow and immediately after selecting
  80's Espresso: 271 + 219 frames retained one paint state per monitored element,
  unchanged bounds/DOM/theme variables and zero restarted animations. All four
  settings were adjusted both ways; held workflow and KV saves blocked duplicate
  taps and navigation. Profile-load gating and real disconnected styling passed.
  Workflow and per-profile KV both retained the acknowledged grind value.
- Prior recipe-tap and rendering regressions passed: chart/focus/DOM retention,
  no pending replay and 217 frames with no row/Sleep replacement. The four-region
  Home/Brewing transition and completion/hold regression also passed.
- Seven focused browser scenarios passed across targeted runs at the reported
  1007 × 601 viewport. The grind keypad saved 0, 20, 20.5, 35 and 50 to both
  workflow/KV, rejected 50.1 without a write, retained 50 after profile switching
  and reload, and stepped 50 → 49.9 → 50. Boundary controls and new labels passed.
  All observed writes were workflow/KV paths. Home and held-save screenshots
  were visually inspected; this is not a full application E2E run.
- A final range rerun and separate capture diagnostic passed. Direct PNG pixel
  comparison found the chart, profile heading and summary unchanged after a
  grind adjustment; consecutive captures were identical. The saved chart also
  matched the final grind-50 capture. An apparent omission in the image viewer
  was not present in the PNG pixels; no production chart change was needed.
- Profile-counter regression passed numeric bounds, stable widths, identical
  values, manual-edit non-animation, rapid retargeting, named settings and reduced
  motion. Its first sampler ended before the requested second profile was
  acknowledged; the test now checks selected identity before settling. The range
  test's return selector was corrected to the fixture's full D-Flow / default
  name. Both reruns passed; no production timing or command guard was relaxed.
- The local package passed verification: 11 files, 624,520 bytes, bundled
  relative assets and no fixture/development override. SHA-256:
  `5c06efcda457319df925753633cde89bca58a1f20e520e91292b7b8c436d8113`.
- The reported browser viewport is 1007 × 601. Desktop checks at that size do not
  establish the actual Samsung WebView result; tablet rendering review remains.

## 0.3.7 — stable brewing profile heading candidate

GitHub publication was explicitly authorized on November 9, 2026 after review
of the heading, spacing and component order. Phase 6 full QA and Samsung WebView
acceptance remain pending; no tablet installation is authorized by publication.
The installable asset is `decent-focus.zip` on tag `v0.3.7`. See the
[implementation and review notes](REFINEMENTS-v0.3.7.md).

### Component order refinement

- Only the two JSX blocks were reordered: rolling status, then profile title,
  followed by the existing metrics/chart group. No production CSS, measurement,
  transition, telemetry, lifecycle or notification code changed.
- `npm run check` passed TypeScript, ESLint, 182 unit tests and production build.
  The first lint run raced Playwright's startup removal of `test-results` and
  stopped with ENOENT; rerunning after startup passed without a source change.
- Three focused browser scenarios passed across targeted runs: synchronized
  transitions/hidden navigation, captured-title stability, and long/unbroken names
  at 1340 × 800, 1007 × 601 and 800 × 480. Updated spacing assertions passed.
  The long-name case first timed out loading the Home fixture profile at 30s,
  before entering brewing; its rerun used the existing 90s fixture-load allowance
  and passed. No app behavior or timing was changed for the rerun.
- Before/after screenshot comparisons found zero changed pixels from the metrics
  downward, for the short title at 1007 × 601 and long titles at all three sizes.
  The reordered short and compact long-title screenshots were visually reviewed.
- The refreshed ZIP passed packaging verification: 11 files, 624,404 bytes.
  SHA-256: `89becbe33b41b43703d3be599284fd2b89aa4710f662e51702e32c79cf3f6bb7`.
- This remains the local v0.3.7 review candidate; no publication, installation,
  Phase 6 QA or actual Samsung WebView validation was performed.

### Spacing refinement

- One flex parent now supplies equal top/bottom padding from eight spacing units
  (32px), using the larger vertical safe-area inset when necessary. A shared
  four-unit gap (16px) separates title, status and the metrics/chart group.
- The chart animates to a measured flex anchor. Fixed live top/height offsets
  were removed; metrics keep their typography, order and column widths. Chart
  styling, rolling motion, navigation hiding, lifecycle, 600ms transitions and
  surface tone 0.16 are unchanged.
- `npm run check` passed TypeScript, ESLint, 182 unit tests and production build.
  `npm run check:brewing` passed 18 model tests and the production-isolation audit.
- Three focused fixture browser scenarios passed in one run: coordinated
  forward/reverse transitions and hidden header; stable title/DOM through stage,
  workflow and shot replacement; long/unbroken names at 1340 × 800, 1007 × 601
  and 800 × 480. Assertions verify equal 32px outer margins, equal 16px gaps,
  anchor/chart agreement, no overlap or overflow and visible metrics. Screenshots
  at reference and compact sizes were inspected. This is not a full-suite run.
- The refreshed local ZIP passed packaging verification: 11 files, 624,403 bytes.
  SHA-256: `b2871440b628ddeab63ac03d33f790e1f4738d0c5af135e4537344905bff8f88`.
  The package remains version 0.3.7 and is not published or installed.
- Browser fixtures require localhost listening; the initial sandbox attempt
  was blocked with EPERM before tests started, then rerun with that access.
  Samsung WebView/device acceptance remains pending.

### Initial heading implementation evidence

- The heading reads the existing shot-captured profileName. No gateway,
  live-session, reducer, sample or completion logic was changed. The same heading
  node remains mounted through status changes and receives the next shot's name.
- Existing Focus typography establishes a primary profile heading above the
  secondary rolling status. Long/unbroken names wrap to two lines with ellipsis
  for extreme lengths and the full accessible name retained.
- Only the measured heading height offsets the existing live-chart geometry.
  Metrics, traces, state icon colors, surface tone and animation timing remain.
- `npm run check` passed TypeScript, ESLint, 182 unit tests and production build.
  `npm run check:brewing` passed 18 model tests and the 2,458-module isolation audit.
  The existing bundle-size advisory remains.
- The four-region fixture regression passed synchronized 600ms timing, complete
  header exit, new-shot interruption of the hold, exact Home return bounds and
  shared-header restoration on other routes.
- Long/unbroken-name checks passed at 1340 × 800, 1007 × 601 and 800 × 480:
  two-line bounds, full accessible/title text, left alignment, an 8px status gap,
  no horizontal/page overflow, no plot/metric overlap and a fully hidden header.
  Reference and compact screenshots were reviewed.
- Captured-title lifecycle checks passed: the correct starting name, unchanged
  text/DOM/bounds through extraction and mutable workflow updates, no heading
  animation, unchanged five metrics/traces, retention during manual-stop hold,
  replacement for a new shot, normal Home return and no fixture writes.
  Three focused browser scenarios passed across targeted runs; not a full suite.
  The initial title test's custom 15s Home wait expired during returning. The
  rerun passed with the repository's standard 30s expectation window; the
  production 3-second hold and 600ms return timer were not modified.
- `npm run package:skin` and `npm run verify:skin` passed: 11 files,
  624,341 bytes, bundled assets/relative paths and no fixture or development
  override. SHA-256:
  `fec183c340171e87520628d7573236a471f9891a18479defa76b6218a9814fdc`.
- The reported 1007 × 601 browser size is a desktop validation target, not proof
  of embedded Samsung WebView or hardware acceptance. No real hardware commands
  or tablet installation were performed.


## 0.3.6 — rendering stability and coordinated motion candidate

Based on v0.3.5. GitHub publication was explicitly authorized on November 9,
2026 after candidate review. No tablet deployment or installation was performed.
See [root-cause investigation, implementation and motion review](REFINEMENTS-v0.3.6.md)
and the [pending tablet recheck](TABLET-ACCEPTANCE.md#v036-candidate-review--pending).

- Frame instrumentation identified shared pending-state disabled styling across
  the recipe controls and Sleep, plus profile-dependent row keys. The loaded
  desktop fixture did not reproduce the Samsung label-disappearance symptom.
  Pending-only paint and row identity are now stable, with command gates intact.
- Metrics are Time, In the cup, Temperature, Pressure, Flow. The same mounted
  header joins the two panels and chart on one 600ms ease-in-out clock. The
  three-second completion hold and 420ms live-domain animation are unchanged.
- Seven Home numeric readouts count for 350ms on profile changes only, using
  ease-out cubic and ref-based text updates. Actual values/persistence remain
  separate; manual edits, telemetry, initial load and returning Home settle directly.
- Five focused production regressions passed sequentially: restart/disconnection,
  live-domain retargeting, shared header across routes and three landscape sizes,
  recipe persistence/focus/failure/pending guards, and MM:SS/Sleep/Wake behavior.
  These are focused checks, not a full application E2E suite result.
- Screenshots reviewed at 1340 × 800, 1007 × 601 and 800 × 480; compact numeric
  type inherits the approved summary size instead of the unit-span override.
- Across targeted runs, nine production browser scenarios passed: the five
  regressions above, normal completion, four-region lifecycle/DOM identity,
  all-setting paint/pending instrumentation, and seven numeric displays. The
  final numeric rerun includes the compact typography assertion. Two final
  preview transition scenarios passed (shared clock/reverse bounds/toast and
  restart during return/navigation cleanup). Earlier preview checks also covered
  intrinsic header wrapping and long-extraction domain expansion.
- The initial final-preview assertion disconnected its observer at Home's DOM
  commit before the toast effect ran. Waiting for both Home and notification
  delivery fixed the assertion; all geometry/clock checks had already passed.
  No production notification behavior was changed.
- Final `npm run check` passed: TypeScript, ESLint, 182 gateway/unit tests and
  production build. `npm run package:skin` and `npm run verify:skin` passed:
  11 files, 624,205 bytes, relative assets and bundled fonts/artwork, no fixture
  or development origin. SHA-256:
  `0bdb1ae9696d2e761583e928072038c859cc2da7b880a2df6022da4b2e7a4da1`.
- Production isolation: 18 model tests passed; 2,458 modules checked with no
  development preview or simulator imports/content.
- Navigation annotation follow-up: All profiles is text-only; Machine Settings
  uses a sliders icon, with matching popover and accessible labels. Visual preview,
  `npm run check` and packaging passed again. The existing focused utility test
  passed keyboard navigation, anchoring, touch targets, dismissal and reduced
  motion with no fixture writes. Its initial 120s total timeout interrupted the
  final reduced-motion step; the rerun passed in 2.1 minutes with a CLI-only 240s
  timeout. Production timing and command gates were not changed.
  The final Machine Settings/sliders revision passed the same focused check
  again (1.6 minutes), plus all 182 unit tests, build and archive verification.
- Samsung WebView smoothness, actual label disappearance and hardware behavior
  remain unverified. The existing Vite bundle-size advisory remains.


## 0.3.4 — unified notifications

Release authorized after local candidate review. This release also includes the
unpublished v0.3.3 stop-lifecycle and header refinements described below.
See [the full notification inventory, policy matrix and QA](NOTIFICATIONS-v0.3.4.md).

- One Base UI Toast manager replaces the old Notice and custom shot-toast UI.
  Routine feedback expires; pending actions update the same toast; critical
  water, fault, connection and active scale-dependent warnings follow real state.
- Ordinary idle scale absence remains in the header, with explicit Connections
  navigation. Machine command gates and physical-only daily controls remain.
- Final `npm run check`: TypeScript, ESLint, 179 gateway/unit tests and build passed.
- `npm run check:brewing`: 18 model tests and production isolation passed;
  2,458 modules checked with no preview/simulator content.
- Eight focused browser checks passed: four notification scenarios, three save
  regressions and one preview restart/navigation/F6-accessibility scenario.
  This is not a full application E2E suite result.
- Static package and verification passed: 11 files, 623,081 bytes; SHA-256
  `6b3962ae45bca8540669cb40d634389a91bbecb5ac509aa19615e26571aee358`.
- Existing Vite bundle-size advisory remains. Samsung WebView, TalkBack, physical
  GHC, refill recognition and Bluetooth reconnection still require tablet testing.
  No hardware commands or installation were performed.


## 0.3.3 — confirmed stop returns, header weight and scale selection

Local review candidate on `codex/focus-0.3.3-refinements`; not pushed, published,
installed or merged. See [investigation, behavior and evidence](REFINEMENT-0.3.3.md).

- Persistent Home `Notice` source, priorities, messages and dismissal rules
  documented; important warnings retained. The user confirmed the reported
  message concerned heating, identifying the phase-derived “Heating to your
  brew temperature.” notice. The underlying machine state at that moment was
  not recorded.
- Verified installed Decaid source: physical GHC and autonomous endings can both
  use `machineEnded`. Confirmed non-abort endings return with neutral “Shot ended”;
  explicit API/app stops use “Shot stopped manually”. Both share the existing
  completion hold/animation. Faults and unclassified stops remain explicit.
- Header labels/values use Medium; Disconnected opens explicit device selection
  through the existing guarded connection API without restyling the status.
- TypeScript, ESLint, 172 gateway/unit tests and static build passed.
- 18 development-model tests and the production isolation audit passed.
- 13 focused browser checks passed (six isolated production, seven preview).
  Includes 1007 × 601 and 1340 × 800 framing, wrap threshold, 44px scale hit area,
  connection success/rejection/duplicate taps, notices, completion/manual/neutral
  endings, duplicate events, restart, navigation, reduced motion and transitions.
  These are focused checks, not a full application E2E suite pass.
- ZIP verification passed: 11 files, 614348 bytes; SHA-256
  `253884e63a3cfa2d59f587b73d11ebc04faba2f6d98dc2ca007d1c4bb8601551`.
- Host callback delays and the existing bundle-size advisory are documented.
  Actual WebView timing, physical GHC and Bluetooth reconnection remain pending;
  no hardware commands were issued.



## 0.3.2 — responsive header, target segments and coordinated motion

Local candidate on `codex/focus-0.3.2-refinements`; not published or installed.
See [implementation, evidence and caveats](REFINEMENT-0.3.2.md).

- TypeScript, ESLint, 151 gateway/unit tests and production build passed.
- 18 development model tests and the production isolation audit passed.
- 11 unique focused preview browser checks passed, including the operator's
  reported 1007 × 601 browser viewport, intrinsic threshold neighbors,
  mixed targets, utility gates, synchronized transitions, interrupted return,
  live domain animation, completion, navigation and reduced motion.
- Three unique isolated production checks passed for completion, rapid restart /
  connection loss, and domain expansion. The restart fixture was intermittent
  before an isolated diagnostic pass; its earlier failures remain documented.
  This is focused validation, not a full end-to-end suite result.
- Package/verification passed: 11 files, 614043 bytes; SHA-256
  `4551798abdba966134cb61c32c5d159d558f36c0c1762ac02969cf0e8af10906`.
- Real WebView dimensions, frame pacing and hardware acceptance remain pending.
  No hardware commands were issued. The existing bundle-size advisory remains.

## 0.3.1 — Machine Setting and complete Home previews

Local refinement candidate on `codex/focus-0.3.1-refinements`, based on the
operator-tested v0.3.0. Deployment and replacement are not authorized by this
refinement request. See [the changelog, investigation, validation evidence and
tablet recheck](REFINEMENT-0.3.1.md).

The candidate consolidates utility adjustments into one Base UI popover with
line tabs, uses a controlled Steam switch, and omits incomplete Home target
curves together with their legend entries. Live chart markup hashes still
match v0.3.0 in both display temperature units. TypeScript, lint, 149 unit tests,
static build, 18 preview model tests and the production-isolation audit passed.
Seven preview and 18 unique focused production browser scenarios passed, with
initial failures and reruns documented in the linked release note. Packaging
and archive verification passed; the release note records the checksum. These checks use
isolated fixtures, not the tablet or real hardware.

## 0.2.5 — one-touch Sleep and live steam temperature

Device status: **update requires tablet acceptance**. The operator reports that
0.2.4 works, and requested a top-right Sleep button and a read-only actual steam
temperature. This iteration used installed-source inspection and isolated
fixtures; no tablet requests or real machine commands were sent.

- Added a 48px top-right moon / Sleep action using the existing
  `daily.power(true)` path. One tap sends one sleeping request without a
  confirmation modal. Existing idle, connection, freshness, gateway-mode and
  pending gates remain; no delayed command, automatic retry or wake was added.
  The Sleeping UI still requires observed machine state. Failures are visible
  on Home and shared pages.
- Replaced the header's target-temperature control with a read-only live
  `machine.steamTemperature` label. It remains a sensor reading with steam
  heating disabled. Missing, invalid, stale or disconnected readings show a
  dash; a local expiry timer clears telemetry without waiting for another
  update. Celsius/Fahrenheit conversion is display-only. The bottom-left
  Steam utility menu retains enable, temperature and duration controls.
- Verified installed Decaid commit `14361a94`: `models/device/machine.dart`
  serializes `steamTemperature` and defines `MachineState.sleeping`;
  `services/webserver/de1handler.dart` accepts the sleeping state through its
  existing PUT route. No new API field or transport path is assumed.
- `npm run check` passed: TypeScript, lint, **119 gateway tests** and the
  production build. The 11 added cases verify one-shot sleep, pending and
  failure handling, no invented success, and rejection while busy, asleep,
  stale, offline or in full gateway mode. No dependencies were added.
- **Six focused browser scenarios passed against the final source**: live
  steam updates while heating is off; stale/missing/disconnected readings and
  recovery; Celsius/Fahrenheit display; one-touch sleep with no duplicate or
  reload replay; failed commands on shared pages and active-operation gates;
  existing steam target controls, profile edit shortcut, viewport layout and
  version readout. This is focused coverage, not a full-suite rerun.
- Home framing passed at 1340 × 800, 1340 × 700, 1280 × 720, 1024 × 600,
  893 × 533 and 800 × 480, including the new 48px Sleep button. Desktop and
  compact screenshots were visually reviewed. Evidence:
  `artifacts/check-0.2.5-final-source.log`,
  `artifacts/e2e-0.2.5-header-final.log` (3 passed, 4.4 minutes),
  `artifacts/e2e-0.2.5-layout-final.log` (3 passed, 4.4 minutes), and
  `artifacts/tablet-0.2.5`. The existing local 240-second test / 90-second
  assertion configuration was used with separate fixture/preview ports.
- Initial browser failures identified duplicate shared-page notices, corrected
  by centralizing them in PageShell; a paused-route cleanup race and ambiguous
  header/utility test selectors were also corrected. Final reruns passed all
  affected checks. Production request timeouts and command gates were unchanged.
- `npm run package:skin` and `npm run verify:skin` passed: **11 files / 596,067
  bytes**, SHA-256
  `1b030a255bde0c209a38f066c94369f38ca5894a6da4e5f12a01805881e2f1ae`.
  Root metadata, relative assets, bundled fonts/artwork and fixture exclusion
  are verified. The existing bundle-size advisory remains. The stable update
  asset is `decent-focus.zip`.

See the [0.2.5 tablet recheck](TABLET-ACCEPTANCE.md). Actual standby and live
boiler readings on the installed tablet remain to be confirmed by the operator.

## 0.2.4 — built-in keypad, persistent adjustments and 18g fallback

Device status: **update requires tablet acceptance**. The operator reported
installing 0.2.3 and requested a built-in numeric keypad, per-profile Home
adjustments that survive switching, and a dose fallback. They explicitly chose
**18g**. This cycle used source inspection and isolated fixtures only.

- Numeric dialogs now contain digits, a decimal point, Backspace and Clear,
  plus Save/Cancel and range validation. The read-only display uses
  `inputMode="none"`; physical keyboard input is also handled. Integer utility
  durations disable the decimal key. Numeric grind uses the same keypad;
  named grind values retain their text editor. Failed drafts stay open with
  the specific save error.
- Home dose, yield, temperature and grind edits (including +/−) patch the
  selected profile's Focus KV preferences as well as the current workflow.
  Other fields/profiles, workflow context and relative temperature offsets
  remain intact. Pending covers both writes; canonical workflow/profile guards
  reject stale reads. Workflow failure prevents preference writes; a preference
  failure after workflow success reports a partial save with explicit retry.
  No executable profile save, hardware command or automatic retry is added.
- Dose precedence on profile selection is Focus preference, profile metadata,
  then **18g**, labeled **Coffee · default**. The installed executable profile
  model has no dose field; the fallback is not an author's recommendation.
  Initial missing-dose display does not write; an explicit profile selection
  or recipe edit applies the fallback to context. Missing yield still means Off.
- The approved [release feedback procedure](RELEASE-FEEDBACK.md) is included
  and linked from README and AGENTS.md.
- `npm run check`: TypeScript, ESLint, **108 gateway tests** and production
  build pass. The 15 added tests cover per-profile patching, temperature offsets,
  partial failures, invalid saved data, pending/identity/workflow/state guards,
  explicit retry and dose precedence. No dependencies were added; the existing
  bundle-size advisory remains.
- **12 focused browser scenarios passed**: all five release-feedback flows,
  all five tablet regressions, and two Home/named-grind checks. This is focused
  coverage, not a full-suite rerun. Profile edits survived switching and reload;
  partial-save retry, first-install read-only defaults, keypad validation,
  correction, keyboard input, focus return and integer utilities passed.
  Layout checks passed at 1340 × 800, 1340 × 700, 1280 × 720, 1024 × 600,
  893 × 533 and 800 × 480 with at least 44px touch controls. Desktop/compact
  Home and compact keypad screenshots were visually reviewed.
- Evidence: `artifacts/check-0.2.4-final.log`, `artifacts/lint-0.2.4-final.log`,
  `artifacts/e2e-0.2.4.log` (10 passed, 11.1 minutes),
  `artifacts/e2e-0.2.4-focus.log` (2 passed, 3.0 minutes), and
  `artifacts/tablet-0.2.4`. Runs used the existing local 240-second test /
  90-second assertion configuration on separate fixture/preview ports. No
  browser failures occurred; production timeouts and freshness gates are unchanged.
- `npm run package:skin` and `npm run verify:skin` pass: **11 files / 595,896
  bytes**, SHA-256
  `04ae2e4f422d724a8c169def0eff89dfe84fe6848f70a0f1fe84b21772bb015f`.
  Root metadata, relative assets, bundled fonts/artwork and fixture exclusion
  are verified. The stable release asset remains `decent-focus.zip`.

See the [0.2.4 tablet recheck](TABLET-ACCEPTANCE.md). Android keyboard behavior,
installed-Decaid persistence and actual hardware acceptance remain pending.

## 0.2.3 — release feedback: header, number entry and Streamline copy

Device status: **update requires tablet acceptance**. The operator reported
installing 0.2.2 and requested the changes below. This iteration used source
inspection and isolated fixtures only; it did not read or modify the tablet.
The operator approved this first feedback cycle on November 6, 2026. The
[standard procedure](RELEASE-FEEDBACK.md) now records the agreed workflow; this
process approval does not change the pending device-acceptance status.

- Removed the right-side physical-control instructions from Home and shared
  footers. Utility cards/navigation prompts retain guidance; daily execution
  still belongs to the physical group head. Focus after a new shot now goes to
  the header machine status, replacing the removed footer focus target.
- Header steam target opens Steam settings, with quick edits at 135–160 °C.
  Scale connection status is text-only. Compact header spacing also applies to
  shared pages. Celsius wire values and existing command gates are preserved.
- Numeric values open a Focus-styled dialog with range validation, decimal
  input, Enter submission, Save/Cancel, focus return and failed-draft retention.
  Touch entry does not automatically summon the software keyboard. The existing
  grind text editor remains available for named grinder settings.
- Edit profile beside the loaded title opens the matched stored record in the
  existing editor, preserving bundled-default protections.
- Copy from Streamline reads exact-ID saved Home overrides or legacy metadata
  into a reviewable Focus preference draft. Only dose, yield, grind text and
  brew temperature are mapped. Explicit Save writes Focus preferences, retaining
  unrelated fields/profiles; neither copying nor saving starts a machine or
  writes Streamline/calibration/utility data.
- `npm run check`: TypeScript, ESLint, **93 gateway tests** and the production
  build pass. No dependencies were added. The existing >500 kB bundle advisory
  remains; device performance and keyboard/WebView behavior are not accepted.
- **17 distinct focused browser scenarios pass across the recorded runs**:
  six Home/state scenarios, three new feedback flows, five tablet regressions,
  two navigation/draft checks and the production-asset smoke check. This is
  focused regression coverage, not a full-suite rerun. The final-source run
  passes all **4** affected header, focus, packaging and layout checks. Home
  fits 1340 × 800, 1340 × 700, 1280 × 720, 1024 × 600, 893 × 533 and 800 × 480
  without panel scrolling, retaining 44px minimum touch controls. Desktop Home
  and compact numeric-dialog captures were visually reviewed.
- Browser evidence: `artifacts/e2e-0.2.3-*.log` and
  `artifacts/tablet-0.2.3`. Earlier runs exposed two incorrect test route
  parameters, corrected to the existing `profile` parameter. Initial live-stage
  and first-install loads exceeded 30-second assertions; both passed with the
  documented local 240-second tests / 90-second assertions. Production request
  timeouts and freshness gates were not relaxed.
- `npm run package:skin` and ZIP verification pass: **11 files / 594,984 bytes**,
  SHA-256 `ec5e7f4c3cccada16acb32580e25ed4a8d52e4df5fba150fc5a9faaee076b28a`.
  Root metadata, relative assets, bundled fonts/artwork and fixture exclusion
  are verified. The stable update asset remains `decent-focus.zip`.

See the [0.2.3 tablet recheck](TABLET-ACCEPTANCE.md). Hardware acceptance remains
pending; publishing this update is not a device-acceptance claim.

## 0.2.2 — physical control, full Home framing and profile defaults

Device status: **update requires tablet acceptance**. The operator confirmed
0.2.1 installation and footer visibility, but reported internal Home scrolling,
remote starts requiring a second physical press, and repeated recipe values.
Read-only workflow/profile/preferences requests were used for diagnosis; no
physical start, stop, profile load, device connection or setting write was sent.

- Installed Decaid source confirms an active group-head controller only arms a
  remote start. At the operator's explicit request, daily Start **and Stop**
  controls are now non-interactive physical-control guidance. Shared footers,
  active-shot navigation prompts and the Escape shortcut follow the same rule.
  Utility settings remain editable while idle. Advanced procedures are separate.
- The compact Home composition replaces scrolling with smaller gaps, a responsive
  chart and compact rolling rows. Controls retain at least 44px hit areas; no
  canvas transform scales them. The 1340 × 800 frame and 104px rolling rows remain;
  the requested footer guidance and recipe-source labels intentionally change
  those parts of the previous screenshot. No pixel-identical whole-Home claim.
- The initial tablet profiles included variants with identical 94°C starts and
  no weight target. No Focus recipe dose preferences were stored. Those values
  are not synthesized to look different. The actual bug was inheriting the
  previous workflow yield when the selected profile's target was zero/missing.
  Selection now sets targetYield to zero/off in that case, and clears an absent
  saved dose with the installed API's nullable targetDoseWeight. Saved Focus
  preferences still override their own profile; coffee/equipment data remains.
  Invalid negative, non-finite or nonnumeric profile weight targets fail before
  writing rather than being treated as an instruction to disable a weight stop.
- **System and help → Screen and viewport** measures layout/visual CSS dimensions,
  device pixel ratio and zoom in the current browser/WebView. Resize updates are
  observed locally. The About version now comes from the packaged manifest.
- `npm run check`: **90 gateway tests**, TypeScript, ESLint and the static build
  pass. Existing bundle-size advisory remains; no dependencies were added.
- Focused browser run: **12 passed (12.2 minutes)**, covering six Home
  scenarios, five tablet regressions and production assets. It checks physical
  start/stop guidance with no execution requests, utility adjustments, failure
  gating, first-install preferences, scale warnings/explicit connection, actual
  profile defaults and the viewport readout.
- Final-source rerun: **4 passed (4.2 minutes)**. Navigation during a physical
  start retains drafts; Back cancellation and active-shot replay behave correctly;
  compiled assets load under a nested path with API access blocked. The no-scroll
  test passes at **1340 × 800, 1340 × 700, 1280 × 720, 1024 × 600, 893 × 533 and
  800 × 480**. Ready/Heating/Brewing/Completed captures were visually reviewed,
  including long titles and a utility popup at the smallest size. Touch controls
  stay at least 44px. This is focused regression coverage, not a full-suite rerun.
  Evidence: `artifacts/tablet-0.2.2-final`, `artifacts/tablet-0.2.2-verification`
  and `artifacts/tablet-0.2.2`. An ignored local runner config uses 240-second
  tests and 90-second assertions for this Mac; production freshness gates are
  unchanged.
- `npm run package:skin` and archive verification pass: **11 files / 594,844
  bytes**, SHA-256
  `9bc5f8450f180722e9ec1aff17567751995e74e2c41225881494b1085dfe6554`.
  The archive has root metadata, relative static assets and bundled font/artwork;
  no fixture, development origin or source/test code is packaged.

The focused [tablet recheck](TABLET-ACCEPTANCE.md) requires actual viewport
measurements, physical group-head starts/stops, profile values, reconnect and
no-scroll framing on the Samsung WebView. Local tests never contact hardware.

## 0.2.1 — tablet fixes, November 6, 2026

Device status: **update requires tablet acceptance**. Mac read-only checks of
0.2.0 verified installed assets, API reads and telemetry against Decaid
0.9.1+3027 (`14361a94`). The operator reported overflow inside the landscape
Decaid WebView and a persistent scale-disconnected warning. The actual tablet
CSS viewport and physical Bookoo reconnection were not measured or tested here.

- The old 1000 px minimum width / 680 px minimum height could exceed the actual
  WebView. Home now uses the available viewport and retains its action footer;
  short landscape screens scroll content panels. Touch controls retain their
  sizes, and popovers stay within available height. Small-screen rules are
  isolated from the locked reference size.
- Connection-error notices are separate from command gates. Only the confirmed
  `scaleDisconnected` and `scaleConnectFailed` kinds cease to block unrelated
  operations. Decaid's `blockOnNoScale` still gates espresso; no setting is
  changed automatically. Dismissal tracks the error's identity across replay,
  while a new incident can reappear. Machine/profile-upload failures remain
  blocking, even after notice dismissal. Mid-shot scale-loss guidance remains.
- **Connect scale** opens Connections for explicit device selection. That path
  submits the selected ID, requires a confirmed outcome and refreshes inventory;
  it never chooses the first remembered scale or silently treats a failure as
  success. No physical connection command was sent during development.
- Installed Decaid returns `200/null` for missing KV keys. Favorites and Focus
  preferences now confirm absence against the namespace key list before using
  suggestions/defaults. Stored null, malformed responses, failed reads, empty
  favorites and unavailable IDs do not silently become new assignments.
- `npm run check` passes TypeScript, ESLint, **84 gateway tests** and the static
  build. The existing 500 kB bundle advisory remains. No dependency was added.
- At 1340 × 800, the final-build locked Focus screenshot has **zero changed RGB
  pixels** against `artifacts/phase-2/home-before.png` in both the Home body
  `(0,72)–(1340,704)` and footer `(0,704)–(1340,800)`.
  Evidence: `artifacts/tablet-acceptance/focus-comparison-0.2.1.json`.
- Final tablet-specific/production-asset run: **4 passed (4.4 minutes)**. It
  covers first-install defaults without writes, deliberately empty favorites,
  dismiss/replay behavior, explicit selected-device connection, optional-scale
  brewing, and Ready/Brewing controls at 1340 × 800, 1024 × 600, 893 × 533 and
  800 × 480. All footer touch targets remain at least 44 px, the document does
  not overflow, favorite/Browse controls do not overlap, and the utility popup
  fits the smallest viewport. Production assets also load below a nested path
  with the API blocked and no fallback readings. Captures were visually reviewed.
  Evidence: `artifacts/tablet-final-fixes` and `artifacts/tablet-acceptance`.
- All six existing Home scenarios passed in an earlier focused run, and the
  final-build locked-layout, utility, empty-workflow and mid-shot cases also
  passed. The shared-pages navigation case passed separately. A broader sweep
  was interrupted after startup timeouts and a calibration read-back hit the
  stale-reading guard. Do not count interrupted runs as acceptance or claim a
  clean complete suite. The three serial recovery cases subsequently passed (**3 passed, 2.9 minutes**):
  sensor/flow calibration, real brewing stages/completion, and disconnect/error/
  sequencing gates. This diagnostic run used a 90-second test assertion allowance
  and a 240-second test timeout in an ignored local config; production request
  timeouts, freshness limits and command gates were not changed. Evidence:
  `artifacts/tablet-serial-recovery`. There is no claim of a single clean full-suite run.
- `npm run package:skin` passes. The verified archive has **11 files**, is
  **593,844 bytes**, and has SHA-256
  `ad1d28429cbe8895d6030aa9bb0c0a2510abe63d2849c7394356f84929947dd6`.
  It contains the production static build, bundled fonts/artwork, root metadata
  and relative assets; no fixture endpoint or test code is packaged.

See [TABLET-ACCEPTANCE.md](TABLET-ACCEPTANCE.md) for the focused 0.2.1 recheck:
landscape framing, preference persistence, warning dismissal, Bookoo connection,
optional-scale policy, physical manual stop / stop-at-weight and resume.

## Phase 9 — local release preparation, November 5, 2026

Device status: **not accepted**. No tablet, machine, account or external service
was contacted for this phase. The actionable device checklist and evidence
record are in [TABLET-ACCEPTANCE.md](TABLET-ACCEPTANCE.md).

- `npm run check` passes TypeScript, ESLint, **80 gateway tests**, and the static
  production build. `npm ls --depth=0` reports a valid installed dependency tree.
  The JS bundle remains about 653 kB / 205 kB gzip, with the existing 500 kB
  advisory. No dependencies, Focus layout, CSS tokens or typography changed.
- The broad navigation check caught duplicate React keys between the daily and
  advanced Machine sections. Section-specific keys correct the reconciliation;
  the read-only category/navigation regression now passes without duplicate
  controls.
- A library-load scenario exposed an object-identity race: an unchanged workflow
  returned by periodic sync was treated as a concurrent recipe edit. Profile
  loading, inventory assignment and shot repeat now compare a captured canonical
  workflow value across their reads. Six unit regressions verify that equivalent
  refreshes succeed and genuine changes (including in-place edits) still block
  the write. Freshness, sequencing and operation guards remain unchanged.
- The complete **40-scenario** browser sweep finished with **35 passed and
  5 failed** (47.5 minutes). The five failures were the workflow-read race above
  and initial-load timeouts in extension, malformed-favorite and two profile
  editor scenarios. Startup assertions now wait for the initial gateway/editor
  state (and explicit Refresh where appropriate); production timeouts and
  guards are unchanged. All five failed scenarios subsequently passed in
  focused runs. A four-case run also rechecked shot repeat and inventory/recipe
  selection against the workflow guard fix (**4 passed**, 6.1 minutes); separate
  favorite, ID-recovery and profile-draft runs passed in 1.4, 1.9 and 1.8 minutes.
  Thus all 40 scenarios have passing evidence across the sweep and reruns;
  this is not a claim of a single clean 40-test run. Evidence for reruns is in
  `artifacts/phase-9-regressions`, `phase-9-favorites-recovery`,
  `phase-9-profile-recovery` and `phase-9-profile-drafts`.
- The final-build locked Focus rerun passes (**1 passed**, 1.5 minutes) after
  waiting for initial brewing readiness and all five favorites. This extra run
  also encountered a startup timeout before those explicit waits were added;
  no production guard or timeout changed. At 1340 × 800, comparison against
  `artifacts/phase-2/home-before.png` finds **zero changed RGB pixels** in the
  body `(0,72)–(1340,704)` and footer `(0,704)–(1340,800)`.
  Evidence: `artifacts/phase-9-focus-comparison.json` and
  `artifacts/fidelity/test-ready.png`.
- Browser fixture builds are now isolated by preview port. An overlapping
  diagnostic run initially shared the old build directory; those runs were
  stopped and the complete suite restarted with isolated builds. Do not count
  interrupted runs as release evidence.
- `package:skin` rejects a development API override before building, packages
  the static application, and runs `verify:skin`. The verifier checks ZIP
  integrity, the root index/manifest, exact correspondence with dist, relative
  assets, bundled font/artwork, forbidden files and fixture/local-origin
  markers. It writes an ignored checksum and source-state report.
- The inspected release archive contains **11 files / 12 ZIP entries** and is
  **593,220 bytes**. SHA-256:
  `c08e47982c6129ab044c102890f2489677d7fe479f1f0e286293e96e8183b874`.
  Root metadata, bundled assets and relative entry paths pass inspection.
- The production-asset browser smoke test passes under `/skins/focus/`, with
  all non-static HTTP and every WebSocket blocked before navigation. It verifies
  the bundled Geist face actually loaded, relative CSS, 1340 × 800 containment,
  disabled brewing and unavailable readings without an API, plus direct Help
  entry and reload. No fixture origin is built into that release asset test.
- Six negative archive checks reject an extra environment file, fixture code,
  a hard-coded local API origin, an absolute CSS asset, a missing relative asset
  and archive bytes that differ from dist. A seventh check confirms a fixture
  environment override fails before building and leaves the prior archive
  unchanged. Evidence: `artifacts/phase-9-negative-checks.json` and command output.

The remaining acceptance work needs the Samsung tablet and, for execution
checks, paired equipment and a supervised operator. Installation, actual CSS
viewport and WebView compatibility, touch/keyboard/TalkBack, suspend/resume,
physical starts and stopping policies, saved-shot behavior and each approved
service/plugin operation remain unverified. The documented locked Stop-label
contrast shortfall is unchanged; no WCAG AA or hardware-performance claim is made.

## Phase 8 — extensions and support, November 4, 2026

- `npm run check` passes TypeScript, ESLint, **74 gateway tests** and the
  production build. The JS bundle is about 653 kB / 205 kB gzip; Vite's existing
  500 kB advisory remains. No dependencies or locked theme tokens changed.
- Contract checks use Decaid `14361a94` and Streamline `65460d41`. Unit coverage
  includes strict inventory/settings responses, hidden and unsupported fields,
  secure credential clears, manifest changes before writes, permission candidate
  changes, safe launch/return URLs, supported installation bodies, command gates,
  text-only feedback/account checks and bounded plain-text logs.
- Targeted browser checks cover retained failed drafts, hidden/secure field
  preservation, shot interruption, safe return links, lifecycle actions,
  permission approval, partial updates, installation and cancelled removal.
  Help coverage verifies local diagnostics/log reads, owned system-preference
  patches, explicit feedback review, failed-submission retention and successful
  acknowledgement without attachments. Startup runs exposed delayed initial
  reads in headless Chrome; traces showed successful fixture responses. Read-only
  support loads now start immediately, and the support/recovery checks wait for
  gateway readiness and use the visible Refresh action. Production request
  timeouts and command gates were not relaxed. All **four phase 8 scenarios**
  passed across targeted runs; the final support and unavailable-endpoint run
  passed **both scenarios** (2.7 minutes), including explicit credential removal
  only on Save, missing inventory, signed-out feedback and unavailable WebView
  logs. This is targeted coverage, not a full-suite claim.
- The locked Focus browser regression passes. Its 1340 × 800 capture has **zero
  changed RGB pixels** in the body `(0,72)–(1340,704)` and footer
  `(0,704)–(1340,800)` compared with `artifacts/phase-2/home-before.png`.
- Manual in-app checks cover Help and plugin settings, direct entry, masked
  credentials, declared launch/return links, no document overflow and visible
  form controls at least 44px. No console errors or warnings were recorded.
  Evidence: `artifacts/phase-8-preview.png`.
- The production archive is **593,205 bytes**, with 12 entries, root index and
  manifest, relative entry assets, bundled font and artwork. Fixture origins,
  test routes, source/dependency directories and environment files are excluded.

All operations ran against the isolated API fixture. No real hardware commands,
plugin downloads, account login or external feedback submission were performed.
Installed plugin UI behavior, native account/consent flows, external delivery and
Samsung WebView acceptance remain phase 9 work.

## Phase 7 — advanced operations, November 4, 2026

- `npm run check` passes TypeScript, ESLint, **63 gateway tests** and the
  production build. The JS bundle is about 625 kB / 197 kB gzip; Vite's existing
  500 kB advisory remains. No dependencies or locked theme tokens changed.
- Contract checks use the installed-target Decaid `14361a94` and Streamline
  `65460d41` source. Coverage includes correction math and factory restoration,
  capability/identity/freshness gates, palette preservation, bounded exports,
  firmware stream verification, maintenance state transitions and interruption,
  cancelled starts and explicit sync conflicts/section outcomes.
- Targeted browser checks cover read-only category visits, sensor and flow
  calibration, maintenance prerequisites and ordered cancellation, firmware
  verification failure/cancellation/completion, load-cell results and accessory
  writes, partial import/sync, and distinct app/skin installation. Missing
  form-submit types found in cup warmer and skin installation were corrected,
  including scheduled preheat. All seven advanced scenarios passed across
  targeted runs, alongside the locked Focus regression. Repeat runs exposed
  startup read/connection timing: advanced reads now wait for the connection,
  identity recovery is explicit, and browser setup waits for initial network
  loading like the existing Focus tests. Production request timeouts and
  freshness/command gates were not relaxed. Calibration passed twice in the
  repeat run; the final startup/calibration run passed **both scenarios**
  (2.4 minutes). This is targeted coverage, not a full-suite claim.
- The Home regression at 1340 × 800 has **zero changed RGB pixels** in the body
  `(0,72)–(1340,704)` and footer `(0,704)–(1340,800)` compared with
  `artifacts/phase-2/home-before.png`. Focus layout, styles and theme tokens are
  unchanged.
- Manual in-app checks cover direct Calibration entry, shared frame, visible
  controls of at least 44px, no document overflow and no new console errors after
  a fresh reload. An effect-dependency warning during hot replacement cleared
  on reload and did not recur.
  Evidence: `artifacts/phase-7-preview.png` and `artifacts/phase-7/updates.png`.
- The production archive is **584,592 bytes**, with 12 entries, root index and
  manifest, relative entry assets, bundled font and artwork. Fixture origins,
  test routes, source/dependency directories and environment files are excluded.

All operations ran against the isolated API fixture. No real hardware command
or discovery was performed. Actual calibration, thermal procedures, firmware,
native app installation, skin reload and large file transfer still need
supervised device acceptance. Browser export is bounded to 128 MiB; larger
exports and unsupported legacy migrations use native Decaid data management.
An acknowledged request, elapsed time or upload percentage is not proof of a
completed hardware procedure.

## Phase 6 — shot history, November 4, 2026

- `npm run check` passes TypeScript, ESLint, **50 gateway tests** and the
  production build. The JS bundle is about 573 kB / 183 kB gzip; Vite's existing
  500 kB advisory remains. No dependencies or locked theme tokens changed.
- The initial targeted browser run passed **all six scenarios**: locked Focus,
  shared-page navigation, server filters/paging/Back with one session, failed
  and overlapping annotation edits with canonical clears, repeat/export/delete,
  and missing/partial records with physical-shot interruption and read retry.
  After the development-remount fix and interrupted-draft protection, the final
  history run passed **all four scenarios** again (4.8 minutes), including
  opening another record without losing the retained draft. This is targeted
  coverage, not a full-suite claim.
- Annotation tests verify that workflow and measurements remain unchanged,
  unknown extras survive, failed writes retain edits and later edits survive
  acknowledgement. Repeat writes only profile/context and never a start command.
  Export matches the saved record; deletion tests cover Cancel, failure and
  acknowledged removal. All mutations run against disposable fixture records.
- The Home regression at 1340 × 800 has **zero changed RGB pixels** in the body
  `(0,72)–(1340,704)` and footer `(0,704)–(1340,800)` compared with
  `artifacts/phase-2/home-before.png`.
- Manual in-app checks cover direct history/detail entry under development
  remounts, recorded chart rendering, fixed footer actions and target framing:
  no document overflow and no visible interactive controls below 44px.
  Evidence: `artifacts/phase-6-preview.png`, `artifacts/phase-6-curves.png`
  and browser captures in `artifacts/phase-6/`.
- The production archive is **570,416 bytes**, with 12 entries, root index and
  manifest, relative asset URLs and bundled fonts. Fixture origins, test routes,
  source/dependency directories and environment files are excluded.

This is desktop/fixture evidence only. No real machine discovery, connection or
hardware command was performed. Samsung WebView installation, file downloads,
actual viewport and touch/keyboard behavior, lifecycle and device acceptance
remain pending. Export is saved-shot JSON, not a full Decaid backup.

## Phase 5 — recipes, coffee and equipment, November 4, 2026

- `npm run check` passes TypeScript, ESLint, **42 gateway tests** and the
  production build. The JS bundle is about 558 kB / 178 kB gzip; the existing
  Vite 500 kB advisory remains. No dependencies or locked theme tokens changed.
- Initial browser coverage passed all three scenarios: default fork and stage
  reordering with unknown fields after reload; changed-ID recovery after a
  rejected favorites write; and recipe preferences with inventory selection and
  archival. The expanded final run passed **all seven targeted scenarios**:
  locked Home, shared navigation, default forks/unknown fields, changed-ID
  recovery after reload, preferences/inventory selection, inventory draft
  interruption and create/edit/archive/restore, and profile validation/navigation/
  shot interruption/Cancel. After the final editor-specific Cancel and lineage
  refresh cleanup, all three affected browser scenarios passed again. This is
  targeted phase 5 coverage, not the full suite.
- The final Home regression passed at 1340 × 800. RGB comparison against
  `artifacts/phase-2/home-before.png` found **zero changed pixels** in the body
  `(0,72)–(1340,704)` and footer `(0,704)–(1340,800)`.
- Manual in-app review at 1340 × 800 confirms no document overflow, fixed shared
  footer Save/Cancel, and no interactive controls below 44px. Base UI's hidden
  1px form inputs are excluded from touch-target measurement. Preview evidence:
  `artifacts/phase-5-preview.png`; browser captures: `artifacts/phase-5/`.
- `node scripts/package-skin.mjs` produced a **566,004-byte** archive with 12
  entries, root index/manifest and relative bundled assets. No fixture origin,
  test route, source/dependency directory or environment file is packaged.

The tests use loopback fixtures only. No machine discovery, device connection,
grinder command or physical operation was performed against real hardware.
Samsung WebView installation, keyboard/touch behavior on the actual tablet,
background/resume and actual device acceptance remain pending. Profile limits
and unknown-field sidecars are not claims of support for new machine features.

## Phase 4 — daily-use settings, November 4, 2026

- `npm run check` passes TypeScript, ESLint, **34 gateway tests**, and the
  production build. The main bundle is about 520 kB / 168 kB gzip; Vite reports
  its standard 500 kB chunk advisory. No dependency or theme-token changes.
- Locked Home workflow/layout and shared-page navigation regressions passed.
  At 1340 × 800, pixel comparison of `artifacts/fidelity/test-ready.png` against
  `artifacts/phase-2/home-before.png` found **zero difference** in body
  `(0,72)–(1340,704)` and footer `(0,704)–(1340,800)` regions. Header still has
  the previously approved Settings entry.
- All four daily-use category visits were verified to send no operational
  requests. The explicit scan uses discovery only (`connect=false`).
- Eight distinct targeted browser scenarios passed across regression runs:
  locked Home, shared-page navigation, empty favorites/Cancel, Back cancellation,
  read-only category visits/explicit scan, utility drafts/failed saves/shot
  interruption, brightness caps/newer edits/unit persistence, and schedules/
  sleep/wake/unsupported grinder. The final six-scenario run passed five; its
  display assertion included the select's decorative arrow. After targeting the
  value text, the display rerun passed. This was targeted coverage, not a single
  complete-suite run. Earlier runs were interrupted while refining test labels.
- `node scripts/package-skin.mjs` produced the ignored 555,410-byte skin archive. Inspection
  confirms root index/manifest, relative assets, bundled Geist/artwork and no
  fixture origin, test routes or test implementation in `dist/`.
- Manual in-app preview reviewed grouped rows, 48px fields/switches/selects,
  clear disabled states, shared page framing and section actions. The display
  page has no document overflow or controls below 44px at 1340 × 800. Fahrenheit
  hot-water adjustment round-tripped 194.0 → 195.8 → 194.0°F while retaining
  integer Celsius wire values; the preview was restored to Celsius. Captures are
  under ignored `artifacts/phase-4/` and `artifacts/phase-4-preview.jpg`.

No machine was discovered or operated. All automated mutations used isolated
fixtures. Installed tablet/WebView, physical devices, charging/brightness,
wake schedules and grinder hardware acceptance remain pending. The upstream
contract was source-checked at the installed-target commit, not live queried.


**Not yet accepted for hardware release.** The Focus implementation is complete, but Samsung WebView installation and supervised machine acceptance remain unverified. The locked stop-button color also remains below the normal-text WCAG AA contrast threshold.

Validated on November 4, 2026 with Node 25.8.0, npm 11.21.0 and installed desktop Google Chrome. The installed Decaid target is 0.9.1+3027 (`14361a94`). All automated and manual commands in this validation used isolated local fixtures; no hardware command was sent.

## Phases 2 and 3 — shared pages and favorites

Implemented and fixture-verified on November 4, 2026. Device acceptance is still pending. The production audit below describes the earlier Focus baseline; its historical source line references may have moved.

- `npm run check`: TypeScript, ESLint, **27 gateway tests**, and production build passed.
- Browser coverage: the six existing Focus scenarios passed. Final shared-page/library runs cover direct entry/reload/Back, one five-socket session, focus restoration, 44px minimum controls, document overflow, swaps/reordering/clear/Cancel, all-empty persistence, failed Save, edits during Save, physical-start draft recovery, malformed/unavailable IDs, hidden/default records, import/export and partial import results. The staged import also survives a physical-start interruption. Duplicate-title loading and empty/error library recovery also passed. In total, all **15 browser scenarios** passed across the regression and final focused runs (six Focus scenarios plus nine page/library scenarios).
- Home visual comparison at **1340 × 800**: **zero differing pixels** in the Cover rail, center, right panel and footer. The approved 48px Settings entry is the only header addition. Shared pages retain the 72px header, 220px rail and 96px footer.
- Local captures: `artifacts/phase-2/home-before.png`, `artifacts/fidelity/test-ready.png`, `artifacts/phase-2/settings.png`, `favorites.png`, `library.png`; region comparison data is in `artifacts/phase-2/home-comparison.json`. The Settings, favorites and library captures were visually reviewed.
- `artifacts/decent-skin-codex-0.2.0.zip` was rebuilt and inspected: root index/manifest, bundled fonts/artwork and relative assets; no source, dependencies, fixture origin/routes or environment files in its 12 entries. The version is unchanged because this work is not a new device-accepted release.

The initial expanded browser run passed 12 of 14 scenarios; two loading/history cases failed before the final navigation/read-fencing work and both passed focused reruns (`npm run test:e2e -- tests/pages.spec.ts --grep 'unavailable, duplicate|Back cancellation'`: 2 passed). The remaining final page suite (`--grep-invert 'unavailable, duplicate|Back cancellation'`) passed all 7 scenarios. Verification is reported across regression and focused runs rather than claiming that initial full run was green. A separate gateway regression checks that a replayed preparation event after reconnect cannot be mistaken for a newly observed start, while machine-first shot events retain elapsed-time knowledge.

Favorites and staged imports are retained in memory across navigation and shot interruption. A completed reload discards unsaved drafts; browser unload protection is requested but still requires WebView acceptance. File picker/download behavior, installation, live installed-version confirmation, actual Samsung viewport, background lifecycle and physical machine/scale behavior remain unverified. No hardware commands were sent.

## Visual evidence

The approved Focus source was built and preserved before removing the prototype. Its final surface tone was set to 0.16. Reference and production were compared at a **1340 × 800 CSS viewport** in the same browser.

| Measurement | Reference and production |
| --- | --- |
| Header | x0, y0, 1340 × 72 |
| Cover rail | x0, y72, 220 × 632 |
| Main | x220, y72, 792 × 632 |
| Right panel | x1012, y72, 328 × 632 |
| Footer | x0, y704, 1340 × 96 |
| Main title | Geist Variable, 30px / 37.5px, weight 500 |
| Focus window | x1037, y214, 279 × 280 |
| Stage rows | 104px, 28px type, 10px dot gap |
| Page overflow | 1340 × 800; no document overflow |

In the same-browser brewing captures, the title/description region and footer have **zero differing pixels**. The right panel has 85 of 207,296 pixels with a maximum RGB-channel difference over 2/255 (mean maximum-channel difference 0.009/255); this includes the independently running dot animation and JPEG capture compression. This is evidence of matching geometry and appearance, not a blanket pixel-exact claim for dynamic readings or another browser.

Data-dependent text and curves intentionally differ: real profile targets/stages, live readings, truthful water-height units, and unknown-value dashes. See [locked design constraints](design/FOCUS.md). Screenshots and the preserved reference are ignored local artifacts under `artifacts/fidelity/` and `artifacts/focus-reference/`.

## Production audit

A. Accessibility

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Blocker | The inherited red Stop label at `src/skin/chrome.tsx:228` is about 4.245:1 | Locked color retained | It misses the 4.5:1 normal-text threshold; the user explicitly locked colors | Open design decision |
| Should fix | Returning from the completed panel could lose keyboard focus | First recipe control receives focus at `src/skin/screen.tsx:105` | Keyboard users can continue adjusting the recipe | Fixed and checked |

B. Performance

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Should fix | Each independent stream notification rebuilt the UI | `src/gateway/client.ts:107` coalesces telemetry notifications over 100ms while updating command-guard state immediately | Avoids redundant renders from simultaneous device, scale and machine messages | Fixed; tablet frame rate still unverified |
| Should fix | An unbounded shot could grow its plot indefinitely | Observed samples are capped at 3,600 at `src/gateway/client.ts:420` | Bounds memory and SVG work | Fixed |

C. Mobile

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Should fix | Imported labels could expand or overlap their columns | Containment at `src/skin/chrome.tsx:128`, `src/skin/focus.tsx:63` and `src/skin/screen.tsx:32` | Preserves the locked geometry with long data | Fixed |
| Should fix | Native touch selection and scroll chaining were uncontrolled | Touch feedback at `src/skin/skin.css:85`; library overscroll containment at `src/skin/profile-library.tsx:91` | Avoids accidental selection and background scrolling | Fixed |

D. Forms

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Blocker | Empty workflows could not choose an initial profile | Profile selection uses the connection/operation lock independently of profile existence at `src/skin/use-skin.ts:231` | A fresh workflow can be initialized | Fixed and checked |
| Blocker | A named grinder setting could become NaN | `src/skin/grind-editor.tsx:17` preserves a string; numeric settings retain steppers | The official workflow field is a string | Fixed and checked |
| Should fix | Failed profile writes could be hidden behind the dialog | Error is shown inside `src/skin/profile-library.tsx:95` | User sees that the recipe was not changed | Fixed and checked |

E. Stability and states

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Blocker | Prototype actions and values were simulated | `src/gateway/client.ts:269` implements REST/WebSocket bindings with no mock fallback | Production must reflect Decaid | Fixed; contract/fixture verified only |
| Blocker | Replayed completion could reopen a dismissed panel | Completion dismissal is idempotent in `src/gateway/client.ts:119` | “Adjust profile settings” must stay in settings | Fixed and checked |
| Should fix | Resume could arrive during an in-flight sync | A queued resync runs after the current request at `src/gateway/client.ts:269` | Avoids dropping a lifecycle refresh | Fixed |
| Should fix | A mid-shot reload could fabricate a start time | Unknown elapsed time remains a dash until stored measurements are available (`src/skin/use-skin.ts:122`) | Replay timestamps are not shot-start timestamps | Fixed and checked |
| Should fix | Curves could escape their axes or bridge missing targets | `src/skin/trace.tsx:26` clips plots and breaks paths at unavailable samples | Avoids implying readings that do not exist | Fixed |

F. Motion

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Should fix | The dot wave could run during heating or while hidden | `src/skin/focus.tsx:44` runs it only while brewing and visible | Motion reflects the actual process | Fixed |

The existing 220ms rolling transition, 900ms dot wave, fading dividers and reduced-motion handling are retained. Reduced motion keeps static dots and stage changes; it removes movement.

G. Theming: one fixed dark appearance, surface tone 0.16. No theme picker, stored appearance override or light-screen route remains. Generated shadcn base tokens are preserved.

H. Content and leftovers

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Blocker | Multiple experimental screens and demo transport existed | `src/App.tsx:12` mounts only Focus; retired prototypes, appearance UI, simulation, old app components and the unused animation dependency are removed | Only Focus ships | Fixed |
| Should fix | Simulation labels implied fake readings | Live/recorded labels at `src/skin/trace.tsx:84`, real profile data and unknown-value dashes at `src/skin/use-skin.ts:12` | Keeps the UI truthful | Fixed |

I. Marketing/SEO: skipped; this is an installed device-control UI with no marketing routes. Title, description, dark color scheme, viewport metadata and local font preload are present.

## Needs a device

- Install the archive using Decaid's skin manager. Verify the relative JS, CSS, images and font load without the development computer.
- Record actual CSS `innerWidth`, `innerHeight`, `devicePixelRatio`, `visualViewport` and Android System WebView version. Confirm 1340 × 800 framing rather than inferring it from physical display pixels.
- Check touch, native dialogs, keyboard focus, TalkBack, reduced motion and smooth rolling on the Samsung tablet.
- Check suspend/resume and Decaid's page unload/reload behavior. Mid-shot reattachment should show the correct frame and unknown elapsed time, not restart a shot.
- In a supervised session, verify physical group-head start, profile upload, stage transitions, manual stop, stop-at-weight, scale loss, device disconnect/reconnect, steam, hot water, flush and saved history.

The reported tablet API address `http://192.168.50.13:8080` was unreachable from the development computer. No installation or machine acceptance result is claimed.

## Needs a human

The locked red Stop label needs a decision before WCAG AA conformance can be claimed. The smallest change would be to lighten only that foreground until it reaches 4.5:1 against its actual background; use `emil-color` / `emil-touch-and-accessibility`. No color change was made because visual fidelity was explicitly locked.

## Command results

Final command outcomes are recorded below. Earlier browser runs exposed a completion-replay bug (fixed and covered by a unit regression) and startup timeout failures. Targeted reruns passed all six scenarios. Browser setup now waits for initial network loading before beginning interaction assertions. The eight-second production request timeout and five-second freshness gate were not relaxed.

- `npm run check` — passed: TypeScript, ESLint, **18 gateway tests**, and the production build. Final Vitest output: `Test Files 1 passed (1)` / `Tests 18 passed (18)`.
- `npm run test:e2e` — final full run: **`6 passed (5.5m)`**. Covers locked layout, workflow preservation and adjustments, profile search/load, history, live stages, completion/dismissal/focus, utility settings/start/stop, disconnected/error/full-mode gating, empty workflows, named grind settings, reduced motion, mid-shot attachment and long-label containment.
- `npm run package:skin` — passed. After the final checked build, `node scripts/package-skin.mjs` refreshed `artifacts/decent-skin-codex-0.2.0.zip` (519,945 bytes).
- Archive inspection — **PASS**: root `index.html` and `manifest.json`, relative entry assets, bundled Geist and five artworks, no source/test/prototype directories or fixture endpoint strings.
- `git diff --check` — passed. Source scan found no private-key or credential-token patterns in changed application/test/documentation files.
- Manual in-app browser — confirmed the locked geometry and numeric baseline, stage rendering, completion dismissal with focus return, and steam duration/start/stop against the isolated fixture. All real machine behavior remains on the device-acceptance list above.

No commit, push, tablet installation or hardware test was performed for this implementation. The pre-existing untracked historical export script was preserved.

The final screenshot review added first-sample coverage for a brewing snapshot sharing the idle replay timestamp. After that correction, `npm run check` passed all 18 unit cases and `npm run test:e2e -- --grep 'real stages'` reported **`1 passed (1.0m)`**, including a visible multi-point chart assertion. The archive was rebuilt and its contents revalidated after this last change.
