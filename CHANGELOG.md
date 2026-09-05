# Changelog

All notable changes to this project will be documented here.

The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Report usability and complete risks

- Align report controls and long labels; add named keyboard-scrollable regions to report tables.
- Expose all portfolio risks after the first 20 with counts and screen disclosure. Print includes the complete scoped risk lists and fits all detail columns.
- Open tax and outstanding risks at their exact source through existing navigation; preserve original calculations, filters and privacy exclusions.

### Schedule usability

- Add local company/year/type/owner search and date-completeness filters without changing saved schedules, order or tax associations.
- Restore native vertical and horizontal scrolling; make precision and edit controls readable, and include the reporting period in date-action names.
- Keep entered schedule dates visible in detailed row metadata, with narrow-workspace reflow and preserved simplified mode.

### Deadline alert readability and search

- Alert titles, sources and dates wrap in narrow dialogs; one modal body handles scrolling. Search and urgency fields share the 42px control height.
- Search existing alerts by company, owner, deadline type or year and combine it with tax/project and urgency filters. Clear filters restores the full existing alert list without updating any deadlines.
- Tax-alert accessible names include their source company so identical deadline titles can be distinguished.

### Outstanding centre usability

- Long item titles, source details, notes and status controls fit the sidebar; common fields are 42px high and icon/text actions stay aligned.
- Added view-only identifying-field search, a reset action and result counts without changing status semantics or indexing notes.
- Saved items are revealed even under stale filters. Inline status changes and deletion retain usable keyboard focus; source links open the exact canonical item.

### Company master annual overview

- Annual cards use the existing holding-company progress calculation instead of a fixed zero, while company progress continues to use project statistics.
- Annual lists support local year/type/owner search and explicit archive filters, with all records shown by default. Owner and partial schedule dates remain visible in narrow workspaces.
- Company outstanding-item shortcuts reveal their exact source cards, including archived read-only sources.

### Holding component workspace

- Reflow annual-component controls by panel width, retain full company/period labels and align 42px selectors, progress graphics and readiness criteria.
- Add view-only component search and assignment/mismatch filters, explicit complete-period diagnostics and archived source labels without changing readiness or workflow calculations.
- Component links now use canonical cross-workspace navigation, including archived sources; assignments remain immediate and historical scope is not automatically synced.

### Tax deadline editing

- Tax deadline drafts now require confirmation before cancellation, closing or deletion; whitespace-only custom names and revision reasons show field errors.
- Tax forms use one scroll container, aligned controls and a visible save/cancel footer. Returning to the list restores focus; saving reveals the saved deadline and clears stale filters.
- Save/delete preparation rejects archived, missing or changed sources without replacing current records. Original dates, revision rules and audit progress remain unchanged.

### Daily editors and group-template alignment

- Stage, completion-criterion, outstanding-item and workstream forms now share the existing unsaved-draft guard.
- Required text fields explain blank or whitespace-only input, focus the invalid field, and clear feedback after correction without rewriting the draft.
- Group-template editors use consistent labeled icon actions and named fields for stages, conditions and readiness criteria; narrow layouts and save isolation have regression coverage.

### Safer configuration editors

- Company, annual-engagement, workstream/group-template, status and category editors now confirm discarding unsaved changes when closing, cancelling or leaving the editor. Restoring initial values removes the warning; structural edits count too.
- The same editors keep their save/cancel footer visible while scrolling. Shared dialogs include disclosure summaries in keyboard navigation, reveal invalid collapsed fields and ignore IME Escape. Pointer gestures starting inside a dialog cannot dismiss it on release outside.
- Draft protection does not save unfinished data or guarantee recovery after a forced browser shutdown. Search and immediately applied settings do not receive draft prompts.

### Quick open and navigation continuity

- Added a Quick open action and Cmd/Ctrl+K for local company/engagement lookup by company, reporting year, type and owner. Recent records rank first, archives require explicit opt-in, and keyboard selection respects IME composition.
- App back/forward retains navigation search, filters, list mode, active workstream and main-workspace scroll in memory. Missing or newly archived destinations are resolved safely without restoring old business data.
- Archived company overviews no longer expose editing, merging or new-engagement actions; historical period summaries open the read-only record.

