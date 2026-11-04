# Setup verification

Validated on 2026-11-03 using Node 25.8.0, npm 11.21.0, and desktop Google Chrome. This is browser/demo evidence, not Samsung tablet or espresso-machine verification.

- TypeScript, ESLint, and 7 demo unit cases passed.
- Production static build succeeded with relative asset URLs and locally bundled Geist.
- Both production browser scenarios passed (the scaled-preview case was rerun after allowing 0.1px for subpixel rounding). Checks cover blocked starts, partial stop, pause/advance, six scenarios, theme persistence, 48px controls, runtime errors, and zero external/gateway/socket traffic.
- Browser scenarios are also checked for document overflow at 1340 × 800, frame/content bounds at 1100 × 750, and horizontal overflow at 800 × 600 and 390 × 844.
- ZIP contents were inspected: `index.html`, `manifest.json`, `skin.svg`, JavaScript, CSS, and font, with no enclosing project directory.

Screenshots and the demo skin ZIP are under `artifacts/` (ignored by Git). At that initial setup milestone, Git was local-only on `main`; no remote, commit, or publication had yet been created. Consult Git for the current repository state.

The initial browser run caught a Brewing chart overflow. Constraining the chart height and making the preview border non-layout-affecting corrected it. The tests retain checks for this regression.

The setup-time npm audit reported 17 tooling advisories (15 moderate, 2 low); this is historical evidence, not a current audit. Live adapter behavior, Decaid installation, Android WebView, machine control, and hardware have not been tested.

## Repository initialization validation

For the initial repository commit, `npm run check` passed: TypeScript, ESLint,
all 7 gateway unit tests, and the main static build. The separate concept build
also passed using `proto/home-brewing/vite.config.js`. No application code,
framework, dependency versions, or design-system configuration was changed.

The staged source set was reviewed for credential patterns and generated output.
Local dependencies, environment files, exports, archives, and browser artifacts
are excluded. Existing browser evidence above remains historical; browser and
hardware tests were not rerun for this documentation/Git-only change.
