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

## Revision — section divergence, November 4, 2026

The user requested four designs for left profile selection and four for the
right brewing status, using Revision as the starting point. Added an isolated
`sections/` study with two independent five-entry pickers: unchanged Revision
reference plus four new directions each. The opposite pane stays at Revision.

- Profile axes: Index (text), Gallery (equal thumbnails), Cover (fixed artwork
  and compact stable list), Recipe cards (visible yield comparison).
- Brewing axes: Timeline (stage sequence), Yield (cup progress), Dial (elapsed
  time), Receipt (recipe/result ledger).
- Kept accepted materials, pane dimensions, recipe controls, library, utility
  popovers, chart, header, footer, and demo boundary. No dependencies added.
- Extended the standard picker to 44px height to satisfy project touch rules.
- No winner or rejected option yet; awaiting user comparison. Neither this round
  nor Revision is promoted into the application.

Validated all ten entries across six states with long names; selected all five
favorites in each new profile direction; verified recipe recall, library loading,
early stop, completion, profile locks, and focus restoration. Layout measurements
and screenshots are in `artifacts/section-studies/`. Native Samsung WebView and
hardware acceptance remain outside this exploration.

## Cover selected; brewing studies retained — November 4, 2026

The user selected Cover for Revision's profile rail and explicitly removed the
metadata row under its artwork (profile kind and numeric index). Promote that
rail into Revision only. Delete Index, Gallery, Recipe cards, the old expanding
rail implementation, and the independent profile picker. No reasons were given
for rejecting the other profile concepts beyond preferring Cover.

Keep Original unchanged. All brewing studies use the selected Cover rail.
Timeline, Yield, Dial, and Receipt remain candidates for another refinement;
no brewing status winner is selected and production remains demo-only.

Refinement details: stage headings and completion actions reserve their height;
Timeline shows explicit ranges and per-stage elapsed/duration; Yield uses partial
segment opacity for accurate proportional progress; Dial divides its track by
stage and moves a marker; Receipt keeps fixed metric rows and distinguishes
current versus target ratio. Motion defaults to 180ms, with duration, speed,
easing, and reduced-motion preview controls; copy/download includes their values.
Numbers remain immediate. Animation is limited to stage-change opacity/translation
and running progress transform/opacity, with keyboard and reduced-motion overrides.

Validation: all five brewing entries across all six states with long names fit
1340 × 800 without panel overflow or sub-44px stage controls. Verified early stop
and focus return, all five Cover favorites with stable positions, recipe recall,
library artwork fallback, and old-profile URL redirection. Evidence lives in
`artifacts/section-refinement/`.


## November 4, 2026 — Timeline and Dial shortlist

User selected Timeline and Dial for continued comparison and requested removal
of the other brewing options. Removed Yield, Receipt, and the Revision reference
from the study picker. Keep existing Timeline (`v=2`) and Dial (`v=4`) links;
keyboard shortcuts are now 1 and 2. No final status winner or production promotion.

Applied the annotated removals: stage helper and counter; Timeline's stage timing
ranges, elapsed/duration values, and visible state labels; Dial's radial ticks,
elapsed caption, stage/demo timing captions, and in-panel simulation status.
Moved Timeline's yield metrics below Stage by stage and above the current stage.
Kept accessible stage status, graphical progress, completion behavior, motion
controls, and the selected Cover rail.

Validation: isolated section build and `git diff --check` pass. Both candidates
fit the 1340 × 800 comparison stage across six states with long names, with no
panel overflow or sub-44px stage controls. Verified early-stop titles, return
focus to grind controls, keyboard switching, stable URL IDs after reload, and
zero browser warnings/errors. Screenshots and layout results are saved under
`artifacts/timeline-dial/`.


## November 4, 2026 — Match Dial metric placement

Moved Dial's Target yield and Remaining metrics below Shot clock and above the
current stage title, matching Timeline's spacing, divider, and ordering. Completed
shots retain In the cup in the same position.


