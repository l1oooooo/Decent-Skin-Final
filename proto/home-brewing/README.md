# Home and Brewing — Monochrome Studio

Open http://127.0.0.1:5173/proto/home-brewing/?v=2&state=ready with `npm run dev` running.

The current picker contains only Monochrome Studio **Original** (v=1) and
**Revision** (v=2, default). Original preserves the last approved layout. Studio,
Grid, and Grid Focus are retired from the picker and build; their source remains
as historical reference. Decisions are recorded in [DECISIONS.md](./DECISIONS.md).

| # | Option | Purpose |
| --- | --- | --- |
| 1 | Original | Unchanged Monochrome Studio with read-only shot recipe |
| 2 | Revision | Expanding artwork rail, utility popovers, and stage-aware Brewing pane |

## Interactions

- Picker or keys **1–2 / left–right** switch directions. **R** resets the current preview.
- **Load state** starts Home, Brewing, Completed, Heating, Disconnected, or Error. Brewing is paused at 12 seconds for comparison; Resume / +5s are below the canvas.
- **Long profile** tests Easy blooming — active pressure decline. Browse profiles opens the searchable 21-profile demo collection. All five favorites are one tap away in both options, with the full selected name visible above the chart.
- Both options include a unitless demo Grind size above Dose, stepping by 0.1 across 0–20 and remembered per profile. No grinder commands are sent.
- Dose steps by 0.1g, target yield by 0.5g, and temperature by 0.5°C. Controls clamp to illustrative demo bounds. Adjustments persist per profile within the current preview session. No settings popover or keyboard is needed.
- Steam has a separate enable switch. Disabling stops an active demo steam operation and blocks Start; enabling does not start a cycle. The setting persists within the preview session.
- Steam duration steps by 5 seconds (5–90s). Open Steam to adjust duration and start/stop. Its countdown stays visible in the bottom bar while running. Hot water exposes temperature and duration; flush exposes duration in a small, nonmodal settings card. Settings survive closing and reopening that card in the session.
- Utility countdowns automatically stop and pause while the page is hidden. Recipe/profile controls lock while brewing or running utilities. Changing the next recipe archives a completed shot before clearing it.
- Profile names and selected recipe defaults are based on Streamline data. All profiles still use one illustrative 30-second demo curve; this is not a faithful simulation of the source profiles.
- History is session-only. Direction/state changes reset the local session.

## Monochrome Studio Brewing

Original retains its four readings, chart, and read-only shot recipe.
Revision removes the Favorites heading and header DEMO badge, renames Recipe to
Profile settings, and gives Stop extraction a 10% red tint with matching red text (Figma 323:76).
Its selected favorite expands with supplied Figma artwork; Browse profiles is
pinned at the rail bottom. Status information sits to the left and History to the
right. Steam, Hot water, and Flush open anchored Base UI popovers above the footer. Its right pane keeps
the same width while showing the current stage, a three-stage sequence, target
yield, and remaining grams. Early stop and completed results retain the same
structure. Adjust profile settings returns focus to the first adjustment control.

Stages follow the shared demo curve: Preinfusion 0–7s, Extraction 7–18s, Pressure
decline 18–30s. These are illustrative, not imported profile steps or live machine
states. Original and Revision both default to surface tone 0.17, radius 8px, and
150ms feedback. Appearance adjustments remain independent between options.

## Viewing on the tablet

The comparison canvas is 1340 × 800 CSS pixels and scales to fit its wrapper. **Tablet view** opens the current direction without the harness, starting at Home. Use browser Back to return to comparison. At an actual 1340 × 800 viewport this renders at 1:1, with 48px adjustment buttons. Different physical pixel densities still require measurement on the Samsung WebView.

The accepted preset in `selected-direction.json` defaults to Revision, Home, no long name, surface tone 0.17, control radius 8px, and feedback 150ms. The appearance panel changes surface tone, control radius, and feedback duration separately for each concept; reload restores its default. Copy or download the config as JSON. The page stays black; surface tone adjusts its secondary surfaces only. Monochrome Studio is selected for continued refinement; it has not been promoted into the main app.

## Materials and sources

The prototypes reuse the installed shadcn Base UI / Nova / Neutral / Geist / Lucide preset, actual Button component, local Geist font, and in-memory demo gateway. All exploration code lives here; production imports none of it.

Studio interprets the pane-based interface and warm neutral presentation on [Cursor's official site](https://cursor.com/). Grid interprets [Vercel Geist](https://vercel.com/geist/introduction) and its [neutral color and border rules](https://vercel.com/geist/colors). These are independent espresso concepts, not replicas.

The five favorites come from [Streamline profiles](https://github.com/decentespresso/streamline-js/tree/main/src/profiles): D-Flow / default, 80's Espresso, Easy blooming — active pressure decline, Rao Allongé DA Earthworld o.bourbon, and Mild und süßlich (displayed as Gentle & sweet). The last two were verified from the official JSON files during round two. Short descriptions are paraphrased; chosen brew settings remain illustrative.

## Verification

- Prototype build, browser stage transitions, early stop, completed result, and
  keyboard focus return checked for this revision.
- All six states checked with long names; native 1340 × 800 framing and 44px
  minimum touch targets verified. Evidence: `artifacts/monochrome-revision/`.
- Original component compared byte-for-byte with the pre-edit snapshot.
- No machine transport exists in these prototypes. Physical machine and Samsung
  WebView acceptance remain unverified.

The expanded catalogue comes from [Streamline's API sample](https://github.com/decentespresso/streamline-js/blob/main/src/profiles/new_api.json) and [Slayer Shot](https://github.com/decentespresso/streamline-js/blob/main/src/profiles/profile.json). Manual, cleaning, unbounded-yield, and large-yield entries outside the demo's supported range are visible but unavailable for execution. This is not a live inventory of the user's installed profiles.
