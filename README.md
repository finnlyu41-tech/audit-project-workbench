<div align="center">

# APW
### Audit Project Workbench

**Clarity across companies, reporting years, and group engagements.**

A local-first workbench for audit-practice owners and engagement leads.

**[Open APW](https://finnlyu41-tech.github.io/audit-project-workbench/)** · [中文介绍](#中文介绍) · [Quick start](#quick-start) · [Documentation](#documentation)

Desktop-first · Local-first · English / 简体中文 / 繁體中文

</div>

---

## Coordinate the work. Keep the context.

Audit work spans more than a task list: a company can have several reporting years, a group can change its structure, and a completed engagement can still have an outstanding tax deadline.

**APW keeps those relationships explicit.** Bring company records, reporting periods, workflows, outstanding items and deadlines into one desktop workspace—without replacing your existing working-paper system.

> **License:** New covered material uses the [APW Proprietary License](LICENSE), with free non-production evaluation and separately authorized production/commercial use. Earlier MIT and third-party rights remain unchanged. See [licensing and permitted use](docs/licensing.md).

## Built for the questions that matter

| Your question | How APW helps |
|---|---|
| **Which company—and which reporting year—is this work for?** | Separate long-lived company records from engagements. Manage years independently or keep several explicit reporting periods in one engagement. |
| **What is holding up the group?** | Review linked component engagements, period mismatches, readiness conditions, local consolidation steps and outstanding items together. |
| **What should I follow up next?** | Move from priority actions and deadlines to the exact source record. Keep outstanding requests separate from audit completion criteria. |
| **Can I keep control of my business data?** | Work with browser-local data, an optional linked local file and portable JSON backups; the core application has no business-data backend. |

## A practical daily flow

**Set up the company once.** Keep its legal identity, fiscal-year defaults, current group relationships and tax deadlines in the company record.

**Run the engagement in context.** Choose the reporting periods, assign an owner, set the delivery schedule and use a blank workflow, a template or a prior engagement's structure.

**Turn outstanding items into the next action.** Record requests continuously, trace each item to its company and year, then prepare a reviewed client follow-up draft without automatically including internal notes.

## Purpose-built, not all-purpose

### Company and reporting-period clarity

An engagement can cover one or several reporting periods while retaining its own owner, schedule and workflows. Reporting dates remain separate from execution dates. Calendar-year, April-to-March and first-period date helpers remain editable; archived engagements still participate in exact-period duplicate checks.

### Group work with historical context

Current company relationships and a group engagement's saved annual component scope are separate. Later hierarchy changes do not silently rewrite that scope. Explicit component links and complete-period comparisons help expose mismatches, while readiness conditions remain distinct from progress percentages.

### Workflows without mixed signals

Organize bookkeeping, audit, tax and custom workstreams with stages and completion criteria. Track outstanding items independently: receiving client information does not automatically complete an audit procedure, and finishing an engagement does not automatically clear its tax deadlines.

### The tools around the work

| Area | Included capabilities |
|---|---|
| **Daily navigation** | Priority actions, company and engagement views, Quick Open, search, filters and in-app view history. |
| **Planning and deadlines** | Project schedules, company-level tax deadlines, reminders and reasoned deadline-change history. |
| **Reusable workflows** | Workstream and holding-company templates, tags, version notes and validated template-package import/export. |
| **Client follow-up** | Continuous outstanding-item entry and a single-company, single-engagement text draft with an editable preview and explicit review before output. |
| **Management overview** | Portfolio, company and group reports with filters, risk lists and print-ready views. |
| **Working language** | English, Simplified Chinese and Traditional Chinese system interfaces; user-entered names and content remain in their original wording. |

## Your data stays under your control

The core application does not upload engagement data to a business server. Records are stored in the current browser's `localStorage`; optionally, you can link a local `.apw.json` file. File authorization is device/browser-specific and is not included in backups.

- **Portable, not public.** Workspace backups can contain confidential client data. Keep them private; never attach them to public issues.
- **Local files are not team synchronization.** Other browsers, devices or file writers can create conflicts. A linked file is not a shared collaboration service.
- **Protection is not a guarantee.** Save-failure warnings, recovery checks and single-window safeguards do not replace independent backups. Unsubmitted form drafts are not included in those backups.

The hosted page still uses normal browser and hosting requests. Local-first does not mean encrypted-by-default storage, permanent offline availability or automatic cross-device synchronization. Read the [data boundary](docs/privacy.md), [recovery guidance](docs/stability-recovery.md) and [window-safety notes](docs/workspace-window-safety.md).

## What APW does not do

APW coordinates work; it does not issue audit opinions, assess evidence for you, sign off engagements, file tax returns or calculate consolidated financial statements. It is not a client-evidence repository or a replacement for a complete working-paper platform.

Client follow-up output is a **draft**, not an automatically sent message. Review selected titles and any manual additions before sharing. Team synchronization, role-based permissions and general change-history infrastructure remain roadmap items, not current service promises.

## Quick start

For the rights holder, separately authorized developers, or private non-production evaluation permitted by the [license](LICENSE).

**Requirements:** Node.js 20.19 or later, plus the repository's pinned pnpm version through Corepack.

```bash
corepack enable
pnpm install
pnpm dev
```

Before contributing or publishing a change:

```bash
pnpm exec playwright install chromium webkit
pnpm check
```

Use fictional or properly de-identified records when testing. Follow the [release checklist](docs/release-checklist.md); do not treat test counts as a guarantee of safety or compatibility on every device.

## Documentation

| Guide | Read it for |
|---|---|
| [Architecture](docs/architecture.md) | Company/engagement boundaries, group scope and application layers. |
| [Privacy and data](docs/privacy.md) | What is stored, what leaves the browser and how to handle backups. |
| [Stability and recovery](docs/stability-recovery.md) | Startup protection, save failures and recovery verification. |
| [Continuous entry and client follow-up](docs/client-follow-up.md) | The record-to-draft workflow and its safety boundaries. |
| [Roadmap](ROADMAP.md) | Reliability first, measurable reduction in work second, useful output third. |
| [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) | Contribution permissions, client-neutral examples and security reporting. |

## License and commercial use

APW is **source-visible**, with [proprietary terms](LICENSE) for new covered material. It is not a blanket open-source grant for future additions. Evaluation permission is not production or commercial-use permission; separate written authorization is required where the new license applies.

Previously MIT-licensed material retains its earlier permissions, including that same material carried into later releases. Third-party components retain their own licenses. See the [licensing transition](docs/licensing.md), [historical MIT notice](licenses/MIT-legacy.txt) and [third-party notices](THIRD_PARTY_NOTICES.md).

Your client records, user-authored templates, backups and generated outputs do not become APW's property. Licensing does not add a paywall, subscription, cloud backup or hosting-service commitment.

---

## 中文介绍

### 看清每家公司、每个报告年度，以及集团工作的下一步。

**APW 是面向小型审计事务所负责人和项目统筹者的本地优先工作台。** 不必更换现有底稿系统，就能按公司和报告期间，集中查看项目进度、集团组成部分、待清事项和期限。

它不是把所有工作塞进一个任务列表，而是保留工作真正需要的上下文：**是哪家公司、哪个年度、哪一个集团范围，以及下一步该处理什么。**

### 三个核心特点

| 特点 | 实际解决的问题 |
|---|---|
| **公司长期保存，年度项目分别管理** | 同一公司可以有多个独立年度项目，也可以把共同执行的多个报告期间放在一个项目内；报告期间与实际排期分开。 |
| **集团关系有当前架构，也有年度范围** | 集团项目保留已保存的组成部分范围，当前架构变化不会自动改写它；关联项目的报告期间不匹配时有明确提示。 |
| **工作状态清楚，数据自己掌握** | 待清、审计完成、合并就绪和税务期限各自独立；核心业务资料留在浏览器和主动关联的本地文件中。 |

### 从查看进展，到完成下一步

建立公司主档后，为相应报告期间创建项目，使用空白流程、范本或以前年度的结构。负责人、排期、模块和待清事项都在明确的公司及年度下维护。

日常通过首页优先事项、客户搜索、排期和期限提醒进入具体记录。连续录入待清后，可以选择**一个来源公司与年度**的事项，生成可编辑、需人工检查的客户跟进草稿，再复制或下载文本；不会自动发送，也不会自动带入内部备注或税务编号。

需要回顾时，使用公司历年项目、集团组成部分和管理层报告查看当前范围。范本可单独整理、导入和导出，修改范本不回写已经建立的项目。

### 本地优先，也明确边界

核心应用没有业务数据后端，不主动上传项目资料。浏览器会保存工作台，也可按使用者选择关联 `.apw.json` 本地文件，并导出 JSON 备份。

**本地保存不等于默认加密，也不等于多人或多设备同步。** 备份可能包含客户机密资料；未提交的表单草稿不在备份内。出现保存失败时，应先按提示导出或处理问题，而不是清除浏览器数据。详见[隐私与数据边界](docs/privacy.md)及[恢复说明](docs/stability-recovery.md)。

APW 跟踪集团合并的工作步骤和就绪情况，**不自动计算合并财务报表，也不代替审计判断、证据评估或签署**。中文、英文切换只改变系统界面及系统措辞，不擅自翻译或改写你的客户名称与记录。

### 使用、开发与授权

直接[打开 APW 在线工作台](https://finnlyu41-tech.github.io/audit-project-workbench/)，或按上方 [Quick start](#quick-start) 在许可范围内运行。

新许可覆盖的原创新增内容采用 [APW 专有许可证](LICENSE)：允许私人非生产评估；相关生产或商业使用须取得单独书面授权。历史 MIT 内容及第三方组件保留原有许可。本仓库公开可见，**不代表所有新内容可自由商用**。详见[授权切换说明](docs/licensing.md)。

后续方向保持克制：**先可靠，再减少重复操作，最后让已有记录直接成为可用的工作成果。** 查看[路线图](ROADMAP.md)。
