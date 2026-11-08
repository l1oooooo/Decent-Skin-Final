# Focus 0.3.2 refinement candidate

## Implementation plan

Preserve v0.3.1 styling, utility controls, telemetry and shot ownership. This
candidate is pending review; it does not authorize publication or installation.

- Replace the forced 1050px two-row header with intrinsic flex wrapping. Keep
  the existing typography/spacing rules and let the gap between groups shrink
  to its minimum. Measure the rendered header for the brewing layout; viewport
  width alone must not imply header height. The operator reports 1007 × 601 CSS pixels from whatismyviewport.com on the
  tablet. Include this browser measurement in validation; the embedded Decaid
  WebView viewport remains unconfirmed.
- Replace whole-profile target completeness with segment visibility. Preserve
  configured pump modes, missing values, known ramps and temperature basis
  boundaries. Use the same valid segments for lines, fills and legend entries;
  never invent data after an unknown timeline boundary.
- Retain the SVG renderer and its 30s initial / 10s incremental time domain.
  Interpolate the displayed time range over 420ms outside React's render cycle.
  Move geometry and tick/marker positions from one displayed range; measurements
  and incoming telemetry stay unchanged. Retarget expansions from the current
  range; reset/snap on new shots, hidden views, resize and reduced motion.
- Share a 500ms layout transition between production and the simulator. Keep
  Home's side panels mounted and translate them outward while a single chart
  surface expands from the measured Home anchor. Preview and live graphics
  remain separate layers with a short opacity handoff. Reverse the same motion
  after the existing three-second completion hold. Read current transforms on
  interruption, cancel obsolete animations and use a shared start time.
- Keep transport, machine commands and sample collection outside motion code.
  Reuse the production transition implementation in the development preview.
  No new animation dependency or production simulator.

## Validation and delivery

Local candidate checks are complete; review and tablet acceptance are pending. This branch is based on
`f688eb36f108fb6675912f4fdbf0a8ab7461e419` (v0.3.1). No remote release,
deployment, tablet installation or hardware commands are part of this candidate.

### Rendering decisions

The live SVG renderer, five-series configuration, colors, fills, numeric domains
and raw sample paths are retained. A presentation-only SVG transform compresses
the horizontal coordinate system; tick and stage labels use the same displayed
domain without changing their font size. Updates do not rerender React on each
animation frame. A new expansion starts from the current displayed range.

The same mounted surface contains separate Home and live layers. Each retains
its own render dimensions while the outer surface uses FLIP. Both side-panel
translations and the surface transform share one start time, easing and 500ms
duration; graphics crossfade over 200ms. The simulator now delegates its entire
presentation to the production screen, using its existing isolated event adapter.

Preview line and fill paths split at missing targets, pump-mode gaps and
changes of temperature sensor basis. Unknown durations stop the placeable
prefix. If a smooth step has an unknown starting pump value, its configured
endpoint is shown as a dot, without fabricating a starting measurement or area.
This is why D-Flow's final pressure target is a dot, while Easy blooming shows
both its initial flow segment and later pressure segments.

### Viewport evidence

- One header row at 1340, 1280, 1200 and 1007px widths.
- At 1007 × 601, both groups fit with the existing compact typography and controls.
- With the fixture's Ready labels, intrinsic required width is about 848.11px:
  849px remains one 72px row; 848px becomes a 96px header. The implementation
  does not hardcode this threshold. 800px also wraps without overflow.
- Removed the old 1050px wrap rule and the legacy compact fixed header height.
- The actual embedded WebView remains unmeasured. Device performance and
  installation acceptance are pending review and a supervised session.

### Checks

- TypeScript, ESLint, 151 gateway/unit tests and production build: passed.
- Development model tests: 18 passed; production module graph excludes simulator code.
- New preview checks pass for intrinsic wrapping, all three regions sharing
  a start time, exact Home restoration, restart during a paused midpoint of the
  reverse transition, navigation cleanup, ongoing samples during zoom, new-shot
  domain reset and reduced motion.
- 11 unique focused preview browser checks passed: four existing brewing lifecycle
  checks, three UI/utility regressions and four new layout/motion checks.
- Three unique isolated production browser checks passed: frozen completion and
  one automatic return; rapid restart, missing scale and disconnect handling;
  and multiple live domain expansions with aligned ticks and ongoing samples.
  These are focused suites, not a full application end-to-end suite pass.
- The rapid-restart production fixture intermittently reported Connection lost
  before passing in isolation with request/socket diagnostics. No transport or
  freshness behavior was changed. Retain this as a test-harness/acceptance caveat;
  a passing rerun does not identify the earlier connection interruption's cause.
- Archive packaging and verification: passed; 11 files, 614043 bytes.
- Existing Vite bundle-size advisory remains (no new dependencies).

### Candidate artifact

`artifacts/decent-skin-codex-0.3.2.zip`

SHA-256: `4551798abdba966134cb61c32c5d159d558f36c0c1762ac02969cf0e8af10906`

The generated inventory is `artifacts/skin-release.json`. Captures and test logs
are ignored under `artifacts/v032*`. The v0.3.1 rollback archive is retained.


### Test-harness observations

Initial real-time test sleeps were shorter than delayed browser callbacks under
concurrent test load (an observed nominal three-second hold took about five
seconds on this host). Frame/geometry tests now wait for observed phases and
settled domains, while the existing controlled-clock lifecycle checks retain
exact hold/return assertions. No production freshness gates or timer durations
were loosened. Early live-zoom fixture input began at timestamp 29s, which the
adapter correctly treated as the shot start; the test now anchors the shot at
0s before advancing to the boundary. An empty Home area path was removed for
endpoint-only targets. The utility test spanning a development reload passed again
against stable source. The production rapid-restart sequence now runs inside the
fixture page so driver round trips cannot consume its short completion hold;
all outcome, timing and command assertions remain. Failed-run logs and contexts remain under `artifacts/`.

Final result logs: `artifacts/v032-final-check.log`,
`artifacts/v032-final-isolation.log`, `artifacts/v032-final-preview.log`,
`artifacts/v032-final-motion.log`, `artifacts/v032-final-fixture.log`
(zoom passed; restart failure retained), and `artifacts/v032-rapid-diagnostic.log`
(isolated restart passed). Earlier successful long-simulation/header runs and
failed-run contexts remain alongside them. Review captures include
`artifacts/v032/mixed-profile-1007.png`, `returned-1007.png`,
`long-extraction.png` and `production-long-1007.png`.
