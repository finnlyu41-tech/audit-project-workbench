# Release verification checklist

Run `pnpm check` before publishing. The command must complete the unit tests, full Chromium flows, the WebKit stability gate and a production build. Automatic retries are disabled; investigate failures instead of treating a retry as a clean gate.

## Automated gate

- All unit, migration, internationalisation and persistence tests pass.
- All Playwright tests pass without retries locally.
- No serious or critical axe violations are reported on the company, holding-company, template, report, settings or tax-deadline surfaces.
- A production build is created only after both test suites pass.

## Desktop smoke test

Complete this short check in current desktop Chrome and Edge before a release that changes persistence or layout:

- At 1280, 1440 and 1920 px, check 80%, 100% and 125% browser zoom. The app rail, company navigation, workspace and outstanding centre must remain reachable without page-level horizontal clipping.
- Create and link a new `.apw.json` file. Make several rapid edits, choose Save now, reopen the file and confirm that only the latest data is present.
- Close and reopen the browser, reconnect the linked file when prompted, and confirm the browser safety copy remains available if permission is denied.
- Modify both the browser copy and linked file, then confirm the conflict dialog preserves the replaced version as a recovery download.
- Verify the native leave warning appears only while linked-file data is unsynchronised and the preference is enabled.
- Export a V10 backup and load it into V11. Confirm the one-time recovery download, one entity plus one engagement per legacy record, hierarchy, workstreams, outstanding items, tax-deadline revision history and template metadata.
- Create a sole proprietorship or other custom entity type, confirm holding-company controls remain independent, and verify relationship-role fields appear only after selecting a parent.
- Create first periods from DOI under both calendar and April-to-March defaults. Confirm the overview shows the exact year-end for a full year and `For the period from … (DOI) to …` for the first period.
- At a short viewport height, verify annual-engagement forms scroll to every field and action. Check back/forward view history, direct next-year creation, wrapped card text and overflow hover/focus labels.
- Create one company with calendar-year FY2023, FY2024 and FY2025 engagements; confirm each period and progress remain independent, a duplicate period is rejected even after archiving, and a prior-year copy clears operational state.
- Create an April-to-March company and confirm FY2025/26 generates `2025-04-01` through `2026-03-31`; edit either date and confirm only that engagement becomes custom.
- Change a holding hierarchy after creating an annual consolidation engagement. Confirm the historical component scope remains frozen until explicit sync and unmatched reporting periods remain visible.
- Export and re-import a `.apw-template.json` package. Check the preview, category mapping, copy/replace choice and confirm no company, owner, outstanding-item or tax data is present.
- Open portfolio and current-record reports, exercise every filter and a sortable column, then inspect print preview and save one report as PDF with scope, generation time and page numbering visible.

Do not publish if any item fails. Attach the Playwright report, screenshots and traces to the issue when an automated check fails.

## Stability and recovery

Run `pnpm test:stability` for the focused dual-engine gate and follow `docs/stability-recovery.md`. Verify full-payload backup restoration in a clean context, explicit failure/retry behaviour, blocked startup preservation and no draft carry-over across a confirmed replacement. Preserve failing results; never remove a failing case or relax its assertion merely to publish.

## Window ownership

- Open two updated tabs in the same browser context: only one may mount the workspace; the other must not read or write the business payload or trigger local-file restoration. Save in the owner, close it, then retry and confirm all latest data are retained.
- Verify that owner refresh and backgrounding do not create a second editor, and Back cannot resume stale state while another owner is active.
- Missing API: no implicit startup, explicit single-window acknowledgement, persistent warning. Rejected API: no compatibility bypass.
- Save and close old-version tabs before production use; this lock does not coordinate other profiles, devices or external file writers.

## Licensing

- Keep root LICENSE and the shipped public/legal/APW-LICENSE.txt identical. Preserve legacy MIT and third-party notices.
- After dependency changes, refresh public/legal/ notices from the frozen installation and review their licenses.
- New external contributions require documented rights suitable for the intended distribution; a PR alone is not copyright assignment.
- Do not describe proprietary additions as MIT/open source. Check hosting terms separately before a paid-service launch.

## Lightweight outstanding list

- Compare default row density with fixed fictional text and viewport; do not reduce type size.
- Check folded filters remain apparent, More opens the existing tools, and long notes are available through accessible disclosures.
- Verify source grouping, shared IDs, native status focus, archive read-only, save/reveal and cancelled editing with unchanged business records.
