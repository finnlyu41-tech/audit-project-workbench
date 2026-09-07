# Project priority / 项目优先级

Manual priority belongs to an annual engagement, including ordinary and holding-company engagements. It never changes a company master, reporting period, deadline, outstanding status, workflow condition or consolidation scope.

## Set and use

Choose **Urgent / High / Normal / Low** in the compact quick-update strip. This explicit selection applies immediately; it is separate from any unsaved owner/date/note draft. The backup menu still reports actual persistence status. Archived projects display a disabled control.

The annual creation/edit form also provides the same field. Changes there apply only when the form is saved; cancelling discards them.

- Home **Active engagements**: priority first, then earliest deadline; undated work last within each level. Identical keys retain their previous order.
- Flat **Projects** list: priority first; the existing schedule/company/period ordering breaks ties. Company hierarchy and the saved schedule order are not rewritten.
- Home **Priority actions**: manually urgent/high unfinished work has its own entry even without pending requests. Overdue/today deadline alerts remain first; manual urgent comes before upcoming deadlines, manual high after them. **Manual priority** filters only these entries. Completed/archived work leaves this queue without erasing its saved priority.

Normal is the default. New reporting-year projects start at Normal unless explicitly assigned another level; copying last year's workflow does not copy its urgency. Setting one annual project's priority does not change another year's priority.

## Storage and compatibility

The V11 envelope has an optional `engagement.priority` enum (`urgent`, `high`, `normal`, `low`). Absence means Normal; serialized Normal is omitted. Ordinary legacy reads with no priority remain unchanged. Invalid supplied enums are rejected by workspace validation, not silently imported.

Priority is retained through normalization, runtime compatibility views, company/holding conversion, backup export/restore and existing linked-file serialization. This is not a change log or cloud synchronization. Older application pages do not understand this field: save/export as appropriate and update old pages before editing a priority-enabled workspace.

## 中文操作说明

在项目的紧凑快速更新栏选择“紧急／高／普通／低”，即应用于当前年度项目。新建、编辑年度项目时也可选择，表单内仍需点击保存。

首页“进行中的项目”和扁平“项目”列表按优先级排列；同级在首页按截止日、在项目列表保留原有排序。公司树和排期顺序不变。高／紧急的未完成项目也进入首页“优先处理”，可用“手工优先”筛选；已经逾期或今天到期的期限仍先显示。

默认普通，新年度不自动沿用旧年度的紧急等级；不修改任何审计勾选、税务期限或合并范围。不新增客户资料上传或自动外发。界面显示“已应用”不代表关联文件必定已同步；失败时先导出当前已应用资料。
