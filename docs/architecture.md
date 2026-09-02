# Architecture

Audit Project Workbench (APW) is a small React application built with Vite.

## Layers

- `src/dashboard/model.js`: pure data construction, V1–V7 migration, progress calculations and template de-identification.
- `src/dashboard/i18n.jsx`: UI-language state and system-text translations.
- `src/dashboard/traditional.js`: deterministic Simplified-to-Traditional conversion for system-owned text only.
- `src/dashboard/components.jsx`: reusable forms, rows, cards and modal components.
- `src/dashboard/Workbench.jsx`: application state and project/group workflows.
- `src/dashboard/group-components.jsx`: group hierarchy, component matrix and group-template interfaces.
- `src/dashboard/dashboard.css`: desktop-first layout and component styling.

## Persistence

The application stores one versioned JSON object in browser `localStorage`. Backups use the same versioned structure. Storage version 5 added project `workstreams`, outstanding-item `workstreamId`, template `workstreamType`, per-status colours and `selectedSampleIdsByType`. Storage version 6 added `workstreamCategories`, template/workstream `categoryId` and `selectedSampleIdsByCategory`. Storage version 7 adds project/group `periodStart` and `periodEnd`, plus project `reportingFramework`; legacy free-text `period` values remain available as a fallback. Versions 1–6 migrate automatically when stored or imported data is loaded.

Each project owns at least one `workstream`. Built-in types are `quote_collection`, `audit`, `tax_computation_filing` and `cdd`; each may appear once per project. User-defined categories map to custom workstreams and can be added, renamed or reordered. Custom workstreams are unlimited. Legacy project `nodes` become one audit workstream without changing node or condition identities, completion state, owner, due date or group references.

The historical `audit-progress-workbench:*` browser-storage keys are intentionally retained so the product rename does not discard existing local data.

Project data is intentionally independent from the template library. Editing, switching or deleting a template affects future projects only. Built-in templates have Simplified Chinese, Traditional Chinese and English variants. Exact matches to known built-in workflow text are localised at display time, including in legacy projects; all other custom template and project content is left unchanged. Legacy internal shorthand is migrated to professional trial-balance and general-ledger wording.

Groups reference projects or other groups through member records rather than copying them. A project or subgroup can have only one parent. Cycles are rejected. Group progress reads each member's audit workstream; when no audit workstream exists it uses that member's explicit group-readiness completion. Group progress recursively combines the direct-member average at 70% with the current level's consolidation workflow at 30%; classification-only groups use the direct-member average alone. Consolidation readiness remains an explicit gate and is not inferred from the percentage.

Archived records are excluded from active navigation calculations, group progress and outstanding roll-ups. Relationships are retained, so restoring a project or group reinstates its former hierarchy. Archived detail is read-only. Permanent project deletion also removes its outstanding items, workstreams and group references; permanent group deletion leaves its members intact.

## Domain boundaries

Workflow stages contain completion criteria and calculate workstream progress. A project completes only when every enabled workstream completes. Outstanding items have their own configurable status definitions, including colour and whether a status counts as cleared, and do not contribute to progress. An item may be project-level or linked to one workstream. Group pages roll up outstanding items with their source without duplicating them. This separation is a core invariant and is covered by tests.

## Future changes

Any server-backed synchronisation should be an optional adapter. The local data model should remain usable without an account or network connection.
