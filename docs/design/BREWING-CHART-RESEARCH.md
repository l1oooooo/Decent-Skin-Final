# Brewing chart source audit

Inspected November 6, 2026. Streamline `main` is a moving reference, not proof of
compatibility with the installed Decaid 0.9.1+3027 / 14361a94. No machine was
contacted. The redesign is a separate development preview pending design approval.

## Sources and telemetry

Read the actual [chart model](https://github.com/decentespresso/streamline-js/blob/main/src/modules/chart.js),
[ECharts renderer](https://github.com/decentespresso/streamline-js/blob/main/src/modules/echarts-renderer.js),
[live policy](https://github.com/decentespresso/streamline-js/blob/main/src/modules/chart-live-policy.js),
[application event handling](https://github.com/decentespresso/streamline-js/blob/main/src/modules/app.js),
and [chart notes](https://github.com/decentespresso/streamline-js/blob/main/docs/AI_CHART_NOTES.md).

| Input | Actual units | Streamline use |
| --- | --- | --- |
| `pressure` | bar | Actual pump pressure, regular + expanded |
| `targetPressure` | bar | Pressure reference, regular + expanded |
| `flow` | mL/s | Volumetric flow, regular + expanded |
| `targetFlow` | mL/s | Flow reference, regular + expanded |
| `groupTemperature` | °C | Measured group temperature; plotted divided by 10 in both modes |
| `targetGroupTemperature` | °C | Temperature reference, divided by 10; regular + expanded when provided |
| `mixTemperature` | °C | Water/mix temperature, additional expanded trace divided by 10 |
| `targetMixTemperature` | °C | Optional expanded water-temperature reference, divided by 10 |
| `weightFlow` | g/s | Gravimetric flow, misleadingly named `weight` / “Weight” in the chart |
| Scale `weight` | g | Cumulative beverage mass, separate from the flow trace |

The seven regular trace slots are pressure, flow, target pressure, target flow,
group temperature, target group temperature and weight flow. Expanded mode uses
those seven plus mix temperature and optionally target mix temperature. Neither
mode plots cumulative beverage weight as its weight-flow trace. Shot volume is a
separate cumulative mL value in the app’s shot summaries and stop classification.

`app.js` selects machine `weightFlow` for Bengle and scale `weightFlow` otherwise.
`chart.js` prefers the provided server signal, including a real zero. When absent,
its fallback computes mass delta / elapsed time and an EMA with alpha 0.1. This
fallback is Streamline behavior, not approval to invent Focus readings. Historical
rendering also distinguishes machine GFlow from scale-derived flow. Focus’s
prototype leaves absent readings null and draws gaps; production source selection
must be verified against the installed contract after design approval.

## Streamline appearance

| Trace | Light | Dark |
| --- | --- | --- |
| Pressure | `#17C29A` | `#00B087` |
| Target pressure | `#A0E0D1` | `#374D47` |
| Flow | `#0358CF` | `#0358CF` (no dark ongoing token) |
| Target flow | `#BED9FF` | `#23416C` |
| Group temperature | `#FF97A1` | `#653F43` |
| Target group temperature | `#FFD1D5` | `#3E3233` |
| Weight flow | `#E9D3C3` | `#695F57` |
| Expanded mix temperature | `#D9822B` | same |
| Expanded target mix temperature | `#E8B480` | same |

Regular traces use the renderer’s default 2px width unless overridden. Actual
traces are solid; targets use dot patterns. A user-selected line-width multiplier
scales strokes. Regular step markers are 2px long-dashed, `#7F8BBB` dark /
`#7C7C7C` light, with profile-frame names. Expanded pressure, flow and weight flow
are 4.5px; pressure/flow goals are 3px with [6,6] dashes; measured temperatures
are 3px; temperature goals and step markers are 1.5px with [12,12] dashes.
The renderer preserves unsmoothed live traces; smoothing is opt-in, not the
measured-data default. Targets anchor the previous value at the new timestamp
only at frame changes, preserving vertical discontinuities and in-frame ramps.

Regular mode starts with a 0–10 common numerical Y range and adjusts for label
space/data. Expanded Y is fixed 0–14. Both divide temperature by 10. Live X keeps
about 7% headroom (`time / .93`) and changes tick intervals from 1 to 5 to 20 to
30 seconds as elapsed time grows. Regular/expanded charts suppress the legend
and place separated end labels on actual traces. Expanded labels include water
and group temperature but omit goal lines.

## Rendering and lifecycle

The chart model produces compatibility traces; the renderer translates them into
ECharts canvas options. Instances are retained per element in a WeakMap, with
stable `trace-N` identities. Live mode merges projected append-only data and axes
using lazy updates. Structural changes use a full option with `replaceMerge`.
Bundle loading is lazy and promise-cached. Resize/dispose and hidden-route guards
are explicit; canvas DPR is 1.25. Pending paints coalesce through a timeout and
requestAnimationFrame; ingestion and painting have separate ownership.

**Source/document discrepancy:** AI_CHART_NOTES still describes a 100ms minimum.
The inspected executable `chart-live-policy.js` instead starts at 100ms, estimates
arrival cadence with 0.75/0.25 smoothing, and clamps to **25–100ms**. Its comment
reports Bengle measurements, not Samsung Tab A11 evidence. This preview generates
10Hz samples; no faster tablet performance claim is made.

Preparation does not start the extraction clock. `app.js` starts recording on
observed espresso preinfusion/pouring, clears the old shot once, and timestamps
from the machine sample. Profile-frame changes generate markers. Leaving
espresso finalizes the chart while retaining its data. Shot-state decision events
own ending notifications when that feed is present. Stop/abort/terminal outcomes
are distinct; a generation guard protects asynchronous final-weight corrections.
A delayed snapshot-based fallback handles missing decision events and suppresses
duplicate notifications. Gateway mode can lack sequencer events: an idle snapshot
alone is insufficient evidence of a successful extraction.

## Consequences for Focus

The current production `src/skin/trace.tsx` is SVG, with three traces and a
60–100°C right axis. Its flow trace currently uses a separate 0–4 mapping.
`src/skin/use-skin.ts` and gateway samples use **mix**, not group temperature;
shot samples do not retain target pressure or weight flow. Existing completion
UI is a persistent rolling-status panel with an Adjust profile settings button.
`App.tsx` reacts to the gateway’s newly observed shot counter for navigation;
physical GHC actions arrive indirectly through machine/shot-state observations,
not through a frontend click handler. There is no production three-second return
or “Shot completed” toast to reuse today.

The candidate keeps SVG to avoid adding a renderer dependency solely for five
lines. It uses the requested five tokens, literal common left-axis values,
actual Celsius on an independent 60–100 axis, no smoothing, and only pressure/
flow fills. Left range begins 0–12 and expands in coarse steps without shrinking
during the shot. X starts 0–30s and extends in 10s windows. Explicit target-step
flags preserve jumps; ramps remain linear between supplied observations.
The completed trace freezes. A shared presentation reducer owns per-shot timers
and the single completion notification; the simulator is a separate event source.

Before any production integration, verify group-temperature and gravimetric-flow
availability, stop-reason semantics, reconnect/replay identity, and native toast
ownership on the installed Decaid build. Never substitute mix temperature for
group temperature or infer success from an unclassified stop. Real WebView motion
and hardware behavior remain unverified.


## Phase 4.1 source checks — November 6, 2026

- Inspected [Figma header node 606:1010](https://www.figma.com/design/KZ1wUJFWkmaDoFZJqeQ2KR/Screen?node-id=606-1010), including its screenshot and generated structural context: 32px readout gaps, flexible separation, 48px action controls, 6px icon-label gaps. Focus typography, surfaces and Lucide icons remain in use; the user's later annotation selects Power for Sleep.
- [Installed Decaid machine model](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/models/device/machine.dart) distinguishes group from mix temperature. Espresso substates include preparingForShot, preinfusion, pouring and pouringDone; heating/preheating and explicit error states are separate. The status color adapter follows these semantics; preview outcomes supply explicit completion/error overrides.
- [Installed profile model](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/models/data/profile.dart) has fast/smooth transitions, per-step duration and coffee/water sensor selection. Its temperature adjustment preserves relative offsets.
- [Installed DE1 profile encoder](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/models/device/impl/de1/unified_de1/unified_de1.profile.dart) maps smooth to the machine's Interpolate flag. [TCL profile conversion](https://github.com/decentespresso/de1app/blob/d83a7f46341c98c1367bb828b36d282e9214308c/de1plus/profile.tcl) builds pressure/flow decline stages with smooth transitions and the full configured decline duration. The candidate draws that configured interpolation, not a prediction of measured machine response. Unknown initial targets remain gaps with endpoint markers.
- Streamline's current planned-chart helper invents a ramp preview duration clamped to 0.5–3 seconds / 30% of the step. This display heuristic is **not** adopted as an executable profile field.
- [Streamline waterTank.js](https://github.com/decentespresso/streamline-js/blob/main/src/modules/waterTank.js) supplies the mm lookup and 2058 ml saturation. [TCL vars.tcl](https://github.com/decentespresso/de1app/blob/d83a7f46341c98c1367bb828b36d282e9214308c/de1plus/vars.tcl) attributes the source lookup to tank CAD. The actual table contains 68 entries (indices 0–67), despite Streamline's comment saying 0–69. Conversion uses the actual table length. Unknown tank calibration is not inferred from refillKit=false.

These are source/desktop findings, not verification of this user's physical tank,
firmware interpolation accuracy, or Samsung WebView performance.
