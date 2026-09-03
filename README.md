# APW — Audit Project Workbench

一个以英文为默认界面、面向电脑窗口并以本机数据为主的专业服务项目进度工作台。每家公司是年度委聘的总容器，可并行管理审计、账务处理、报价与收款、税务计算及报税、客户尽职调查和自定义业务模块；会持续变化的待清事项则保持独立。

**[直接打开在线工作台](https://finnlyu41-tech.github.io/audit-project-workbench/)**

> This repository is bilingual. The English introduction follows the Chinese section.

## 主要功能

- Obsidian 式主工作区布局：左侧紧凑树状导航、中间宽工作区、右侧按需待清中心；左右区域均可收起，窄桌面窗口展开待清中心时不会挤压工作区。项目导航提供统一的“新建公司”入口，可拖动公司或控股公司改变归属及层级，并以加减号和连续层级线明确显示控股关系。
- 最左侧采用固定窄工具栏，以统一线性图标收纳项目排期、范本、指南、设置、备份和语言；悬停或键盘聚焦会显示完整功能说明，同时保留无障碍名称。建立公司仍放在项目导航的视觉热区。
- 内置分章节使用指南，逐项说明入口、操作步骤和完成结果。
- 每个项目记录法律实体、可自定义财务报告准则／框架，以及可覆盖短期或长期间的报告期开始日和结束日；项目执行另设独立开始日和截止日，避免与财务报告期间混淆。
- 项目排期以负责人、公司／控股公司和按周横向工期条呈现，支持横向滚动、今天定位及红色虚线、逾期提示、日期缺失提示、状态筛选及从排期直接返回项目；排期逻辑参考年度人员计划表，但不复制其中的客户资料。
- 独立税务期限台账支持每家公司或控股公司保存多项报税、缴税、雇主报税表及自定义期限；逐项设置课税年度、负责人、提醒天数、税务模块关联、参考编号和备注，改期时强制记录原因并保留完整历史。
- 铃铛提醒同时纳入已逾期、今日到期及进入提醒期的税务期限；排期图以同日可合并计数的菱形标记显示税务日期。已完成项目仍保留税务提醒，归档记录则退出提醒。
- 公司可不启用任何业务模块而先作为空容器建立，也可并行启用账务处理、审计、税务及其他模块；每个模块各自拥有负责人、截止日、横向节点和客观达成条件。
- 项目显示“已完成模块数／全部模块数”，只有全部启用模块完成后才算完成，不使用容易误导的混合百分比。
- 多层控股公司结构：控股公司可包含公司或中间控股公司，每一级可选择独立合并流程或仅作层级分类。
- 控股公司总览以紧凑状态栏显示组成部分进度、公司合并就绪、本级合并流程及未清事项，让公司清单和合并节点优先进入首屏。
- 公司可按本团队审计、其他审计师或管理账设置不同的合并就绪条件。
- 公司资料可直接选择或变更所属控股公司；控股公司资料可集中添加、移除及修改公司与中间控股公司。公司与控股公司可在资料编辑页双向转换，原业务模块或合并结构会保留以便日后恢复。
- 控股公司的待清事项与下级公司事项集中汇总，同时保留来源和跳转入口。
- 节点横向排列；所选节点的达成条件固定显示在下方，不会把相邻节点推离视野。
- 独立待清中心不影响节点进度；状态可新增、改名、排序、定义“已清”语义并自定义颜色，事项可归属项目级或指定业务模块。
- 范本库按业务模块分类，每类可保存多个范本；范本及其中节点可编辑、排序和删除，另有控股公司范本保存合并节点和审计类别默认就绪条件。范本可加标签和版本备注，并以经过结构验证、不会携带公司或税务资料的 `.apw-template.json` 范本包选择导出、预览导入、另存副本或明确覆盖。
- 中央管理层报告提供项目组合、单一公司及控股公司视图，可按状态、负责人、控股层级、项目日期、业务模块及期限紧急程度筛选，显示可排序明细与风险清单，并以专用打印样式保存为 PDF；报告不包含待清备注或税务参考编号。
- 范本公司名称精确去敏：只替换使用者输入的完整公司名称，不自动猜测。
- 英文为新使用者的默认界面，并提供完整的简体中文和繁体中文切换；内置内容随语言切换，自定义范本、项目名称和使用者资料保持原文。
- 在常见桌面宽度和浏览器缩放下优先保持单行信息密度；待清中心以固定右侧抽屉呈现，收起后仍保留可见图标入口，并避免页面横向截断。
- 归档公司和控股公司与活跃统计及汇总隔离；归档详情只读，只可恢复或永久删除。
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

Audit Project Workbench (APW) is an English-first, desktop-first and local-first tracker for professional-service engagements. Each company is an annual engagement container with optional parallel workstreams for bookkeeping, audit, quotation and collection, tax computation and filing, customer due diligence, or custom services. Fluid outstanding items remain separate from workflow completion.

### Features

- An Obsidian-inspired, centre-first desktop layout with compact tree navigation, a wide company/holding-company workspace and an on-demand outstanding centre. The side panes collapse, and opening outstanding items on a narrower desktop does not resize the workspace. Project navigation contains the single New company entry point, exact-level drag-and-drop reassignment, explicit plus/minus disclosure controls and continuous hierarchy guides.
- Consistent line icons condense project scheduling, deadline alerts, templates, guidance, settings, backup, language and workspace actions; hover or keyboard focus reveals the full explanation while preserving accessible names. Record creation stays in the navigation work area.
- A built-in, sectioned user guide explaining each entry point, procedure and expected result.
- Project details capture the legal entity, a customisable financial reporting standard or framework, reporting-period start and end dates, plus separate project start and deadline fields so the financial period is not confused with delivery timing.
- A horizontally scrollable weekly schedule groups companies and holding companies by owner, marks today with a red dashed line, highlights overdue or incomplete dates, follows the navigation status filter and links each bar back to the record. Its planning logic was informed by an annual staff plan without copying client data.
- A persistent deadline-alert badge counts active overdue company, holding-company and distinct workstream deadlines; its compact list is ordered by days overdue and links directly to the source record. Completed, rescheduled or archived work clears automatically.
- A separate tax-deadline register stores multiple filing, payment, employer-return or custom deadlines for each company or holding company, with per-item lead time, year of assessment, owner, optional workstream link, reference, notes and mandatory reasons for every saved date change.
- Tax deadlines enter the alert centre when overdue, due today or inside their own reminder window, and appear as same-day-counted diamond markers on the schedule. They remain independent of project completion and disappear only when completed, marked not applicable or archived.
- A company may start as an empty container with no workstream enabled. Bookkeeping, audit, tax and other optional parallel workstreams retain independent owners, deadlines, horizontal stages and objective completion criteria.
- Project completion shown as completed workstreams out of total workstreams; all enabled workstreams must finish before the project completes.
- Multi-level holding-company structures with companies, intermediate holding companies, optional consolidation workflows and hierarchy-only levels.
- A compact holding-company status strip for component progress, company readiness, consolidation progress and open items, keeping the company matrix and consolidation stages in the first screenful.
- Companies use readiness defaults for internal audits, other component auditors or management accounts.
- Company details can change holding-company assignment directly, while holding-company details manage companies and intermediate holding companies in one member roster. A record can convert in either direction between company and holding company while retaining recoverable workflow or consolidation state.
- Holding-company outstanding items roll up subsidiary and intermediate holding-company items while preserving their source and navigation.
- Horizontal stages with a stable detail panel below, so opening one stage never displaces its neighbours.
- A separate outstanding centre that never changes stage progress, with custom labels, ordering, cleared-state semantics and colours; items can be project-level or linked to a workstream.
- Multiple templates per workstream category, user-defined category names and ordering, plus separate holding-company templates for consolidation stages and readiness defaults. Tags, version notes and validated `.apw-template.json` packages support selective export, import preview, safe copies and explicit replacement without carrying company, owner, outstanding-item or tax data.
- Centre-canvas management reports cover the portfolio, one company or one holding company, with composable filters, sortable detail, risk lists and print-to-PDF styling. Outstanding notes and tax references are deliberately excluded.
- Exact-match company-name de-identification within templates.
- English is the default for new users, with complete Simplified Chinese and Traditional Chinese interfaces available; built-in content follows the interface language while custom content remains unchanged.
- Responsive desktop rules reflow panes, controls and forms cleanly under narrower windows and browser zoom.
- Archived records are isolated from active calculations and are read-only until restored; permanent deletion is available only from the archive.
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
