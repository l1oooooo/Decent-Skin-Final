# Phase 6 architecture, hardening and performance audit

Candidate: **0.3.10-rc.1**. Working branch: `codex/focus-phase-6-hardening`.
This is a local review candidate, not a published or installed release.

## Baseline and scope

The approved source baseline is v0.3.9, commit
`89e7711625b0d6448f757f1db929f521a3b247ca`. The local tag
`phase-6-baseline-v0.3.9` preserves it. The separate, unrelated
`scripts/export-current-designs.mjs` working file is excluded from this change.

The Phase 6 brief mentions 40 seconds, but the later approved implementation
and v0.3.9 release use **35 seconds**. This audit retains that definitive
baseline: 35 → 40 at 35 seconds, then 10-second expansions at each boundary.
No chart timing, telemetry, visual styling, typography or machine behavior was
changed for this candidate. Recipe-page initialization and shot-entry keyboard focus were corrected.

Production starts at `index.html` → `src/main.tsx` → `src/App.tsx`.
The separate development entry is `design/brewing/index.html`; it imports
production presentation, while production never imports the simulator.
`npm run check:brewing` audits the actual production module graph and output.

## Architecture review

| Area | Finding and decision |
| --- | --- |
| Shell and routing | App owns one gateway and retained drafts. Query routes share the header. The separate shot-navigation subscription has a distinct purpose; it is not a second machine connection. No shell rewrite. |
| Home and recipe settings | Stable field keys retain controls; pending-only saves preserve paint while activation guards remain enforced. Profile count animations depend on profile identity, not direct numeric edits. Keep the existing ownership and save sequence. |
| Profiles | Canonical executable identity, Focus KV recipe overrides, save journals and revision checks remain separate. Do not infer identity from titles or fill missing executable targets. |
| Preview chart | Memoized profile fingerprint and meaningful configured segments drive both drawing and legend. Missing/inactive pump targets are not manufactured. Preserve temperature-basis splits. |
| Live chart | This is a React/SVG chart, **not ECharts**. There is no chart instance to initialize or dispose. Pressure/flow areas and three line series retain raw samples and gaps. A memoized drawing layer and coordinate-only domain animation are already present. |
| Live session | The profile title is captured at shot start. Completion hold and return timers are shot-ID guarded and cleaned up; new shots supersede holds. Replay, unknown endings and faults remain distinct. |
| Transport | Five channel subscriptions, bounded retry bookkeeping and read generation guards. Stop clears timers, sockets, listeners and abort controllers. Reconnect does not replay commands. Notification batching does not defer the snapshot used by command gates. |
| Animation | Shared layout transition uses WAAPI and measured anchors. Resize, visibility and reduced-motion handlers settle animations. Timeline RAFs, rolling-status timers and profile-number RAFs have cleanup. Preserve 600 ms layout / 420 ms timeline durations and approved easing. |
| Toasts | One manager owns deduplication, priority and watchdogs. Persistent safety conditions clear from confirmed state. A watchdog reports uncertainty; it does not cancel or retry a machine action. |
| Settings and asynchronous work | Daily settings use canonical contents/revisions and changed-field writes. Failed/newer drafts remain. Advanced operations have explicit cancellation and identity gates. No speculative rewrite of these workflows. |
| Simulation boundary | Preview and API fixture remain development-only. No hardware operations were performed during this audit. |

Large App/gateway modules have several responsibilities, but they also preserve
important session and command ownership. Size alone was not treated as evidence
that a rewrite would improve correctness. The audit does not establish that all
possible races are absent; the fixture and unit coverage exercise known ones.

## Confirmed cleanup

### Delayed profile initialization

Cold recipe-preferences and profile-editor deep links could mark the route initialized while their
profile was absent. When a later library read succeeded, the route key was
already marked and the preferences were never read. A retained browser trace
showed successful profile responses but no recipe-preference request; the page
remained unavailable. A deterministic fixture check then reproduced the same
failure with an initially empty library followed by connection recovery.

