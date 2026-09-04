# Architecture

Audit Project Workbench (APW) is a small React application built with Vite.

## Layers

- `src/dashboard/model.js`: pure data construction, V1–V10 migration, progress calculations and template de-identification.
- `src/dashboard/i18n.jsx`: UI-language state and system-text translations.
- `src/dashboard/traditional.js`: deterministic Simplified-to-Traditional conversion for system-owned text only.
- `src/dashboard/components.jsx`: reusable forms, rows, cards and modal components.
- `src/dashboard/Workbench.jsx`: application state and project/group workflows.
- `src/dashboard/group-components.jsx`: group hierarchy, component matrix and group-template interfaces.
- `src/dashboard/timeline.jsx`: weekly project-schedule projection and horizontal duration-bar interface.
- `src/dashboard/deadline-alerts.jsx`: compact, navigable presentation of derived overdue deadlines.
- `src/dashboard/persistence.js` and `use-workbench-persistence.js`: device-local persistence settings, linked-file access, serial autosave, permission recovery and conflict resolution.
- `src/dashboard/persistence-ui.jsx`: compact storage settings, file review and conflict-resolution interfaces.
- `src/dashboard/template-packages.js` and `template-transfer.jsx`: validated portable-template serialization, preview, category mapping and import/export interfaces.
- `src/dashboard/reporting.js` and `management-report.jsx`: derived portfolio and record reports, filters, risk summaries and print presentation.
- `src/dashboard/dashboard.css`: desktop-first layout and component styling.

## Persistence

The application always stores one versioned JSON safety copy in browser `localStorage`. Backups and optional linked `.apw.json` files use the same structure. Storage version 5 added project `workstreams`, outstanding-item `workstreamId`, template `workstreamType`, per-status colours and `selectedSampleIdsByType`. Version 6 added category-aware templates, version 7 added reporting-period ranges and reporting frameworks, version 8 added separate project start dates, version 9 added company and holding-company tax-deadline registers, and version 10 added portable-template identity, tags, version notes and timestamps. Versions 1–9 migrate automatically when browser, backup or linked-file data is loaded.

Persistence preferences are device-local and deliberately separate from the V10 business-data schema. The selected mode and leave-warning preference use a small versioned `localStorage` record; the structured-cloneable `FileSystemFileHandle` is stored in IndexedDB. Neither is exported. Linked-file writes are debounced and serialized, while every change reaches the browser safety copy first. A saved digest distinguishes browser-only changes, file-only changes and true two-sided conflicts on reopening. File permission is queried silently on startup but requested only after a user gesture.

Each project owns zero or more `workstream` records. Built-in types are `quote_collection`, `bookkeeping`, `audit`, `tax_computation_filing` and `cdd`; each may appear once per project. User-defined categories map to custom workstreams and can be added, renamed or reordered. Custom workstreams are unlimited. Legacy project `nodes` become one audit workstream without changing node or condition identities, completion state, owner, due date or group references.

The historical `audit-progress-workbench:*` browser-storage keys are intentionally retained so the product rename does not discard existing local data.

Project data is intentionally independent from the template library. Editing, switching or deleting a template affects future projects only. Built-in templates have Simplified Chinese, Traditional Chinese and English variants. Exact matches to known built-in workflow text are localised at display time, including in legacy projects; all other custom template and project content is left unchanged. Legacy internal shorthand is migrated to professional trial-balance and general-ledger wording.

Portable `.apw-template.json` packages contain only template categories, stages, completion criteria and holding-company readiness conditions. Import parsing rejects unknown or workspace-data fields, applies bounded list and text limits, maps built-in categories by type and custom categories by explicit choice or exact name, and builds the next store off to the side so a failed import cannot partially mutate the active workspace. A matching source defaults to a copy; replacement requires an explicit existing target.

The interface presents companies and holding companies through one creation flow. For backward compatibility with V1–V8 backups and browser data, the model and stored schema retain the internal names `projects`, `groups` and `members`. Records may convert between company and holding-company structures. The active structure keeps the shared identity, reporting, scheduling, owner, notes and outstanding-item fields, while `conversionState` retains the opposite structure's workstreams or consolidation settings for a later round trip.

Holding companies reference companies or other holding companies through member records rather than copying them. A company or intermediate holding company can have only one parent. Cycles are rejected. Holding-company progress reads each member's audit workstream; when no audit workstream exists it uses that member's explicit consolidation-readiness completion. Progress recursively combines the direct-member average at 70% with the current level's consolidation workflow at 30%; hierarchy-only holding companies use the direct-member average alone. Consolidation readiness remains an explicit gate and is not inferred from the percentage.

Archived records are excluded from active navigation calculations, group progress and outstanding roll-ups. Relationships are retained, so restoring a project or group reinstates its former hierarchy. Archived detail is read-only. Permanent project deletion also removes its outstanding items, workstreams and group references; permanent group deletion leaves its members intact.

The project schedule projects company and holding-company `startDate` and `dueDate` values without duplicating them. It follows the navigation status filter, derives its weekly range at render time and stores only a stable `scheduleOrder` key list. Existing stores without that list migrate from the former owner/start-date/name ordering. Drag-and-drop and `Alt` plus arrow keys update display order; a name opens the canonical record, while a calendar control, duration bar or incomplete-date marker opens the same record's focused date editor. Archived rows always open their read-only record instead.

Deadline alerts are also derived rather than stored. Project and workstream delivery alerts apply to active incomplete records, while an open tax deadline can continue after project completion. Archived records are excluded, and a workstream reminder is suppressed when it merely repeats its parent project's deadline. Completing, rescheduling, marking a tax deadline not applicable or archiving the source therefore updates reminders without separate reminder state.

Management reports are calculated from the current store and never persist duplicate totals. Portfolio filters compose over status, owner, holding hierarchy, schedule range, workstream category and deadline urgency. Record reports deliberately whitelist management fields: outstanding-item notes and tax references, notes and revision history are not exposed. Print CSS hides navigation and controls while retaining the selected scope and generation time.

## Domain boundaries

Workflow stages contain completion criteria and calculate workstream progress. A project completes only when every enabled workstream completes. Outstanding items have their own configurable status definitions, including colour and whether a status counts as cleared, and do not contribute to progress. An item may be project-level or linked to one workstream. Group pages roll up outstanding items with their source without duplicating them. This separation is a core invariant and is covered by tests.

## Future changes

Any server-backed synchronisation should be an optional adapter. The local data model should remain usable without an account or network connection.
