# Project instructions

Read this file and the relevant source before changing the project. Keep these
instructions focused on durable decisions; use README for setup, docs for
technical decisions, and the design history for previous iterations.

## Purpose and ownership

- Build a modern, minimal, touch-first Decaid skin for preparing espresso and
  following extraction on an 8.7-inch Samsung Galaxy Tab A11.
- Design for landscape 1340 × 800. This is the requested screen target, not a
  verified CSS viewport. Measure the actual WebView before device acceptance.
- This repository is an independent frontend. Decaid owns machine/scale
  connections, Bluetooth/USB, workflows, profiles, execution, and shot storage.
  Streamline JS is a behavior/API reference, not this app's runtime dependency.
- Live integration was explicitly requested on November 4, 2026. Decaid owns
  execution, stop-at-weight, device pairing and shot storage; the skin is a
  REST/WebSocket client. Never send hardware commands during development or
  automated tests. Use the isolated API fixture. Never auto-discover machines,
  replay commands after reconnect, or substitute simulated readings on failure.

## Confirmed stack and integration boundary

- Existing application: React 19, TypeScript 6, Vite 8, Tailwind CSS 4, npm.
  `package-lock.json` records exact versions; use `npm ci` for installation.
- shadcn is already initialized: Base UI / Nova / Neutral / Geist / Lucide,
  preset `b2fA`, with `rsc: false`. Preserve `components.json`, generated
  components, and CSS tokens. Do not run initialization again or substitute
  Radix APIs for Base UI APIs without an explicit migration decision.
- Decaid loads a web application; it does not interpret JSX, TypeScript,
  Tailwind classes, or shadcn source. Vite compiles these into static browser
  assets. The upstream skin guide includes a React/Vite example; compatibility
  of this build with the target Android WebView remains unverified.
- Preserve `base: './'`, `dist/`, bundled fonts/assets, and an `index.html` at
  the skin archive root. `public/manifest.json` supplies skin metadata. Do not
  introduce SSR, server actions, or a Node server requirement on the tablet.
- Decaid's skin entry point is port 3000; REST/WebSocket APIs are on 8080.
  Skin origins may use separate ports. Do not infer the API port from the page
  port or assume laptop localhost is the tablet. Recheck the installed Decaid
  API contract before integrating. See [integration notes](docs/DECAID.md).
- The adapter implements reconnect/resume, explicit origin configuration,
  workflow persistence and command gating. Static packaging is checked locally;
  modern CSS, installation and behavior on the target WebView still require
  device acceptance. Do not describe a desktop preview as hardware verification.

## Directory responsibilities

| Path | Responsibility |
| --- | --- |
| `src/` | Production Focus application and reusable components |
| `src/gateway/` | Decaid adapter, wire types, normalization and unit tests |
| `src/components/ui/` | Generated/customized shadcn components |
| `src/index.css`, `components.json` | Theme tokens, fonts, component configuration |
| `src/skin/` | Locked Focus Home, shared pages/navigation, editor drafts and bundled artwork |
| `docs/design/` | Locked design and historical iteration decisions |
| `public/` | Static skin metadata and assets |
| `tests/` | Main-app Playwright checks |
| `scripts/` | Skin packaging and optional historical export tooling |
| `docs/` | Integration constraints, validation records, technical decisions |
| `dist/`, `artifacts/`, `exports/` | Ignored generated output; retain local work but do not stage it |

## Design and code conventions

- Shared pages use query routes and the single App-owned gateway/session. Keep
  settings/favorite drafts and staged imports above page navigation. Only a newly
  observed shot start interrupts navigation; never infer one from replay data.
- Daily-use settings keep separate owners for workflow, Decaid preferences,
  machine settings, display/presence and Focus KV preferences. Save only the
  current section's changed fields; retain failed/newer edits and reject drafts
  for a replaced machine. No write is retried automatically.
- Device discovery is explicit and uses `connect=false`. Grinder setting/RPM
  commands require the current device's writable descriptors; recipe Send is
  opt-in and one-shot. Presence heartbeats require real activity, never a timer.
- Temperature preferences affect display only; all wire values remain Celsius.
  Focus refill warnings require a confirmed non-refill-kit machine and use mm.
- Favorites are five nullable IDs. Only missing-key 404 permits suggestions;
  malformed, empty and unavailable assignments must not silently fall back.
  Update the rail only after an acknowledged explicit Save. Workflow loading
  is independent; never identify a profile by title alone.
