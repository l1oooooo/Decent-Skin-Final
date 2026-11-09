# Focus v0.3.7 — brewing profile heading

Local candidate based on the user-approved v0.3.6, pending review. Phase 6 QA,
GitHub publication and tablet installation have not been started.

The live screen displays the shot's existing captured `profileName` as its
primary heading, above the rolling status. It does not read the mutable Home
profile or add a new capture mechanism. The existing start event changes this
name for a new shot; telemetry, stage changes and completion retain it. The
heading DOM stays mounted and has no independent animation. A missing captured
name is explicitly shown as “Profile unavailable”; another selected profile is
never substituted.

The heading uses the existing foreground, medium weight and tight tracking:
30px/36px at reference height, 24px/30px in compact landscape. It wraps up to two
lines, including unbroken names. Exceptionally long names ellipsize after two
lines; the complete name remains the heading's accessible text and title.
An 8px gap separates it from the unchanged rolling indicator, whose text is
18px to establish secondary hierarchy. State-specific icon colors and rolling
animation remain unchanged.

Only the new heading's measured height is added to the live chart's existing
top offset. This keeps the status, metrics and chart in their established order
without guessing the number of title lines. A resize observer updates that
geometry for viewport/font changes; the name stays constant during extraction.
Metrics and graph styling, data sources, 600ms four-region transition, 3-second
completion hold, hidden header behavior and surface tone 0.16 are unchanged.

## Review on the tablet

- Confirm the profile name at shot start, through stage changes and completion.
- Try short, long and unbroken names at the actual embedded WebView size.
- Confirm consistent left alignment, no overlap and a readable chart.
- Recheck a new shot during the hold, manual stop and the reverse Home transition.

The reported tablet browser viewport is 1007 × 601. Matching that size in Chrome
does not establish Samsung WebView or hardware acceptance.

## Local validation

TypeScript, lint, 182 gateway/unit tests and the production build passed.
The brewing audit passed 18 model tests and checked 2,458 production modules
without preview/simulator content. Three focused browser scenarios passed across
targeted runs: captured title/DOM stability and shot replacement, long-name
geometry at three landscape sizes, and the existing four-region lifecycle.
Screenshots were reviewed at 1340 × 800, 1007 × 601 and 800 × 480. These checks
are not a full Phase 6 QA run or Samsung hardware acceptance.

The first title run reached the returning phase but exceeded its custom 15s
Home expectation; the rerun used the repository's standard 30s expectation and
passed. No production timing or state logic was changed to satisfy the test.
See [the verification record](VERIFICATION.md#037--stable-brewing-profile-heading-candidate)
for packaging evidence and the pending device check.
