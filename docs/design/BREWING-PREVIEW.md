# Brewing experience — design review candidate

Status: Phase 4.1 refinement candidate, awaiting visual approval. Production Home, gateway,
chart and lifecycle code are unchanged. No release was published.

## Open and review

```sh
npm run dev:brewing
```

Open [the local preview](http://127.0.0.1:5174/). Use a 1340 × 800 browser viewport.
The development dock sits in the otherwise empty bottom-right space. Click
**Simulate GHC brew**: one second of preparation precedes a 30-second extraction.
It is synthetic telemetry, not a reconstruction of the selected executable
profile. The selected Home profile and its local recipe draft persist.

The live view retains the header and profile identity, removes the side panels,
and gives the chart 66% of the area below the header. Five compact numerical
readouts sit above it. The approved colors, widths, dotted target, and 8%/6%
vertical fills are unchanged. Temperature uses a deliberately broad 60–100°C
axis; pressure, flow and weight flow retain their literal numerical values and
individual unit labels. A missing value creates a gap, never a zero.

Success freezes the final trace for three seconds, contracts it toward its Home
position, restores Home and shows “Shot completed” once for 2.4 seconds. There
is no completion settings button. The simulator's explicit manual stop says
“Shot stopped manually”. In production, a confirmed `machineEnded` event uses
neutral “Shot ended”: installed Decaid does not distinguish physical GHC stops
from autonomous endings. Both use the same hold and return lifecycle. Errors,
blocked starts and disconnects stay visible until explicitly dismissed or a new
shot is observed. Disconnect blanks current readings and labels the retained
trace as last received, without implying the machine has stopped.

**Test scenarios** offers 1×/4× playback, pressure above 12 bar, missing scale,
a 65-second shot, manual completion, blocked/interrupted/disconnected outcomes,
duplicate completion, late previous-shot endings, and intentional navigation.
Start a new shot during the hold to test cancellation. Playback acceleration
never accelerates the three-second presentation hold. Navigation is a small
placeholder view for testing route ownership, not a redesign of Settings/History.
Utility adjustments now update local preview drafts through the same session method
interface and gates as production. Sleep remains inert in this isolated preview; its
icon is now Power. Recipe edits and favorite selection have no Decaid persistence.

## Separation and motion

- `design/brewing/experience/`: transport-independent typed reading/event contract,
  reducer, SVG renderer and presentation component. Candidate code for later
  reuse, currently outside the production import graph.
- `design/brewing/simulator.ts`, `home-session.ts`, `preview.tsx`: development-only
  event generator, Home data and test controls. No network transport. Unexpected
  access to the Home session’s gateway throws immediately.
- `design/brewing/index.html` and `vite.config.ts`: separate entry/root, loopback
  server, no public assets, restricted connection policy. The production Vite
  build still starts exclusively at the original root index.
- `scripts/verify-brewing-isolation.mjs`: audits the actual production module graph
  and emitted content. Builds its evidence under ignored `artifacts/`.

The candidate Home copies the accepted composition, reuses the production profile
rail, recipe controls, numeric keypad and utility steppers, and preserves surface
0.16 tokens. Its footer is absent from JSX. The new header follows the inspected
[Figma node 606:1010](https://www.figma.com/design/KZ1wUJFWkmaDoFZJqeQ2KR/Screen?node-id=606-1010):
DE1, Scale, Group, Steam, Tank on the left; Steam, Hot Water, Flush, Shot history,
Settings and Sleep on the right. The latest annotation replaces the grouped utility
menu with three direct settings controls. The utility popover opens without executing an
operation; all three utilities are visible immediately. Actual daily starts/stops
remain physical group-head actions. Utility settings lock during brewing or
connection loss. History, Settings and Connections retain the existing navigation
preview destination. No production UI has been promoted.

Home and live charts share `experience/chart.tsx`, with separate data adapters.
Home has exactly three configured series, a short unit-free legend, quiet horizontal
grid lines and shadcn-inspired gradient fills. The exact sum of known step durations
still defines its geometry, while axis numbers and stage annotations are omitted. The data adapter retains pump-mode gaps, fast jumps and configured smooth
transitions. Following the latest annotation, the Home renderer applies visual
curve interpolation separately; it does not rewrite those configured values. A missing origin is not invented: only the endpoint
target is marked. Missing/zero duration stops the known timeline rather than
compressing later steps. Mix-water sensor targets are not labeled as group targets.
Conditional exits are called out because configured duration is not a prediction.
Recipe temperature changes preserve the profile’s relative offsets.

The five named development profiles are explicitly synthetic fixtures, now with
different configurations for switching/ramp/gap checks. They are not authenticated
copies of public recipes or profiles fetched from a machine. The shot simulator
still emits its independent representative shot, as it did in Phase 4.

Tank volume uses the Streamline/TCL CAD lookup only when a standard-DE1 calibration
identity is explicitly supplied. The preview supplies that identity for its mock
tank. Missing calibration, invalid/negative values or disconnection show a dash.
The lookup floors millimetres and saturates at 2058 ml, matching the source. Raw mm
and refill thresholds are untouched. The installed machine-info model exposes a
model string and refill-kit metadata, not proof of tank geometry; physical tank
compatibility remains a production-integration prerequisite.

The title’s far-right duplicate badge is removed. The adjacent status reuses the
existing 3×3 circular dot-wave timing. Its icon stays fixed while one text node
exits for 120ms and the latest label enters for 140ms. Identical labels do not
restart it; changes cancel unfinished animations. Reduced motion immediately
settles the label and disables the dot wave. Colors use existing busy/brewing
roles plus restrained OKLCH preinfusion (.75 .12 170), completion (.76 .11 155),
and error (.73 .12 25) roles. The approved chart hex colors are unchanged.

The candidate live SVG stays mounted across shots and transitions. A 280ms
transform-only FLIP expansion grows from the Home chart bounds; return is 220ms,
with companion opacity changes. Container geometry is set once per layout
change, not animated every frame; telemetry continues independently. Reduced
motion disables the layout animation and all added CSS transitions. The resting
canvas and interactive hit areas remain unscaled.

## Verification

```sh
npm run check
npm run check:brewing
npm run test:brewing
npm run test:e2e
```

The preview unit tests cover event identity, stale timers, duplicate endings,
late telemetry, manual/error outcomes, navigation, literal ranges, gaps and
explicit target steps. Browser tests cover continuous SVG identity, selected
profile preservation, the full hold/return/toast sequence, repeated shots,
disconnects, navigation, reduced motion, scale loss and out-of-range pressure.
Review screenshots are ignored under `artifacts/brewing-review/`.

Read [the Streamline source audit](BREWING-CHART-RESEARCH.md) for the telemetry,
rendering and lifecycle findings, including the source/document cadence mismatch.
Desktop checks do not establish Samsung WebView or hardware acceptance.

### Phase 4 baseline results — November 6, 2026

- `npm run check`: passed; TypeScript, ESLint, 119 gateway tests and production build.
- `npm run check:brewing`: passed; 11 presentation/geometry tests and a 2,359-module
  production graph audit. No preview modules or simulation content were emitted.
- `npm run test:brewing`: four browser checks passed at 1340 × 800. The disconnect
  case also passed again after blanking stale header readings and disabling Sleep.
- `FOCUS_FIXTURE_PORT=18082 FOCUS_TEST_PORT=4175 npm run test:e2e -- tests/focus.spec.ts`:
  all six existing Focus regressions passed. A broader run was stopped after three
  advanced-page tests passed; this is not a claim that the full 53-test suite passed.
- Manual browser review used normal pointer interactions, real-time and accelerated
  shots, the completion hold/return and retained disconnect state. Captures:
  `artifacts/brewing-review/home.jpg`, `brewing.jpg` (the completed chart), and
  `disconnected.jpg`.

The deterministic lifecycle tests pause browser time and force pointer dispatch
so Playwright does not wait on a paused animation frame. They advance separately
through React’s completion and return commits. These checks establish lifecycle
behavior; they are not tablet motion/performance measurements. Initial test-clock
and short real-time runner attempts timed out; the corrected suite above passed.

### Phase 4.1 verification

- `npm run check`: passed again (TypeScript, ESLint, 119 gateway tests, production build).
- `npm run check:brewing`: 17 tests passed, production graph excludes all preview
  modules and simulator content.
- The expanded preview browser suite checks three-series semantics, profile and
  temperature changes, the power icon, footer removal, header framing, utility
  popover dismissal/focus/local edits/gates, and rapid/reduced-motion status changes.
- `npm run test:brewing -- --workers=2`: all seven browser checks passed after
  correcting a preview hot-reload guard. React object inspection can read symbol
  properties; gateway method access still throws. The 17th unit test guards this.
- Standalone preview build, final TypeScript and preview ESLint checks passed.
- Manual CUA review confirmed Home, all three utilities, local steam adjustments,
  long profile titles, rolling status and the completed-shot return. Saved evidence:
  `artifacts/brewing-review/phase-4-1/{home,utilities,brewing}.jpg`.
- Existing Focus fixture suite: five passed; the mid-shot attachment case timed
  out before workflow/stage hydration. The fresh isolated rerun passed (52 seconds),
  giving passing coverage of all six cases without changing production code or tests.
- The final rolling-status check also exercises the longest unconfirmed-outcome
  label inside its fixed 300px area; the focused rerun passed.


### Annotation polish — November 6, 2026

The follow-up annotations simplify only the candidate Home. The first readout
is labeled DE1, Scale is non-interactive even when disconnected, and the utility
popover is named Brew utilities with a Lucide Gauge icon. The menu continues to
expose Steam, Hot Water and Flush settings with the same session gates.

Home omits the profile description, preview heading, stage labels/markers and
all numeric axes. The legend reads Pressure, Flow and Temperature without units.
Its configured timeline, scales, pump-mode gaps and transition geometry remain
unchanged internally. Horizontal grid lines remain faint. Pressure/flow fills
follow the supplied shadcn example: effective opacity .32 at 5% to .04 at 95%
(.8/.1 stops multiplied by .4). The live chart retains its original .08/.06 fills,
five series, axes, stage markers and full legend. No Recharts dependency was added.

The title and Edit profile control share a vertical center. The artwork divider
is removed, and the four recipe rows divide available panel height evenly. The
preview-only simulation dock is one compact row so it does not obscure the final
recipe control. Empty configuration still has an explicit empty state; missing
configured channels retain their accessible explanation without a visual footer.

Manual review covers 1240 × 719 and 1340 × 800. Screenshots are under
`artifacts/brewing-review/annotation-polish/`. The existing browser checks now
assert the quiet Home chart, read-only Scale, DE1 label and equal recipe rows at
1340 × 800, 1240 × 719 and 800 × 480, as well as the unchanged live lifecycle.

Validation for this annotation pass: `npm run check` passed (119 gateway tests,
TypeScript, ESLint and production build); `npm run check:brewing` passed (17
preview unit tests and production isolation); all seven preview browser checks
passed with three independent workers. The standalone preview build passed.
Production source and the physical-machine integration remain unchanged.


### Direct utilities and curved preview — November 6, 2026

Steam, Hot Water and Flush now appear as individual icon-and-label navigation
controls before Shot history, Settings and Sleep. Each opens its own anchored
settings card in one click; switching cards closes the previous one. Settings
retain their current handlers and brewing/disconnection gates. Opening a card
never starts a machine operation.

The visible Profile settings heading is removed. Recipe rows use a 496px maximum
combined height, shrinking at compact heights while retaining 48px buttons. Three
thin dividers fade to transparent at both ends. The development dock retains its
reserved space below the final control.

All three Home series now have gradient areas, including Temperature. A separate
preview-only path generator eases line segments and softens hard steps over a
small horizontal span. It preserves gaps and leaves the profile data untouched;
its accessible description explicitly identifies the curves as visual interpolation.
The renderer uses bounded cubic controls to avoid overshoot. The live chart still
uses its original literal geometry, two fills, five traces and numeric axes.

Manual review: direct Hot Water → Flush switching and Home framing. Evidence:
`artifacts/brewing-review/direct-utilities/`. Unit coverage now includes preserving
raw targets and missing-channel gaps through the visual smoothing operation.

Validation: `npm run check` passed (TypeScript, ESLint, 119 gateway tests and
production build), as did the standalone preview typecheck/build and
`npm run check:brewing` (18 preview tests and production isolation). All seven
preview browser cases passed across the full run and a focused utility rerun.
The utility test now advances the paused clock through opening and clicks the
visible left edge of the title for outside dismissal; its former center point
was covered by the newly positioned Steam card. No production source changed.

### Status title and control polish — November 6, 2026

The brewing status replaces the profile title at the left edge of the monitoring
view. White title typography pairs with a stationary circular dot grid; text
rolls between observed states. The supplied loading reference informs the 650ms
wave and 90ms stagger. Reduced motion freezes the dots and settles text immediately.
Home recipe rows align to the top with more space between labels and controls.
Wind, Droplet and Search replace the Steam, Hot Water and Browse profiles icons.

Preview chart colors now share OKLCH tokens with the status dots, while the
remaining preview color literals are converted without changing their intended
appearance. See [the complete color and motion audit](BREWING-STATUS-POLISH.md)
for every declaration, contrast measurements and screenshots. Production source,
profile definitions and hardware command ownership remain unchanged.

### Main-page capture — November 6, 2026

Removed the group-head “Press…” guidance from all three candidate utility
popovers and added a Pencil icon before Edit profile. Manual browser inspection
confirmed Steam, Hot Water and Flush now show only their settings. Application
checks, 18 preview unit tests, production isolation and the standalone preview
build passed. Production source is unchanged.

The initial 1240 × 719 screenshot handoff was replaced, at the user's request,
by [the editable main page](https://www.figma.com/design/KZ1wUJFWkmaDoFZJqeQ2KR/Screen?node-id=615-6)
on the Codex page. The verified frame contains 47 Geist text layers, 43 vectors,
13 reusable control instances and auto-layout groups. Only the profile artwork
uses an image fill; no full-screen raster remains inside the editable frame.
The original screenshot frame created by this task was removed; other user
canvas items remain untouched.
Local capture: `artifacts/brewing-review/figma-mainpage/Focus — Main page.jpg`.

### Machine readiness label — November 6, 2026

The candidate header now says “DE1 Ready”. Its label reflects readiness only:
Heating during preparation, Ready throughout preinfusion/extraction/completion,
and Disconnected after a connection loss. Shot stages and outcomes remain in
the large rolling title. The browser regression checks these separate labels
through preparation, preinfusion, extraction and disconnection.

### Brewing area fills — November 6, 2026

Live pressure and flow now share Home's gradient stops: 32% opacity at 5%,
fading to 4% at 95%. Target pressure, group temperature and weight flow retain
their existing line styles. Live sample geometry, gaps and axes are unchanged.
