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

## Round 6 follow-up — Monochrome Studio only

- Removed the preparation/brewing eyebrow above the profile title. The title,
  description, metric row, and chart spacing follow Studio's main-column pattern.
- Home shows three equal readings: Brew ratio, Coffee, and Drink. Brewing and
  Completed reuse Studio's four readings: Time, In the cup, Pressure, and Flow.
- History moves to the status group as a 16px icon inside a 48px accessible
  button. The existing history dialog and focus restoration remain intact.
- Steam, Hot water, and Flush return to the left of the bottom bar; its vertical
  dividers are removed. Brew/Stop remains on the right.
- Other concepts retain their header/footer defaults and existing layouts.

Validation: separate prototype build passed; all six Monochrome Studio states
with a long profile name fit without stage/panel overflow or sub-44px buttons.
Checked native 1340 × 800 Home, the Brew/Stop transition, and History dialog
focus restoration. No browser warnings/errors. These remain demo interactions.

## Selected direction — Monochrome Studio Brewing refinement

The user selected Monochrome Studio and supplied the appearance preset now stored
in `selected-direction.json`: variant 2, ready, longName false, surface tone 0.17,
control radius 8, duration 150. It is the default when no valid variant is supplied.
The other three concepts remain references with their original appearance defaults.
Tuning is isolated per concept; reload returns to the checked-in defaults.

The user approved replacing disabled Brewing steppers with a read-only shot
summary. The four Studio-style readings and chart retain their positions. The
summary shows target yield, remaining grams, and the recipe; completion distinguishes
early stop from reaching the target. Adjust recipe restores the controls, returns
keyboard focus to them, and archives the shot through the existing session reset.
The chart header now shows recording/paused/completed state instead of duplicating
flow and temperature. Stop remains bottom right.

Validation: prototype build passed; all six states with long names fit without
panel/stage overflow or sub-44px targets. Checked remaining-yield arithmetic,
early stop, recipe return/focus, default preset reload, and per-concept appearance
isolation. The native Brewing preview measured exactly 1340 × 800. No browser
warnings/errors. No hardware or production integration was performed.

## Monochrome Studio — Original and Revision

The user requested an unchanged Original and a separate Revision, retiring the
other three directions from the active comparison. Original is v=1; Revision is
v=2 and the default. Both use the accepted 0.17 / 8px / 150ms appearance preset.
Historical source is retained but no longer imported into the active build.

Revision removes the Favorites heading and DEMO badge, renames Recipe to Profile
settings, and makes Stop extraction red. Its right pane becomes a stable-width
brewing-stage display: current stage, three progress rows, target yield and grams
remaining. Completion shows the actual drink weight; early stop identifies the
interrupted stage without marking future stages complete. The demo curve changes
at 7s and 18s and finishes at 30s; these stage labels are illustrative and not live
profile data. Adjust profile settings restores controls and keyboard focus.

The original component is preserved byte-for-byte. Shared header/footer additions
are opt-in, so Original retains its badge and neutral Stop button. All work stays
inside the prototype and documentation; no hardware adapter was introduced.

## Revision — Figma profile rail and utility popovers

Only Revision changes in this pass. The selected favorite expands into remaining
rail height with its name above the supplied artwork; the other four names remain
compact. The divider and Browse profiles control stay pinned at the bottom.
The header follows the supplied status-left/tools-right pattern, preserving Decent,
current status text, temperature, scale information, History, and the dark palette.
No light-theme toggle, Settings, or Sleep feature was added from the reference.

Steam, Hot water, and Flush now use the shadcn Base UI Popover composition with
upward chevrons. Popovers anchor above each trigger, portal into the prototype
surface so scaling and theme inheritance remain correct, close on outside press
or Escape, and restore focus. The existing settings/timer/steam-enable logic is
reused. Revision's Stop button uses a pale red background and dark red text.

Figma file KZ1wUJFWkmaDoFZJqeQ2KR: profile pattern 596:813, header 596:820,
artwork collection 250:3663. Local assets and their mappings are documented in
assets/profiles/README.md. The popover composition follows
https://ui.shadcn.com/docs/components/base/popover and the base-nova registry.

Validation: prototype build passed; all six states with long names had no stage
clipping, section overflow, or sub-44px buttons. All five artwork files loaded in
their selected slots, and Browse profiles stayed at the same bottom coordinate.
Checked utility switching, outside dismissal, Escape/focus restoration, steam
on/off gating, and blocked utility starts during brewing. Original still renders
its existing utility card and DEMO badge; its component is byte-identical to the
pre-edit snapshot. Native 1340 × 800 screenshots: artifacts/monochrome-figma/.

## Revision — Figma Stop treatment

Updated only Revision's active Stop extraction button to Figma node 323:76:
#e7000b text, the same red at 10% opacity for its background, transparent border,
and 8px radius. Hover increases the tint to 20%. The existing label, icon, size,
position, and stop behavior remain intact. The tint composites over the dark
footer, matching the supplied style tokens rather than a pale opaque fill.

## Revision — status alignment, action width, and temperature trace

Status information is right-aligned with History, retaining 24px gaps. Brew,
Stop extraction, and Brew again now share the 279px width and horizontal edges
of Adjust profile settings in the right pane.

Revision opts into a temperature series with its own fixed 60–100°C right axis,
a dashed stroke, and a toggleable legend entry. Original keeps its two-series
chart. The prototype sample adapter now carries its selected recipe temperature,
matching the existing current-reading override; the underlying demo has constant
temperature, so no artificial fluctuations are added. Preview uses the selected
target temperature, while shot traces stop at their sampled time.

Color addition in tablet-controls.jsx: no previous temperature token →
--signal-temperature: oklch(.78 .12 330). Rose separates temperature from blue
pressure and amber flow with a matching lightness range. Linear sRGB channels
are 0.7664 / 0.3268 / 0.7151 (in gamut), giving 9.97:1 WCAG contrast against the
black chart. No existing color declarations were replaced.

## Revision — compact utility and chart labels

Utility chevrons now sit 12px after their labels, with the fixed button widths
and 48px hit areas retained so timers do not shift neighboring controls. Revision
hides Illustrative preview and shortens the flow legend to ml/s. Original retains
its existing labels and spacing; chart scales and simulated-shot behavior are unchanged.

## Revision — content-sized utility triggers

Steam, Hot water, and Flush now hug their contents instead of reserving 184px.
They retain 48px height, the 12px label-to-chevron gap, and balanced 16px leading /
14px trailing padding. This supersedes the fixed-width choice in the previous pass.

## Revision — utility disclosure state

Steam, Hot water, and Flush chevrons point down while their own popover is open
and return to pointing up when closed. Direction follows the controlled popover
state, including dismissal with Escape or an outside press.

## Revision — water and scale readings

The top bar includes water percentage and grams alongside scale connection.
Prototype water is a fixed 75% demo reading (8% in the water-tank error scenario);
disconnected readings show dashes. Scale connection follows the demo snapshot
independently of machine errors; grams use the simulated shot weight, including
the completed reading. Tabular numerals and reserved weight width keep the bar
stable. Original and the production gateway contract remain unchanged.

## Revision — compact scale status and retry

Connected scale status now uses a 14px scale icon and grams, aligned with the
temperature and water readings. A disconnected scale shows a compact Retry
control with a 48px touch height. Retry reconnects only the simulated scale;
it leaves the machine disconnected and sends no hardware requests. Loading a
scenario resets this demo override.

## Revision — text scale label

The scale icon is replaced with the word Scale, followed by the compact reading
(Scale 0.0g). The disconnected control also uses Scale text and retains Retry.
