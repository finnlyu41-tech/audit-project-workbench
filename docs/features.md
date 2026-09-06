# Feature reference / 功能详解

[Product overview](../README.md) · [中文介绍](../README.zh-CN.md)

This reference retains the detailed capability list. For operating behavior and limitations, use the linked documents below. It is not a guarantee of regulatory compliance or support on every device.

## 中文功能详解

- 默认首页把活跃项目、已完成项目、需关注期限和待清事项放在第一屏，并按逾期／今日到期、即将到期、资料不完整、尚未建立项目及待清事项排序“优先处理”清单；每项都可直接进入对应项目、期限或建立项目界面。
- Obsidian 式主工作区布局：左侧可在公司层级与年度项目平铺列表之间切换，中间为宽工作区，右侧为按需待清中心；左右区域均可收起，导航栏宽度也可拖动调整并保存。公司视图可一键展开或收起全部公司，并以加减号和连续层级线明确显示控股关系；项目视图直接显示公司、明确年结／DOI 期间、项目类型、负责人和进度。
- 最左侧采用固定窄工具栏，以统一线性图标收纳首页、项目排期、范本、指南、设置、备份和语言；悬停或键盘聚焦会显示完整功能说明，同时保留无障碍名称。建立公司仍放在项目导航的视觉热区。
- 内置分章节使用指南，逐项说明入口、操作步骤和完成结果。
- 新建公司只建立长期主档，不混入年度项目设置；主体类型可直接输入有限公司、个人独资、合伙企业或其他形式，且与是否启用控股公司架构分开。控股归属角色只在选定母公司后显示。“集团批量”可在同一个窗口建立集团主档、多家成员公司、各自主体类型、默认会计年度及集团角色。
- 同一公司既可建立多个互相独立的年度项目，也可把一起开票、一起执行的多个报告年度放进同一个项目，共用项目类型、负责人、排期、模块、待清事项和进度。自然年输入 `2025` 会生成 `2025-01-01 → 2025-12-31`，4 月制输入 `2025/26` 会生成 `2025-04-01 → 2026-03-31`；首个项目可从成立／开始日期（DOI）延伸至相应年结日。任何自动日期均可修改；同一公司不能在其他项目重复占用相同报告期间，归档项目也参与检查。
- 年度项目可多选预设项目类型并添加自定义类型，同时记录财务报告准则／框架、负责人、报告期间、项目开始日及截止日；新年度可以从空白、范本或上一年度结构建立，但不会带入旧负责人、执行日期、完成状态、待清事项或实际税务期限。
- 项目排期按公司合并显示各年度项目，公司名称与年结日／报告期间分行呈现；公司资料栏可拖动调整宽度并保存。时间精度可在天、周、月之间切换；排期支持拖动排序、键盘调整、横向滚动、今天定位及红色虚线、逾期与日期缺失提示。项目排期使用同一个日历先后点选开始日和截止日；工期条悬停显示完整日期，归档记录保持只读。
- 独立税务期限台账保存在公司主档，支持每家公司或控股公司保存多项报税、缴税、雇主报税表及自定义期限；逐项设置课税年度、负责人、提醒天数、年度项目／税务模块关联、参考编号和备注，改期时强制记录原因并保留完整历史。
- 铃铛提醒纳入项目逾期，以及已逾期、今日到期或进入提醒期的税务期限；排期图以同日可合并计数的菱形标记显示税务日期。业务模块不再另设日期，已完成项目仍保留税务提醒，归档记录则退出提醒。
- 年度项目可不启用任何业务模块而先作为空白委聘建立，也可并行启用账务处理、审计、税务及其他模块。负责人和日期统一由年度项目管理；业务模块只保存流程、完成条件和进度。业务模块、节点及完成条件均可拖动排序。点击模块才展开其节点，再点击可收起；点击节点才展开其里程碑条件，再点击同样可收起。
- 项目显示“已完成模块数／全部模块数”，只有全部启用模块完成后才算完成，不使用容易误导的混合百分比。
- 多层控股公司结构：公司主档保存当前归属；每个控股公司年度项目冻结建立当时的直属组成部分快照，可按完整报告期间匹配下属项目，并由使用者明确同步后续架构变化。
- 控股公司总览以紧凑状态栏显示组成部分进度、公司合并就绪、本级合并流程及未清事项，让公司清单和合并节点优先进入首屏。
- 公司可按本团队审计、其他审计师或管理账设置不同的合并就绪条件。
- 公司资料可直接选择或变更所属控股公司；控股公司资料可集中添加、移除及修改公司与中间控股公司。公司与控股公司可在资料编辑页双向转换，原业务模块或合并结构会保留以便日后恢复。
- 控股公司的待清事项与下级公司事项集中汇总，同时保留来源和跳转入口。
- 节点横向排列；所选节点的达成条件固定显示在下方，不会把相邻节点推离视野。内置流程每个节点只保留一至两个重要里程碑条件，自定义范本不受改写。
- 独立待清中心不影响节点进度；“未清／已清（归档）／全部”切换可随时找回已清事项并恢复状态。状态可新增、改名、排序、定义“已清”语义并自定义颜色，事项可归属项目级或指定业务模块。
- 范本库按业务模块分类，每类可保存多个范本；范本及其中节点可编辑、排序和删除，另有控股公司范本保存合并节点和审计类别默认就绪条件。范本可加标签和版本备注，并以经过结构验证、不会携带公司或税务资料的 `.apw-template.json` 范本包选择导出、预览导入、另存副本或明确覆盖。
- 中央管理层报告提供项目组合、单一公司及控股公司视图，可按状态、负责人、控股层级、项目日期、业务模块及期限紧急程度筛选，显示可排序明细与风险清单，并以连续打印页保存为 PDF，不再产生空白首页或尾页；报告不包含待清备注或税务参考编号。
- 范本公司名称精确去敏：只替换使用者输入的完整公司名称，不自动猜测。
- 英文为新使用者的默认界面，并提供完整的简体中文和繁体中文切换；内置内容随语言切换，自定义范本、项目类型和使用者资料保持原文。
- 在常见桌面宽度和浏览器缩放下优先保持紧凑信息密度；进度统一使用绿色圆环，卡片和表格文字会完整换行，极窄位置可悬停或键盘聚焦查看完整值。长表单在弹窗内独立滚动；工作区提供返回／前进视图历史，编辑年度项目时可直接建立下一年度。
- 公司主档和年度项目分别管理归档生命周期；年度项目可单独归档，公司主档则须先归档旗下所有活跃项目。归档详情只读，永久删除公司时会明确包含旗下年度项目和公司级税务期限。
- 支持将 V1–V10 浏览器资料、备份和本地文件迁移为 V11；迁移不会按名称自动合并公司，并会保留一份可下载的迁移前 V10 恢复副本。重复公司可通过预览工具由使用者确认合并。
- 默认使用本机浏览器自动保存，也可关联持续同步的 `.apw.json` 本地文件；浏览器安全副本、明确的同步状态、重新授权、双向冲突保护、未同步离开提醒、JSON 备份及安全初始化共同防止静默遗失资料。