## November 4, 2026 — Profiles above artwork

Moved the five favorite profiles to the top of Revision's left rail and the
preview artwork below the list, above Browse profiles. The shared rail also
updates Timeline and Dial. Original remains unchanged.


## November 4, 2026 — Give progress the full right pane

Removed Target yield and Remaining from both status candidates at the user's
request, superseding the earlier metric placement decisions. Timeline now uses
flexible, evenly spaced stage rows, larger labels and markers, and continuous
vertical connectors. Dial uses a pane-width ring and larger time readout centered
in the available height. Both retain their current-stage title and completion
action, without reserving unused action space during extraction.


## November 4, 2026 — Timeline selected

User chose Timeline over Dial. Promote the final full-height Timeline into the
Revision prototype: 36px stage heading, 20px stage labels, 40px markers, flexible
rows and progress tracks, without yield metrics or the removed helper labels.
Keep 180ms progress/stage motion with reduced-motion and keyboard overrides.
Dial is retired; no reason beyond the user's preference was supplied. Remove the
section comparison harness and retain old URLs only as redirects to Revision.
Original and the main demo application remain unchanged.


## November 4, 2026 — Five brewing-motion directions

User removed Original and chose Revision as the starting point for a new
five-option exploration of the right brewing pane. Original's component and
main picker are removed; existing v=1 main URLs resolve to Revision (v=2).

Keep the selected Timeline as option 1 and the unchanged reference. Add Ribbon
(time moving down a stage path), Focus (stage names settle into a fixed reading
position with segmented stage progress), Percolate (flow through a schematic
coffee bed), and Bloom (pressure contours with restrained breathing motion).
The last two deliberately explore expressive metaphors. The chart, metrics,
Cover rail, recipe controls, and machine utilities remain the Revision shell.
No new winner is selected and no production or hardware integration is implied.

The isolated `motion/` harness includes keys 1–5 / arrows, explicit Replay (R),
pause/resume, shot scrubbing, motion duration/easing/speed/travel, Bloom expression,
reduced-motion preview, and config export. Numeric readings update immediately.
Only transform and opacity animate. Hidden-tab and paused playback stop loops;
reduced motion presents static shapes. Ordinary keyboard interaction skips
transitions; explicit Replay opts into motion unless reduced motion is enabled.

Validation: both isolated Vite builds pass. Browser checks cover all 30
option/state combinations, long profile names, 7s/18s stage boundaries, completed
shots, early stop, adjustment focus, running/paused motion, keyboard Replay,
reduced motion, config copy/download, and actual 1340 × 800 device framing.
Final checks found no panel overflow or browser warnings/errors. Evidence:
`artifacts/brewing-motion/`. No production code or hardware transport changed.


## November 4, 2026 — Ribbon and rolling Focus refinements

User kept Ribbon and Focus and asked to continue designing around them. Remove
Timeline from the motion picker and delete Percolate/Bloom sources. Timeline
remains the previously selected Revision status outside this experiment. No
production promotion or final winner is implied.

Keep Focus as the visually unchanged first reference, extracting its rolling
stage window so new variants share the same behavior. Ribbon loses its seconds
readout and adds a stage description plus pressure reference to each row. Give
each stage equal vertical space to accommodate details, mapping the playhead to
stage index plus that stage's progress instead of overall elapsed fraction.

Add Pressure (rolling titles above recorded-pressure bars and a faint planned
silhouette), Flow (rolling titles above horizontally travelling lanes whose pace
tracks flow), and Sequence (rolling titles above enlarged horizontal stage blocks
and current-stage detail). Sequence promotes the formerly secondary bottom strip
into the principal graphic, without duplicating that strip at the footer.

Keep Ribbon URL v=2 and Focus v=3 stable. New URL IDs are 6/7/8; keys 1–5 follow
picker order. Retired IDs resolve to Focus. Remove Bloom expression controls;
retain timing, easing, slow motion, heading travel, scrubbing, Replay, and reduced
motion. All stage references are from the shared illustrative demo curve.

