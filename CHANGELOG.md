# Changelog

All notable changes to this project will be documented here.

The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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

### Changed

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