- Profile IDs derive from executable content; titles alone cannot create forks.
  Keep unknown profile/stage fields in `metadata.focusExtensions` because the
  installed model drops them. Returned executable fields remain authoritative.
  Journal profile saves in Focus KV before writing; retry reference remaps only
  on explicit action and clear the journal with DELETE (POST null stores text
  in the installed KV handler). Save-as-new never remaps source favorites.
- Recipe preferences are Focus-owned KV, separate from executable definitions
  and workflow context. Inventory updates are field patches; archive instead of
  deleting records and preserve historical context. Equipment IDs are not device IDs.
- Shot history preserves raw records for display/export. Write only changed
  canonical annotation fields; never mutate measurements or recorded workflows.
  Repeat loads the recorded profile/context through the existing workflow guard,
  without applying utility settings or issuing a start command. Missing records
  and incomplete traces stay explicit; permanent deletion requires confirmation.
- Focus is the sole production design. Surface tone 0.16, radius 8px and
  feedback 150ms are fixed in `src/skin/skin.css`. Preserve the accepted 1:1
  layout and typography. Retired variants and appearance controls are removed;
  their history is in `docs/design/HISTORY.md` and Git.
- The Cover rail has five real favorite profiles above artwork. Focus uses
  104px rolling status rows, 10px dot-to-label gap, stationary fading dividers,
  and the circular 3×3 dot wave on the current process only. Shot complete is
  the final row without dots. No right-panel timer, progress bar, description
  or top strip. Stages follow real profile frames rather than demo timing.
- Installed integration target: Decaid 0.9.1+3027, commit 14361a94. See
  `docs/DECAID.md` for contract and operating-mode constraints. Static builds
  and fixture tests do not establish Samsung WebView or hardware acceptance.

- Prioritize readable dark surfaces, clear hierarchy, accessible contrast, and
  restrained decoration. Use chart/status color with accompanying labels.
- Keep frequent recipe adjustments directly accessible; avoid unnecessary
  modal steps. Maintain stable layouts across Ready, Heating, Brewing,
  Completed, Disconnected, and Error states.
- Target 48px primary touch controls; never reduce an interactive hit area
  below 44px. Support keyboard focus, accessible names, disabled states,
  reduced motion, and touch operation without hover dependence.
- Use consistent components and theme tokens. Use tabular numerals for live
  metrics and prevent clipping when profile names or values grow.
- Follow local TypeScript/React patterns. Production UI lives only in `src/`;
  never reintroduce an exploratory picker or demo fallback into the skin.
- Follow Prettier: two spaces, double quotes, no semicolons. Use `@/` imports
  where appropriate. Prefer small reusable components and domain functions.
- Keep UI separate from transport. Temperature is represented by profile step
  temperatures; preserve their relative offsets. Do not invent wire fields.
  Avoid dependencies without a concrete need and verified static packaging.

## Workflow and validation

1. Inspect relevant code, Git state, and existing documentation. Preserve
   unrelated work; explain significant architectural changes before proceeding.
2. Implement incrementally. Keep changes and commits focused and descriptive.
   Update README for setup changes and these instructions for durable decisions.
3. Run `npm run check` for application/configuration changes or a baseline
   commit. It covers TypeScript, ESLint, gateway unit tests, and the static build.
4. For main UI changes, run `npm run build` then `npm run test:e2e` when browser
   automation is available. The configured runner uses installed Google Chrome
   and port 4173. Follow the host's browser-tool policy when manual checks are
   required. Report any check that could not run.
5. Run `npm run test:e2e` against its isolated fixture build. No test may
   contact real hardware. The test-only API fixture is never packaged.
6. Check 1340 × 800 framing, long labels, overflow, touch targets, dialog focus,
   state transitions, lifecycle, failed writes and command gating. Test network
   failures without simulation fallback. Use the locked reference evidence in
   `artifacts/focus-reference` when available; generated captures stay ignored.
7. Before hardware release, verify Decaid skin installation, relative
   asset loading, API contracts, reconnect/resume, and behavior on the Samsung
   WebView. Hardware checks require actual device evidence and explicit scope.
8. Review staged files for secrets and generated output. Never commit tokens,
   private keys, real environment files, upload credentials, dependency folders,
   or test artifacts. Never force-push, overwrite another remote, or discard
   existing work without explicit approval.

## References

- [Decaid](https://github.com/decentespresso/decaid)
- [Skin guide](https://github.com/decentespresso/decaid/blob/main/doc/Skins.md)
- [Streamline JS](https://github.com/decentespresso/streamline-js)
- [shadcn documentation](https://ui.shadcn.com/docs)
- [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite)

Validate upstream guidance against the installed version rather than assuming
that an example or an older audit is the active API contract.
