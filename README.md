# APW — Audit Project Workbench

一个以英文为默认界面、面向电脑窗口并以本机数据为主的专业服务项目进度工作台。公司主档长期保存法律实体、控股层级、税务期限和默认会计年度；FY2023、FY2024、FY2025 等年度项目则分别保存报告期间、负责人、排期、模块、节点、待清事项和进度。

**[直接打开在线工作台](https://finnlyu41-tech.github.io/audit-project-workbench/)**

> This repository is bilingual. The English introduction follows the Chinese section.

## 主要功能

- Obsidian 式主工作区布局：左侧紧凑树状导航、中间宽工作区、右侧按需待清中心；左右区域均可收起，导航栏宽度也可拖动调整并保存。导航以法律实体为主标识，在公司下面展开各年度项目；可拖动公司或控股公司改变当前归属及层级，并以加减号和连续层级线明确显示控股关系。
- 最左侧采用固定窄工具栏，以统一线性图标收纳项目排期、范本、指南、设置、备份和语言；悬停或键盘聚焦会显示完整功能说明，同时保留无障碍名称。建立公司仍放在项目导航的视觉热区。
- 内置分章节使用指南，逐项说明入口、操作步骤和完成结果。
- 新建公司只建立长期主档，不混入年度项目设置；主体类型可直接输入有限公司、个人独资、合伙企业或其他形式，且与是否启用控股公司架构分开。控股归属角色只在选定母公司后显示。
- 同一公司可建立多个互相独立的年度项目。自然年输入 `2025` 会生成 `2025-01-01 → 2025-12-31`，4 月制输入 `2025/26` 会生成 `2025-04-01 → 2026-03-31`；首个项目可从成立／开始日期（DOI）延伸至相应年结日。任何自动日期均可修改，完全相同的期间不会重复建立。
- 年度项目记录可自定义项目类型、财务报告准则／框架、负责人、报告期间、项目开始日及截止日；新年度可以从空白、范本或上一年度结构建立，但不会带入旧负责人、执行日期、完成状态、待清事项或实际税务期限。
- 项目排期按公司合并显示各年度项目，公司名称与年结日／报告期间分行呈现；公司资料栏可拖动调整宽度并保存。排期支持拖动排序、键盘调整、横向滚动、今天定位及红色虚线、逾期与日期缺失提示；点击名称返回详情，点击日历或工期条可直接编辑开始日和截止日，归档记录则保持只读。
- 独立税务期限台账保存在公司主档，支持每家公司或控股公司保存多项报税、缴税、雇主报税表及自定义期限；逐项设置课税年度、负责人、提醒天数、年度项目／税务模块关联、参考编号和备注，改期时强制记录原因并保留完整历史。
- 铃铛提醒同时纳入已逾期、今日到期及进入提醒期的税务期限；排期图以同日可合并计数的菱形标记显示税务日期。已完成项目仍保留税务提醒，归档记录则退出提醒。
- 年度项目可不启用任何业务模块而先作为空白委聘建立，也可并行启用账务处理、审计、税务及其他模块；业务模块、节点及完成条件均可拖动排序。点击模块才展开其节点，再点击可收起；点击节点才展开其里程碑条件，再点击同样可收起。
- 项目显示“已完成模块数／全部模块数”，只有全部启用模块完成后才算完成，不使用容易误导的混合百分比。
- 多层控股公司结构：公司主档保存当前归属；每个控股公司年度项目冻结建立当时的直属组成部分快照，可按完整报告期间匹配下属项目，并由使用者明确同步后续架构变化。
- 控股公司总览以紧凑状态栏显示组成部分进度、公司合并就绪、本级合并流程及未清事项，让公司清单和合并节点优先进入首屏。
- 公司可按本团队审计、其他审计师或管理账设置不同的合并就绪条件。
- 公司资料可直接选择或变更所属控股公司；控股公司资料可集中添加、移除及修改公司与中间控股公司。公司与控股公司可在资料编辑页双向转换，原业务模块或合并结构会保留以便日后恢复。
- 控股公司的待清事项与下级公司事项集中汇总，同时保留来源和跳转入口。
- 节点横向排列；所选节点的达成条件固定显示在下方，不会把相邻节点推离视野。内置流程每个节点只保留一至两个重要里程碑条件，自定义范本不受改写。
- 独立待清中心不影响节点进度；状态可新增、改名、排序、定义“已清”语义并自定义颜色，事项可归属项目级或指定业务模块。
- 范本库按业务模块分类，每类可保存多个范本；范本及其中节点可编辑、排序和删除，另有控股公司范本保存合并节点和审计类别默认就绪条件。范本可加标签和版本备注，并以经过结构验证、不会携带公司或税务资料的 `.apw-template.json` 范本包选择导出、预览导入、另存副本或明确覆盖。
- 中央管理层报告提供项目组合、单一公司及控股公司视图，可按状态、负责人、控股层级、项目日期、业务模块及期限紧急程度筛选，显示可排序明细与风险清单，并以专用打印样式保存为 PDF；报告不包含待清备注或税务参考编号。
- 范本公司名称精确去敏：只替换使用者输入的完整公司名称，不自动猜测。
- 英文为新使用者的默认界面，并提供完整的简体中文和繁体中文切换；内置内容随语言切换，自定义范本、项目类型和使用者资料保持原文。
- 在常见桌面宽度和浏览器缩放下优先保持紧凑信息密度；进度统一使用绿色圆环，卡片和表格文字会完整换行，极窄位置可悬停或键盘聚焦查看完整值。长表单在弹窗内独立滚动；工作区提供返回／前进视图历史，编辑年度项目时可直接建立下一年度。
- 公司主档和年度项目分别管理归档生命周期；年度项目可单独归档，公司主档则须先归档旗下所有活跃项目。归档详情只读，永久删除公司时会明确包含旗下年度项目和公司级税务期限。
- V1–V10 浏览器资料、备份和本地文件会无损迁移为 V11；迁移不会按名称自动合并公司，并会保留一份可下载的迁移前 V10 恢复副本。重复公司可通过预览工具由使用者确认合并。
- 默认使用本机浏览器自动保存，也可关联持续同步的 `.apw.json` 本地文件；浏览器安全副本、明确的同步状态、重新授权、双向冲突保护、未同步离开提醒、JSON 备份及安全初始化共同防止静默遗失资料。

## 快速开始

需要 Node.js 20.19 或以上版本，并建议使用 Corepack 提供的 pnpm。

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

发布前检查：

```bash
pnpm check
```

## 数据与隐私

项目资料默认保存在当前浏览器来源的 `localStorage`；如使用者主动关联本地文件，资料还会写入该文件，文件授权则仅保存在当前浏览器的 IndexedDB。应用没有后端，也不会主动上传资料。工作台文件和导出的 JSON 备份可能包含客户名称及审计状态，请按机密审计资料处理，不要提交到公开仓库。详见 [隐私与数据边界](docs/privacy.md)。

## 项目方向

当前版本刻意保持简单，重点是可靠地追踪进度、期限及可携带的流程范本。后续方向包括可选择的团队同步、权限角色和审计轨迹；任何联网功能都应保持可选，并清楚区分客户数据与公开模板。详见 [路线图](ROADMAP.md)。

## 参与贡献

欢迎提交问题和改进。请先阅读 [贡献指南](CONTRIBUTING.md)、[行为准则](CODE_OF_CONDUCT.md)及 [安全政策](SECURITY.md)。

## English

Audit Project Workbench (APW) is an English-first, desktop-first and local-first tracker for professional-service work. A long-lived company master stores the legal entity, current holding structure, tax deadlines and fiscal-year default. Independent FY2023, FY2024, FY2025 and other annual engagements store their own reporting period, owner, schedule, workstreams, outstanding items and progress.

### Features

- An Obsidian-inspired, centre-first desktop layout with compact tree navigation, a wide company/holding-company workspace and an on-demand outstanding centre. Navigation prioritises each legal entity and expands its annual engagements; current holding assignments support exact-level drag-and-drop, explicit plus/minus disclosure controls and continuous hierarchy guides.
- Consistent line icons condense project scheduling, deadline alerts, templates, guidance, settings, backup, language and workspace actions; hover or keyboard focus reveals the full explanation while preserving accessible names. Record creation stays in the navigation work area.
- A built-in, sectioned user guide explaining each entry point, procedure and expected result.
- New company creates a company master only. Its free-text entity type (limited company, sole proprietorship, partnership, individual or another form) is independent from the holding-company structure control; relationship fields appear only after a parent is selected.
- One company can carry several independent annual engagements. Calendar year `2025` generates `2025-01-01 → 2025-12-31`; April-to-March `2025/26` generates `2025-04-01 → 2026-03-31`. A first period can run from the incorporation/commencement date (DOI) to the applicable year end. Generated dates remain editable, and duplicate periods are rejected even when archived.
- Annual engagements capture a customisable engagement type, reporting framework, owner, authoritative reporting-period dates and separate project start/deadline dates. A new year can start blank, from a template or from the prior year's structure without copying owners, operating dates, completion, outstanding items or actual tax deadlines.
- The horizontally scrollable weekly schedule groups annual engagements beneath each company and puts the year-end or reporting period on its own line. Its identity column is resizable and saved; rows support drag-and-drop ordering and keyboard movement, today is marked with a red dashed line, and overdue or incomplete dates stay visible. Choose a name for record details or a calendar/bar to edit dates directly; archived rows remain read-only.
- A persistent deadline-alert badge counts active overdue company, holding-company and distinct workstream deadlines; its compact list is ordered by days overdue and links directly to the source record. Completed, rescheduled or archived work clears automatically.
- A company-level tax-deadline register stores multiple filing, payment, employer-return or custom deadlines for each company or holding company, with per-item lead time, year of assessment, owner, optional engagement/workstream link, reference, notes and mandatory reasons for every saved date change.
- Tax deadlines enter the alert centre when overdue, due today or inside their own reminder window, and appear as same-day-counted diamond markers on the schedule. They remain independent of project completion and disappear only when completed, marked not applicable or archived.
- An annual engagement may start blank with no workstream enabled. Bookkeeping, audit, tax and other optional parallel workstreams retain independent owners, deadlines, horizontal stages and objective completion criteria. Workstreams, stages and criteria can all be reordered by drag or keyboard. Selecting a workstream reveals its stages; selecting a stage reveals its milestone criteria, and either level can be collapsed again.
- Project completion shown as completed workstreams out of total workstreams; all enabled workstreams must finish before the project completes.
- Multi-level holding structures whose company masters record the current hierarchy. Each holding-company engagement freezes its direct-component snapshot, matches subsidiaries by exact reporting period and changes only after an explicit structure sync.
- A compact holding-company status strip for component progress, company readiness, consolidation progress and open items, keeping the company matrix and consolidation stages in the first screenful.
- Companies use readiness defaults for internal audits, other component auditors or management accounts.
- Company details can change holding-company assignment directly, while holding-company details manage companies and intermediate holding companies in one member roster. A record can convert in either direction between company and holding company while retaining recoverable workflow or consolidation state.
- Holding-company outstanding items roll up subsidiary and intermediate holding-company items while preserving their source and navigation.
- Compact green circular progress rings replace linear progress bars across the workbench, while schedule duration bars retain their timeline form. Long labels wrap or expose their full value without overlapping controls.
- A separate outstanding centre that never changes stage progress, with custom labels, ordering, cleared-state semantics and colours; items can be project-level or linked to a workstream.
- Multiple templates per workstream category, user-defined category names and ordering, plus separate holding-company templates for consolidation stages and readiness defaults. Tags, version notes and validated `.apw-template.json` packages support selective export, import preview, safe copies and explicit replacement without carrying company, owner, outstanding-item or tax data.
- Centre-canvas management reports cover the portfolio, one company or one holding company, with composable filters, sortable detail, risk lists and print-to-PDF styling. Outstanding notes and tax references are deliberately excluded.
- Exact-match company-name de-identification within templates.
- English is the default for new users, with complete Simplified Chinese and Traditional Chinese interfaces available; built-in content follows the interface language while custom content remains unchanged.
- Responsive desktop rules reflow panes, controls and forms cleanly under narrower windows and browser zoom. Important boxed text wraps in full where practical, remaining overflow exposes the complete value on hover/focus, long dialogs scroll internally, and compact view-history controls revisit prior screens. Annual-engagement editing can open the next-year form directly.
- Company masters and annual engagements have separate archive lifecycles. An engagement can be archived alone; a company master requires all active engagements to be archived first. Archived records are read-only, and company deletion explicitly includes all annual engagements and company-level tax deadlines.
- V1–V10 browser data, backups and linked files migrate losslessly to V11 without name-based merging. The first migration retains a downloadable V10 recovery source, while a previewed tool lets the user merge genuine duplicate company masters intentionally.
- Browser-local autosave by default, with an optional continuously synced `.apw.json` local file, a browser safety copy, explicit save status, permission recovery, two-sided conflict protection, unsynced-leave warnings, JSON backup and protected initialisation.

### Local development

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Run `pnpm check` before opening a pull request.

This tool supports progress tracking only. Audit judgement, evidence assessment, sign-off and filing remain the responsibility of qualified people.

## License

[MIT](LICENSE)
