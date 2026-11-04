# Home / Brewing exploration decisions

## Round 1 → Round 2 — November 3, 2026

The user retained **Workspace** and **Instrument** as references. **Ritual**, **Orbit**, and **Sequence** were rejected and removed from the live picker and source. No specific rejection reason was supplied.

Round 2 explores three new candidates alongside the two unchanged references:

- **Studio**: Cursor-inspired warm split panes; vertical favorites and persistent recipe controls.
- **Grid**: Vercel-inspired joined grid; monochrome interface with color only in the graph; horizontal profile tabs.
- **Console**: large favorite tiles and a lower control deck designed around tablet reach.

User requirements applied to all three new candidates:

- Text-only **Decent** wordmark.
- Dose, target yield, and temperature adjusted directly on screen.
- No grind setting.
- Steam start/stop and duration directly on screen.
- Hot water and flush use separate settings cards because they change less often.
- One-tap switching between the five favorite profiles, with per-profile recipe tweaks retained during the current preview session.

No final direction is selected. No prototype has been promoted into production.

## Round 2 → Round 3 — November 3, 2026

The user retained **Studio** and **Grid**. Their variant files remain unchanged as references. **Workspace**, **Instrument**, and **Console** were removed from the live picker and source. No separate rejection reason was supplied.

The four-option order is now:

1. **Studio** — retained warm split-pane reference.
2. **Monochrome Studio** — Studio's profile rail and persistent recipe/steam column with Grid's neutral palette. Home emphasizes ratio and preparation; Brewing emphasizes cup weight, time, pressure, and target progress.
3. **Grid** — retained monochrome joined-grid reference.
4. **Grid Focus** — Grid-derived profile tabs, wide trace, a dedicated shot/action column, and stable lower recipe and steam controls.

Both refinements keep color only in the graph. All five favorites and frequent adjustments remain on screen. Water and flush retain their nonmodal settings cards. These are local demo interactions; no machine commands are sent.

No final direction has been selected or promoted into production.

## Round 3 → Round 4 — annotation and polish pass

All four concepts remain. The user requested changes to all of them, so Studio and Grid are now revised concepts rather than unchanged references.

- A consistent 96px bottom bar holds Steam, Hot water, Flush, and the 240px Brew / Stop action. Steam opens a settings card with duration and start/stop; its running countdown remains visible when the card is closed.
- All concepts expose Browse profiles. A searchable 21-profile demo collection supports loading available recipes, a favorites filter, no-result recovery, Escape dismissal, and focus restoration. Five existing favorites remain unchanged when loading another library profile.
- Removed the annotated rail icon/count, helper captions, repeated readiness labels, and Monochrome Studio target progress. Removed favorite check marks and strengthened the selected background without changing font weight.
- Grid hides the four live readings outside Brewing and places Brew in the bottom bar.
- Grid Focus has a ratio/dose/yield overview at Home and weight/time/pressure/flow/target during a shot, without the former progress bar and readiness copy. Temperature and scale status are in the top nav across all concepts.
- Recipe controls stay on screen. The interface keeps 48px adjustment buttons and stable tabular numeric values.

Library fixtures combine the existing five favorites with the official Streamline `src/profiles/new_api.json` sample catalogue and `profile.json` (Slayer Shot), fetched November 3, 2026. This is a demo collection, not the user's installed Decaid library. Five entries outside this demo's recipe/execution bounds remain browsable but are marked unavailable. Every runnable profile still uses the same illustrative demo extraction curve. Live catalogue loading belongs to the later integration phase.

No live machine calls or production promotion were made.

## Round 4 → Round 5 — controls and alignment

Applied the next annotation set to the four existing concepts:

- Header contains only Decent and a geometrically centered status/temperature/scale/demo group. Fixed text slots keep the group stable through status changes. Status uses a small colored dot plus text: green ready/completed, blue brewing, amber heating/utility, gray disconnected, red error. These requested status indicators are an exception to the previous graph-only color rule.
- Studio and Monochrome Studio favorites show names only. Added Grind size above Dose in their recipe columns, as newly requested. It is an illustrative unitless 0–20 setting with 0.1 increments, remembered per profile during the demo session; it does not control a grinder.
- Removed Studio breadcrumbs and replaced its right-side ratio with History. Monochrome Studio History moved into the bottom bar. Bottom bars separate History, utilities, and Brew with vertical dividers.
- Grid and Grid Focus Browse profiles is centered, with a vertical separator and no button border.
- Grid Focus Home side panel has three equal-height rows and equal-size values for ratio, coffee in, and espresso out. Its lower recipe controls have two vertical separators.
- Steam has an accessible enable switch, independent of Start/Stop. Disabling blocks steam start and duration changes and stops an active demo steam operation. Enabling never starts steaming. The setting survives closing/reopening the card and profile changes in the same session. Other utilities remain available.

Verification: all four variants across all six states with a long profile name; exact header centering, no stage or panel overflow, touch targets at least 44px. Exercised grind recall and steam off/on by pointer and keyboard, including disable during steaming. Production remains untouched; hardware behavior is not tested.

## Round 5 → Round 6 — annotation refinements

- All four header status groups return to right alignment with natural-width text and consistent 28px gaps; the group sits 28px from the stage edge.
- Monochrome Studio centers Steam, Hot water, and Flush in the footer. Equal flexible side columns keep History left and Brew right, with vertical separators retained. Other footer arrangements remain unchanged.
- Studio and Monochrome Studio separate Browse profiles from the five favorites with a horizontal rule.
- Grid Focus moves its recipe row directly below the profile tabs, retaining the vertical control dividers. Removed the selected-profile eyebrow and profile-kind label.
- Grid removes the small preview/live/record badge above the chart. The illustrative-curve caption remains.

Verification: production build passed; all four Home/Brewing layouts checked with long profile names, plus all six Grid Focus states. No stage clipping, panel overflow, or buttons below 44px. Verified the native 1340 × 800 stage and recipe adjustment, exact header inset, and exact Monochrome Studio utility centering. Browser reported no warnings or errors. Tablet screenshots are in `artifacts/round-six/`. All interactions remain local demo behavior; no production promotion or hardware testing.