### Guide and icon affordances

- The built-in user guide now has an autofocus search that matches both localized and source guide text, filters the feature directory, and shows a clear empty state.
- Guide search and content remain keyboard-accessible and contained in narrow dialogs.
- Date-range calendar icon controls now expose the same hover/focus tooltips as the rest of the icon-action system.

### Action navigation and editor follow-through

- Next-step actions now reveal and focus the exact unfinished stage; empty workstreams remain empty until explicitly configured.
- Home outstanding-item actions expand the outstanding centre, clear stale item filters and focus the selected card, including in narrow workspaces.
- Cross-workspace links resolve the current source identity and clear stale navigation filters without losing unsaved quick-edit drafts. Archived sources remain in the read-only archive view.
- Status-editor colors, names, checkboxes and icon actions use explicit aligned columns instead of the old decorative-dot layout. Template and category editors gain narrow-dialog regression coverage.


### Changed

- Home now has focused action filters, an owner filter, expandable priority lists and recent-record shortcuts. Home uses the space previously occupied by the empty outstanding panel.
- Project cards keep company identity, reporting period, owner, deadline and the next unfinished stage readable across desktop widths.
- Company relationships and annual-engagement template/framework options use expandable sections while preserving existing values and defaults.
- Added inline owner, schedule and project-note updates with explicit save/cancel, session drafts, conflict checks and archived-record protection.

### Fixed

- Reporting-period IDs remain stable during unrelated updates and reloads; new records still receive separate IDs and duplicate-period validation remains enforced.
- Added regression coverage for UI alignment, partial updates, optional fields, recent history, accessibility and narrow layouts. See `docs/action-workbench-ux.md` for scope and data boundaries.

## [0.6.7] - 2026-09-04

### Changed

- Multi-year schedule rows show one year-end heading followed by separate full-date labels, replacing repeated inline prefixes and awkward paragraph wrapping.
- Simplified view now gives navigation a genuinely compact 250px presentation with denser controls, one-row status filters and concise multi-period summaries such as `3 year-end dates · 2026–2028`.

### Fixed

- Detailed and simplified schedule rows now share the same reporting-period hierarchy as company and project navigation without hiding any authoritative date.

## [0.6.6] - 2026-09-04

### Changed

- Multi-period engagements show one year-end heading followed by distinct full-date labels that stay on one line when space permits and wrap cleanly in narrower navigation panels.
- Company and project navigation use the same structured reporting-period presentation, including simplified view.

### Fixed

- Project progress stays aligned with the project title instead of interrupting a wrapped list of year-end dates.

## [0.6.5] - 2026-09-04

### Added

- A home overview that opens by default and surfaces active work, deadline attention, incomplete setup, companies without active engagements and outstanding items with direct actions.
- Saved compact/detail display controls for company navigation and project scheduling, plus navigation filtering for faster record finding.

### Changed

- Engagement types can be selected in combination or entered as custom values, and now lead project navigation and project-detail headings ahead of company context.
- Company and project navigation removes redundant icons and entity-type labels; workstream settings are consolidated beside Add and sortable cards can be dragged directly without a separate handle.
- Built-in templates can be deleted through the same protected action as user-created templates.

### Fixed

- Archiving a subsidiary no longer makes its active parent appear archived, and archiving a record no longer switches the current filter to Archive.
- Homepage, navigation and schedule layouts remain readable at supported widths and zoom levels without reintroducing industry-specific information.

## [0.6.4] - 2026-09-04

### Added

- An engagement can contain multiple reporting years when the work and billing are managed together; all included periods share one engagement type, owner, schedule, workflow, outstanding list and progress state while remaining explicit in navigation, reports and backups.
- Holding company batch creation establishes one holding-company master and multiple member-company masters, including each member's custom entity type, fiscal-year default and relationship role, in one saved operation.

