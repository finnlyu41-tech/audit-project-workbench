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

## Action navigation and editor follow-through

The follow-through pass resolves cross-workspace destinations against the canonical company/engagement records before opening them. Home, recent history, deadline and report links clear stale navigation filters; archived destinations select the archive rather than silently falling back to another record. Normal clicks within the filtered navigation tree retain the selected filters.

Next-step requests explicitly select the unfinished stage and move keyboard focus to its details. Requests are consumed after focus, so manually collapsing a stage or switching workstreams does not repeatedly reopen it. Empty workstreams are revealed without inventing stages or marking progress complete.

Home outstanding-item links expand the outstanding centre even in compact layouts, reveal the specific item and scroll it into view. A subtle border identifies the destination. Outstanding filters reset for the destination; project-note drafts remain in memory and are not saved by navigation.

The status editor now gives the actual native color selector its own column and aligns its 42px field with the name input. At narrow dialog widths, the checkbox and icon actions move to a separate row. Layout tests measure both horizontal containment and non-overlap, because containment alone did not catch the old color/name collision.

`tests/action-navigation.test.js` covers identity resolution and archived/missing sources. `e2e/action-navigation.spec.js` and `e2e/editor-layout.spec.js` cover target focus, draft preservation, stale filters, empty workflows, native color editing, status ordering, accessibility and 480/800/1440px configuration dialogs. Existing broader regression tests remain in place. This pass does not change the workspace schema, audit completion rules, reporting periods or tax-deadline data.

## Guide and icon affordances

The built-in guide now starts with a focused search field. Search checks localized display text and the source guide wording so English, simplified Chinese and traditional Chinese users can find workflows even when terminology differs slightly. Matching feature sections stay in the directory and only matching topics are shown; no-match searches render a dedicated empty state.

The guide search is part of the modal focus order and the scrollable guide article remains keyboard focusable. The narrow layout keeps the search above the horizontal feature directory without introducing horizontal page overflow. Date-range calendar controls now use the same accessible names and hover/focus tooltip attributes as other icon-only actions.
