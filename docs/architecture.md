# Architecture

Audit Project Workbench (APW) is a small React application built with Vite.

## Layers

- `src/dashboard/model.js`: pure data construction, V1–V8 migration, progress calculations and template de-identification.
- `src/dashboard/i18n.jsx`: UI-language state and system-text translations.
- `src/dashboard/traditional.js`: deterministic Simplified-to-Traditional conversion for system-owned text only.
- `src/dashboard/components.jsx`: reusable forms, rows, cards and modal components.
- `src/dashboard/Workbench.jsx`: application state and project/group workflows.
- `src/dashboard/group-components.jsx`: group hierarchy, component matrix and group-template interfaces.
- `src/dashboard/timeline.jsx`: weekly project-schedule projection and horizontal duration-bar interface.
- `src/dashboard/deadline-alerts.jsx`: compact, navigable presentation of derived overdue deadlines.
- `src/dashboard/persistence.js` and `use-workbench-persistence.js`: device-local persistence settings, linked-file access, serial autosave, permission recovery and conflict resolution.
- `src/dashboard/persistence-ui.jsx`: compact storage settings, file review and conflict-resolution interfaces.
- `src/dashboard/dashboard.css`: desktop-first layout and component styling.

## Persistence

The application always stores one versioned JSON safety copy in browser `localStorage`. Backups and optional linked `.apw.json` files use the same structure. Storage version 5 added project `workstreams`, outstanding-item `workstreamId`, template `workstreamType`, per-status colours and `selectedSampleIdsByType`. Version 6 added category-aware templates, version 7 added reporting-period ranges and reporting frameworks, version 8 added separate project start dates, and version 9 added company and holding-company tax-deadline registers. Versions 1–8 migrate automatically when browser, backup or linked-file data is loaded.

Persistence preferences are device-local and deliberately separate from the V9 business-data schema. The selected mode and leave-warning preference use a small versioned `localStorage` record; the structured-cloneable `FileSystemFileHandle` is stored in IndexedDB. Neither is exported. Linked-file writes are debounced and serialized, while every change reaches the browser safety copy first. A saved digest distinguishes browser-only changes, file-only changes and true two-sided conflicts on reopening. File permission is queried silently on startup but requested only after a user gesture.

Each project owns at least one `workstream`. Built-in types are `quote_collection`, `audit`, `tax_computation_filing` and `cdd`; each may appear once per project. User-defined categories map to custom workstreams and can be added, renamed or reordered. Custom workstreams are unlimited. Legacy project `nodes` become one audit workstream without changing node or condition identities, completion state, owner, due date or group references.

The historical `audit-progress-workbench:*` browser-storage keys are intentionally retained so the product rename does not discard existing local data.

Project data is intentionally independent from the template library. Editing, switching or deleting a template affects future projects only. Built-in templates have Simplified Chinese, Traditional Chinese and English variants. Exact matches to known built-in workflow text are localised at display time, including in legacy projects; all other custom template and project content is left unchanged. Legacy internal shorthand is migrated to professional trial-balance and general-ledger wording.

The interface presents companies and holding companies through one creation flow. For backward compatibility with V1–V8 backups and browser data, the model and stored schema retain the internal names `projects`, `groups` and `members`. Records may convert between company and holding-company structures. The active structure keeps the shared identity, reporting, scheduling, owner, notes and outstanding-item fields, while `conversionState` retains the opposite structure's workstreams or consolidation settings for a later round trip.

Holding companies reference companies or other holding companies through member records rather than copying them. A company or intermediate holding company can have only one parent. Cycles are rejected. Holding-company progress reads each member's audit workstream; when no audit workstream exists it uses that member's explicit consolidation-readiness completion. Progress recursively combines the direct-member average at 70% with the current level's consolidation workflow at 30%; hierarchy-only holding companies use the direct-member average alone. Consolidation readiness remains an explicit gate and is not inferred from the percentage.

Archived records are excluded from active navigation calculations, group progress and outstanding roll-ups. Relationships are retained, so restoring a project or group reinstates its former hierarchy. Archived detail is read-only. Permanent project deletion also removes its outstanding items, workstreams and group references; permanent group deletion leaves its members intact.

The project schedule is a read-only projection of company and holding-company `startDate` and `dueDate` values. It follows the navigation status filter, orders records by owner and start date, and derives its weekly range at render time; selecting a row or duration bar returns to the canonical record rather than maintaining duplicate schedule data.

Deadline alerts are also derived rather than stored. The model includes overdue deadlines only for active, incomplete records and workstreams, excludes archived or completed work, and suppresses a workstream reminder when it merely repeats its parent project's deadline. Completing, rescheduling or archiving the source therefore clears the reminder without separate reminder state.

## Domain boundaries

Workflow stages contain completion criteria and calculate workstream progress. A project completes only when every enabled workstream completes. Outstanding items have their own configurable status definitions, including colour and whether a status counts as cleared, and do not contribute to progress. An item may be project-level or linked to one workstream. Group pages roll up outstanding items with their source without duplicating them. This separation is a core invariant and is covered by tests.

## Future changes

Any server-backed synchronisation should be an optional adapter. The local data model should remain usable without an account or network connection.