### Changed

- Project navigation and project workspaces now lead with the engagement type, followed by the explicit year end or reporting period; the flat Projects view keeps the company and owner as supporting context.
- Schedule identity rows place the owner immediately after the engagement type and reveal project start and deadline dates only from the timeline bar.
- Project schedules use one two-click range calendar and the timeline can switch between saved day, week and month precision.
- Workstreams now inherit context from their annual engagement instead of exposing separate owner and deadline fields; compact cards use the progress ring without repeating stage counts.
- The outstanding centre has explicit Open, Cleared / archived and All views, so cleared items remain discoverable and can be reopened.

### Fixed

- Tax-deadline markers on the schedule use a horizontal browser tooltip instead of rotating and clipping the date label inside the timeline row.
- Management-report printing uses one continuous page context, avoiding blank first and last pages.

## [0.6.3] - 2026-09-04

### Added

- A saved Companies / Projects navigation switch, with a flat annual-project list showing company, explicit year end or DOI period, project type, owner and progress.
- One-click Expand all / Collapse all controls for the company hierarchy.
- Clear form guidance that engagement types accept both suggested values and free-text custom types.

### Changed

- Annual engagements now use explicit `YE December 31, 2025` or full `For the period from … (DOI) to …` wording in navigation, company histories, deadline links and reports.
- Workstream progress rings sit in the title row instead of occupying a separate row.
- Increased screen typography throughout navigation, project workspaces, schedules and management reports, with a wider default resizable navigation panel.

### Fixed

- Status filters keep complete labels in a two-by-two layout, and long project metadata wraps without colliding with progress or actions.

## [0.6.2] - 2026-09-04

### Added

- Customisable annual-engagement types, shown with every financial year in navigation, schedules and management reports.
- Saved drag-and-drop ordering for workstreams, workflow stages and completion criteria, with keyboard alternatives.
- “Apply to all workstreams” when changing an engagement owner.
- Persistent drag handles for resizing the company navigation and schedule identity columns.

### Changed

- Replaced linear progress bars with compact green circular progress rings throughout the workbench; schedule duration bars remain horizontal.
- Workstream stages now open only after selecting their parent workstream, and stage details toggle open or closed from the selected stage.
- Schedule and portfolio views group annual engagements under one company and separate the company name from each year-end or reporting-period label.
- Removed internal project-name and project-note fields from the annual-engagement form while preserving existing stored values for compatibility.

### Fixed

- Long workstream names, company names, period labels and report cells now wrap or reveal their full value instead of colliding with neighbouring controls.
- Selected annual engagements automatically reveal their company ancestry without forcing unrelated navigation groups open.

## [0.6.1] - 2026-09-04

### Added

- Free-text entity types for limited companies, sole proprietorships, partnerships, individuals and other legal forms, independently from the holding-company structure control.
- Optional incorporation or commencement dates and a first-period `DOI → year end` method that calculates the next applicable calendar or April-to-March year end while keeping both dates editable.
- Compact back and forward view-history controls, plus a direct “Create another year” action from annual-engagement editing.
- Formal company-overview period wording: full financial years show their exact year-end date, while first periods show `For the period from … (DOI) to …`.

### Changed

- Built-in workflow completion criteria now use one or two material milestone gates per stage instead of many granular checklist items. Custom templates remain unchanged.
- Company and engagement cards wrap important text where space allows; remaining overflow receives the full value on hover or keyboard focus.
- Financial-year options use explicit dates, and holding-company relationship fields appear only after a parent holding company is selected.

### Fixed

- Long annual-engagement forms scroll inside the viewport while the dialog title remains available and the action row remains reachable.
- Clearing a parent holding company now also clears its obsolete relationship role.

## [0.6.0] - 2026-09-04

### Added

