# Release verification checklist

Run `pnpm check` before publishing. The command must complete the unit tests, Chromium browser flows and production build.

## Automated gate

- All unit, migration, internationalisation and persistence tests pass.
- All Playwright tests pass without retries locally.
- No serious or critical axe violations are reported on the company, holding-company, template, settings or tax-deadline surfaces.
- A production build is created only after both test suites pass.

## Desktop smoke test

Complete this short check in current desktop Chrome and Edge before a release that changes persistence or layout:

- At 1280, 1440 and 1920 px, check 80%, 100% and 125% browser zoom. The app rail, company navigation, workspace and outstanding centre must remain reachable without page-level horizontal clipping.
- Create and link a new `.apw.json` file. Make several rapid edits, choose Save now, reopen the file and confirm that only the latest data is present.
- Close and reopen the browser, reconnect the linked file when prompted, and confirm the browser safety copy remains available if permission is denied.
- Modify both the browser copy and linked file, then confirm the conflict dialog preserves the replaced version as a recovery download.
- Verify the native leave warning appears only while linked-file data is unsynchronised and the preference is enabled.
- Export a V9 backup, initialise the browser workspace and restore that backup. Confirm company hierarchy, workstreams, outstanding items and tax-deadline revision history.

Do not publish if any item fails. Attach the Playwright report, screenshots and traces to the issue when an automated check fails.