The route guard keeps a recipe route pending until its requested profile
exists and initializes an empty, idle editor when its profile later arrives.
Missing-profile guidance remains explicit. It does not retry failed preference
writes, overwrite an existing editor draft or clear the save-recovery journal. `tests/phase6-recovery.spec.ts` covers arrival after recovery and asserts
that no write occurred. Before-fix failure evidence is retained under
`artifacts/phase6/recovery-before/`; final validation is in the QA report.

### Keyboard focus on shot entry

The navigation interruption handler still targeted the first Machine state
label, which now belongs to the hidden/inert shared header. A focused browser
regression confirmed that the visible `.brew-title` did not receive focus after
a shot interrupted a draft page. The handoff now waits for that shot sequence and the visible Home brewing
state, then focuses the existing status container once with `preventScroll`.
This preserves its markup, appearance and transition and avoids focusing it
while still inert. A selector-only change was insufficient in the first rerun. Before-fix evidence is in `artifacts/phase6/focus-before/`; the
post-fix result is recorded in the QA report.

### Dead presentation code

Import searches established that `src/skin/chrome.tsx` was an unused earlier
header/rail/footer implementation. Its private `src/skin/popover.tsx` wrapper
was used only by that dead module. Both were removed.

Unused `Wordmark`, `TabletStatus`, `UtilitySettings` and `ShotNumbers` exports
were removed from `controls.tsx`, along with an unused chart re-export and icon
import. The active Stepper, RecipeControls and GroupHeadGuidance remain.
`trace.tsx` is still used by history, profile details and the editor, so it was
retained. Historical design documents were not rewritten.

No dependencies were added, removed or upgraded. Active presentation was not
reorganized. Vite already excluded the dead JavaScript, so this is primarily a
maintenance cleanup, with a small generated CSS reduction from unused utility
classes. It is not claimed as a measured runtime speedup.

ESLint previously traversed ignored generated builds under `artifacts/` and
`exports/`. A debug run confirmed it parsed and analyzed a minified fixture
bundle for 2.007 seconds despite having no applicable source rules. Generated
build, report and coverage directories are now globally ignored by ESLint.
Source-only `npm run lint` completed in 12.57 seconds on this host. There is no
controlled whole-run before/after comparison, so a total speedup is not claimed.

## Release tooling

The package and verifier now share a strict version validator accepting stable
`x.y.z` and `x.y.z-rc.N` (positive N) versions. Node tests cover valid versions,
malformed values, leading zeros and path-like strings. Version metadata is
consistent across package, lockfile and skin manifest.

The pinned Decaid 0.9.1 source stores skin versions as strings, including when
reading the ZIP manifest:
[webui_storage.dart at 14361a94](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/webui_support/webui_storage.dart).
That source check does not replace installation testing on the tablet.

## Measured performance

### Bundle

Production Vite output before cleanup: JavaScript 734.13 kB (gzip 232.57 kB),
CSS 72.38 kB (gzip 13.75 kB). Final candidate: JavaScript 734.52 kB
(gzip 232.71 kB), CSS 70.01 kB (gzip 13.45 kB).
These are Vite's rounded decimal sizes. JavaScript is effectively unchanged;
CSS is about 2.37 kB smaller before compression. The existing >500 kB chunk
advisory remains. Splitting the persistent session/shell was not justified by
this measurement alone.

### Pure chart computation

`node scripts/profile-chart.mjs` performs 20 warmups and 100 measured domain and
five-series path generations at 1, 1,200 and 3,600 samples. Measurements run on
Node 25.8.0, darwin/x64. The last sample set is the current retention cap.

| Samples | Median | p95 | Generated line + area characters |
| --- | ---: | ---: | ---: |
| 1 | 0.004 ms | 0.012 ms | 138 |
| 1,200 | 0.892 ms | 1.762 ms | 254,320 |
| 3,600 | 2.986 ms | 5.870 ms | 816,586 |

This excludes React rendering, SVG paint, gradients, browser layout and Android.
The large maximum path size is a reason to measure on-device; it is not a
reason to discard or smooth telemetry. No sampling optimization was applied.
Raw output: `artifacts/phase6/baseline/chart-cpu.json` (ignored).

### Repeated usage

