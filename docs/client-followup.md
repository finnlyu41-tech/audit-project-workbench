# Client follow-up drafts / 客户跟进草稿

## Use / 使用

Open an annual engagement and choose Client follow-up draft in the outstanding centre. Select the items to include, generate the preview, review the company and every reporting period, then copy the text or download a `.txt` file. In a holding-company view, explicitly choose one source engagement first. The item list contains all eligible open items in that source, not only the underlying sidebar's current search results.

打开年度项目，在待清中心选择「客户跟进草稿」。逐项勾选后生成预览，检查公司、完整报告期间及正文，再复制或下载文本。集团视图必须先明确选择单一来源；不会把不同公司和年度自动拼在一起。新增待清时可先用「保存并继续新增」录入，再从同一批记录生成跟进草稿，无需重抄标题。

## Data boundaries / 资料边界

Draft generation is deterministic and local. Only the selected company's legal name, reporting periods and explicitly selected item titles enter the generated text. Internal item notes, engagement notes, owners, tax references, workflow conditions, completion percentages and status labels are not inserted. User-entered titles stay verbatim; switching the draft language changes system wording only. An item title may itself contain confidential material or an internal conclusion: review it and edit the preview before sharing. This is not automatic redaction.

No network API, AI service, email account or automatic sending is added. Draft text is not written to workspace data, backups or localStorage. A copied/downloaded draft is outside APW's subsequent control. Nothing automatically follows later item changes into an already downloaded file.

生成过程在本地运行，不调用 AI、不上传、不发送邮件。系统只填入所选公司、期间及勾选事项标题，不自动加入内部说明。标题本身仍可能敏感，必须预览。修改草稿不改源事项；已复制或下载的文本不会随源资料更新。

## Safety and usability

Nothing is preselected. Missing, archived, cleared or unknown-status items are excluded. Shared item IDs across engagements are resolved only within the explicitly selected engagement. Source/selection/language changes invalidate the preview; manual edits require confirmation before a switch discards them. A generated but not copied/downloaded draft also participates in the existing close guard. Changing company identity, reporting periods or a selected item invalidates an old preview; output remains disabled until selections are reviewed again.

Copy success is shown only after `navigator.clipboard.writeText` resolves. A denied or unavailable clipboard produces an actionable message and selects the text after it is enabled for manual copy. Download uses a neutral filename, UTF-8 plain text and only the visible edited preview. A download request is not proof that the browser retained a file. The draft is not an email and no recipient is inferred.

The View source item action stays inside APW and resolves the exact source item. Internal source IDs and links are not added to client-facing text. Long titles and complete company/period labels wrap; the modal body remains the single scrolling area. Keyboard focus moves to the generated preview without submitting anything.

## Verification

`tests/client-followup.test.js` verifies the field allowlist, identity isolation, stale snapshots, archive/cleared exclusions, languages and plain-text export. `e2e/client-followup.spec.js` exercises explicit source/selection, hand-edited previews, copy success/failure simulations, real text downloads, source navigation, continuous-entry-to-draft and three-language narrow layouts. Clipboard permission tests use an isolated stub, not the user's OS clipboard or email account. Browser suites use fictional records only; native Safari/iOS and human task-time validation remain separate.

References: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText and https://react.dev/learn/preserving-and-resetting-state .