- Storage V11 company masters and independent annual engagements, allowing one legal entity to manage FY2023, FY2024, FY2025 and other periods side by side.
- Calendar-year, April-to-March and custom fiscal-year presets with exact period generation, next-year suggestions and duplicate-period prevention, including archived engagements.
- Company-level tax deadlines and current holding-company relationships, with engagement-level frameworks, owners, schedules, workstreams, outstanding items and progress.
- Blank, template-based or prior-year engagement creation; prior-year copies retain workflow structure and framework while clearing operational dates, owners, completion and outstanding items.
- Previewed duplicate-company merging and one-time downloadable V10 source recovery before the first migration.
- Frozen holding-company component snapshots for each annual engagement, explicit period matching and an intentional sync action for later structure changes.

### Changed

- New company now creates only a long-lived company master; annual project settings are created from the company overview.
- Navigation prioritises legal entity names and nests complete FY or actual-date labels beneath each company.
- Company and annual-engagement archives have separate lifecycles, and management reports now show one detail row per engagement period.
- JSON backups and linked local files use the canonical `entities` and `engagements` schema while continuing to load V1–V10 data automatically.

### Fixed

- Companies with no annual engagement remain visible in the active navigation filter.
- Focused schedule editing no longer requires an unrelated legacy reporting period to be complete.
- The schedule Today action centres the current-date line correctly inside the scrollable timeline.

## [0.5.0] - 2026-09-04

### Added

- Persistent project-schedule ordering with drag-and-drop and `Alt` plus arrow-key movement.
- Focused company and holding-company date editors directly from schedule calendars, duration bars and incomplete-date markers.
- Browser coverage for saved ordering, both drop directions, keyboard movement, legacy empty-entity records, holding-company dates, archived read-only behavior, accessibility and responsive schedule layouts.

### Changed

- Schedule editor titles now identify the company or holding company being changed.
- Existing workspaces without a saved schedule order retain the former owner, start-date and name ordering on first migration.
- Schedule controls use clearer accessible names and larger pointer targets while keeping the compact desktop layout.

### Fixed

- Archived schedule graphics can no longer open a writable date editor.
- Drop placement is calculated at release time, avoiding an intermittent stale before/after position.
- Focused date edits no longer reorder holding-company members or fail on legacy company records without a legal-entity value.

## [0.4.0] - 2026-09-04

### Added

- Storage V10 template identities, source identities, tags, version notes and timestamps with automatic V1–V9 migration.
- Validated `.apw-template.json` packages with selective export, import preview, category mapping, copy-by-default conflicts and explicit replacement.
- Portfolio, company and holding-company management reports with composable filters, sortable detail, risk summaries and print-to-PDF styling.
- A built-in bookkeeping workstream and starter template covering setup, source documents, recording, reconciliation and period close.
- Explicitly empty company containers that can add their first workstream later.

- Parallel project workstreams for quotation and collection, audit, tax computation and filing, customer due diligence, and custom services.
- Storage V5 migration from legacy project nodes into an audit workstream, preserving progress and holding-company relationships.
- A fixed three-pane desktop workspace with collapsible project navigation and outstanding centre.
- Horizontal stage navigation with a stable detail panel beneath the stage rail.
- Simplified Chinese, Traditional Chinese and English system interfaces.
- Per-status colour controls and workstream-linked outstanding items.
- Read-only archive details, restoration and archive-only permanent deletion.
- Direct holding-company assignment, role and audit-category controls in company details.
- In-place company and intermediate holding-company membership management in holding-company details.
- User-defined template categories with reusable category-specific workstreams.
- Storage V6 migration for category-aware templates and selected-template preferences.
- A detailed in-app user guide covering the complete company, holding-company, template, archive and data workflow.
- A protected workbench initialisation flow with backup guidance and explicit acknowledgement.
- Direct company creation in Project navigation and drag-and-drop company or holding-company reassignment across hierarchy levels.
- Storage V7 fields for reporting-period start/end dates and a customisable financial reporting standard or framework, while preserving legacy period text.
- A unified New company flow for creating either a company or a holding company.
- Explicit drop targets on every eligible holding-company row, including expanded middle levels.
- A centre-first, Obsidian-inspired workspace mode with an on-demand outstanding panel for narrower desktop windows.
- Storage V8 project and holding-company start dates, kept separate from reporting-period dates and existing deadlines.
- A weekly horizontal project schedule with sticky company details, owner ordering, overdue and incomplete-date states, status filtering and direct links back to records.
- A global deadline-alert bell with a live overdue count and a sorted, navigable list covering companies, holding companies and distinct workstream deadlines.
- Reversible company-to-holding-company conversion with recoverable workflow and consolidation state.
- Storage V9 tax-deadline registers for companies and holding companies, including custom types, per-item reminder windows, optional tax-workstream links, original dates and reasoned revision history.
- Tax deadline summaries, multi-level holding-company roll-ups, urgency/owner/type filters, global reminder integration and same-day-counted schedule markers.
- Optional linked-local-file mode with a continuously updated `.apw.json` file, browser safety copy, persisted file handle, explicit save state, permission recovery and two-sided conflict resolution.
- Compact storage settings, unsynced-leave protection and recovery-copy downloads before resolving divergent browser and file versions.

