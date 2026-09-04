# Changelog

All notable changes to this project will be documented here.

The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
