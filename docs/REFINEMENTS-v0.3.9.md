# Focus v0.3.9 — thirty-five-second brewing timeline

Local build prepared for tablet testing before Phase 6. No installation or
hardware operation is included.

## Scope and boundary behavior

The live chart starts at 0–35 seconds. Its existing ten-second scaling strategy
now selects the next boundary at an exact multiple of ten, so incoming samples
have room after an expansion. At 35 seconds the range begins expanding to 40;
it does not wait for the next sample to exceed the old right edge.

| Elapsed shot time | Live X-axis target |
| --- | --- |
| 0, 25, 30, 34 seconds | 0–35 seconds |
| 35, 39 seconds | 0–40 seconds |
| 40, 45 seconds | 0–50 seconds |
| 60 seconds | 0–70 seconds |
| 120 seconds | 0–130 seconds |

Only the live time-domain calculation changes. The existing
420ms cubic ease-out, coordinate retargeting, raw samples and missing-value gaps
are unchanged. New shots reset to 35 seconds. Planned Home charts still use
their profile-derived duration, independently of the live minimum. Chart size,
Y-axis rules, colors, gradients, typography, metrics, the 600ms Home/Brewing
transition, completion behavior and surface tone 0.16 are unchanged.

## Tablet recheck

The revised 35s candidate passed 205 unit tests, 18 model tests, TypeScript,
lint, the production build and isolation audit. Two focused browser scenarios
passed across runs at 1007 × 601: the duration matrix and animated retargeting,
including raw-value geometry, fixed bounds, Home preview retention, new-shot
reset and reduced motion. The open simulator was refreshed and confirmed at
35s. The installable ZIP passed static verification. See the prior broader
40s candidate coverage and the test setup correction in
[the validation record](VERIFICATION.md).

At the actual embedded WebView size, check short shots through 34 seconds,
the boundary at 35 seconds, and longer shots through 45, 60 and 120 seconds.
Confirm smooth expansions, visible incoming samples, unchanged metrics and
Home transitions, and a fresh 35-second range on the next shot. Local fixture
checks do not establish Samsung WebView or hardware acceptance.
