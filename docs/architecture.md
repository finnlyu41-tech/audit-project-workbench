# Architecture

Audit Project Workbench (APW) is a small React application built with Vite.

## Layers

- `src/dashboard/model.js`: pure data construction, migration, progress calculations and Sample de-identification.
- `src/dashboard/i18n.jsx`: UI-language state and system-text translations.
- `src/dashboard/components.jsx`: reusable forms, rows, cards and modal components.
- `src/dashboard/Workbench.jsx`: application state and project/group workflows.
- `src/dashboard/group-components.jsx`: group hierarchy, component matrix and Group Sample interfaces.
- `src/dashboard/dashboard.css`: desktop-first layout and component styling.

## Persistence

The application stores one versioned JSON object in browser `localStorage`. Backups use the same versioned structure. Storage version 4 adds `groups`, `groupSamples` and `selectedGroupSampleId` while retaining the project Sample library and workspace-level `outstandingStatuses`; versions 1–3 migrate automatically when stored or imported data is loaded.

The historical `audit-progress-workbench:*` browser-storage keys are intentionally retained so the product rename does not discard existing local data.

Project data is intentionally independent from the Sample library. Editing, switching or deleting a Sample affects future projects only. The built-in Sample has Chinese and English content variants. Exact matches to known built-in workflow text are localised at display time, including in legacy projects; all other custom Sample and project content is left unchanged.

Groups reference projects or other groups through member records rather than copying them. A project or subgroup can have only one parent. Cycles are rejected. Group progress recursively combines the direct-member average at 70% with the current level's consolidation workflow at 30%; classification-only groups use the direct-member average alone. Consolidation readiness remains an explicit gate and is not inferred from the percentage.

## Domain boundaries

Workflow stages contain completion criteria and calculate engagement progress. Outstanding items have their own configurable status definitions, including whether a status counts as cleared, and do not contribute to progress. Group pages roll up outstanding items with their source without duplicating them. This separation is a core invariant and is covered by tests.

## Future changes

Any server-backed synchronisation should be an optional adapter. The local data model should remain usable without an account or network connection.
