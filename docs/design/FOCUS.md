# Locked Focus design

Selected by the user for production on November 4, 2026. Focus is the only screen implementation. Appearance: surface tone **0.16**, radius **8px**, control feedback **150ms**. The source of truth is `src/skin/`, with shared shadcn primitives in `src/components/ui/`.

At a 1340 × 800 CSS viewport:

| Region | Geometry |
| --- | --- |
| Header | 1340 × 72 |
| Left Cover rail | x0, y72, width 220, height 632 |
| Main | x220, y72, width 792, height 632; padding 28px horizontal, 24px vertical |
| Right panel | x1012, y72, width 328, height 632; padding 24px |
| Footer | y704, height 96 |
| Main title | Geist Variable, 30px, 500, 37.5px line-height, tracking−.045em |
| Focus stage | 104px row, 28px title, 10px dot gap; 280px mask window |

Five favorites sit above fixed artwork. The active stage has a circular 3×3 dot wave; neighboring stages roll vertically. Two stationary dividers and the top/bottom fades match the selected prototype. The terminal Shot complete row has no dots. There are no timers, descriptions, progress bars or top strips in the right panel. Motion remains 220ms; dot wave 900ms. Reduced-motion and keyboard behavior remain supported.

## Necessary data-related differences

The approved composition is preserved, with these functional corrections:

- Water height is labeled mm because Decaid does not provide a tank percentage.
- Profile titles, notes and stage names come from the selected real profile; stage durations are not a hardcoded 30-second sequence.
- Chart lines are true profile targets or real samples. Uncontrolled axes are absent rather than invented. Live and recording labels replace simulation labels.
- Unknown readings render as a dash. Mid-shot attachment cannot reconstruct elapsed time from the API replay event alone.
- Named grinder settings remain visible and editable through the value's existing position; steppers stay available for numeric settings.
- Long imported names wrap or are contained without altering the normal label sizes or column geometry.

## Preserved accessibility tradeoff

The locked stop-button foreground `#e7000b` on its 10% red/black surface measures approximately 4.245:1 for 14px text, below WCAG AA 4.5:1. Its icon and explicit label are preserved. Changing its color was not authorized by the locked-design request; resolve this before making an accessibility-conformance claim.

Historical explorations are recorded in `HISTORY.md` and Git commit `5f3ce07`; no alternate design is shipped.
