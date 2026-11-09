# Focus v0.3.8 — pending-save paint and Home recipe labels

Local candidate for tablet review. No merge, push, release, installation or
hardware commands are included in this refinement.

## Confirmed rendering cause

The v0.3.7 baseline was instrumented before changing production code. A held
workflow write exposed 88 animation frames. Edit Profile, the selected favorite
button and its name span all retained the same DOM nodes and bounding boxes;
none became hidden and root theme variables did not change. The nearby grind
output and DE1 status retained their paint.

The shared pending flag makes `profileLocked` true. These two controls still
used genuine-unavailability paint during that temporary lock:

- Edit Profile's transparent border became `--border` (OKLCH 0.29) and its clear
  background became `--card` (OKLCH 0.135), restarting a background transition.
- The selected favorite's foreground changed from white to `--muted-foreground`
  (OKLCH 0.72); the name span inherited the changed color.

This is the same pending-versus-unavailable distinction fixed for recipe rows
and Sleep in v0.3.6. It is not evidence of a remount, changing key, layout shift,
theme reset or a compositor bug. Ordinary React renders still update disabled
semantics; they do not require replacing or repainting those nodes.

Both controls now opt into the existing pending-only treatment. Edit Profile
uses Base UI's focusable-disabled behavior only while it has a valid profile
and the sole blocker is pending work. Base UI still suppresses activation.
Favorite buttons retain native disabled semantics. Genuine missing profiles,
connection loss, stale readings and other blockers retain unavailable styling.
No new CSS, opacity effect, delay, entrance animation or blanket memoization was
added. Existing write gates and persistence ordering are unchanged.

## Grind range and ownership

Home's numeric grind range is 0–50 in 0.1 steps, with unchanged formatting and
keypad behavior. The stepper/keypad and numeric state handler use shared bounds.
Explicit recipe adjustment writes reject numeric grind strings outside this
range before any workflow/KV write; named settings remain supported.
Read paths do not clamp or rewrite historical values.

The installed Decaid commit `14361a94b32888f6a81182e9e239f513d39d060c` was checked:
[workflow context](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/models/data/workflow_context.dart)
parses and serializes `grinderSetting` as optional text; the
[workflow handler](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/services/webserver/workflow_handler.dart)
merges that context and does not impose a 20-point cap. Focus's previous cap was
in its Home control definition. This setting records the recipe; it is not a
grinder motor command. Device-descriptor validation in the separate physical
grinder controls is unchanged.
The installed controller's
[`updateWorkflowSettings`](https://github.com/decentespresso/decaid/blob/14361a94b32888f6a81182e9e239f513d39d060c/lib/src/controllers/de1_controller.dart)
only applies changed steam, hot-water and rinse settings; changing this context
field alone returns without a device write.

## Home labels

The middle summary now reads Dose in place of the Coffee/source label. The
right-side Target yield control now reads Drink, including its accessible control
names and numeric-dialog label. Values, units, source/default selection, ratio
calculations and internal `targetYield` serialization are unchanged. The shared
RecipeControls component is currently used only by Home. Other editors/history
retain their existing terminology.

## Verification scope

See [the verification record](VERIFICATION.md). The reported tablet browser
viewport is 1007 × 601; fixture checks at that size do not establish actual
Samsung WebView acceptance. The observed pending-paint cause is addressed;
remaining device-specific rendering symptoms still require tablet review.

Local validation passed 190 unit tests, 18 model tests, production build/lint,
the simulator-isolation audit and seven focused browser scenarios across
targeted runs. The fixed paint audit sampled 490 frames across two profiles with
one paint state per monitored element and no remount, movement or restarted
animation. Grind boundary/persistence checks and the existing profile-number,
recipe stability and Home/Brewing lifecycle checks passed. Test-only corrections
and the downloadable package checksum are recorded in VERIFICATION.md.
