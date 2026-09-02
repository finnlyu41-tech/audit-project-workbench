# Changelog

All notable changes to this project will be documented here.

The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Parallel project workstreams for quotation and collection, audit, tax computation and filing, customer due diligence, and custom services.
- Storage V5 migration from legacy project nodes into an audit workstream, preserving progress and group relationships.
- A fixed three-pane desktop workspace with collapsible project navigation and outstanding centre.
- Horizontal stage navigation with a stable detail panel beneath the stage rail.
- Simplified Chinese, Traditional Chinese and English system interfaces.
- Per-status colour controls and workstream-linked outstanding items.
- Read-only archive details, restoration and archive-only permanent deletion.
- Direct group assignment, role and audit-category controls in company details.
- In-place company and subgroup membership management in group details.

### Changed

- Consolidated language, backup, create and template-library actions into one workbench menu.
- Replaced project-wide blended percentages with completed-workstream counts.
- Categorised the multi-template library by workstream type and replaced internal shorthand with professional terminology.
- Excluded archived records from active navigation, group calculations and outstanding roll-ups.

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