Validation: isolated motion build passes. All 30 direction/state combinations
fit with long names, no panel overflow, and no sub-44px stage buttons. Checked
7s/18s stage transitions, completion, early stopping, focus return, keyboard
selection and replay, stable IDs after reload, reduced motion, and the clean
1340 × 800 tablet frame. No browser warnings/errors. Screenshots and results:
`artifacts/brewing-motion-round-two/`.

## November 4, 2026 — Focus, Ribbon, and Process only

User kept Ribbon unchanged, requested removal of Focus's bar graphic and moving
its stage strip to the top, and asked for a third option with only rolling titles
and process descriptions. Implement Process with paired copy moving together in
172px rows, without a progress visualization, pressure references, or clock.
Focus retains its original 100px rolling titles below the top stage strip.

Delete Pressure, Flow, and Sequence components and their unused helpers/loop CSS.
Only Focus (v=3), Ribbon (v=2), and Process (v=9) remain. Keys 1–3 follow picker
order. Keep the harness, replay/scrubbing, reduced motion, and completion actions.
No final choice or production promotion is implied.

Validation: motion build and diff checks pass. Browser verified 18 option/state
combinations with long names and no panel overflow or sub-44px stage buttons.
Process title/description pairs match at 0s, 7s, 18s, and completion; early stop
and adjustment focus return work. Running transitions use transform at 180ms;
reduced motion yields 0s transitions. No console warnings/errors. Evidence:
`artifacts/brewing-motion-three/`.

## November 4, 2026 — Combine Focus and Process

User requested Focus's exact rolling treatment with a process description below
the large title. Preserve its 36px titles, 100px rows, masked window, dimmed
neighbors, and stationary dividers. Reserve description space inside the active
row and animate it with its title. Remove the In this moment eyebrow and visible
labels below the top progress lines, retaining accessible names and stage status.

Combine under Focus (v=3), delete the separate Process component, and keep Ribbon
unchanged (v=2). The picker now has two options; v=9 falls back to Focus. No main
application promotion or new final winner.

Validation: isolated motion build and diff checks pass. Both options fit all six
states with long names. Checked stage/title-description matching, completion,
early stop, adjustment focus, old Process URL fallback, 180ms running motion,
and 0s reduced-motion transitions. The longest stage fits its original row
without description overlap. No console warnings/errors. Evidence:
`artifacts/brewing-focus-combined/`.


## November 4, 2026 — Progress beneath the rolling stage

Remove Focus's top three-stage strip. Replace the process description beneath
the active title with one horizontal bar that fills over the current stage.
Retain the existing rolling titles and dimmed neighbors. At each stage boundary,
the outgoing bar fills and the next title rolls into place with its bar at zero.
Ribbon remains unchanged; this stays in the isolated motion exploration.

Validation: isolated motion build and diff checks pass. Browser checked progress
at 0, 6.75, 7, 17.75, 18, and 30 seconds: each stage resets to zero and completion
reaches 100%. Playback advances the rolling title automatically. Early stopping
retains the partial fill with an accessible stopped status. No console warnings
or errors. Evidence: `artifacts/brewing-focus-stage-progress/`.


## November 4, 2026 — Completion in the rolling sequence

Focus now has a fourth, terminal “Shot complete” row after Pressure decline.
Natural completion rolls into that row with a full bar instead of replacing
the Pressure decline title. Preserve partial progress for an early stop. Keep
transitions enabled through the final playback update, with existing paused and
reduced-motion behavior.

Reserve the adjustment button's footer slot throughout brewing in both motion
options. Ribbon's stage positions and spacing now remain identical at completion,
and Focus's rolling window also stays fixed.

Validation: isolated motion build and diff checks pass. Browser playback verified
Focus advances from -200px to -300px with a 180ms transition, announces completion
at 100%, and retains identical window bounds. All three Ribbon row positions and
heights are identical before and after completion. Evidence:
`artifacts/brewing-completion/`.


