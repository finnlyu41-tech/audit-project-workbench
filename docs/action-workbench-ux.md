# Action-first UX pass

## Implemented scope

The home view now offers due-today, overdue, next-seven-days, outstanding and setup filters with counts, an owner selector, and incremental show-more controls. Outstanding counts link to the corresponding action list. Project-list shortcuts clear stale navigation filters and open the project workspace. The unused outstanding panel is hidden on the home view only.

Project cards foreground the company, retain the reporting year, owner and deadline at narrow widths, and show the next unfinished workflow stage when available. Recent company and engagement shortcuts appear on the home view and in a collapsible navigation section.

Company forms keep their core identity fields visible and move relationships and notes into an optional disclosure. Editing an existing company and batch creation expose the relevant advanced controls. Annual-engagement template choices and reporting-framework settings use disclosures without discarding their values or changing the selected defaults. Project notes remain outside the full annual-engagement form.

An inline quick-update panel edits the engagement owner, schedule and existing project notes with explicit Save and Cancel. It is available for company and holding-company engagements. It does not introduce a manually overrideable progress status or bypass completion conditions. Existing detailed editors and workflows remain available.

## Data boundaries

- The canonical workspace schema is unchanged. Reporting-period normalization now preserves existing internal IDs instead of regenerating them during unrelated edits or reloads.
- Quick updates patch only edited fields, reject conflicting field changes, validate calendar dates and ranges, and reject archived or missing records.
- Unsaved quick drafts are held in memory for the current session. Navigation does not silently discard a draft; Cancel removes it. A page-leave warning protects outstanding drafts.
- Recent history stores at most eight kind/ID pairs in a separate optional browser preference, not names or client details. Deleted and archived records are not rendered. Clearing history does not delete workspace records.
- Existing reporting periods, completion conditions, tax deadlines and printing behavior remain authoritative. Tests use fictional records only.

## Verification

`tests/ux-model.test.js` covers filtering, recent-history validation, read-only records, next-stage selection, conflict detection and partial updates. `e2e/action-workbench.spec.js` covers in-place save/cancel, navigation drafts, date validation, disclosures, list expansion, recent shortcuts, accessibility and 1024/1440/1920px layouts. Existing control-alignment coverage also checks dialogs at 480px and short viewport heights.

Local validation uses an isolated checkout, synthetic browser contexts and separate test-server ports. Run `pnpm check` for the normal repository gate. The new UI and existing control-alignment/accessibility cases are also checked with Playwright WebKit; this is an engine-level check, not certification of every Safari or iOS version.
