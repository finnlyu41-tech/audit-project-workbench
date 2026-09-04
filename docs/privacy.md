# Privacy and Data Boundary / 隐私与数据边界

## What the app stores

The app stores engagement and group names, legal entities, periods, owners, hierarchy, notes, workstreams, stage status, consolidation-readiness criteria, outstanding items, tax deadlines, custom outstanding-status labels and colours, and both editable template libraries in the browser's `localStorage`.

If the user explicitly enables linked-local-file mode, the same versioned workbench JSON is also written to the selected `.apw.json` file. A browser safety copy remains in `localStorage`. The device-specific file handle and permission reference are stored separately in IndexedDB and are never included in an exported backup.

## What the app sends

The core application has no backend and makes no network request to send engagement data. Standard browser and hosting behaviour still applies to the page itself.

## Backups

JSON backups and linked `.apw.json` workbench files can contain all workbench data. Treat them as confidential client material. Do not attach them to public issues or commit them to this repository.

Linked files are not a collaboration service. Simultaneous edits by different people or browsers can create divergent versions; the app pauses file autosave and asks the user to choose a version when it can prove that both the browser copy and file changed after the last sync.

## Public contributions

Use fictional or bracketed identifiers such as `[Company Name]`. Before submitting a pull request, inspect code, tests, screenshots and documentation for real client names, file paths, registration numbers, asset names, email addresses and credentials.

## Template de-identification

The built-in tool replaces only exact company names supplied by the user. It does not claim to detect every form of personal or client information. A human review is still required before publishing or sharing a template. Language switching does not translate or alter custom template or project content.

Portable `.apw-template.json` packages are structurally limited to template categories, stages, completion criteria and holding-company readiness conditions. They exclude workspace companies, owners, outstanding items and tax deadlines, but free-text template content may still contain identifiers entered by a user. Review and de-identify every package before sharing it.
