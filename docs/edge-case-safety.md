# Edge-case safety / 多类型边界保护

This increment fixes existing operations; it does not add a client-management system or change the backup version.

## Recovery / 恢复

Validate supplied records before normalization. Syntactically valid JSON is not sufficient: wrong nested collection types, duplicate scoped identifiers, orphan engagement/company references, string booleans, impossible dates, inconsistent live links and cyclic master relationships are refused. Startup retains the original payload and exposes the existing raw-export/recovery screen. Ordinary restore and linked-file reads use the same gate. Legitimate missing historical component references are retained, not inferred or silently removed.

Valid V1–V10 input retains the existing migration path. Validation is not automatic repair, cryptographic authenticity, an unlimited-size parser or proof against every possible malformed file. Raw recovery export is not a validated backup. Never clear browser data to get past a validation error.

## Company merge / 公司合并

Preserve source-only master metadata, annual engagements and tax records. Retain the chosen target name. Conflicting nonempty long-lived fields block the merge rather than silently discarding either value. Different entity kinds, archived masters, current/historical ownership relationships and duplicate reporting periods must be resolved before merge. Existing company editing remains the way to review conflicts; no bulk overwrite wizard is introduced.

Prepare the merge before enqueueing React state so errors remain in the dialog instead of escaping from an asynchronous state updater. Remap live entity references but retain original historical snapshot labels. Repeated tax IDs get distinct IDs without dropping either tax record.

## Readiness and dates / 就绪和日期

A component can contribute to group readiness only when its company and complete reporting periods match the selected group engagement. Matching dates do not check readiness or audit conditions. Wrong-year, wrong-entity, missing/incomplete-period and differently partitioned multi-year ranges cannot masquerade as a valid match. This may correct a previously misleading completed/ready display; it does not alter saved checkboxes or provide an audit conclusion.

Impossible tax dates are not rolled into the following month when computing urgency. Existing records are not silently rewritten to guessed dates.

## Submission / 提交

Modal composition events guard Enter/Escape so confirming or cancelling an IME candidate does not submit or close the editor. Duplicate submit events for the same form in a single activation are coalesced. Later corrected submissions and continuous entry remain available. This is a local interaction guard, not a distributed transaction/idempotency service.

所有验证使用隔离浏览器中的虚构资料，不读取用户真实客户工作台。新规则用于阻止后续错误，不自动重建历史上已丢失的信息。先导出备份并保留未提交草稿后再更新；资料异常时保留原始文件，不要用同步当前集团架构替代历史恢复。
