# Focus 0.3.1 refinement candidate

## Scope and changelog

The operator reports successful v0.3.0 testing. This candidate addresses only
the four requested corrections, based on source commit
`167eb74778cfce020c94fabddd9e85b1cf2edaa6`, on
`codex/focus-0.3.1-refinements`. It has not been deployed or installed; the
working v0.3.0 archive remains available locally.

- One **Machine Setting** top-navigation entry opens an anchored popover with
  **Steam | Hot Water | Flush** line tabs. History, Settings and Sleep retain
  their existing handlers. Switching tabs sends no commands. Panel height stays
  stable; outside click, the trigger, close button and Escape dismiss it.
- Steam enable uses the shadcn Base UI Switch, without redundant On/Off copy.
  It is controlled by the acknowledged workflow target, not independent UI
  state. Existing idle/fresh/connected/pending guards and failure handling
  remain. The switch has an expanded touch hit area; unavailable settings
  disable it. Temperature and duration controls retain their existing handlers.
- Home shows only complete configured target curves, and its legend is built
  from exactly the same series selection. Zero values remain valid. Missing,
  nonfinite or intentionally hidden values never produce legend entries.
- Live brewing retains its five traces, gradients, axes, labels, sample gaps,
  completion hold and return behavior. No transport or telemetry code changed.

The Switch, Popover and Tabs wrappers were copied from the official shadcn
Base/Nova registry using the existing installed Base UI package. No dependencies
or initialization changes were needed. Focus surface tone 0.16, typography,
colors, spacing system and existing gradient rendering are retained.

## Steam semantics

Inspected Decaid's installed-target commit
`14361a94b32888f6a81182e9e239f513d39d060c`, particularly
`lib/src/controllers/de1_controller.dart` (`steamSettings` and
`updateWorkflowSettings`). A steam target of at least 135°C enables the persistent
steam setting; zero disables it. Focus already sends these workflow settings
through Decaid's existing guarded update path. Re-enabling retains the existing
140°C default; this refinement does not introduce a new restoration policy.

The switch follows the acknowledged workflow setting. It does not indicate a
running Steam operation or measured heater temperature. The header continues
showing read-only measured steam temperature, even when heating is disabled.
Starts/stops remain exclusively on the physical group-head controller.

## Why mixed curves were incomplete

Each profile step controls one pump quantity. A flow step has a flow target but
no pressure target; a pressure step has a pressure target but no flow target.
Inactive fields can exist in stored data, but they are not simultaneous target
curves. The existing adapter correctly supplied null for the inactive channel,
so partial lines stopped at pump-mode boundaries.

The official [Streamline chart implementation](https://github.com/decentespresso/streamline-js/blob/main/src/modules/chart.js)
uses the same distinction in `plotProfile`, leaving the inactive channel null.
A complete second curve cannot be recovered without predicting machine/puck
behavior or inventing targets. Neither is appropriate for a configuration preview.

The Home-only `completeProfilePreview` selection therefore requires a finite
value at every boundary across all timed steps:

| Profile configuration | Visible Home curves |
| --- | --- |
| Pressure throughout, complete temperature | Pressure + Temperature |
| Flow throughout, complete temperature | Flow + Temperature |
| Mixed pressure/flow, complete temperature | Temperature |
| Complete pump target, missing temperature | That pump target only |
| No complete target or unknown timeline | Explicit empty state |

Temperature is shown only when all steps have complete targets on the same
known sensor basis (coffee or water). Mixed sensor bases are not joined. Unknown
or zero-duration steps cannot place the full configured timeline, so no partial
prefix is presented as complete. A first smooth step with no known starting
pump target hides that pump series. Conditional exits can shorten actual stages;
the preview remains a smoothed illustration of configured durations, not a
prediction of the measured shot.

## Local verification

- `npm run check`: passed TypeScript, lint, 149 unit tests and static build.
  This includes complete/invalid/zero/mixed targets and baseline live-chart
  markup hashes in both Celsius and Fahrenheit. The hashes were recorded from
  v0.3.0 before the shared chart changes and still match.
- `npm run check:brewing`: passed 18 existing model tests and production module
  isolation. No preview simulator or synthetic telemetry enters the package.
- Manual development preview: reviewed mixed, pressure-only and flow-only
  profiles, all three tabs, Steam enable/disable, stable layout and matching
  legends. Preview remains at http://127.0.0.1:5174/. These interactions used
  the development-only simulator, never hardware.
- All seven development-preview browser scenarios passed, including immediate
  legend changes, stable tab dimensions, focus restoration, disabled controls
  during brewing, rolling text, five traces and completion behavior.
- The first production rapid-restart case hit the connection-loss guard before
  its stop assertion. The same unmodified test passed on a dedicated fixture
  rerun (ports 4175/18082); no safety or freshness thresholds changed. Initial
  failure evidence is retained in `artifacts/refinement-031/first-run/`.
- The keyboard test initially assumed automatic selection on arrow focus.
  Installed Base UI defaults to manual activation; the corrected test presses
  Enter after the arrow key. It passed, then passed again with explicit
  reduced-motion assertions after disabling popover animation and underline
  transitions for that preference.
- The initial broad production run was narrowed after the core scenarios to
  the remaining affected keypad, shared-utility and viewport checks. This is
  focused coverage, not a claim that the entire repository browser suite ran.
  **18 unique production browser scenarios passed** across the initial run,
  dedicated reruns and five-case final selection. Coverage includes acknowledged
  Steam state after reload, failed and duplicate writes, offline gates, all
  utility adjustments, nested keypads, keyboard activation/focus, outside and
  Escape dismissal, stable tabs, 44px hit areas, reduced motion, 1340 × 800 and
  compact landscape layout, five live traces and shot lifecycle behavior.
  Final five-case selection passed in 6.5 minutes. Evidence and logs are under
  `artifacts/refinement-031/`; `machine-setting.png` shows the production fixture
  at 1340 × 800 and `preview-popover.png` shows the open development preview.
- `npm run package:skin` and `npm run verify:skin` passed: 11 files, 612,690 bytes,
  relative assets and bundled fonts/artwork. Candidate archive:
  `artifacts/decent-skin-codex-0.3.1.zip`.
  SHA-256: `986c82ae2e89281eca13497047cbb86b137a6d12e80420aaa0861b87deb2629d`.

The existing Vite large-chunk advisory remains. No Samsung WebView or hardware
acceptance is inferred from these desktop checks.

## Tablet recheck before promotion

With explicit installation approval, install the candidate and verify:

1. Machine Setting fits the actual tablet viewport, all tabs are reachable,
   settings dialogs return focus correctly, and taps do not start utilities.
2. Steam switch follows the persistent setting after save/reload. Disconnects,
   pending writes and failed writes cannot leave a false checked state.
3. Hot Water and Flush adjustments persist. Physical group-head starts/stops
   still work; the popover does not add daily command buttons.
4. Representative real pressure-only, flow-only and mixed profiles have the
   expected complete curves and matching legends. Confirm unknown-duration
   and empty-state treatment where applicable.
5. Live five-trace extraction, physical stop, confirmed completion, frozen hold,
   automatic Home return and reconnect/resume remain as in v0.3.0.

Retain `artifacts/decent-skin-codex-0.3.0.zip` as the local rollback archive.
This task does not authorize automatic deployment or replacement of that skin.
