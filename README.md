# Decent Focus

Focus is the locked Home and brewing screen for the Decaid skin. Settings, profile library/details and favorite management share its visual system. The locked Monochrome Studio design uses surface tone **0.16**, the Cover profile rail and the rolling Focus brewing status. It is rendered directly at the requested **1340 × 800** landscape viewport; no exploration picker, appearance controls or simulated data ships in the application.

## Run and build

```sh
npm ci
npm run dev
npm run check
npm run test:e2e
npm run package:skin
```

`npm run package:skin` creates `artifacts/decent-skin-codex-0.2.0.zip` with `index.html`, `manifest.json`, fonts and assets at the archive root. Install that archive through Decaid's skin management. No Node server is required on the tablet. `dist/` and generated archives are not committed.

An installed skin connects to its serving hostname on API port **8080**, independent of its skin port. For desktop development, set `VITE_DECAID_URL` in `.env.local` (see `.env.example`) to the tablet's gateway origin, then restart Vite. This is a build-time setting: a release intended for installation on the tablet should normally be built without an override. Do not publish a build that points to the isolated test fixture.

## Integration

The adapter is verified against the published contract at installed Decaid **0.9.1+3027**, commit `14361a94b32888f6a81182e9e239f513d39d060c`. Workflow, profiles, machine controls, utilities, shot history and independent device/machine/scale/shot-state streams are wired to REST/WebSocket endpoints. There is no fallback to demo readings and no automatic discovery or machine command on load.

Decaid must own shot sequencing, stop-at-weight and history. Use **tracking** mode (or the native managed `disabled` gateway mode). The skin blocks new operations in full gateway mode, where gateway-owned sequencing is not assured. It never changes gateway mode automatically. Stop remains an explicit, unreplayed request.

The five favorite positions use a nullable ID array in Decaid's `decent-skin-codex/favorites` KV value. Only a missing-key 404 suggests the first five visible profiles. Saved empty positions and unavailable IDs remain in place. Use **Browse profiles → Manage favorites** to replace, swap, reorder or clear positions, then Save. Loading a library profile changes the workflow independently. Failed saves retain both the last acknowledged rail and the editor draft.

**Settings** sits beside History. Static query routes support direct entry, reload and browser Back: `?page=settings`, `?page=library`, `?page=favorites`, and `?page=profile&profile=<encoded ID>`. All pages share one session. A newly observed machine shot start returns to Focus, closes overlays and retains favorite drafts and staged imports; return to Manage favorites or Profile library to recover them. Ordinary navigation away from that editor prompts before discarding changes. Reload/unload prompts for unsaved changes where the browser supports it; drafts do not persist across a completed reload.

The library supports search, sorting, visible/hidden views, read-only details/target preview, hide/restore and JSON profile-record import/export. Imports show imported, skipped and failed counts; existing IDs are skipped by Decaid. Profile content editing stays disabled until phase 5. Future Settings categories are identified by phase and expose no placeholder hardware controls. Artwork is decorative, bundled and independent of recipe data.

See [integration contract](docs/DECAID.md), [locked design](docs/design/FOCUS.md), and [verification and device acceptance](docs/VERIFICATION.md).

The [skin completion roadmap](docs/SKIN-ROADMAP.md) records the planned screens, settings inventory, Decaid API ownership, and implementation phases. Phases 2 and 3 are implemented in this working tree; later controls remain planned. See the verification record for fixture and device status.

## Tests and limits

Gateway unit tests cover command gating, malformed data, workflow preservation, failed writes, sequencing, scale loss and stale samples. Browser tests build the same app against an isolated local API fixture on port 18081. The fixture does not forward requests and is not packaged in the skin.

Desktop validation does **not** establish Samsung WebView or machine acceptance. The tablet reported gateway `http://192.168.50.13:8080`, but it was unreachable from the development computer. Installation, actual CSS viewport, background/resume, physical group-head operation, stop-at-weight and device behavior still need on-tablet verification. Do not describe this release candidate as hardware verified.

## Source layout

- `src/skin/`: the sole Focus UI, assets and fixed visual tokens.
- `src/gateway/`: contract-based wire types, normalization, commands and subscriptions.
- `src/components/ui/`: existing Base UI / shadcn primitives.
- `tests/`: isolated contract fixture and browser acceptance checks.
- `docs/design/HISTORY.md`: historical exploration decisions. Retired screen source is available in Git history at `5f3ce07`.
