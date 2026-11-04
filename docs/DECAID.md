# Decaid integration boundary

Official sources inspected during setup:

- https://github.com/decentespresso/decaid
- https://github.com/decentespresso/decaid/blob/main/doc/Skins.md
- https://github.com/decentespresso/streamline-js
- https://github.com/decentespresso/streamline-js/blob/main/src/modules/api.js
- https://ui.shadcn.com/docs/installation/vite

The current milestone is entirely simulated. These notes guide a later integration, not a claim that an API adapter is implemented or hardware has been verified.

## Ownership

Decaid owns Bluetooth/USB, device connections, profile/workflow persistence, machine execution, scale integration, and shot logging. The skin supplies a web UI through REST and WebSocket APIs. Streamline is a behavioral reference, not a dependency or a codebase to migrate in place.

A production skin is served locally by Decaid. Port 3000 is the skin entry point and may redirect to an assigned skin origin. REST and WebSockets use port 8080. Desktop development requires an explicit gateway host; the desktop's localhost is not the tablet. Do not use the skin's arbitrary serving port as the API port.

## Future adapter

Normalize API responses into UI-facing types behind the gateway boundary. The demo-only mode marker and scenario names are not backend machine-state enums; extend the contract deliberately when adding live support.

- Prefer `GET/PUT /api/v1/workflow` for the active recipe. Dose and yield live in `context.targetDoseWeight` and `context.targetYield`. Brew temperature comes from the profile's step semantics; it is not a top-level workflow `brewTemperature` field.
- `PUT /api/v1/machine/state/{state}` requests execution. Never invoke it during setup or demo testing. Validate current schema and command gating against the installed Decaid version before adding controls.
- `/ws/v1/machine/snapshot` carries machine telemetry. Subscribe to device state independently; an open telemetry socket or a quiet interval does not establish machine connectivity.
- Reconnect after real network closure, resynchronize workflow/device state, and dispose all subscriptions. Never replay queued machine actions after reconnect.
- Embedded WebViews can be paused and later reloaded. Persist actual recipe state in Decaid, and restore it from the API on resume. Do not substitute stale demo data when live connections fail.

The docs include old example names and legacy fields alongside newer guidance. Verify API schemas and installed runtime behavior before live integration; do not copy illustrative snippets verbatim.

## Tablet acceptance (later)

The supplied target is landscape 1340 × 800. Verify `innerWidth`, `innerHeight`, `devicePixelRatio`, and `visualViewport` in the actual tablet WebView. Check keyboard appearance, dialogs, touch interactions, font sizing, background/resume, offline assets, and real chart performance. Browser emulation alone is not device or hardware verification.

## Static frontend compatibility review

The repository-initialization review checked the official Decaid README, skin guide, Streamline README/package metadata, and shadcn Vite documentation. The skin guide explicitly includes a React/Vite build example. Streamline uses browser JavaScript as its application model; that does not impose a plain-JavaScript-only requirement on an independent skin.

**Verified in this repository:** React/TypeScript is bundled by Vite, Tailwind is compiled at build time, Base UI components are local React source, and Geist is bundled. The generated output is static. Decaid is not expected to interpret source JSX or run the shadcn CLI. No SSR or server action is implemented.

**Still to decide or verify:**

- The supported Decaid release and gateway schema, including workflow temperature semantics and whether a requested machine action is allowed in the current gateway mode/state.
- Actual Android System WebView compatibility with the emitted JavaScript and modern Tailwind/OKLCH CSS, plus focus, dialogs, touch input, lifecycle/resume, and chart performance.
- Explicit live/demo selection, gateway configuration, reconnection, state persistence, and command gating. The current interface is demo-only.
- Routing strategy if multiple production pages are added. Do not rely on a development-server fallback being provided by Decaid.
- Final skin identifier, versioning, and distribution. Keep the existing demo metadata until a production identity is chosen. Private source-repository URLs are not unauthenticated install URLs; distribution needs a separate decision.

Before reconfiguring shadcn, compare any new preset against the existing `components.json`, theme tokens, and Base UI APIs. Reinitialization is not required to establish this repository.
