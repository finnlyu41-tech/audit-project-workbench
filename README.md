# APW — Audit Project Workbench

一个面向电脑窗口、以本机数据为主的专业服务项目进度工作台。每个项目是年度委聘的总容器，可并行管理审计、报价与收款、税务计算及报税、客户尽职调查和自定义业务模块；会持续变化的待清事项则保持独立。

**[直接打开在线工作台](https://finnlyu41-tech.github.io/audit-project-workbench/)**

> This repository is bilingual. The English introduction follows the Chinese section.

## 主要功能

- 固定三区桌面布局：左侧项目导航、中间项目／集团工作区、右侧待清中心；左右区域均可收起。
- 顶部操作按用途分为新建、范本库、备份及语言四组；常用入口直接显示，同类次要操作才使用短菜单。
- 每个项目可启用多个并行业务模块，各自拥有负责人、截止日、横向节点和客观达成条件。
- 项目显示“已完成模块数／全部模块数”，只有全部启用模块完成后才算完成，不使用容易误导的混合百分比。
- 多层集团审计：集团可包含公司项目或子集团，每一级可选择独立合并流程或仅作分类。
- 集团总览同时显示公司平均进度、合并流程进度、70%／30%整体进度及公司合并就绪门槛。
- 公司可新建或关联现有项目，并按本团队审计、其他审计师或管理账设置不同的合并就绪条件。
- 公司资料可直接选择或变更所属集团；集团资料可集中添加、移除及修改公司与子集团。
- 集团待清事项与下级公司事项集中汇总，同时保留来源和跳转入口。
- 节点横向排列；所选节点的达成条件固定显示在下方，不会把相邻节点推离视野。
- 独立待清中心不影响节点进度；状态可新增、改名、排序、定义“已清”语义并自定义颜色，事项可归属项目级或指定业务模块。
- 范本库按业务模块分类，每类可保存多个范本；另有集团范本保存合并节点和审计类别默认就绪条件。
- 范本公司名称精确去敏：只替换使用者输入的完整公司名称，不自动猜测。
- 完整的简体中文、繁体中文和英文系统界面；内置内容随语言切换，自定义范本、项目名称和使用者资料保持原文。
- 归档项目和集团与活跃统计及汇总隔离；归档详情只读，只可恢复或永久删除。
- 本机浏览器自动保存，并支持 JSON 备份导入、导出。

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

Audit Project Workbench (APW) is a desktop-first, local-first tracker for professional-service engagements. Each project is an annual engagement container with parallel workstreams for audit, quotation and collection, tax computation and filing, customer due diligence, or custom services. Fluid outstanding items remain separate from workflow completion.

### Features

- A fixed three-pane desktop layout: project navigation, project/group workspace and outstanding centre, with collapsible side panes.
- A purpose-grouped toolbar for creating records, opening the template library, managing backups and changing language; frequent actions stay visible while related secondary actions use short menus.
- Parallel workstreams with independent owners, deadlines, horizontal stages and objective completion criteria.
- Project completion shown as completed workstreams out of total workstreams; all enabled workstreams must finish before the project completes.
- Multi-level group audits with company projects, optional subgroup consolidation workflows and classification-only levels.
- A group dashboard showing company-average progress, consolidation progress, a 70% / 30% overall score and explicit readiness gates.
- New or existing company projects can be linked to a group with readiness defaults for internal audits, other component auditors or management accounts.
- Company details can change group assignment directly, while group details manage companies and subgroups in one member roster.
- Group outstanding items roll up company and subgroup items while preserving their source and navigation.
- Horizontal stages with a stable detail panel below, so opening one stage never displaces its neighbours.
- A separate outstanding centre that never changes stage progress, with custom labels, ordering, cleared-state semantics and colours; items can be project-level or linked to a workstream.
- Multiple templates per workstream category plus separate group templates for consolidation stages and readiness defaults.
- Exact-match company-name de-identification within templates.
- Complete Simplified Chinese, Traditional Chinese and English system UI; built-in content follows the interface language while custom content remains unchanged.
- Archived records are isolated from active calculations and are read-only until restored; permanent deletion is available only from the archive.
- Browser-local autosave plus JSON backup and restore.

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
