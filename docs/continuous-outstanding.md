# Continuous outstanding entry

The existing Add outstanding item dialog now offers Save and add another only in creation mode. Regular Save still closes the editor; Enter in a title retains that regular-save behaviour. Every button applies exactly one item, not a parsed batch of lines.

A successful continuation resets title, note and status to the next item's default while retaining the explicitly chosen workstream. The next form has a fresh draft baseline and initial keyboard focus. Cancel protects only unfinished input; previously submitted items remain. Closing after several entries reveals the most recently submitted item. Save status still comes from the existing persistence layer; an applied in-memory item is not proof of an on-disk backup.

The source company and complete reporting periods are shown above the form. Saving resolves the current canonical engagement, rejects missing/archived sources, changed identity or periods, missing modules/statuses and conflicting edits. Canonical item updates do not rewrite company hierarchy, historical component snapshots or workflow conditions.

## Measured path

With the same fictional 2026 project already open and three prescribed titles, the old path needs six button activations and three editor visits. The continuation path needs four button activations and one editor visit, still three title entries. This is a reproducible operation count, not measured human elapsed time or a comparison to the user's previous non-APW method. Test time is not human task time.

## Verification

`tests/outstanding-entry.test.js` covers pure source validation and conflict handling. `e2e/outstanding-continuous.spec.js` covers count, field reset, cancellation, double activation, IME, group snapshots, edit-only mode, three languages and narrow layouts. Existing daily-editor and outstanding-centre tests remain in use. Earlier test failures caused by ambiguous submit selectors or incorrect label queries were corrected to exact, user-visible button/combobox names; no behaviour assertions were removed.

All fixtures are fictional and run in isolated browser contexts. No client records, network service or data-format migration are introduced. Source for React form reset identity: https://react.dev/learn/preserving-and-resetting-state .