## November 4, 2026 — Focus selected for Revision

User selected Focus as the final brewing status for Revision. Replace Timeline
with the shared Focus component and include its transform/opacity motion styles
in Revision, including reduced-motion handling. Keep the study as a reference;
this promotes the choice within the prototype only, not into `src/`.

Increase rolling rows from 100px to 140px, the masked window from 240px to 360px,
and the title-to-progress-bar gap from 9.5px to 31px. Preserve the fourth terminal
Shot complete row, per-stage fills, early stop, and reserved adjustment footer.

Validation: Revision and motion builds pass. Browser checks confirm all six
Revision states fit the 1340 × 800 comparison canvas with long profile names.
Measured 140px rows and a 31px title-to-bar gap; completion moves to -420px at
100% without moving the window. Playback uses a 180ms transition; adjustment
returns focus to the grind control. Evidence: `artifacts/revision-focus/`.


## November 4, 2026 — Dot loader with rolling status

Replace Focus's title/progress treatment with the circular 3×3 chevron dot wave
from the user-supplied React loader, paired with the current status name. Omit
the timer, horizontal progress, and stationary dividers. Use 5px dots, a 14px
gap, and 28px labels so Pressure decline fits the pane. Retain 140px rolling
rows, dimmed neighbors, and the final Shot complete row. The label stays steady.

Only the current brewing stage animates (650ms opacity cycle, 90ms stagger).
Pause dots during demo pause and page hiding; freeze them with reduced motion.
Completed and stopped states do not animate. No timer hook, video, external
asset, or dependency from the example is added.

Validation: Revision and motion builds and diff checks pass. Browser confirms
nine dots per row, no label overflow, current-stage-only animation, paused dots,
rolling into Pressure decline and Shot complete, and no animation after finish.
Reduced-motion preview disables dot animations and rolling transitions. No
console warnings/errors. Evidence: `artifacts/revision-focus-dots/`.


## November 4, 2026 — Tighter Focus rhythm and restrained motion

Restore stationary dividers above and below the active stage, as requested.
Reduce the row interval from 140px to 104px, window height from 360px to 280px,
and dot-to-label gap from 14px to 10px. Keep 28px labels with less compressed
tracking. Show the dot grid only on the current row so it conveys activity
rather than repeating as an icon on every stage. Improve neighboring-label
legibility while retaining the rolling-window fade.

Pair rolling and emphasis transitions at 220ms with symmetric easing. Slow
the dot cycle from 650ms to 900ms, soften its opacity peak, and offset its initial
phase so the wave is present as a stage activates. The motion speed control
now scales the dot cycle and delay as well as the roll. Pause, hidden-page,
completion, keyboard, and reduced-motion behavior remain supported.

Validation: both prototype builds and diff checks pass. Browser measured 104px
rows, a 10px gap, 220ms rolling, and a 900ms dot cycle. All labels fit. Live
playback reaches the final Shot complete row at -312px with no dot animation
or panel overflow. Reduced motion yields no dot animation and 0s transitions.
Evidence: `artifacts/revision-focus-refined/`.


## November 4, 2026 — Center the status group

Center the dot grid and status label together in each Focus row. Preserve the
10px internal gap, vertical alignment, dividers, and rolling motion. Both
prototype builds pass; browser measurements confirm the combined group is
centered in the row and the dot/text vertical centers match. Evidence:
`artifacts/revision-focus-centered/`.


## November 4, 2026 — Text-only completion and fading edges

Remove the dot grid entirely from the terminal Shot complete row, keeping its
text centered without reserved icon space. Strengthen the rolling window's
top/bottom fade while preserving full opacity around the current label. Fade
both divider ends horizontally to transparent.

Validation: both prototype builds and diff checks pass. Browser confirms zero
dots in the completion row, centered completion text, and both CSS masks.
Evidence: `artifacts/revision-focus-fades/`.
