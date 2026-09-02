# APW — Audit Project Workbench

一个以英文为默认界面、面向电脑窗口并以本机数据为主的专业服务项目进度工作台。每家公司是年度委聘的总容器，可并行管理审计、报价与收款、税务计算及报税、客户尽职调查和自定义业务模块；会持续变化的待清事项则保持独立。

**[直接打开在线工作台](https://finnlyu41-tech.github.io/audit-project-workbench/)**

> This repository is bilingual. The English introduction follows the Chinese section.

## 主要功能

- Obsidian 式主工作区布局：左侧紧凑树状导航、中间宽工作区、右侧按需待清中心；左右区域均可收起，窄桌面窗口展开待清中心时不会挤压工作区。项目导航提供统一的“新建公司”入口，可拖动公司或控股公司改变归属及层级，并以加减号和连续层级线明确显示控股关系。
- 顶部和工作区采用统一线性图标压缩高频操作；悬停或键盘聚焦会显示完整功能说明，同时保留无障碍名称。建立公司仍放在项目导航的视觉热区。
- 内置分章节使用指南，逐项说明入口、操作步骤和完成结果。
- 每个项目记录法律实体、可自定义财务报告准则／框架，以及可覆盖短期或长期间的报告期开始日和结束日；多个业务模块可并行启用，并各自拥有负责人、截止日、横向节点和客观达成条件。
- 项目显示“已完成模块数／全部模块数”，只有全部启用模块完成后才算完成，不使用容易误导的混合百分比。
- 多层控股公司结构：控股公司可包含公司或中间控股公司，每一级可选择独立合并流程或仅作层级分类。
- 控股公司总览以紧凑状态栏显示组成部分进度、公司合并就绪、本级合并流程及未清事项，让公司清单和合并节点优先进入首屏。
- 公司可按本团队审计、其他审计师或管理账设置不同的合并就绪条件。
- 公司资料可直接选择或变更所属控股公司；控股公司资料可集中添加、移除及修改公司与中间控股公司。
- 控股公司的待清事项与下级公司事项集中汇总，同时保留来源和跳转入口。
- 节点横向排列；所选节点的达成条件固定显示在下方，不会把相邻节点推离视野。
- 独立待清中心不影响节点进度；状态可新增、改名、排序、定义“已清”语义并自定义颜色，事项可归属项目级或指定业务模块。
- 范本库按业务模块分类，每类可保存多个范本；范本及其中节点可编辑、排序和删除，删除不会追溯改变既有项目；另有控股公司范本保存合并节点和审计类别默认就绪条件。
- 范本公司名称精确去敏：只替换使用者输入的完整公司名称，不自动猜测。
- 英文为新使用者的默认界面，并提供完整的简体中文和繁体中文切换；内置内容随语言切换，自定义范本、项目名称和使用者资料保持原文。
- 在常见桌面宽度和浏览器缩放下优先保持单行信息密度；待清中心以固定右侧抽屉呈现，收起后仍保留可见图标入口，并避免页面横向截断。
- 归档公司和控股公司与活跃统计及汇总隔离；归档详情只读，只可恢复或永久删除。
- 本机浏览器自动保存，并支持 JSON 备份导入、导出及受保护的工作台初始化。

## 快速开始

需要 Node.js 20.19 或以上版本，并建议使用 Corepack 提供的 pnpm。

```bash
corepack enable
pnpm install
pnpm dev
```

发布前检查：

```bash
pnpm check
```

## 数据与隐私

项目资料保存在当前浏览器来源的 `localStorage`，应用没有后端，也不会主动上传资料。导出的 JSON 备份可能包含客户名称和审计状态，请按机密审计资料处理，不要提交到公开仓库。详见 [隐私与数据边界](docs/privacy.md)。

## 项目方向

当前版本刻意保持简单，重点是可靠地追踪进度。后续方向包括可选择的团队同步、权限角色、审计轨迹和范本导入导出；任何联网功能都应保持可选，并清楚区分客户数据与公开模板。详见 [路线图](ROADMAP.md)。

## 参与贡献

欢迎提交问题和改进。请先阅读 [贡献指南](CONTRIBUTING.md)、[行为准则](CODE_OF_CONDUCT.md)及 [安全政策](SECURITY.md)。

## English

Audit Project Workbench (APW) is an English-first, desktop-first and local-first tracker for professional-service engagements. Each company is an annual engagement container with parallel workstreams for audit, quotation and collection, tax computation and filing, customer due diligence, or custom services. Fluid outstanding items remain separate from workflow completion.

### Features

- An Obsidian-inspired, centre-first desktop layout with compact tree navigation, a wide company/holding-company workspace and an on-demand outstanding centre. The side panes collapse, and opening outstanding items on a narrower desktop does not resize the workspace. Project navigation contains the single New company entry point, exact-level drag-and-drop reassignment, explicit plus/minus disclosure controls and continuous hierarchy guides.
- Consistent line icons condense frequent toolbar and workspace actions; hover or keyboard focus reveals the full explanation while preserving accessible names. Record creation stays in the navigation work area.
- A built-in, sectioned user guide explaining each entry point, procedure and expected result.
- Project details capture the legal entity, a customisable financial reporting standard or framework, and reporting-period start and end dates suitable for short or extended periods; parallel workstreams retain independent owners, deadlines, horizontal stages and objective completion criteria.
- Project completion shown as completed workstreams out of total workstreams; all enabled workstreams must finish before the project completes.
- Multi-level holding-company structures with companies, intermediate holding companies, optional consolidation workflows and hierarchy-only levels.
- A compact holding-company status strip for component progress, company readiness, consolidation progress and open items, keeping the company matrix and consolidation stages in the first screenful.
- Companies use readiness defaults for internal audits, other component auditors or management accounts.
- Company details can change holding-company assignment directly, while holding-company details manage companies and intermediate holding companies in one member roster.
- Holding-company outstanding items roll up subsidiary and intermediate holding-company items while preserving their source and navigation.
- Horizontal stages with a stable detail panel below, so opening one stage never displaces its neighbours.
- A separate outstanding centre that never changes stage progress, with custom labels, ordering, cleared-state semantics and colours; items can be project-level or linked to a workstream.
- Multiple templates per workstream category, user-defined category names and ordering, plus separate holding-company templates for consolidation stages and readiness defaults.
- Exact-match company-name de-identification within templates.
- English is the default for new users, with complete Simplified Chinese and Traditional Chinese interfaces available; built-in content follows the interface language while custom content remains unchanged.
- Responsive desktop rules reflow panes, controls and forms cleanly under narrower windows and browser zoom.
- Archived records are isolated from active calculations and are read-only until restored; permanent deletion is available only from the archive.
- Browser-local autosave, JSON backup and restore, plus protected workbench initialisation.

### Local development

```bash
corepack enable
pnpm install
pnpm dev
```

Run `pnpm check` before opening a pull request.

This tool supports progress tracking only. Audit judgement, evidence assessment, sign-off and filing remain the responsibility of qualified people.

## License

[MIT](LICENSE)
