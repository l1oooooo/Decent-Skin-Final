# Release feedback procedure

Approved by the user on November 6, 2026, after the v0.2.2 feedback → v0.2.3
release cycle.

## Purpose and authorization

The user installs each release on the tablet, tests it with the hardware, and
posts observations in this chat. The assistant reviews every item, clarifies
uncertainties, implements the agreed changes, tests them locally, commits and
pushes the changes, and publishes the next GitHub release for tablet testing.

Feedback submitted for action under this procedure authorizes that complete
cycle. Do not ask again for routine implementation, commit, push or release
approval. If the user asks for discussion, investigation or a draft only, follow
that narrower scope. Do not publish with unresolved scope decisions or failed
required checks; explain the blocker and continue any independent work.

This authorization covers the skin's source and GitHub release. It does not
cover operating the machine, changing live tablet data, pairing devices,
installing updates on the tablet, calibration or firmware operations. Those
require explicit scope for a supervised device session. Local development and
automated tests must use the isolated fixture, never real hardware.

## 1. Capture the feedback

Accept plain comments, bullets, screenshots or a mixture; a template is optional.
Establish the installed skin version and turn each observation into a tracked
item. Keep the user's intended result separate from a proposed implementation.
Distinguish bugs, design changes, questions and data-transfer requests.

Record enough context to reproduce the issue: affected screen, steps, actual
result and expected result. Ask for tablet/WebView details only when they matter
to diagnosis. Attribute hardware observations to the user; do not present them
as independently verified. Approval of this workflow does not establish hardware
acceptance of a release.

Every item must end with an explicit outcome: fixed and checked, answered,
blocked, or deferred by agreement. Do not silently drop an item or report a
partial fix as completion.

## 2. Inspect, review and clarify

Read [AGENTS.md](../AGENTS.md), inspect the current branch, working tree, remote
and published version, and read the relevant source and documentation. Preserve
unrelated changes and generated files. Use the current checkout as evidence;
do not assume an earlier chat's source state is still current.

Reproduce or explain each issue using code and the isolated fixture. Verify
external references against the relevant upstream source and installed Decaid
contract in [DECAID.md](DECAID.md). Reuse existing editors, components and
transport paths where they already support the request.

Before implementing an ambiguous or consequential choice, ask concise questions
that explain what decision depends on the answer. Group related questions and
recommend an option when useful. Examples include whether settings belong to
the same Decaid installation, which profile values should be copied, or whether
an existing record should be replaced. Ask only for missing information or a
real scope/approval decision; do not require the user to reconfirm clear requests.

Continue independent investigation and fixes while waiting. Do not treat silence
as approval for a dependent action. State reasonable low-impact assumptions and
explain significant architectural changes before proceeding. If an environment
approval blocks an action, identify the action and the actual reason rather
than inventing a project approval requirement.

## 3. Implement the agreed changes

Keep the changes focused on the feedback and preserve the accepted Focus design,
API ownership, profile identity, write guards and physical-only daily controls.
Retain failed drafts and explicit error states; do not invent readings, retry
writes automatically or silently overwrite user data.

For imports or copying settings, establish the source, destination, identity
mapping and supported fields. Prefer a reviewable draft with explicit Save.
Do not assume that similar profile titles identify the same record.

Add or update regression coverage for meaningful behavior changes, especially
persistence, failed writes, command gating, asynchronous state and navigation.
Update affected usage/integration documentation and the release-specific tablet
recheck. Update AGENTS.md only for durable project decisions.

## 4. Validate locally

For application or configuration changes, run:

```sh
npm run check
```

This covers TypeScript, lint, gateway unit tests and the production build.
For main UI changes, ensure the production build is current, then run:

```sh
npm run build
npm run test:e2e
```

Browser checks must use the isolated fixture build. Focused suites may be used
when appropriate to the change; report exactly which coverage ran and do not
call it a full-suite pass. Cover each changed behavior and relevant regressions.
For layout changes, check 1340 × 800 and compact landscape sizes down to
800 × 480, long labels, overflow, at least 44px touch targets, dialog focus,
keyboard entry, reduced motion and the affected machine states. Inspect relevant
screenshots as well as assertions.

Investigate failures before rerunning. Correct a mistaken test expectation when
the intended behavior and contract support it. If local loading exceeds test
harness timeouts, record the evidence and any harness-only timeout adjustment;
never relax production freshness or command gates to make tests pass. Retain
failed-run context and report the successful rerun accurately.

Keep concurrent fixture runs on distinct API/preview ports and output directories.
Do not run builds that share an output directory concurrently. Recheck affected
paths after the final code change. Record results, limitations and evidence in
[VERIFICATION.md](VERIFICATION.md); generated logs and captures stay ignored.
Documentation-only changes need diff and link checks, not an application rebuild
or a new tablet release unless specifically requested.

## 5. Package, commit, push and publish

1. Check the latest published version and choose the next unused version,
   normally a patch increment for a feedback fix. Keep `package.json`, the root
   package entries in `package-lock.json`, and `public/manifest.json` aligned.
   Do not change dependency versions as part of a version bump.
2. Run `npm run package:skin`, then `npm run verify:skin`. Packaging must have
   no development API override. Verify root metadata, relative assets, bundled
   fonts/artwork and exclusion of fixture/source/environment files. Keep the
   generated ZIP and report out of Git.
3. Prepare release notes covering the resolved feedback, usage changes, actual
   checks, remaining limitations and the tablet recheck. Confirm every feedback
   item has an outcome. If an item cannot be resolved, obtain agreement on any
   changed release scope before publishing.
4. Review the staged diff for scope, secrets and generated output. Confirm the
   intended remote and branch, and check for upstream changes. Commit only this
   cycle's changes with a descriptive message, preserving unrelated work. Never
   force-push or replace someone else's work.
5. Re-run archive verification after the commit so the report identifies the
   committed source. Push and confirm the intended commit reached the remote.
6. Publish a new release in `l1oooooo/Decent-Skin-Final`, tagging that exact
   commit. Attach the verified ZIP as **`decent-focus.zip`**, the stable asset
   name used by Decaid updates. A source push or GitHub source archive alone is
   not an installable skin release. Publish through the normal latest-release
   update channel unless the user requested a different channel; keep pending
   hardware acceptance explicit in the notes.
7. Read back release metadata and confirm the tag, commit, publication state,
   asset name and size. Download the published ZIP, compare its bytes/SHA-256
   with the locally verified asset, and run the archive verifier against the
   download. Do not claim publication or verification until these succeed.

## 6. Hand back for tablet testing

The final response should include:

- Release link, version and pushed commit.
- A concise outcome for every feedback item, plus any unresolved limitation.
- Instructions for new controls or data-copy flows and how to get the ZIP.
- Actual checks passed, with focused versus full-suite coverage made clear.
- The specific tablet checks still needed.

The user updates through Decaid, confirms the installed version and tests on the
actual tablet/hardware using [TABLET-ACCEPTANCE.md](TABLET-ACCEPTANCE.md). Preserve
the previous working release for recovery. Record device results only when the
user supplies them or an explicitly scoped session produces evidence. Local
checks and a published release never imply hardware acceptance.

The user's next comments start the same cycle. Keep release-specific findings in
the verification record; revise this procedure when the user approves a process
change.

## Optional feedback format

```text
Installed version:

1. Screen or feature:
   What I did:
   What happened:
   What I expected or want changed:

Other observations or questions:
Screenshots / viewport details, if relevant:
```
