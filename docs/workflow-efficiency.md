# Workflow efficiency / 全流程减负

This release adds small, local workflow aids inside existing surfaces. It does not add a client portal, mail sender, audit sign-off engine, payroll ledger or cross-device collaboration.

## Daily use / 日常使用

**Company and annual entry.** Owner fields suggest existing names but remain editable; the tax-deadline owner field reuses the same editable suggestions instead of requiring the same name to be typed again. Company names and reporting periods show possible duplicates before submission; same-name companies are never merged automatically. Optional search aliases appear in search, not as a replacement legal name in reports or correspondence. A company can be saved and immediately followed by its annual-engagement form; cancelling the second form retains the company already saved. New annual engagements can show differences from the chosen previous year. Actual reporting periods, work dates and tax obligations remain separate.

**Working schedules.** Manual dates and Working days use one shared component in full annual forms, the timeline editor and inline Quick edit. The Hong Kong official public-holiday snapshot covers 2025–2027 with an explicit Monday–Friday or Monday–Saturday workweek. Enter start plus duration, latest finish plus duration (optional external buffer), or both dates to count working days. Day 1 is the first working day. The latest-finish mode rolls a non-working deadline backward, never forward. Saved estimates keep their calendar version and dates until explicitly edited; interval-count mode keeps dates but not an estimate. Any traversed date outside coverage blocks calculation instead of guessing holidays. Personal leave, half-days, company holidays and staffing capacity are not inferred.

In schedule filters, **Adjust work schedules in bulk** previews a shift preserving estimated workday duration or an explicitly selected sequence with per-project duration/order. Only selected active, unfinished projects participate. Existing hard latest-finish targets cannot be overrun. Tax deadlines, reporting periods and workstream completion are not shifted. The user must review and apply the preview.

**Next action and remaining work.** Quick update has optional collapsed settings to pin an existing unfinished stage or outstanding item. Completing or removing it does not create a replacement task or mark another task complete. The manual remaining-work estimate compares recorded days with available working dates; it does not convert completion percentages into labour estimates, reschedule work or change priority. Workflow boards can hide finished stages without changing records; drag ordering is unavailable while the filtered view hides rows.

**Saved filters and quick commands.** Save a named combination inside the existing home, navigation, outstanding or report filter surface. Values are local browser preferences, not duplicate project records. Invalid references are not silently applied; replacing a workspace clears these filters. The quick-open dialog has a collapsed current-engagement action group (new outstanding item, work schedule, next year), always showing the target identity.

## Outstanding items and follow-up / 待清与跟进

Use **Paste multiline outstanding items** in the outstanding More menu. Each nonblank line becomes one item, up to 100 lines / 1,000 characters per item / 50,000 characters per paste. Duplicate titles are flagged, not silently merged. Choose one source year, initial open status and optional module, preview, then apply once.

**Select multiple items** allows one source company/year at a time, even in aggregate views. Selected items can be previewed for a common status change or carried directly into a follow-up composer. Bulk status changes never complete audit conditions. A currently available batch undo checks the fields and source context it would reverse; related changes, changed status definitions, missing or archived sources prevent unsafe reversal. It preserves unrelated later changes. Batch additions, status changes, sent-date metadata and work schedules can offer undo; annual creation is not a destructive one-click undo operation.

The follow-up composer can remember one company's output language, separately from the interface language. System wording follows that selection; original titles and names are not machine-translated. Review acknowledgment is required for full-copy, subject-only, body-only or download. Source changes invalidate the preview. Titles can themselves contain sensitive information and must be checked. Meaningful filenames can use the explicitly stored company alias and reporting period; the generic, client-name-free option remains the default. Copy/download success is never recorded as sending.

Only after actually sending a message, use **Record sending and next follow-up** on selected open items. Record the real sent date and a working-day interval. The next-follow-up date starts counting *after* the sent date. Future sending cannot be recorded. Due items appear in the home follow-up section and link back to their actual source. This is an in-app list, not scheduled external email or operating-system push notifications; dates are not silently recalculated after calendar updates. Closed/archived sources leave the follow-up list without changing historical metadata.

