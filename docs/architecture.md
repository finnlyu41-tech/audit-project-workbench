# Architecture

Audit Project Workbench (APW) is a small React application built with Vite.

## Layers

- `src/dashboard/model.js`: pure data construction, migration, progress calculations and Sample de-identification.
- `src/dashboard/i18n.jsx`: UI-language state and system-text translations.
- `src/dashboard/components.jsx`: reusable forms, rows, cards and modal components.
- `src/dashboard/DashboardContent.jsx`: application state and user workflows.
- `src/dashboard/dashboard.css`: desktop-first layout and component styling.

## Persistence

The application stores one versioned JSON object in browser `localStorage`. Backups use the same versioned structure. Storage version 3 contains a `samples` array, `selectedSampleId` and workspace-level `outstandingStatuses`; older single-Sample and fixed-status data is migrated automatically when stored or imported data is loaded.

The historical `audit-progress-workbench:*` browser-storage keys are intentionally retained so the product rename does not discard existing local data.

Project data is intentionally independent from the Sample library. Editing, switching or deleting a Sample affects future projects only. The built-in Sample has Chinese and English content variants; custom Sample and project content is never machine-translated.

## Domain boundaries

Workflow stages contain completion criteria and calculate engagement progress. Outstanding items have their own configurable status definitions, including whether a status counts as cleared, and do not contribute to progress. This separation is a core invariant and is covered by tests.

## Future changes

Any server-backed synchronisation should be an optional adapter. The local data model should remain usable without an account or network connection.
