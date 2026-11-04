# Home and Brewing — round six

Open http://127.0.0.1:5173/proto/home-brewing/?v=2&state=ready with `npm run dev` running.

All four concepts incorporate the latest annotations. Workspace, Instrument, and Console have been removed. Decisions and requirements are recorded in [DECISIONS.md](./DECISIONS.md).

| # | Direction | Strength | Tradeoff |
| --- | --- | --- | --- |
| 1 | Studio | Warm split panes, profile rail, persistent recipe, bottom actions | Narrower chart |
| 2 | Monochrome Studio | Studio layout in black and white; simplified preparation and shot hierarchy | Gives more central space to readings than the chart |
| 3 | Grid | Wide Home chart, live readings only during Brewing, bottom actions | Graph changes width when brewing starts |
| 4 | Grid Focus | Wide chart, ratio/shot column, recipe row below profiles | Less vertical chart space |

## Interactions

- Picker or keys **1–4 / left–right** switch directions. **R** resets the current preview.
- **Load state** starts Home, Brewing, Completed, Heating, Disconnected, or Error. Brewing is paused at 12 seconds for comparison; Resume / +5s are below the canvas.
- **Long profile** tests Easy blooming — active pressure decline. Browse profiles opens the searchable 21-profile demo collection. All five favorites are one tap away in all four options, with the full selected name visible above the chart.
- Studio and Monochrome Studio include a unitless demo Grind size above Dose, stepping by 0.1 across 0–20 and remembered per profile. No grinder commands are sent.
- Dose steps by 0.1g, target yield by 0.5g, and temperature by 0.5°C. Controls clamp to illustrative demo bounds. Adjustments persist per profile within the current preview session. No settings popover or keyboard is needed.
- Steam has a separate enable switch. Disabling stops an active demo steam operation and blocks Start; enabling does not start a cycle. The setting persists within the preview session.
- Steam duration steps by 5 seconds (5–90s). Open Steam to adjust duration and start/stop. Its countdown stays visible in the bottom bar while running. Hot water exposes temperature and duration; flush exposes duration in a small, nonmodal settings card. Settings survive closing and reopening that card in the session.
- Utility countdowns automatically stop and pause while the page is hidden. Recipe/profile controls lock while brewing or running utilities. Changing the next recipe archives a completed shot before clearing it.
- Profile names and selected recipe defaults are based on Streamline data. All profiles still use one illustrative 30-second demo curve; this is not a faithful simulation of the source profiles.
- History is session-only. Direction/state changes reset the local session.

## Viewing on the tablet

The comparison canvas is 1340 × 800 CSS pixels and scales to fit its wrapper. **Tablet view** opens the current direction without the harness, starting at Home. Use browser Back to return to comparison. At an actual 1340 × 800 viewport this renders at 1:1, with 48px adjustment buttons. Different physical pixel densities still require measurement on the Samsung WebView.

The appearance panel changes surface tone, control radius, and feedback duration. Copy or download the config as JSON. Grid keeps its page black; surface tone adjusts its secondary surfaces only. No design has been selected for production.

## Materials and sources

The prototypes reuse the installed shadcn Base UI / Nova / Neutral / Geist / Lucide preset, actual Button component, local Geist font, and in-memory demo gateway. All exploration code lives here; production imports none of it.

Studio interprets the pane-based interface and warm neutral presentation on [Cursor's official site](https://cursor.com/). Grid interprets [Vercel Geist](https://vercel.com/geist/introduction) and its [neutral color and border rules](https://vercel.com/geist/colors). These are independent espresso concepts, not replicas.

The five favorites come from [Streamline profiles](https://github.com/decentespresso/streamline-js/tree/main/src/profiles): D-Flow / default, 80's Espresso, Easy blooming — active pressure decline, Rao Allongé DA Earthworld o.bourbon, and Mild und süßlich (displayed as Gentle & sweet). The last two were verified from the official JSON files during round two. Short descriptions are paraphrased; chosen brew settings remain illustrative.

## Verification

- Browser inspection and screenshots of Home and Brewing for all four options.
- This round: all four options checked in Home and Brewing with long profile names; Grid Focus also checked across all six states. No stage clipping, section overflow, or buttons below 44px. Recipe adjustment buttons remain 48px.
- Direct adjustments, per-profile recall, brewing progress/stop, steam, and utility cards exercised in the local demo.
- Tablet view checked at 1340 × 800 CSS pixels with a 1:1 stage. Current tablet screenshots are in `artifacts/round-six/`.
- Build: `npx vite build --config proto/home-brewing/vite.config.js --outDir /private/tmp/decent-round6-build`.
- Production source/configuration checked against pre-round SHA-256 hashes.
- No machine transport exists in these prototypes. Vite HMR is unrelated to Decaid. Physical machine and Samsung WebView acceptance remain unverified.

The expanded catalogue comes from [Streamline's API sample](https://github.com/decentespresso/streamline-js/blob/main/src/profiles/new_api.json) and [Slayer Shot](https://github.com/decentespresso/streamline-js/blob/main/src/profiles/profile.json). Manual, cleaning, unbounded-yield, and large-yield entries outside the demo's supported range are visible but unavailable for execution. This is not a live inventory of the user's installed profiles.
