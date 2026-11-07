# Brewing preview — spacing, status and color audit

November 6, 2026. Changes are confined to the isolated design preview. The shared production rail and default icons remain unchanged; the candidate rail reuses the existing profile data, artwork and callbacks.

## Visual changes

- Recipe groups align to the top with a 16px label-to-control gap (6px at compact heights); 48px controls and the fading dividers remain.
- Steam uses Wind, Hot Water uses Droplet, and Browse profiles uses Search.
- The brewing profile title is replaced by the left-aligned rolling status. Its text uses the former title’s 26px size, 500 weight, −0.045em tracking and white foreground.

## Motion review

| Before | After |
| --- | --- |
| 900ms circular dot wave, 100ms stagger | Reference-based 650ms wave, 90ms chevron stagger, 4px dots with 1.5px gaps |
| 120ms text exit + 140ms enter | 100ms exit + 140ms enter; transform and opacity only |
| Fixed 300px status slot beside profile title | Full available title width; fixed icon slot and 38px text window |
| Reduced motion disables wave and text transitions | Preserved; changing the preference immediately settles text; rapid updates cancel previous animations |

## Color changes by file

### `design/brewing/preview.css`

Existing neutrals and chart hues are converted rather than repainted. The generated declarations below cover every changed color value. Keywords and inherited theme tokens are retained.

| Selector / declaration | Previous | Replacement | Reason |
| --- | --- | --- | --- |
| `.brew-preview` / `--brew-pressure` | `New token` | `oklch(0.751 0.132 171.592)` | Single semantic source for chart lines, fills, legends and status dots. |
| `.brew-preview` / `--brew-target-pressure` | `New token` | `oklch(0.746 0.057 177.131)` | Single semantic source for chart lines, fills, legends and status dots. |
| `.brew-preview` / `--brew-flow` | `New token` | `oklch(0.69 0.149 256.904)` | Single semantic source for chart lines, fills, legends and status dots. |
| `.brew-preview` / `--brew-temperature` | `New token` | `oklch(0.729 0.088 18.506)` | Single semantic source for chart lines, fills, legends and status dots. |
| `.brew-preview` / `--brew-weight-flow` | `New token` | `oklch(0.728 0.055 62.104)` | Single semantic source for chart lines, fills, legends and status dots. |
| `.brew-chart-surface` / `background` | `#000` | `oklch(0 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-legend` / `color` | `#d4d4d4` | `oklch(0.87 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-chart text` / `fill` | `#a0a0a0` | `oklch(0.706 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-chart text.brew-temp-tick` / `fill` | `#c49697` | `oklch(0.717 0.055 17.086)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-toast` / `background` | `#191919` | `oklch(0.213 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-alert, .brew-scale-note` / `color` | `#d99192` | `oklch(0.729 0.088 18.506)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-alert button, .brew-away button` / `color` | `#eee` | `oklch(0.949 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-away` / `background` | `#000` | `oklch(0 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.brew-away p` / `color` | `#aaa` | `oklch(0.738 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-dock` / `background` | `#111` | `oklch(0.178 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-dock` / `border` | `1px solid #303030` | `1px solid oklch(0.309 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-dock > span` / `color` | `#a0a0a0` | `oklch(0.706 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-dock .design-ghc` / `background` | `#e9e9e9` | `oklch(0.934 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-dock .design-ghc` / `color` | `#111` | `oklch(0.178 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios` / `background` | `#161616` | `oklch(0.2 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios` / `border` | `1px solid #363636` | `1px solid oklch(0.333 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios` / `box-shadow` | `0 16px 40px #0008` | `0 16px 40px oklch(0 0 0 / 0.533)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios header p` / `color` | `#aaa` | `oklch(0.738 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios label` / `color` | `#bbb` | `oklch(0.792 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios select` / `background` | `#222` | `oklch(0.252 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios select` / `border` | `1px solid #444` | `1px solid oklch(0.387 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenarios select` / `color` | `#eee` | `oklch(0.949 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-scenario-actions button` / `border` | `1px solid #444` | `1px solid oklch(0.387 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.design-event-state` / `color` | `#aaa` | `oklch(0.738 0 0)` | Converts legacy notation to OKLCH; preserves appearance. |
| `.rolling-status` / `color` | `var(--muted-foreground)` | `var(--foreground)` | Matches the requested white title; widens foreground contrast. |
| `.rolling-status` / `--rolling-color` | `var(--status-brewing)` | `var(--brew-flow)` | Reuses the preview palette instead of an independent state color. |
| `.rolling-status[data-tone="preparing"]` / `--rolling-color` | `var(--status-busy)` | `var(--brew-weight-flow)` | Reuses the preview palette instead of an independent state color. |
| `.rolling-status[data-tone="preinfusion"]` / `--rolling-color` | `oklch(0.75 0.12 170)` | `var(--brew-pressure)` | Reuses the preview palette instead of an independent state color. |
| `.rolling-status[data-tone="complete"]` / `--rolling-color` | `oklch(0.76 0.11 155)` | `var(--brew-pressure)` | Reuses the preview palette instead of an independent state color. |
| `.rolling-status[data-tone="error"]` / `--rolling-color` | `oklch(0.73 0.12 25)` | `var(--brew-temperature)` | Reuses the preview palette instead of an independent state color. |
| `.rolling-status[data-tone="idle"]` / `--rolling-color` | `var(--status-disconnected)` | `var(--muted-foreground)` | Reuses the preview palette instead of an independent state color. |

