# Continuous entry and client follow-up / 连续录入与客户跟进

## Record once / 只记录一次

In the outstanding centre, Add outstanding item keeps its ordinary Save and Cancel actions. New items additionally offer **Save and add another / 保存并继续新增**. Each activation applies one item to the stated company and annual engagement; the next form clears the title and note, resets to the default open status and retains the explicitly chosen workstream. Cancelling a later unfinished item does not remove earlier submissions. Editing an existing item does not offer continuation.

The source is rechecked before applying an item. Archived/missing targets, changed periods, unavailable modules/statuses and conflicting edits cannot silently redirect a save. Business records are updated through the canonical engagement, preserving holding snapshots. A submitted item in memory is not proof of browser/file persistence; the existing save-failure warning and backup status remain authoritative. Backups exclude unsubmitted form drafts.

## Prepare a follow-up / 生成客户跟进草稿

Open **Client follow-up draft / 客户跟进草稿** in the outstanding centre. Select one source company and annual engagement, select the intended open items, choose the draft language and generate a preview. A group does not preselect a source or mix subsidiary records. Candidates follow that annual engagement's saved component links, not the company's present-day hierarchy. Archived companies/projects and cleared items are excluded.

Generated text uses only the company name, reporting periods and explicitly selected item titles. Internal notes, owners, workflow judgments, status labels, tax references and other companies' records are not automatically included. User titles and names are not translated. **Titles themselves can contain confidential information: review them before sharing.** Manual edits may add sensitive text, so the preview remains the user's responsibility.

The preview is editable without changing source records. Editing clears the review acknowledgment; changing the source, selected items or output language discards the old preview only after protecting unexported manual edits. Changed or removed source information makes an existing preview ineligible for output. Source buttons navigate to the original item inside APW; exported text contains no internal navigation links.

Explicitly acknowledge review before Copy draft or Download text draft. Copy success is shown only after the clipboard promise resolves; denied/unavailable clipboard access offers manual text selection and download. A download request is not proof that a file reached the user's disk. There is no send button, email integration, AI request or upload. Draft state remains in component memory and is not a new persistent workspace field.

## Evidence and limitations / 验收与限制

`e2e/workflow-effort.spec.js` observes actual button click events and newly mounted dialogs for the same synthetic three-item task: ordinary saves versus continuation. The starting point is an already-open project. Text entry count stays three. Human reading, typing duration, navigation to the project, error rates and comparison with the user's earlier method are **not** measured by browser automation. Do not label this as a measured percentage of human time saved.

The entry tests cover cancellation, reset boundaries, duplicate submission, IME, edit-only behavior, group snapshots and browser-write failure. The follow-up tests inspect real downloaded text and unchanged source data, single-source boundaries, same-ID isolation, draft guards, source changes, languages, narrow layouts and accessibility. Clipboard calls are simulated in isolated browser contexts, not tests of every operating-system clipboard or permission prompt. No real client records are used.

The prior stability/recovery gate remains in place. This release implements the agreed first product loop, not a guarantee that every future defect is eliminated. Team synchronization, permissions infrastructure, audit sign-off automation and client evidence storage remain outside this increment.

References: React state identity https://react.dev/learn/preserving-and-resetting-state ; Clipboard write contract https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText .
