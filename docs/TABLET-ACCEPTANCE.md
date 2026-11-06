# Phase 9 — tablet acceptance

Status: **local checks complete; tablet acceptance pending**. This is an
execution and evidence checklist, not a record of completed device testing.
Use [VERIFICATION.md](VERIFICATION.md) for actual local results and
[DECAID.md](DECAID.md) for the installed API contract.

## Local candidate

```sh
npm ci
npm run check
FOCUS_FIXTURE_PORT=18090 FOCUS_TEST_PORT=4180 npm run test:e2e
npm run package:skin
npm run verify:skin
```

Packaging requires `zip` and `unzip` on the development computer. It rejects a
nonempty `VITE_DECAID_URL` from the shell or production Vite environment files
before building. Do not remove someone else's development configuration;
prepare the release in a clean checkout when necessary. The installed skin
uses its serving hostname on API port 8080. It needs no Node process on Android.

The archive is `artifacts/decent-skin-codex-0.2.2.zip`. Its inspection report is
`artifacts/skin-release.json`: SHA-256, byte count, file inventory, manifest,
source commit and tracked changes. Re-run verification after committing to
associate the report with the committed source. Rebuilding may change ZIP
timestamps and therefore its checksum; identify the exact file transferred.
The report is generated locally and never marks a device accepted.

### Recheck after the 0.2.3 update

1. Install Decent Focus **0.2.3** and reload. Confirm the footer has only utility
   settings, the scale status has no icon, and the steam target appears beside
   the brew reading. Measure the actual WebView viewport again.
2. Tap dose/yield/temperature values. Verify decimal keyboard entry, validation,
   Cancel, Save, focus return and keyboard dismissal. Test with the keyboard
   open at the tablet's landscape size; dialog fields and actions must remain
   reachable. Test a failed save and confirm the draft stays available.
3. Tap the header steam target. Change and verify the setting, including display
   in Fahrenheit if used. This target is separate from the live brew reading.
   Verify physical operation separately; changing settings never starts steam.
4. Tap **Edit profile** beside the Home title. Confirm it opens the selected
   record. Review a disposable user profile or save a modified default as new.
5. In **Browse profiles → Details → Recipe preferences**, tap **Copy from
   Streamline**. Compare the draft with that exact profile's saved Streamline
   Home values. Review, Save, load the profile, switch away and back, and verify
   persistence. Steam/calibration values must remain unchanged. No data was
   copied to the real tablet during development.
6. Recheck Ready, Heating, Brewing and Completed, all Home panels, physical
   starts/stops, scale connection, reconnect/resume and shot history. Record
   actual results; the prior local checks do not accept this tablet build.

### Recheck after the 0.2.2 update

1. Open **Settings → Updates and data → Skins**, choose **Check and install
   skin updates**, and confirm. This checks all installed skins. Confirm Decent
   Focus **0.2.2**, then **Reload current skin**.
2. Inside Decaid on the tablet, in landscape with the keyboard closed, open
   **Settings → System and help → Screen and viewport**. Record the layout
   viewport, visible viewport, device pixel ratio and zoom. A measurement made
   in Chrome on the Mac is not the tablet's WebView measurement.
3. Return Home. Verify all five favorites, artwork, Browse profiles, recipe
   summary, chart, grind/dose/yield/temperature controls and footer fit without
   scrolling any Home panel. Long titles may wrap or truncate; full names and
   notes remain available in profile details. Test a utility popover separately.
4. Verify the footer and utility cards show group-head instructions instead of
   daily Start/Stop buttons. Prepare the machine and operate Espresso, Steam,
   Hot water and Flush from the physical group-head controller. Confirm real
   starts update the screen, physical stops/completion update it correctly,
   and returning from Settings preserves the physical-control guidance. Escape
   must only dismiss an overlay, never start or stop the machine.
5. Choose profiles with known different temperatures and weight targets; compare
   Home against their stored profile details. A profile without a saved Focus
   dose must show **Not set**; a missing/zero weight target must show **Off**.
   The brew ratio is unavailable until both values are present. Profiles with
   identical source values should still show identical values.
6. Set a dose for the current preparation if needed. Use Recipe preferences to
   save a dose/yield/temperature for one profile, then select another profile
   and return. Confirm the saved values apply only to the intended profile,
   coffee/equipment context is preserved, and profile selection never starts
   an operation. Observe physical stopping behavior for both target-weight and
   no-weight-target profiles; a target marked Off does not enable stop-at-weight.
7. Recheck scale connection, warning dismissal, suspend/resume and shot history.
   Record actual device outcomes; local fixture tests do not establish physical
   operation or compatibility at an unmeasured viewport.

### Historical 0.2.1 recheck (superseded by 0.2.2 controls)

The operator reported that 0.2.0 overflowed the landscape Decaid WebView,
kept a scale warning open, and showed favorites/Focus-preference errors.
Mac read-only checks confirmed the installed release and live API behavior;
they did not measure the tablet WebView or verify physical scale reconnection.

Update **Decent Focus** through native Decaid skin management, using repository
`l1oooooo/Decent-Skin-Final` and asset `decent-focus.zip`. Confirm version 0.2.1,
then reopen the skin. Retain the previous skin for recovery.

1. In landscape inside Decaid, verify Steam, Hot water, Flush and Brew / Stop
   stay visible without scrolling the whole page. On a shorter viewport, scroll
   the profile, chart and settings panels independently; check all five favorites,
   Browse profiles and the temperature adjustment remain reachable without overlap.
2. Open Manage favorites and Display and presence. Confirm the first-install
   errors are gone. Existing empty positions and saved assignments must remain.
   Save one deliberate favorite/preference change, reload, and verify persistence.
3. With the scale disconnected, dismiss its warning. It should stay dismissed
   through repeated telemetry; a new disconnect incident may show a new warning.
   Recipe adjustments and utility settings should remain available while idle.
4. Tap **Connect scale**, choose the Bookoo Mini Scale in Connections, and tap
   its **Connect** button. Require a confirmed connection and changing live weight;
   a failure must remain an error, not a success indication. Scanning is explicit.
5. To test without a scale, turn off **Require a scale before brewing** under
   **Settings → Brew and utilities**, then save **Decaid preferences**. This is
   an operator choice, never an automatic skin change. Confirm Brew is available
   when the machine is otherwise ready. Weight-based stopping needs a scale;
   supervise the extraction and use manual stop or the machine's other limits.
6. In a supervised session, verify both manual Stop without a scale and
   stop-at-weight with the connected scale. Recheck suspend/resume and that
   reconnecting never replays a start. Record actual viewport/WebView details
   and outcomes below; local fixture tests are not hardware acceptance.

The verifier compares every archived byte with `dist`, checks ZIP integrity,
root metadata, bundled Geist/artwork, relative entry/CSS assets, and rejects
unexpected files, fixture/development markers and hard-coded local API origins.
This is a targeted release check, not a general secret scanner or proof of
WebView compatibility. Review staged files and release contents as well.

Browser tests use loopback fixtures only. Each preview port gets a separate
build directory. If running suites concurrently, also use distinct fixture
ports and `--output` directories. The production-asset smoke check serves the
unchanged release build below `/skins/focus/` and blocks all API/WebSocket
traffic before navigation. No automated test should contact a real machine.

## Record before testing

Copy this record into a private local acceptance log. Leave untested fields
marked **not run**; attach evidence to each pass or failure. Do not commit
account credentials, serial numbers, private logs or network addresses.

| Field | Recorded value |
| --- | --- |
| Operator and date | Not run |
| Source commit / clean tracked checkout | Not run |
| ZIP filename / bytes / SHA-256 | Not run |
| Tablet model / Android version | Samsung Galaxy Tab A11 target; actual device not recorded |
| Android System WebView provider and version | Not run |
| Decaid version / build / commit | Expected contract: 0.9.1+3027 / 14361a94; recheck installed build |
| Machine / scale / optional grinder model and firmware | Not run |
| Skin origin / API origin / gateway mode | Not run; keep private addresses in local evidence |
| Landscape CSS viewport / DPR / visual viewport | Not run; 1340 × 800 is the requested target |
| Installed plugin versions and enabled service scope | Not run |
| Evidence directory / reviewer / decision | Not run |

## Tablet session

The user must have the tablet and paired equipment available. Arrange a
supervised session before any machine command, discovery, account action,
update or external submission. Begin with read-only installation and display
checks. Select a limited set of service procedures explicitly; installing a
candidate is not authorization to calibrate, descale or flash firmware.