### `design/brewing/experience/chart.tsx`

Each mapping covers the series definition, matching legend/line color and both gradient stops where present. Pressure, Flow and Temperature each replace three literal declarations; Target Pressure and Weight Flow each replace one.

| Declarations | Previous | Replacement | Reason |
| --- | --- | --- | --- |
| Pressure / both stops | `#37C9A4` | `var(--brew-pressure)` | Shared palette; no duplicated hue literals. |
| Target Pressure | `#86B9AC` | `var(--brew-target-pressure)` | Shared palette; no duplicated hue literals. |
| Flow / both stops | `#5B9CF6` | `var(--brew-flow)` | Shared palette; no duplicated hue literals. |
| Temperature / both stops | `#D99192` | `var(--brew-temperature)` | Shared palette; no duplicated hue literals. |
| Weight Flow | `#C1A084` | `var(--brew-weight-flow)` | Shared palette; no duplicated hue literals. |
| Grid stroke | `#232323` | `oklch(0.256 0 0)` | Equivalent OKLCH notation. |
| Stage marker stroke | `#555` | `oklch(0.45 0 0)` | Equivalent OKLCH notation. |

## Color verification

Rounded palette values remain in sRGB. Contrast below is measured against the black chart surface; labels accompany the lines. Dim loading dots are decorative, with the white status text carrying the state.

| Role | Contrast | sRGB gamut |
| --- | --- | --- |
| pressure | 10.04:1 | In gamut |
| target-pressure | 9.55:1 | In gamut |
| flow | 7.53:1 | In gamut |
| temperature | 8.42:1 | In gamut |
| weight-flow | 8.62:1 | In gamut |
| Status title: white on black | 21.00:1 | In gamut |
| Recipe labels: theme muted foreground on card | 8.07:1 | In gamut |

Both text pairs exceed WCAG AA for normal text. This is a color-pair check, not a complete accessibility conformance claim.

## Evidence

- `artifacts/brewing-review/status-title/home-1240.jpg`
- `artifacts/brewing-review/status-title/brewing-1240.jpg`

## Validation

`npm run check` passed: TypeScript, ESLint, 119 gateway tests and production build.
`npm run check:brewing` passed: preview TypeScript, 18 unit tests and production
isolation. The standalone preview build passed. All seven preview browser tests
passed, followed by a focused layout rerun after removing row-top padding at
heights of 520px and below. The layout check verifies label spacing, top alignment,
48px controls staying inside their rows, and no horizontal overflow at 1340 × 800,
1240 × 719 and 800 × 480. Production source remains unchanged; no hardware was used.
