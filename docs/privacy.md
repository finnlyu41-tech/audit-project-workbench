# Privacy and Data Boundary / 隐私与数据边界

## What the app stores

The app stores engagement and group names, legal entities, periods, owners, hierarchy, notes, workstreams, stage status, consolidation-readiness criteria, outstanding items, custom outstanding-status labels and colours, and both editable template libraries in the browser's `localStorage`.

## What the app sends

The core application has no backend and makes no network request to send engagement data. Standard browser and hosting behaviour still applies to the page itself.

## Backups

JSON backup files can contain all workbench data. Treat them as confidential client material. Do not attach them to public issues or commit them to this repository.

## Public contributions

Use fictional or bracketed identifiers such as `[Company Name]`. Before submitting a pull request, inspect code, tests, screenshots and documentation for real client names, file paths, registration numbers, vessel names, email addresses and credentials.

## Template de-identification

The built-in tool replaces only exact company names supplied by the user. It does not claim to detect every form of personal or client information. A human review is still required before publishing or sharing a template. Language switching does not translate or alter custom template or project content.
