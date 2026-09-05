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

## Quick open and navigation continuity

Use the search icon in the left action rail or Cmd+K / Ctrl+K to open the local record switcher. Combine company, reporting year, engagement type and owner terms. Identity fields are indexed in memory; notes, audit content and tax references are not searched or uploaded. The latest eight recently opened identifiers influence ordering. Archived records require an explicit checkbox. The first thirty results are rendered with a total and refinement hint. Arrow keys select, Enter opens and Escape cancels. IME composition does not trigger navigation, and a currently open editor dialog is never replaced by the shortcut.

Application back/forward keeps a maximum of fifty UI snapshots in this session: record identity, navigation search and filters, company/project navigation mode, selected workstream and main-workspace scroll. This is not persisted as business data and does not undo edits. Current record identity and archived state are rechecked when returning; deleted sources are skipped. Page-specific report filters, expanded individual workflow nodes and browser-history URLs are outside this snapshot scope. Unsaved inline drafts continue to use the existing in-memory draft map.

Archived company overviews disable structural edits and remove editor/merge shortcuts. A historical period summary opens the corresponding read-only engagement rather than its editor. No workspace schema, audit judgement, period dates, tax deadline or printing rules are changed. Tests use fictional data in isolated browser contexts.

## Configuration draft safety

Six explicitly opted-in editor families compare their current React draft with the initial serialized value: company (including batch), annual engagement (including focused owner/framework/schedule editors), workstream template, holding-company template, outstanding-status configuration and template categories. Cancel, Close, Escape and a true backdrop click share one discard guard. Leaving annual editing to create another year, template reset and template redaction transitions are also guarded. Reordering or removing structure is a change even without typing. Reverting exactly to the initial values removes the dirty indicator and leave warning. Successful saves do not ask for discard confirmation; rejected validation leaves protection active.

This is not a blanket guard on every form. Search panels, directly applied settings, tax-deadline management and the smaller node/condition/item editors retain their existing behavior. No incomplete draft is silently written to workspace data or uploaded. The modal registry stores only dirty flags; snapshots remain in component memory. The existing inline quick-update draft behavior remains separate.

When an opted-in editor is dirty, a beforeunload listener requests the browser-native page-leave warning; it is removed when clean or unmounted. The browser owns the warning text and may suppress it, especially on mobile or forced shutdown. This is a warning, not durable autosave or guaranteed crash recovery. See MDN's Window beforeunload event documentation.

Sticky action footers use opaque backgrounds and stay inside the dialog viewport. Initial focus ignores hidden/disabled controls, the tab loop includes disclosure summaries, invalid collapsed ancestors expand before validation focus, and composition Escape is ignored in both the outer dialog and date-range picker. The calendar consumes its own Escape before the editor is considered for closing.

## Daily editors and group-template alignment

The seventh pass extends the explicit modal draft registry to stage, completion-criterion, outstanding-item and workstream forms. Cancel, Escape and modal dismissal use the same confirmation as the larger editors. Reverting values removes the warning; successful submission follows the existing save handlers. This is not recovery storage and does not expand protection to the tax-deadline manager or other unregistered editors.

Required single-line names and content keep the existing trimmed non-empty constraint, now backed by a browser pattern and a visible error linked with aria-describedby. Errors are marked only after validation, clear after correction and do not rewrite the entered text. The browser's own invalid-field navigation remains available.

Group-template stage sorting, deletion, condition deletion and readiness deletion now have consistent icons, sizes, tooltips and accessible names. Field names identify the stage or readiness category. Edits stay in the template draft until Save; existing engagements are not rewritten. UI tests cover 480/800/1440px, cancellation, correction, template order and data isolation. Existing legacy-view saves may update company timestamps, as before; business fields and audit completion rules are unchanged.

## Tax deadline editing

Tax deadline creation and editing use the existing explicit draft registry. Cancel buttons, outer-window close/Escape and deletion transitions share the discard decision. The registry normalizes only the numeric lead-time representation for comparison; it does not write drafts to storage. Revision reasons are ignored for dirty-state comparison when the date is reverted. List filters and instant Mark completed actions remain immediate, not drafts.

