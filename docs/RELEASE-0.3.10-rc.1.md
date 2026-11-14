# Decent Focus 0.3.10-rc.1

Phase 6 release candidate based on v0.3.9. The user explicitly authorized
GitHub publication after reviewing the QA findings. It is published as a
**prerelease**, not a stable promotion; main is not merged and no tablet
installation is performed. The current design, live telemetry, command gates, notifications
and motion remain the approved baseline, including the **35-second** initial
brewing timeline.

## Changes

- Allow recipe-preferences and profile-editor deep links to initialize when
  their requested profile becomes available after library/connection recovery,
  without replaying writes or replacing existing drafts.
- Move keyboard focus to the visible brewing-status container when a new shot
  interrupts navigation, instead of the now-inert header.
- Remove confirmed unused legacy navigation/popover components and helpers.
- Exclude generated build/test output from ESLint; keep source/test coverage.
- Support strictly validated RC versions in static packaging and verification.
- Add repeatable chart/startup/resource measurements and a 20-shot stability
  check. Align older browser assertions with the current toast/header design.
- Document architecture, measured limits, regression evidence and the remaining
  Samsung/DE1 acceptance checklist. No dependency changes.

## Candidate artifact

`artifacts/decent-skin-codex-0.3.10-rc.1.zip` is produced by
`npm run package:skin`, then checked with `npm run verify:skin`.
`artifacts/skin-release.json` records the exact source commit, tracked changes,
archive inventory, size and SHA-256. Device acceptance remains false.

Verified archive: **624,366 bytes, 11 files**. SHA-256:
`9d6459820794b04524b216517b6ce90f34db209134b7a39afe70cc8bc91fe9fc`.
Review status: **stable-release gate not met; prerelease publication authorized for review/testing**.
Latest per-case browser coverage is 85/86 passing across full and targeted runs,
with an unresolved inventory notification check. Cold-read reliability and
measured desktop frame stalls also remain open. All static/package checks passed;
these do not establish production or device acceptance.

The ZIP has `index.html` and `manifest.json` at its root, relative compiled
assets and bundled fonts/artwork. It does not require a Node server on the
tablet. Only the production build is packaged; fixture and simulator outputs
are excluded.

## Review documents

- [Architecture, cleanup and performance](PHASE-6-AUDIT.md)
- [Automated results and repeatable device checklist](PHASE-6-QA.md)

The observed slow local Chrome cold startup requires further evaluation.
No Android performance, installation or physical-machine acceptance is claimed.

## Rollback to the approved stable release

The preserved local archive is
`artifacts/phase6/rollback/decent-focus-v0.3.9.zip`.

- Release: [v0.3.9](https://github.com/l1oooooo/Decent-Skin-Focus/releases/tag/v0.3.9)
- Published asset: `decent-focus.zip`, 624,524 bytes
- SHA-256: `b4774c2e58517a4c4a99c7ebac8f4be4e584a113963add3ed3f6d242b4986a62`
- Source: `89e7711625b0d6448f757f1db929f521a3b247ca`
- Local source tag: `phase-6-baseline-v0.3.9`

Before an approved installation, keep this archive accessible and preserve a
Decaid backup using its supported procedure. If the candidate misbehaves,
return to native Decaid while idle, install/select the preserved stable skin
through the same supported skin workflow, then confirm version 0.3.9 and the
saved profiles/recipes. Do not reset KV data, profiles or workflow settings as
part of a skin rollback. This candidate introduces no data migration.

The source tag is a recovery reference, not a reason to discard working files.
For source inspection use a separate checkout of the tag. No installation,
downgrade or hardware operation has been performed automatically.
