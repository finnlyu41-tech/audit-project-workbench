# APW — Audit Project Workbench

一个面向电脑窗口、以本机数据为主的审计项目进度工作台。它把“项目节点及达成条件”和会持续变化的“待清事项”分开管理，适合同时追踪多个审计项目。

**[直接打开在线工作台](https://finnlyu41-tech.github.io/audit-project-workbench/)**

> This repository is bilingual. The English introduction follows the Chinese section.

## 主要功能

- 多项目进度总览，按进行中、已完成和归档筛选。
- 每个项目可自定义节点、说明、顺序及达成条件；进度由条件自动计算。
- 独立待清事项栏，不影响节点进度；状态可新增、改名、排序，并可指定哪些状态代表“已清”。
- 可保存多个 Sample 流程范本，并可新建、切换、复制、编辑或删除，再用任一范本快速建立项目。
- Sample 公司名称精确去敏：只替换使用者输入的完整公司名称，不自动猜测。
- 完整的中英文系统界面；可精确识别的内置流程条目会随语言切换，其余自定义范本、项目名称和使用者资料保持原文。
- 可折叠项目侧栏，优先利用电脑横向空间。
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

Audit Project Workbench (APW) is a desktop-first, local-first tracker for managing several audit engagements. It deliberately separates workflow stages and their completion criteria from fluid outstanding items such as missing documents or signatures.

### Features

- Multi-engagement overview with active, completed and archived filters.
- Custom stages, descriptions, ordering and completion criteria with automatic progress.
- A separate outstanding-items bar that never changes stage progress, with custom names, ordering and cleared-state semantics.
- A multi-Sample library with create, select, duplicate, edit and delete controls; any Sample can start a new project.
- Exact-match company-name de-identification within the Sample.
- Complete Chinese and English system UI; recognised built-in workflow entries follow the interface language, while other custom and user-entered content remains unchanged.
- Collapsible project sidebar for desktop workspace efficiency.
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
