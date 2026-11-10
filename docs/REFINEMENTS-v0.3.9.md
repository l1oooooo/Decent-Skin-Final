# Focus v0.3.9 — forty-second brewing timeline

Local build prepared for tablet testing before Phase 6. No installation or
hardware operation is included.

## Scope and boundary behavior

The live chart starts at 0–40 seconds. Its existing ten-second scaling strategy
now selects the next boundary at an exact multiple of ten, so incoming samples
have room after an expansion. At 40 seconds the range begins expanding to 50;
it does not wait for the next sample to exceed the old right edge.

| Elapsed shot time | Live X-axis target |
| --- | --- |
| 0, 25, 35, 39 seconds | 0–40 seconds |
| 40, 45 seconds | 0–50 seconds |
| 60 seconds | 0–70 seconds |
| 120 seconds | 0–130 seconds |

Only two production lines in the domain calculation change. The existing
420ms cubic ease-out, coordinate retargeting, raw samples and missing-value gaps
are unchanged. New shots reset to 40 seconds. Planned Home charts still use
their profile-derived duration, independently of the live minimum. Chart size,
Y-axis rules, colors, gradients, typography, metrics, the 600ms Home/Brewing
transition, completion behavior and surface tone 0.16 are unchanged.

## Tablet recheck

Local verification passed 202 unit tests, 18 model tests, TypeScript, lint,
the production build and isolation audit, five production-fixture browser
tests and one continuous simulator regression. The duration matrix passed at
1007 × 601, 1340 × 800 and 800 × 480, including raw-value geometry, fixed bounds,
Home preview retention and new-shot reset. The installable ZIP passed static
verification. See [the validation record](VERIFICATION.md).

At the actual embedded WebView size, check short shots through 39 seconds,
the boundary at 40 seconds, and longer shots through 45, 60 and 120 seconds.
Confirm smooth expansions, visible incoming samples, unchanged metrics and
Home transitions, and a fresh 40-second range on the next shot. Local fixture
checks do not establish Samsung WebView or hardware acceptance.
