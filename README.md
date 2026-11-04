# Decent Skin Final

A custom touchscreen UI skin for [Decaid](https://github.com/decentespresso/decaid), focused on espresso preparation and brewing feedback. Designed for an **8.7-inch Samsung Galaxy Tab A11**, with a **1340 × 800 landscape** design target and touch-first controls.

This is an independent frontend, not a fork of Decaid or Streamline JS. Decaid handles the machine and scale; this project develops the interface. [AGENTS.md](AGENTS.md) contains persistent project instructions for future Codex sessions.

## Current status

The existing project already contains a React + TypeScript + Vite environment and a shadcn preset. Repository initialization preserves that work; it does not scaffold a new application or install a new design system.

**Implemented:**

- Demo-only main application with six deterministic machine scenarios, simulated shot telemetry, and a tablet preview.
- Local theme/font assets, reusable controls, static build configuration, and demo skin ZIP packaging.
- Six rounds of Home/Brewing exploration. The current comparison contains Monochrome Studio Original and Revision, with recipe adjustments, profile browsing, and simulated utility controls.
- Unit tests and browser checks for the main demo. The concept exploration is a separate entry point and requires its own build/visual checks.

**Not implemented or verified:** live Decaid transport, production profile/history persistence, a production-ready design, installation acceptance inside Decaid, Samsung Android WebView validation, and physical machine behavior. Prototype actions do not send machine commands.

## Local development

Previously validated locally with Node **25.8.0** and npm **11.21.0**. These record the current environment, not a long-term runtime support policy. Exact dependency versions are in `package-lock.json`.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

| View | Local URL |
| --- | --- |
| Main demo | http://127.0.0.1:5173/ |
| Main demo, framed tablet preview | http://127.0.0.1:5173/?preview=tablet |
| Home/Brewing concepts | http://127.0.0.1:5173/proto/home-brewing/?v=2&state=ready |

Use **Load state** in the concepts to compare Home and Brewing. See the [prototype README](proto/home-brewing/README.md) and [decision log](proto/home-brewing/DECISIONS.md) for controls and design history. A scaled desktop canvas is not proof of the tablet's CSS viewport or pixel density.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite development server |
| `npm run build` | Type-check and build the main app into `dist/` |
| `npm run preview` | Serve the built main app |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint; configured rules target TypeScript files |
| `npm test` | Deterministic gateway and network-isolation unit tests |
| `npm run check` | Type-check, lint, unit tests, and main-app build |
| `npm run test:e2e` | Main-app Playwright checks using installed Google Chrome |
| `npm run package:skin` | Build and ZIP main-app output into `artifacts/`; requires `zip` |

Build before running browser tests. Their preview uses port 4173 and does not reuse another running server. Use the host's approved browser tooling if the runner cannot be used, and record that limitation.

The concept entry point needs a separate build:

```sh
npx vite build --config proto/home-brewing/vite.config.js --outDir artifacts/prototype-build
```

`npm run build` does not package the concept picker. Prototype JSX is not covered by the main TypeScript check. Validate changed concepts, states, and touch behavior in the browser.

## Architecture and compatibility

The existing stack is **React 19, TypeScript 6, Vite 8, Tailwind CSS 4**, and npm. The installed shadcn configuration is **Base UI / Nova / Neutral / Geist / Lucide**, originally generated with preset `b2fA`. `components.json`, `src/components/ui/`, and `src/index.css` define the current foundation.

Decaid hosts browser assets rather than React or Tailwind source. Its [skin guide](https://github.com/decentespresso/decaid/blob/main/doc/Skins.md) includes React/Vite static builds. This project's build-time approach fits that documented model: Vite bundles React and compiles the styles, with `base: './'`, local fonts/assets, `index.html`, and skin metadata. No frontend Node server is required on the tablet. Actual WebView compatibility remains an acceptance task.

| Location | Responsibility |
| --- | --- |
| `src/` | Main application, components, styles |
| `src/gateway/` | Typed UI boundary and local demo simulation |
| `proto/home-brewing/` | Isolated design exploration and decisions |
| `public/` | Skin manifest and static assets |
| `tests/` | Main-app browser tests |
| `docs/` | Integration constraints and validation evidence |
| `scripts/` | Packaging and historical export utilities |

The main app is prepared to package `dist/` contents with `index.html` at the ZIP root. Installing that ZIP in Decaid and testing its embedded WebView are later steps. A private GitHub source repository is not an installable skin release or a public download endpoint. See [integration notes](docs/DECAID.md) for API ownership and unresolved choices.

## Development workflow and roadmap

1. Read `AGENTS.md`, inspect relevant files, and preserve unrelated work.
2. Refine the selected Monochrome Studio Home and Brewing direction, preserving Original as the reference, before promoting prototype code into `src/`.
3. Confirm the design-system preset and the tablet's actual CSS viewport, pixel density, WebView version, and fullscreen behavior.
4. Validate static installation in Decaid, including offline asset loading and background/resume.
5. Implement a separately scoped REST/WebSocket adapter with verified workflow semantics, connection states, persistence, and command gating.
6. Validate live behavior on actual hardware before adding profile editing, settings, durable history, and release distribution.

Keep changes incremental, reusable, and tested. Use focused commits; review staged files and never force-push or discard work without explicit approval. For UI changes check readable contrast, keyboard focus, long profile names, 48px primary touch targets, and layout bounds at 1340 × 800.

Before revisiting [shadcn/create](https://ui.shadcn.com/create), compare the desired preset with the existing `components.json` and tokens. Decide whether to retain this foundation or plan an explicit migration; do not run initialization over existing work. This repository-setup task makes no framework or UI changes.

## Generated output and historical evidence

`node_modules/`, `dist/`, `artifacts/`, `exports/`, test reports, and real environment/credential files are excluded from Git. Local artifacts are preserved. Historical HTML concepts are archived separately; they are not dependencies or build inputs.

`scripts/export-design-rounds.py` is an optional recovery tool for the original six saved builds under `/private/tmp/`. Those snapshots are machine-local and are not present in a fresh clone. The export script is not part of setup or the normal build; current concepts build from `proto/`.

[Verification notes](docs/VERIFICATION.md) distinguish desktop/demo evidence from hardware acceptance. The earlier setup audit reported low/moderate tooling advisories; that snapshot is not a current security assessment. Recheck dependencies before distribution without applying breaking upgrades blindly.

## Upstream references

- [Decaid](https://github.com/decentespresso/decaid) — gateway and machine ownership
- [Decaid skin documentation](https://github.com/decentespresso/decaid/blob/main/doc/Skins.md) — hosting, APIs, and installation
- [Streamline JS](https://github.com/decentespresso/streamline-js) — behavior reference and attributed profile fixtures
- [shadcn/ui](https://ui.shadcn.com/docs) and [Vite setup](https://ui.shadcn.com/docs/installation/vite) — component foundation
