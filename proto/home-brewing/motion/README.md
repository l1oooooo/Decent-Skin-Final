# Brewing motion — Focus and Ribbon

[Open the study](http://127.0.0.1:5173/proto/home-brewing/motion/?v=3&state=brewing)
with `npm run dev` running. Revision supplies the shell, Cover rail, and central
readings. Focus is the final selected option and is integrated into Revision.
The study retains Ribbon for reference.

| Key | Option | URL ID | Treatment |
| --- | --- | --- | --- |
| 1 | Focus | 3 | Rolling status names with a circular 3×3 dot wave |
| 2 | Ribbon | 2 | Vertical path with descriptions and pressure references for all stages |

Focus uses the circular dot-wave pattern from the user-provided loader. A 3×3
grid of 5px dots sits 10px from a 28px status name. Rows are 104px apart inside
a 280px masked rolling window. Thin stationary dividers frame the current row;
neighboring labels fade more strongly toward the top and bottom. Both divider
lines fade to transparent at their left and right ends. Neighboring labels do
not repeat the dot grid. There is no
right-pane timer or progress bar. The active grid uses a 900ms opacity wave
with 100ms chevron delays and an initial phase offset; the name stays steady.
Rolling and emphasis changes share a 220ms symmetric easing curve. Dots pause with playback
or when the page is hidden. Reduced motion freezes the grid and removes rolling
transitions. An accessible live status announces the current stage.

Completed shots roll into a separate final “Shot complete” row with centered text only;
early stops show “Shot stopped” with no animation. The adjustment action retains
its reserved footer slot, keeping the completion layout stable.

The separate Process component is deleted. Its old v=9 URL resolves to Focus,
as do other retired IDs. Revision shares the Focus component and visualization
styles; the main application in `src/` remains separate.

## Controls

- **1–2** or arrows switch options. **R / Replay animation** restarts a 30s shot.
- Previews start paused at 12s. Resume, Pause, +5s, and Shot position allow motion
  inspection. Scrubbing pauses playback. Reset preview returns to 12s.
- Tune motion adjusts transition duration, easing, visual speed, Ribbon title
  travel, and reduced motion. Copy config / Save JSON exports chosen settings.
- Rolling titles and dot waves use transform/opacity only. Reduced motion removes
  transitions. Ordinary keyboard changes are immediate; Replay requests motion.
- Six lifecycle states and Long profile exercise the surrounding layout.
  `device=1` removes study controls for the 1340 × 800 CSS-pixel frame.

Descriptions and pressure references describe the illustrative demo curve,
not imported profile instructions. No production imports or hardware transport.

## Build

```sh
npx vite build --config proto/home-brewing/motion/vite.config.js --outDir artifacts/motion-build
```

Evidence: `artifacts/revision-focus-refined/`. Hardware and Samsung WebView
acceptance remain outside this demo exploration.
