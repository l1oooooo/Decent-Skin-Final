# Focus release-candidate verification

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