The editor retains the original record snapshot for revision validation. Save and deletion preparation reject missing, archived or stale sources; a deleted deadline is not recreated as a new one. Custom names and date-change reasons use the existing non-whitespace validator. The underlying date/history normalization functions and the audit completion model are unchanged.

The form scrolls in the outer modal body, its footer stays visible, and fields reflow by actual dialog width. Cancel returns focus to the source edit button; save clears list filters and focuses the saved record. Subsidiary edits from the holding-company list target only the owning company. The current holding-component panel uses immediate updates, so legacy, unreachable member forms were not modified in this pass.

Coverage: `tests/tax-editor-state.test.js` and `e2e/tax-editor-safety.spec.js`. Tests use fictional records only. As before, browser warnings do not guarantee draft recovery after refresh, forced shutdown or application replacement. No schema, legal-date calculation, report period, print layout or audit-signoff rules are added.

## Annual component workspace

The current holding-company component panel now reflows according to the actual workspace width. Company names wrap, annual project fields are 42px high, progress labels are centered against their graphics, and readiness checks retain readable text. The group summary also allows its labels to wrap instead of clipping them.

Component search is local and view-only. It matches company name, role and the assigned project's owner; it does not search audit notes or upload text. Assignment filters identify unassigned and mismatched records using the existing complete-reporting-period comparison. A matching period is not evidence that audit work or consolidation readiness is complete. No match/readiness rules were changed.

Changing the assigned project still updates that component immediately. Panel search and filters are cleared after assignment so the edited row stays visible; readiness checks remain explicit and immediate. Other component snapshots, audit conditions and tax records are unchanged. Missing-company rows keep their historical names and cannot accidentally open another source. Archived project candidates are labelled, and source navigation selects their read-only archive view instead of an active fallback.

Historical scope does not change on opening, searching or filtering the panel. Structure synchronization retains its existing explicit confirmation. The new component filters are temporary view state, not saved business data or additional navigation-history fields.

`tests/holding-components.test.js` checks pure diagnostics, complete-period matching, archived/missing targets and view-only search. `e2e/holding-components.spec.js` exercises layout, source navigation, search and filters, explicit assignment/readiness updates, historical scope and accessibility using the fictional fixture in `tests/fixtures/holding-workspace.js`.

## Company master annual overview

The company master now derives holding-company annual progress from `groupProgress`, the same function used by the workspace, instead of rendering a hard-coded zero. Company annual records retain `projectStats`. Neither calculation nor its treatment of archived records is changed.

A local search combines report-year, displayed/English project-type and owner tokens, including normalized full-width input. All periods of a multi-period engagement are searchable. Notes and other sensitive free-text fields are not indexed. The default remains all annual records; explicit unarchived and archived filters only affect this list. Company totals and the separate outstanding summary remain unfiltered. View filters reset when changing companies and are not saved into business records or navigation history.

Annual cards preserve full period labels, owner and both available schedule dates. Missing starts and deadlines are separately labelled instead of hiding the supplied half of a schedule. Card layout responds to the actual panel width. Archived badges remain visible and edit actions stay unavailable for archived companies or engagements.

Outstanding-item shortcuts on the company master reuse the existing exact-item reveal flow. They open the proper record, clear stale navigation filters, expand the outstanding centre and focus the corresponding card; archived sources remain read-only. This does not modify completion status or any saved project fields.

Verification is in `tests/company-overview.test.js` and `e2e/company-overview.spec.js`, with fictional data in `tests/fixtures/company-overview.js`. No schema, persistence, tax-deadline rules or report-printing configuration is changed.

## Outstanding centre search, layout and follow-through

The sidebar now wraps long identifying text and notes, gives common inputs/selects a 42px height, and aligns edit/delete icons with their labels. The full selected status label is also displayed outside the native dropdown. A short viewport keeps both the filter controls and the item list reachable.

Search combines item title, source company/name, workstream label and source-project owner. Notes are intentionally not indexed. Search, status and module filters are conjunctive; visibility-tab totals still refer to the complete current source, while the result count describes the filtered list. Reset returns to the default open-item view. These are temporary view states, not new persisted business fields.