## Annual, group and templates / 年度、集团与范本

The home annual tools can create multiple next-year engagements together. Each suggested period starts after that company's actual latest reporting end, including long first periods. Review each source, period and owner. Prior owners are adopted only with an explicit button. Completion, outstanding items, work dates, priority, pinned action and remaining-work estimates start fresh; historical records stay unchanged. Preview conflicts reject the entire batch rather than partly creating records.

Holding-component filters include **Not ready only**. Reasons derive from stored facts: source missing/archived, no annual assignment, mismatched reporting period, unfinished child-group requirements or unchecked readiness conditions. A matching period does not imply audit readiness. For a component without a matching annual project, **Create the missing corresponding year** opens the ordinary annual form in context; after creation, a separate confirmation links only that component. Cancelling linking retains the newly created engagement. Parent scope/version, child identity and exact reporting periods are rechecked; no conditions are ticked automatically.

Both ordinary and holding templates accept a simple outline: an unindented line is a stage, and a line beginning with two spaces or one tab is a completion condition. Preview before appending to the current template draft. Orphan indentation and oversized input are rejected. Unappended text blocks template save until appended or cleared, so it is not silently lost. Existing engagements never update when a template is edited.

## Output, comparison and protection / 输出、比较与保护

The current portfolio table can be copied as tab-separated text or downloaded as CSV in its actual filter/sort/display order. Only visible table columns are exported; internal notes, tax references and hidden records are excluded. Formula-like strings receive spreadsheet-safe prefixes, and CSV quoting alone is not treated as sufficient. Clipboard denial offers manually selectable text. Filenames are bounded, avoid path/control characters and include a unique time suffix; generic naming is available for client correspondence.

**Compare backup** in Backup opens a validated read-only comparison (up to 20 MB). Current versus incoming records show identity, allowed field changes and counts, not private narrative contents. Equal record totals do not imply equal contents. A comparison can proceed to the existing explicit restore confirmation, but is not itself a restore or automatic merge. Linked-file opening/conflict dialogs use the same read-only differences while retaining their original re-read-before-write protections. Choosing a replacement workspace clears local drafts and saved filters. The compared file is not uploaded.

An attempted company archive with unarchived annual work opens an actionable list of annual/tax records. It does not automatically archive them or suppress tax work. Archiving annual engagements while leaving the master active retains company tax reminders. Destructive actions keep their existing explicit protections.

Feedback distinguishes **applied to the current view**, **browser saved**, **linked file synced** and **download requested**. A browser download request is not proof that a file was retained. The Backup status remains the authoritative save/sync indicator.

## Optional local drafts / 可选本地草稿

Draft recovery is **off by default**, enabled in Settings. It can retain supported company, annual, inline quick-update and outstanding-entry drafts in this browser for up to seven days. Drafts may contain client text: they are **not encrypted, not uploaded, and not included in business backups**. Limits: 12 entries, bounded individual data/baseline and bounded total storage. This is not cloud backup.

Reopening offers explicit restore or discard. Source/baseline changes or malformed structures prevent direct restore, exposing text for manual checking instead. Successful submission or confirmed discard clears the corresponding draft. Normal browser reload does not clear saved drafts, but approved workspace replacement does. Quota and storage failures show a warning and do not claim the draft is saved; keep the page and copy its text. Disabling recovery clears its local cache. Native browser recovery/private-mode/device behaviour is not guaranteed on every platform.

## Implementation and validation notes

Public issue #73 is the scope checklist, including the previous seven scheduling/bulk-entry ideas. Release claims must link to the final feature PR, exact tested commit, CI, Pages deployment and post-deployment verification. Isolated fixtures include same item IDs in different companies, private marker strings, long reporting periods, historical component scope, malformed drafts, denied clipboard/storage and actual downloaded backups restored in clean browser contexts. No real customer workspace or OS clipboard was used.

The original size/cycle build gates remain. Repeated static system-text calls are compacted at build time using parsed syntax and a deterministic translation-key index. User-authored text and identifiers are never rewritten. Tests verify input semantics and both source/production browser flows in English, Simplified and Traditional Chinese. Automated test counts or geometry are not measured human time savings.
