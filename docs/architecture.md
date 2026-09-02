# Architecture

Audit Progress Workbench is a small React application built with Vite.

## Layers

- `src/dashboard/model.js`: pure data construction, migration, progress calculations and Sample de-identification.
- `src/dashboard/i18n.jsx`: UI-language state and system-text translations.
- `src/dashboard/components.jsx`: reusable forms, rows, cards and modal components.
- `src/dashboard/DashboardContent.jsx`: application state and user workflows.
- `src/dashboard/dashboard.css`: desktop-first layout and component styling.

## Persistence

The application stores one versioned JSON object in browser `localStorage`. Backups use the same versioned structure. Migrations run when stored or imported data is loaded.

Project data is intentionally independent from the fixed Sample. Editing the Sample affects future projects only.

## Domain boundaries

Workflow stages contain completion criteria and calculate engagement progress. Outstanding items have their own statuses and do not contribute to progress. This separation is a core invariant and is covered by tests.

## Future changes

Any server-backed synchronisation should be an optional adapter. The local data model should remain usable without an account or network connection.