Successful form saves clear panel filters and reveal the saved item, including a subsidiary item edited inside a holding-company view. The reveal key includes source kind, source ID and item ID to distinguish identical item IDs across separate records. Cancel continues to use the existing draft guard and retains filters. Inline status changes still apply immediately; cleared items still leave the open list, with keyboard focus moving to another matching item or search. Deletion keeps its confirmation and restores a usable focus target.

Source buttons use the existing canonical navigation and exact-item reveal path. Archived sources remain read-only. This pass does not alter the storage schema, status open/closed definitions, workflow completion rules, tax deadlines or print reports. Tests use fictional fixtures and isolated browser contexts, never the user's everyday browser profile.

## Deadline alert readability and search

The bell dialog now wraps complete alert titles, company/owner context and due dates. Screen styles remove the inner list scrollbar so the existing modal body owns scrolling. Narrow dialogs move the date and urgency below the title while retaining the scope and action icons. Search and urgency controls are 42px high.

Search checks company/source names, owners, visible deadline titles, dates and tax years. Built-in tax categories are searchable in English, Simplified Chinese and Traditional Chinese. Custom names are not rewritten. Notes, reference numbers and revision reasons are excluded. Search, urgency and the existing tax/project tabs combine without mutating, reordering or expanding the supplied alerts. Tab counts reflect the search/urgency subset, while the summary and result denominator retain the complete existing-alert count. Clearing filters restores all existing alerts and returns focus to search.

The existing model remains authoritative: project alerts are overdue only; tax alerts can be overdue, due today or due soon according to each saved reminder window. Selecting a filter never creates a new reminder, completes an item or changes dates, timezone handling or notification behavior. Tax-alert accessible action names now include the company so same-name deadlines from different companies remain distinguishable. Opening an alert uses the existing source-navigation handlers.

`tests/deadline-alert-view.test.js` checks filtering boundaries, source identity, localization, excluded fields and record/order preservation. `e2e/deadline-alert-centre.spec.js` checks source navigation, keyboard return, empty results, combined filters, 480/800/1440px layouts, one scroll region and accessibility. Tests use fixed browser dates and fictional canonical records in isolated browser contexts.

## Schedule usability

Schedule search combines company, reporting years, project type and owner; the date selector narrows the current status scope to missing or entered start/due dates. Filters preserve the supplied row order and never index notes. Timeline bounds and company-level tax associations are computed before view filtering, so searching for an older year cannot move an unlinked deadline onto it or rescale the date axis unexpectedly.

Ordinary mouse-wheel motion now remains vertical. Horizontal wheel/trackpad motion and the horizontal scrollbar remain native. The former vertical-to-horizontal interception was removed; the existing horizontal-navigation regression now explicitly sends horizontal input. Today still centres the marker, respecting reduced-motion preferences.

The detailed metadata column also displays entered schedule dates, including partial ranges. Precision and edit buttons have 36px targets, search/select fields are 42px high, and narrow workspaces retain at least part of the timeline beside the company column. The saved column-width preference is unchanged; its effective width is capped only while the workspace is narrow. Simplified mode still omits owner/date detail. Calendar tick text is contained within its own cell rather than overlapping adjacent labels.

Date bars, missing-date actions and tax markers include the reporting period in their accessible names, distinguishing multiple engagements for one company. Existing guarded editors, source routing, archived read-only access, explicit drag/keyboard reordering, date calculations and tax-marker aggregation remain in use. Filling missing dates can naturally remove a row from the Missing dates view; Clear filters restores the list.

All verification uses fictional records in isolated browser contexts. No schema, persistence, reporting-period, tax-rule or audit-completion changes are included. Unit coverage is in `tests/schedule-view.test.js` and browser coverage is in `e2e/schedule-usability.spec.js`.

## Management report usability and complete risk lists

The portfolio report keeps its existing calculation, date filters, sorting and grouped company rows. Screen-only layout rules align filter controls at 42px, wrap long labels and metadata, and enlarge sorting/print actions. Report tables retain native table semantics inside named focusable scroll regions; arrow-key scrolling applies only when the region itself has focus, not when a child control is active.

