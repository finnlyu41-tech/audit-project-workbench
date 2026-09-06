# Operation-boundary fixes / 操作范围修正

This release fixes existing editing behaviour; it adds no screens, client directory or workflow features.
本轮只修复既有操作逻辑，保留轻量待清界面，不新增管理功能。

## Confirmed defects / 已复现问题

- A legacy runtime-view write (status change, item deletion or workflow edit) rebuilt unrelated holding annual components. Unassigned and missing-source slots disappeared, and historical membership could overwrite today's company hierarchy.
- Editing an annual owner while its previous owner filter was active could move the workspace to a different annual record after saving.
- Opening an existing engagement with an empty framework could inherit another year's framework; owner-only Save could then silently write that hidden value.
- Restoring an annual engagement could reactivate it under an archived company. An already completed engagement could also disappear into the Active filter after restoration.

## Corrected boundaries / 修正后的边界

The compatibility adapter now skips unchanged views, patches only actual company-field changes, and preserves complete frozen components when membership is not edited. Readiness/role edits keep original snapshots; explicit visible-member removal or order changes retain unprojected slots. Only explicit membership additions/removals can alter matching current relationships. Existing legacy migration and explicit conversion behaviour remain separately tested.

Annual quick-field dialogs write only their displayed fields. Existing blank frameworks stay blank. Only obstructing navigation filters are cleared after identity-changing saves; framework/date-only edits retain matching filters. Restoring requires an active company master and selects the appropriate Active/Completed view without changing completion criteria.

客户主档、历史年度组成部分和项目操作互不代替：修改待清状态或流程不代表同步集团结构；空白框架不等于从另一个年度继承；恢复年度也不代表恢复其公司主档。

## Verification / 验证

Regression fixtures include different current/historical parents, unassigned members with their own annual projects, missing entities, archived sources, repeated item edits, legacy member operations and empty frameworks. Tests compare complete unrelated entities/engagements and export an actual backup for reload in a clean browser context. Browser tests exercise real controls, cancellation, source navigation and three-language archive explanations.

Full unit, full Chromium/WebKit, CI, production preview and post-publication evidence belong in the release PR. Passing checks does not establish that all conceivable bugs or native-device behaviours were tested.

## Existing data / 现有资料

This prevents further unintended edits; it does not infer or recreate records that may previously have disappeared. No user's real workspace was examined. Do not use structure sync as an automatic repair for historical scope. If a discrepancy is found, compare a preserved backup and confirm the intended scope before changing it. Existing data version, audit/tax formulas and backup format are unchanged; schema migration is not required.
