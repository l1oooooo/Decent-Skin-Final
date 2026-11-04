# Home and Brewing — Monochrome Studio

Open http://127.0.0.1:5173/proto/home-brewing/?v=2&state=ready with `npm run dev` running.

**Revision** (v=2) is the sole starting point. Original is removed, including
its component and picker entry. Old v=1 links now open Revision. Studio, Grid,
and Grid Focus remain retired historical source.

Focus is the final brewing direction, integrated into Revision. Retained references are at
[Brewing motion](http://127.0.0.1:5173/proto/home-brewing/motion/?v=3&state=brewing).
The [motion study README](motion/README.md) describes the alternatives, controls,
and validation. Decisions are recorded in [DECISIONS.md](./DECISIONS.md).

## Brewing studies — November 4, 2026

Cover is selected and integrated into Revision: a stable five-profile list above fixed
artwork, with the profile-kind/index row removed. Index, Gallery, Recipe
cards, and the profile-study picker are deleted. Old profile-study URLs redirect
to Revision.

Focus is selected and integrated into Revision: rolling status names spaced
104px apart, a circular 3×3 animated dot grid on the current stage, and a final
Shot complete row. Thin stationary dividers frame the active row, with a 10px
gap between dots and label. Rolling uses a 220ms eased transition; the dot wave
uses a restrained 900ms cycle.
There is no timer or progress bar in the right pane.
Timeline is retired from Revision.
Dial and the section comparison picker are removed. Old study links redirect to
Revision. See [the decision log](DECISIONS.md) for the selection history.

## Interactions

- **R** resets the Revision preview. The separate motion study has its own two-way picker.
- **Load state** starts Home, Brewing, Completed, Heating, Disconnected, or Error. Brewing is paused at 12 seconds for comparison; Resume / +5s are below the canvas.
- **Long profile** tests Easy blooming — active pressure decline. Browse profiles opens the searchable 21-profile demo collection. All five favorites are one tap away in Revision, with the full selected name visible above the chart.
- Revision includes a unitless demo Grind size above Dose, stepping by 0.1 across 0–20 and remembered per profile. No grinder commands are sent.
- Dose steps by 0.1g, target yield by 0.5g, and temperature by 0.5°C. Controls clamp to illustrative demo bounds. Adjustments persist per profile within the current preview session. No settings popover or keyboard is needed.
- Steam has a separate enable switch. Disabling stops an active demo steam operation and blocks Start; enabling does not start a cycle. The setting persists within the preview session.
- Steam duration steps by 5 seconds (5–90s). Open Steam to adjust duration and start/stop. Its countdown stays visible in the bottom bar while running. Hot water exposes temperature and duration; flush exposes duration in a small, nonmodal settings card. Settings survive closing and reopening that card in the session.
- Utility countdowns automatically stop and pause while the page is hidden. Recipe/profile controls lock while brewing or running utilities. Changing the next recipe archives a completed shot before clearing it.
- Profile names and selected recipe defaults are based on Streamline data. All profiles still use one illustrative 30-second demo curve; this is not a faithful simulation of the source profiles.
- History is session-only. Direction/state changes reset the local session.

## Monochrome Studio Brewing

Revision removes the Favorites heading and header DEMO badge, renames Recipe to
Profile settings, and gives Stop extraction a 10% red tint with matching red text (Figma 323:76).
Its fixed Cover artwork sits below the stable five-profile list; Browse profiles
is pinned at the rail bottom. The artwork has no profile-kind/index caption.
Status information and History are right-aligned. Steam, Hot water, and Flush open anchored Base UI popovers above the footer. Its right pane keeps
the same width while showing Focus's rolling sequence without duplicated yield
metrics. The active stage animates a dot wave before rolling to the next stage.
Completion rolls to a separate Shot complete row; early stops show Shot stopped.
Dots pause with the demo or when the page is hidden, and respect reduced motion. The
adjustment footer is reserved throughout brewing to prevent layout shifts. Adjust profile settings returns focus to the first adjustment control.

Stages follow the shared demo curve: Preinfusion 0–7s, Extraction 7–18s, Pressure
decline 18–30s. These are illustrative, not imported profile steps or live machine
states. Revision defaults to surface tone 0.17, radius 8px, and 150ms feedback.

## Viewing on the tablet

The comparison canvas is 1340 × 800 CSS pixels and scales to fit its wrapper. **Tablet view** opens the current direction without the harness, retaining the selected load state. Use browser Back to return to comparison. At an actual 1340 × 800 viewport this renders at 1:1, with 48px adjustment buttons. Different physical pixel densities still require measurement on the Samsung WebView.

The accepted preset in `selected-direction.json` defaults to Revision, Home, no long name, surface tone 0.17, control radius 8px, and feedback 150ms. The appearance panel changes surface tone, control radius, and feedback duration for Revision; reload restores its default. Copy or download the config as JSON. The page stays black; surface tone adjusts its secondary surfaces only. Monochrome Studio is selected for continued refinement; it has not been promoted into the main app.

## Materials and sources

The prototypes reuse the installed shadcn Base UI / Nova / Neutral / Geist / Lucide preset, actual Button component, local Geist font, and in-memory demo gateway. All exploration code lives here; production imports none of it.

Studio interprets the pane-based interface and warm neutral presentation on [Cursor's official site](https://cursor.com/). Grid interprets [Vercel Geist](https://vercel.com/geist/introduction) and its [neutral color and border rules](https://vercel.com/geist/colors). These are independent espresso concepts, not replicas.

The five favorites come from [Streamline profiles](https://github.com/decentespresso/streamline-js/tree/main/src/profiles): D-Flow / default, 80's Espresso, Easy blooming — active pressure decline, Rao Allongé DA Earthworld o.bourbon, and Mild und süßlich (displayed as Gentle & sweet). The last two were verified from the official JSON files during round two. Short descriptions are paraphrased; chosen brew settings remain illustrative.

## Verification

- Prototype build, browser stage transitions, early stop, completed result, and
  keyboard focus return checked for this revision.
- All six states checked with long names; native 1340 × 800 framing and 44px
  minimum touch targets verified. Evidence: `artifacts/monochrome-revision/`.
- No machine transport exists in these prototypes. Physical machine and Samsung
  WebView acceptance remain unverified.

The expanded catalogue comes from [Streamline's API sample](https://github.com/decentespresso/streamline-js/blob/main/src/profiles/new_api.json) and [Slayer Shot](https://github.com/decentespresso/streamline-js/blob/main/src/profiles/profile.json). Manual, cleaning, unbounded-yield, and large-yield entries outside the demo's supported range are visible but unavailable for execution. This is not a live inventory of the user's installed profiles.