The three portfolio risk categories now retain all computed entries in the rendered report. The screen initially shows twenty per category and explicitly displays the visible/total count. Show all and collapse affect the screen only. A change to the report filters resets disclosure so old list state does not obscure the new scope. No report filter or disclosure writes to the workspace.

Tax risk actions call the existing deadline-opening handler with the source and deadline ID. Outstanding risk actions use the existing exact-item navigation handler. These remain view/navigation operations and preserve the existing read-only and source resolution behavior. Composite source/item keys prevent separate companies with identical item IDs from sharing rendered rows.

Printing deliberately includes every risk in the computed report scope, independent of screen disclosure. The former first-twenty truncation is removed. Long risk lists may span more pages. Risk rows avoid internal page breaks, list sections may span pages, and the portfolio detail table is constrained to the page width so its last columns remain printable. Existing report scope and page-numbering styles remain in place. No new customer fields, notes or reference numbers are added to reports.

Verification uses fictional records with more than twenty risks, duplicate item IDs across sources and long names. It covers report filtering, expand/collapse, exact source navigation, archive opening, native table sorting, keyboard scroll, 800/1024/1440/1920px layouts, accessibility, and print-media completeness. A synthetic Chromium PDF is also rendered and checked for all risk entries, readable columns and absence of private notes/references. No user browser profile or real client dataset is used.

## Template-library search and layout

Business and holding-company library cards now wrap names, descriptions, tags and version notes. Library controls use the shared 42px field height and at least 36px icon actions; narrow dialogs show one card per row. The selected template retains its existing preference behavior and exposes an `aria-pressed` state.

Metadata search is limited to the current category and combines name, description, tag and version terms using normalized full-width/case-insensitive matching. Exact tag filtering and the prior sort comparators are unchanged. Workflow nodes, completion criteria and readiness text are not indexed. Search is view-only and does not change saved template preferences, engagements, companies or exported package contents.

Filtered-empty lists explain that templates still exist and offer a clear-filter action. Truly empty categories retain their creation action. Clear-filter resets only query and tag, not category or sorting. Saving or copying switches to the result category, clears obstructing filters and focuses the actual template card without an extra selection write. Cancelling an editor preserves query/tag state and the existing unsaved-change guard. Search state is session-local and is not added to navigation history or exported business data.

Import/export formats, replacement decisions, deletion confirmation and existing template-selection/use handlers are retained. This pass does not redesign creation from templates or change how editing a template remains independent of existing engagements. All tests use fictional metadata and isolated browser contexts.

## Template-package selection and import decisions

Package transfer is separate from the library's current-category filter. Export search covers template name, description, tags, version and localized category metadata, not workflow instructions or source metadata. Filtering never changes selected keys. Global select/clear and matching-result select/deselect are explicitly named; the footer counts all selected templates and warns when selections are hidden by the current query. The original package creator determines the downloaded contents. An export does not write workspace data.

Import defaults remain copies. Copy, replacement and skip counts are visible; changing an active action, target or category registers an unsaved draft with the existing modal guard. Closing, cancelling or Escape can be refused without losing decisions. Inactive replacement targets and skipped category choices do not cause false dirty warnings. Applying the import still uses the existing validator and transaction path, while unchanged decisions can be cancelled immediately. Import choices are memory-only, not an automatically recoverable backup.

Both panels use the modal body's scroll area and a sticky action footer. Long names and metadata wrap; replacement names are repeated in full below the native select because the native field may shorten long labels. Leading export checkboxes stay aligned with the start of the template name, even when a description is long. Native select text is clipped to its control in WebKit, while the selected replacement name remains fully readable below the controls.

Regression coverage in `template-transfer-view.test.js` and `template-transfer-safety.spec.js` checks independent filter/selection state, actual downloaded contents, composite keys, reversible import choices, refused and confirmed discard, required replacement selection, successful copy/replace/skip, narrow layouts and accessibility. Package format, validation, de-identification, saved templates and existing engagement workflows retain their previous rules.