## Features in detail

- Home is the default landing view, combining active and completed engagements, deadline attention and outstanding-item counts with a ranked Priority actions list. Overdue and due-today work comes first, followed by upcoming deadlines, incomplete setup, companies without an active engagement and outstanding items; every row opens the exact place where action is required.
- An Obsidian-inspired, centre-first desktop layout with switchable company-hierarchy and flat annual-project navigation, a wide company/holding-company workspace and an on-demand outstanding centre. The company view can expand or collapse every branch in one action and retains exact-level drag-and-drop plus continuous hierarchy guides; the project view surfaces company, explicit year end or DOI period, engagement types, owner and progress directly.
- Consistent line icons condense Home, project scheduling, deadline alerts, templates, guidance, settings, backup, language and workspace actions; hover or keyboard focus reveals the full explanation while preserving accessible names. Record creation stays in the navigation work area.
- A built-in, sectioned user guide explaining each entry point, procedure and expected result.
- New company creates a company master only. Its free-text entity type (limited company, sole proprietorship, partnership, individual or another form) is independent from the holding-company structure control; relationship fields appear only after a parent is selected. Holding company batch mode creates one holding-company master and multiple member companies, including their entity types, fiscal-year defaults and relationship roles, in the same window.
- One company can carry several independent annual engagements, or combine reporting years that are billed and performed together inside one engagement. Combined periods share the engagement types, owner, schedule, workstreams, outstanding items and progress. Calendar year `2025` generates `2025-01-01 → 2025-12-31`; April-to-March `2025/26` generates `2025-04-01 → 2026-03-31`. A first period can run from the incorporation/commencement date (DOI) to the applicable year end. Generated dates remain editable, and another engagement cannot reuse any identical period, including an archived engagement.
- Annual engagements support multiple suggested engagement types plus custom types, alongside the reporting framework, owner, authoritative reporting-period dates and separate project start/deadline dates. A new year can start blank, from a template or from the prior year's structure without copying owners, operating dates, completion, outstanding items or actual tax deadlines.
- The horizontally scrollable schedule groups annual engagements beneath each company and puts the year-end or reporting period on its own line. Day, week and month precision is saved; the identity column is resizable, rows support drag-and-drop and keyboard ordering, and today is marked with a red dashed line. A single two-click calendar sets the project range, while hovering a duration bar reveals its full dates; archived rows remain read-only.
- A persistent deadline-alert badge counts overdue annual engagements and tax deadlines that are overdue or inside their reminder window; its compact list links directly to the source record. Workstreams no longer create separate date alerts.
- A company-level tax-deadline register stores multiple filing, payment, employer-return or custom deadlines for each company or holding company, with per-item lead time, year of assessment, owner, optional engagement/workstream link, reference, notes and mandatory reasons for every saved date change.
- Tax deadlines enter the alert centre when overdue, due today or inside their own reminder window, and appear as same-day-counted diamond markers on the schedule. They remain independent of project completion and disappear only when completed, marked not applicable or archived.
- An annual engagement may start blank with no workstream enabled. Bookkeeping, audit, tax and other optional parallel workstreams keep workflow, objective milestone criteria and progress, while owner and schedule stay at annual-engagement level. Workstreams, stages and criteria can all be reordered by drag or keyboard. Selecting a workstream reveals its stages; selecting a stage reveals its milestone criteria, and either level can be collapsed again.
- Project completion shown as completed workstreams out of total workstreams; all enabled workstreams must finish before the project completes.
- Multi-level holding structures whose company masters record the current hierarchy. Each holding-company engagement freezes its direct-component snapshot, matches subsidiaries by exact reporting period and changes only after an explicit structure sync.
- A compact holding-company status strip for component progress, company readiness, consolidation progress and open items, keeping the company matrix and consolidation stages in the first screenful.
- Companies use readiness defaults for internal audits, other component auditors or management accounts.
- Company details can change holding-company assignment directly, while holding-company details manage companies and intermediate holding companies in one member roster. A record can convert in either direction between company and holding company while retaining recoverable workflow or consolidation state.
- Holding-company outstanding items roll up subsidiary and intermediate holding-company items while preserving their source and navigation.
- Compact green circular progress rings replace linear progress bars across the workbench, while schedule duration bars retain their timeline form. Long labels wrap or expose their full value without overlapping controls.
- A separate outstanding centre that never changes stage progress, with explicit Open, Cleared / archived and All views plus custom labels, ordering, cleared-state semantics and colours; items can be project-level or linked to a workstream.
- Multiple templates per workstream category, user-defined category names and ordering, plus separate holding-company templates for consolidation stages and readiness defaults. Tags, version notes and validated `.apw-template.json` packages support selective export, import preview, safe copies and explicit replacement without carrying company, owner, outstanding-item or tax data.
- Centre-canvas management reports cover the portfolio, one company or one holding company, with composable filters, sortable detail, risk lists and continuous print-to-PDF styling without blank first or last pages. Outstanding notes and tax references are deliberately excluded.
- Exact-match company-name de-identification within templates.
- English is the default for new users, with complete Simplified Chinese and Traditional Chinese interfaces available; built-in content follows the interface language while custom content remains unchanged.
- Responsive desktop rules reflow panes, controls and forms cleanly under narrower windows and browser zoom. Important boxed text wraps in full where practical, remaining overflow exposes the complete value on hover/focus, long dialogs scroll internally, and compact view-history controls revisit prior screens. Annual-engagement editing can open the next-year form directly.
- Company masters and annual engagements have separate archive lifecycles. An engagement can be archived alone; a company master requires all active engagements to be archived first. Archived records are read-only, and company deletion explicitly includes all annual engagements and company-level tax deadlines.
- V1–V10 browser data, backups and linked files can migrate to V11 without name-based merging. The first migration retains a downloadable V10 recovery source, while a previewed tool lets the user merge genuine duplicate company masters intentionally.
- Browser-local autosave by default, with an optional continuously synced `.apw.json` local file, a browser safety copy, explicit save status, permission recovery, two-sided conflict protection, unsynced-leave warnings, JSON backup and protected initialisation.

## Workflow and data boundaries

See [continuous entry and client follow-up](client-follow-up.md), [lightweight outstanding centre](outstanding-light.md), [data and privacy](privacy.md), [window ownership](workspace-window-safety.md), [architecture](architecture.md), and [licensing](licensing.md).