The isolated Chrome 157.0.8103.51 check completed 20 normal/manual shot cycles
with Settings/Home navigation at 1007 × 601. It retained the chart during each
shot, reset its domain for the next shot, opened exactly five WebSockets, and
reported no page errors or fixture command writes.

| After cycles | Documents | DOM nodes | JS listeners | Heap after forced GC |
| --- | ---: | ---: | ---: | ---: |
| 3 | 1 | 470 | 520 | 6,946,456 B |
| 10 | 1 | 470 | 543 | 7,281,620 B |
| 20 | 1 | 484 | 532 | 7,972,320 B |

The test's bounded-growth checks passed. Heap grew about 1.03 MB from the warm
sample; this does **not** prove that an hours-long Android session is leak-free.
Raw counters are in `artifacts/phase6/baseline/stability.json`.
The later full-suite rerun also passed: after 3/10/20 cycles, post-GC heap was
6,912,944 / 7,848,728 / 7,747,668 bytes, documents stayed at one, DOM nodes were
470 / 470 / 484 and listeners 543 / 547 / 521. It again opened five sockets
with zero page errors. The run-to-run heap difference is not attributed to an
optimization. Evidence: `artifacts/phase6/stability.json`.

### Isolated desktop workflow frame pacing

A separate headless Chrome run at 1007 × 601 measured RAF intervals after the
other regression browsers exited. Windows cover each complete workflow,
including fixture requests, React work, settling and screenshot overhead;
these are **not** animation-only FPS measurements or Android results.

| Window | Frames | Median interval | p95 interval | Maximum interval |
| --- | ---: | ---: | ---: | ---: |
| Idle | 74 | 16.7 ms | 66.7 ms | 116.7 ms |
| Profile switch | 33 | 50.0 ms | 949.9 ms | 966.6 ms |
| Home → Brewing | 52 | 16.7 ms | 483.3 ms | 2,299.9 ms |
| Rolling status | 17 | 116.6 ms | 1,666.7 ms | 1,666.7 ms |
| Timeline expansion | 11 | 83.3 ms | 983.3 ms | 983.3 ms |
| Completion and return | 85 | 16.7 ms | 666.7 ms | 1,983.2 ms |

PerformanceObserver recorded 82 long tasks totaling 27,387 ms across these
windows. The state/DOM assertions completed without page errors, but these
stalls prevent a performance-acceptance claim. The profile-counter regression
passed in this isolated run after missing an intermediate value under
concurrent regression load. No easing, durations, sampling or fidelity were
changed to hide stalls. Root cause and actual WebView impact remain open;
this is a diagnostic result, not a measured optimization.
Evidence: `artifacts/phase6/motion-performance.json` and `isolated-motion.json`.

### Cold startup: open finding

A profiled local Chrome cold load took **66.58 seconds** before the grind
control became enabled. JavaScript transfer was about 1.76 s, but early fixture
requests completed in 7–19 s from the browser's perspective. An independent
loopback request returned in under 1 ms. The CPU profile contains substantial
React render work; it does not establish a single cause. It would be inaccurate
to attribute this conclusively to either the app or the test host.

The trace is retained in `artifacts/phase6/baseline/startup.cpuprofile` with request
timings in `artifacts/phase6/baseline/browser-startup.json`. These desktop measurements do not establish
tablet startup or frame rate. Production freshness/request limits were not
relaxed to make tests pass. Cold history direct-entry checks failed twice with an explicit Retry history
state; the trace shows a 200 response at the wire while the UI fails to complete
the read. Warm repeat/export/delete passed in the traced rerun. The later missing-shot/error-recovery check passed, and filtering/pagination
passed from a ready Home session. Cold history-list entry remains unresolved.
An inventory rerun also stalled before its controls appeared; another reached
archive but missed the success notification even though the active record
was removed. These are distinct failed observations, not proof of failed
archiving. Their traces remain available for follow-up. This finding requires follow-up before final
production acceptance; no unmeasured performance improvement is claimed.

See [the QA checklist](PHASE-6-QA.md) for test results, unresolved cases and
the exact remaining device checks, and [candidate release notes](RELEASE-0.3.10-rc.1.md)
for packaging and rollback.
