# Focus v0.3.6 rendering and motion candidate

Based on v0.3.5. The approved visual design and gateway ownership remain unchanged. This candidate requires Samsung WebView testing; desktop fixture checks cannot establish device acceptance.

## Rendering investigation

The v0.3.5 baseline was instrumented before motion changes. A frame sampler retained references to every setting row, label, output and button, the Sleep button, and nearby unaffected status/title nodes. It recorded DOM connectivity, computed opacity/visibility/display/color/background/transform and running animations during adjustments.

Two paths were identified:

- Every write sets the gateway's shared `pending` flag. `commandBlock` maps it to disabled recipe controls and disabled Sleep. The recipe disabled rules change all button/value colors and backgrounds; Sleep's disabled rule changes opacity from 1 to 0.4. All rows depend on this same flag, explaining simultaneous repaint even when only one value changes. Nearby header readouts have no disabled presentation dependency.
- Recipe row keys included the resolved selected-profile ID. The first baseline caught all four complete row subtrees being replaced during initial profile resolution. After waiting for the favorite/profile identity to resolve, five sequential adjustments retained every monitored DOM node over 102 sampled frames. Labels stayed visible and no entrance animation restarted. Thus a repeated label-disappearance defect was not reproduced in the loaded desktop fixture; we cannot attribute that tablet symptom conclusively to a remount or compositor defect.

The fix separates temporary pending-only locking from persistent unavailability styling. Pending still disables actions and the gateway retains all original connection, freshness and one-in-flight guards. It no longer repaints the entire recipe and Sleep into an unavailable appearance. Genuine unavailable states retain their disabled treatment. Row identity is now the setting field, independent of profile identity. An open numeric editor is invalidated when its owning profile changes without replacing the surrounding row.

This is not an opacity mask, loading overlay, artificial delay, retry or animation-suppression workaround. The baseline found no new request-driven entrance animation, reload or blank render branch. A definitive claim that all Samsung flashing is fixed requires the user's device recheck.

## Metrics and spatial transition

Brewing now orders the existing metrics as Time, In the cup, Temperature, Pressure, Flow. MM:SS, temperature formatting, sensor sources and chart calculations are unchanged.

The same App-owned header stays mounted and joins the chart and two side panels in the existing Web Animations layout coordinator. All four transforms share one document-timeline start time, **600ms** duration (previously 500ms), and **cubic-bezier(0.645, 0.045, 0.355, 1)** easing. Target/measured chart layers retain their existing 200ms crossfade. The header moves its full measured height above the viewport. Home keeps its measured header space; the expanded brewing surface uses the full viewport, with no blank navigation strip. The 3-second completion hold and 420ms live time-domain expansion are unchanged.

Retargeting samples current transforms/bounds before canceling the previous animation. Resize, document hiding and reduced motion settle immediately. Hidden or moving-out navigation is inert; completion unlocks returning Home controls. Unmounting the brewing view cancels its animations and restores the shared header for other routes. New shots and interrupted holds continue to use the existing real-event lifecycle.

## Profile numbers

`ProfileNumber` interpolates only numeric text for **350ms**, using **ease-out cubic** (`1 - (1 - progress)^3`). A layout effect compares the previous resolved profile ID and actual value/unit. Initial load, unchanged profiles, manual edits, missing/nonnumeric values, incompatible units, hidden Home and reduced motion settle directly. Entering/leaving brewing cancels counting. Rapid profile changes retarget from the current displayed number.

Animation frames update a span through a ref, not React state or gateway data. Actual values, calculation inputs and persistence update normally; no intermediate value is sent or stored. Final formatting is exact, intermediate precision follows the displayed endpoints, and tabular numerals plus reserved endpoint width keep units stable during counting. Summary rows and setting rows retain stable field keys. Named grind settings and yield Off remain text.

## Motion review

| Before | After |
| --- | --- |
| Header remains visible during brewing | Same header translates up/down with the three existing regions |
| Panel/chart travel takes 500ms | Four transform regions share 600ms and the existing ease-in-out curve |
| Profile values jump to their new targets | Eligible Home numeric text counts for 350ms; frequent +/− stays immediate |
| Global pending state recolors recipe values/buttons and dims Sleep | Pending-only locking retains paint; real unavailable states remain distinct |

The requested longer page transition overrides the animation skill's shorter general default. No bounce, overshoot, new dependency, per-frame React rendering or extra operation delay was introduced.

## Validation and remaining device checks

The independent rendering-only check passed before adding the new motion. Final
instrumentation then covered all four settings, both directions, a changed
profile and a held persistence request: 183 sampled frames retained every
monitored node, with no pending-only color/background or Sleep opacity change.
Repeated attempts during the held write issued only the original request.

The numeric check passed all seven readouts, ascending/descending values,
identical values, rapid retargeting, named grind/Off, reduced motion, stable
widths and exact final values. Only the acknowledged profile targets were sent
to the workflow. Frame sampling found and corrected a negative-progress edge
case: a delayed requestAnimationFrame timestamp can precede the interpolation
start. Progress is now clamped to [0, 1], and retargeting starts from the rounded
text actually displayed. Visual review also caught a compact-layout unit-span
rule affecting the new number span; that rule now excludes numeric wrappers,
preserving the approved 28px summary type and stationary 12px units.

Test-harness corrections retain failed-run evidence: a second shot must use a
newer fixture timestamp rather than replay older samples; Base UI's high-priority
toast action is exposed to keyboard navigation through F6; rapid profile tests
must wait for the existing pending write gate; toast assertions wait for the post-commit notification effect after Home renders
and observe delivery rather than requiring a transient notice to remain visible
after a delayed poll.
Timing-sensitive Chrome suites run sequentially. No production freshness,
command or replay guard was relaxed to satisfy a test.

The exact tablet label disappearance was not reproduced in the loaded desktop
fixture. Recheck all four rows and Sleep in the Samsung WebView, together with
600ms motion smoothness and profile counting. The reported browser viewport is
1007 × 601; the embedded WebView still requires direct measurement. No hardware
commands, deployment or tablet installation were performed.

Final checks: TypeScript, ESLint, 182 gateway/unit tests and production build
passed. Eighteen brewing model tests and the 2,458-module isolation audit passed.
Nine focused production browser scenarios passed across targeted runs; two final
preview transition scenarios passed. This is not a full application E2E run.
See [the verification record](VERIFICATION.md#036--rendering-stability-and-coordinated-motion-candidate)
for coverage, test-harness corrections and the archive checksum. The local ZIP
contains 11 verified files (624,204 bytes). Publication and installation remain
outside this candidate handoff.

## Navigation annotation follow-up

The All profiles action is now text-only. The utility trigger and popover title
read Hardware settings, with a Lucide wrench replacing the gauge icon. Tabs,
settings behavior and touch targets are unchanged. Browser accessible-name
selectors follow the new label; the updated main preview was visually checked.