| Check | Procedure and required evidence | Current result |
| --- | --- | --- |
| Installation and recovery | Retain the previous working skin/archive. Install this exact ZIP through native Decaid skin management, select it, and record success/error. Verify a return to native Decaid and restoration of the previous skin. | Not run |
| Relative assets | Load without the development laptop/server. Verify the root entry, font, all five artwork assets and CSS/JS load from the installed skin. Record missing requests and console errors. External internet is not required for bundled assets. | Not run |
| Viewport and fidelity | Measure actual CSS and visual viewports, DPR, orientation and WebView version. Capture Home/Ready, Heating, Brewing, Completed and Settings. Compare with locked evidence; do not compensate by silently changing scale, typography or layout. | Not run |
| Touch and accessibility | Check 44px minimum / 48px primary targets, long names/values, scroll containment, keyboard focus, dialog focus/return, hardware Back, TalkBack, reduced motion and the on-screen keyboard. Verify fields and Save/Cancel remain reachable. | Not run |
| Direct entry and persistence | Reload and use Back on Settings, favorites, library, profile editor, history and plugin routes. Saved favorites/settings must persist. Verify missing/all-empty favorites, unavailable IDs and explicit Save/Cancel. Unsaved drafts survive shot interruption, but not a completed reload. | Not run |
| Connection and lifecycle | Verify real idle/temperature/scale/water readings, background/foreground, screen sleep/wake, native unload/reload, machine/scale disconnect and recovery. Verify stale readings become unavailable and reconnect never replays a write or invents values. Test failures without simulation fallback. | Not run |
| Physical shot start | Start at the physical group head in an agreed supervised shot. Verify the selected real profile, real frames, chart and current-process dots. A new start returns from Settings to Focus, exposes Stop, and retains drafts. A replayed active shot must not masquerade as a new start. | Not run |
| Stop and weight policy | Verify manual Stop, Decaid-owned stop-at-weight, loss/recovery of scale and machine connection, correct completion, and an ambiguous/failed command outcome. Use the native/physical stop procedure when needed; never rely on reconnect to retry a command. | Not run |
| Utilities and daily settings | Explicitly validate agreed steam/hot-water/flush settings and start/stop, sleep/wake, charging/display/presence/schedules, scale policies and descriptor-supported grinder controls. Confirm owned-field writes and read-back; do not automatically discover devices or move a grinder. | Not run |
| Stored shots and recipes | Check the real saved shot, measurements, profile/context, annotation Save/Cancel, export and repeat recipe without starting extraction. Use disposable copies for import/archive/delete, failed saves, version restoration and ID-remap recovery. | Not run |
| Advanced service operations | Separately approve each supported calibration, maintenance, accessory, firmware/app/skin update and backup/import/sync operation. Check device identity/capability gates, prerequisites, interruption/cancellation, partial results and verified terminal state. A timer, upload percentage or acknowledgement is not completion. Keep untested operations unaccepted. | Not run |
| Plugins and support | Check only installed/approved plugins: manifest settings, secure credential preservation/clear, enable/disable, permission review and separate UI return. Native Android/account/consent flows and external feedback delivery need their own explicit scope; no test issue or diagnostic upload without approval. | Not run |

For read-only viewport evidence, use the WebView's inspector if available. Do
not enable debugging or change Android security settings without an agreed
device session. This snippet reads presentation metrics only:

```js
await document.fonts.ready
console.log({
  viewport: { width: innerWidth, height: innerHeight },
  document: {
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  },
  devicePixelRatio,
  visualViewport: window.visualViewport && {
    width: visualViewport.width,
    height: visualViewport.height,
    scale: visualViewport.scale,
    offsetTop: visualViewport.offsetTop,
  },
  orientation: screen.orientation?.type,
  userAgent: navigator.userAgent,
  fonts: [...document.fonts].map(({ family, status }) => ({ family, status })),
})
```

Record metrics before and after showing the on-screen keyboard and resuming
from background. If inspection is unavailable, record that limitation instead
of deriving CSS dimensions from the tablet's advertised resolution.

## Acceptance decision

For each row, record **pass**, **fail**, **not run** or **unsupported**, with the
exact device/build, steps, observed result and evidence location. A failure in
command gating, stop behavior, persistence, installation or lifecycle blocks
release of the affected feature. Document optional unsupported capabilities;
do not replace them with simulated success. Preserve the last working skin.

Known local constraints remain: the locked red Stop label has a documented
contrast shortfall, and the compiled JS triggers Vite's 500 kB advisory. Focus
was intentionally not restyled. Do not claim WCAG AA or acceptable tablet
performance without resolving/recording those results and obtaining a design
decision for any visual change.

Phase 9 is complete only when local evidence and the agreed device checks are
recorded and reviewed. Until then this is a **release candidate**, not a
hardware-accepted release.
