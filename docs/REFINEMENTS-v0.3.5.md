# Focus v0.3.5 local candidate

Based on v0.3.4 (`2daa10b`), prepared on `codex/focus-0.3.5-refinements`. This is a local review candidate, not a published release or installed tablet build.

## Shared navigation and alignment

`App` now owns one approved `CandidateHeader` above its route content. Home, brewing, Settings (every category), history/detail, library/detail, favorites, profile editor, recipe preferences and inventory use the same instance and App-owned session. `PageShell` no longer renders the legacy header. Full-screen Home Sleep intentionally hides navigation; its Wake and Machine settings controls remain.

Header layout rules no longer depend on the Home wrapper. Explicit line height and centered flex content keep labels, readings and icons on the same center without an offset. The 72px minimum header, existing padding, type sizes, action hit areas and responsive wrapping remain. The compact page-sidebar selector is scoped to Skin pages rather than every navigation element. Geometry must still be reviewed in Android WebView; a Chrome emulation of the reported 1007 × 601 CSS viewport is not a device measurement.

The production Home uses the shared header; the separate development preview renders the same component inside its standalone canvas. Chart geometry accounts for the external header while retaining its original global position, 500ms Home/Brewing transition and 420ms time-domain animation. A new shot closes the utility popover without remounting the entire header.

## Recipe interaction investigation

The user clarified that the flash happens on every +/− tap, not when opening or saving the keypad.

Baseline checks used the exact v0.3.4 source in an isolated temporary checkout with the local fixture. Keypad Save and repeated + taps retained the same Home DOM instance; no navigation, blank/loading replacement or Home/chart teardown was reproduced. Source inspection found no reload call in those paths. The browser baseline does **not** establish the cause of a Samsung compositor flash.

Confirmed avoidable work:

- Workflow acknowledgement parses a new equivalent profile object, invalidating the preview's reference-based memo even for context-only Grind/Dose/Yield edits. The preview now compares canonical profile contents, reusing its plan and SVG when targets are unchanged. Actual temperature/profile changes still update it.
- Native-disabled +/− buttons lose keyboard focus during an asynchronous command gate. Base UI's focusable-disabled behavior now preserves focus while still suppressing activation and duplicate writes. Disabled appearance is retained explicitly.
- Each quick adjustment previously created a loading toast followed by a generic acknowledgement. Routine successes now remain in their controls; errors and the 45s unconfirmed-outcome watchdog are retained.

No optimism, opacity mask, artificial delay, retry, page loading overlay, transport change or chart animation was added. Selected-profile IDs, canonical asynchronous guards, merged Focus KV preferences and partial-save errors remain owned by the existing gateway code. Repeated-tap and persisted-value regressions cover this path. **The reported tablet-wide flash remains an acceptance item until the candidate is tested on that device; its exact hardware-specific cause is unverified.**

## Display-only changes

| Reading | Before | After |
| --- | --- | --- |
| Numeric grind | 18.00 / 18.50 | 18 / 18.5 |
| Target yield | 36.0 g / 36.5 g | 36 g / 36.5 g |
| Home temperature | 93.0 °C / 92.5 °C | 93 °C / 92.5 °C |
| Brewing time at 65 seconds | 65.0 s | 01:05 |
| Brewing temperature | Group temperature · 93.0 °C | Temperature · 93 °C |

Dose formatting is unchanged. Named grinder settings are preserved. Setting formatting does not round stored values or change increment sizes; the keypad initializes from the actual value instead of silently rounding it before editing. Live temperature keeps its existing one-decimal measurement precision, with trailing zeros removed. Time uses the actual latest elapsed sample, floors only the display, pads minutes/seconds and supports durations over 99 minutes. Missing/invalid readings stay unavailable.

Metric order is now Time, In the cup, Pressure, Flow, Temperature. The group-temperature sensor, telemetry precision, chart samples, axes, gradients and metric typography are unchanged.

## Notifications

See [the full v0.3.5 notification audit](NOTIFICATIONS-v0.3.5.md) for every trigger, exact previous copy/expression, classification, disposition and dismissal policy.

Removed routine preparation/heating, generic Home acknowledgements and normal Sleep/Wake feedback. Also quieted redundant connection, tare, preference-toggle and readback successes. Important explicit saves, calibration/firmware/transfer results, failed writes, real connection failures, shot results and actionable warnings remain. Advanced page restrictions remain visible inline rather than creating a toast whenever a routine gate changes. Refill and fault latches, scale-dependent warnings, deduplication, ranking and original durations are preserved.

## Validation

All automated device operations used the isolated API fixture; no physical machine was operated. Samsung WebView rendering, touch behavior and device acceptance remain pending. The development preview at `http://127.0.0.1:5174/` was opened and retained for review.

| Check | Result |
| --- | --- |
| `npm run check` | Passed: TypeScript, ESLint, 182 unit tests across 14 files, production build |
| `npm run check:brewing` | Passed: development TypeScript, 18 model tests, production simulator-isolation audit |
| Notification browser checks | 4 passed: quiet heating/preparation and shot outcome; refill persistence/resolution across disconnect; quiet scale connection and visible failures; active required-scale warning/manual stop |
| v0.3.5 browser checks | 3 passed: all routed screens share the same header node and five original WebSocket channels; DOM/chart/focus/persistence stability and guarded rapid taps; actual MM:SS metrics and quiet observed Sleep/Wake |
| Existing affected regressions | 4 passed: direct-entry/Back/search/session navigation; utility partial writes and retained drafts; continuous chart-domain retargeting and reduced motion; 1007 × 601 Medium/disconnected readouts and explicit scale selection |
| Layout evidence | 1007 × 601, 1340 × 800 and 800 × 480 captures in ignored `artifacts/v035/`; no document overflow; single-row header at reported tablet width |
| Repeated recipe updates | Same Home/SVG nodes and chart bounds; zero SVG mutations for context-only changes; focused +/− retained while disabled; one in-flight write, no replay; saved values survive reload; failed save retains previous value |
| Static package | `package:skin` and `verify:skin` passed: 11 files, relative assets, root index, bundled fonts/artwork, no development API override |
| Final hygiene | ESLint and `git diff --check` passed; unrelated untracked export script preserved |

Eleven distinct focused browser tests passed. The complete browser suite was not rerun. The first navigation assertion counted a semantic content header; it was narrowed to navigation headers and passed. The first timer fixture began at 65 seconds, correctly normalized by the adapter to zero; the corrected test starts at zero then advances to 65. Two existing checks first observed a fixture connection loss during concurrent runs; both passed on an isolated rerun without application changes. No transport/freshness gates were weakened to obtain a pass.

The build retains its existing large-JavaScript-chunk advisory. Production isolation checked 2,457 modules and found no development preview/simulator content. Visual review confirmed the Home framing and reordered brewing metrics; it does not prove Android font rendering or compositor behavior.

Local archive: `artifacts/decent-skin-codex-0.3.5.zip`, 623,120 bytes. SHA-256: `35fcfed2b881d8c12389b855ecb40efe81ea5b7219a7d25030914de677b68299`. This exact archive is for the candidate review process; it has not been published, deployed or installed. Source/checksum metadata is recorded in ignored `artifacts/skin-release.json`.

Pending device acceptance: nav optical centering in the embedded WebView, repeated physical +/− taps with no reported full-screen flash, touch/focus behavior and supervised shot lifecycle/warnings. The local investigation excludes a reproduced Home remount but does not establish a definitive tablet-specific root cause.