### Changed

- Redesigned company creation around the legal entity, inline company structure, preset-or-custom reporting framework, paired reporting and project date ranges, and one-row workstream/template choices.
- Made every initial workstream optional, added a clear empty-workstream state, and kept the legal entity as the primary navigation label.
- Added a scrollable schedule with a working Today action and visible current-day line, and replaced native structure-conversion confirmation with an in-app dialog.
- Corrected workstream settings icons to stay in the card's top-right action position.
- Reorganised the workbench toolbar by purpose, with short menus reserved for related secondary actions.
- Replaced project-wide blended percentages with completed-workstream counts.
- Categorised the multi-template library by workstream type and replaced internal shorthand with professional terminology.
- Compacted the global toolbar, company/holding-company headers and holding-company status summary to prioritise working content in the desktop viewport.
- Grouped add-stage and delete-selected-stage controls beside the horizontal stage rail.
- Replaced the customer-due-diligence abbreviation with the full professional name throughout built-in content.
- Excluded archived records from active navigation, holding-company calculations and outstanding roll-ups.
- Replaced separate holding-company expand/collapse buttons with whole-row disclosure and prioritised the legal entity in company details.
- Moved workstream selection ahead of notes in the new-project form.
- Replaced user-facing group and subgroup terminology with holding company and intermediate holding company while retaining backward-compatible stored data.
- Removed the toolbar creation menu and moved the single creation entry point into Project navigation.
- Made English the default language for new users and refined English-first labels, form hierarchy and feedback.
- Increased small interface type and added responsive pane, toolbar, form and card layouts for browser zoom and narrower desktop windows.
- Added explicit plus/minus disclosure controls and hierarchy guide lines to the holding-company navigation tree.
- Replaced long high-frequency action labels with consistent Lucide icons, full hover/focus explanations and accessible labels.
- Added numeric badges to navigation status filters and tightened stage controls into a single compact row.
- Moved template-category management out of the category tabs and aligned consolidation-readiness labels with their completed-condition counts.

## [0.2.0] - 2026-09-02

### Added

- A multi-Sample library with create, select, duplicate, edit and delete workflows.
- A complete English variant of the built-in audit workflow Sample.
- Custom outstanding-item statuses with editable names, ordering and cleared-state semantics.

### Changed

- Renamed the project to APW — Audit Project Workbench (审计项目工作台).
- Upgraded browser storage to version 3 with automatic migration from the former single-Sample structure.
- Localised exact built-in workflow text in older or partially customised Samples and projects while preserving other custom content.

## [0.1.1] - 2026-09-02

### Fixed

- Added an automatic GitHub Pages deployment and a direct live-workbench link.

## [0.1.0] - 2026-09-02

### Added

- Multi-project audit progress tracking with custom stages and criteria.
- Separate outstanding-items status bar.
- Editable fixed Sample workflow with exact-match company de-identification.
- Chinese and English interface modes.
- Collapsible desktop project sidebar.
- Browser-local autosave and JSON backup/restore.
