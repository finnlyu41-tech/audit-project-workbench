# Roadmap / 推进顺序

Approved direction: reliability first, measurable time savings second, usable work output third.
用户确认按以下顺序推进；本地优先、隐私和人工审计判断保持不变。

## 1. Reliability / 先做到可靠

The first stability increment protects failed startup reads, makes browser-write failure actionable, isolates pre-restore session drafts and exercises complete backup recovery in a clean browser context. Completion evidence belongs in the release PR, not an ever-growing test-count claim.

Continue the stability gate across ordinary projects, annual changes, holding companies, archive/restore and backup recovery. A failed test or unexpected application error blocks publication. Damaged or future-version input must not become an autosaved empty workspace. Recovery warnings are not proof that a downloaded file was retained or that every device has been tested.

## 2. Measure and reduce work / 用实际任务做减法

Before adding more controls, establish a baseline for four repeatable tasks: create the next annual engagement, record missing client information, change a schedule and identify the component blocking a consolidation. Record elapsed active time, clicks, repeated entries and mistakes using synthetic or locally de-identified examples; compare against the user's existing method. Automated test duration is not a substitute for human task time.

Only then remove redundant steps and duplicate entry. Keep ordinary-company defaults simple, reveal holding-company options only when needed, and preserve the actual work location after edits. The recovery release did not include this phase. Its first increment is now implemented; deployment evidence belongs in the feature PR. Human time savings remain unmeasured.

## 3. Produce useful work / 让记录直接用于工作

First candidate: selected outstanding items → client follow-up draft with an explicit company/year preview and links back to source records. Default to excluding internal notes, tax references and audit judgements. Output is a draft only; no automatic sending or uploading client data. Design review and tests must precede implementation. The recovery release did not include this phase. Its first increment is now implemented; deployment evidence belongs in the feature PR. Human time savings remain unmeasured.

## Deferred / 暂缓

Optional team synchronisation, role-based permissions, change-history infrastructure, extra dashboards and AI services remain deferred until the above gates show practical value. Preserve existing accessibility work and client-neutral examples.

## Out of scope / 不纳入核心功能

Automated audit conclusions or sign-off; default client-evidence upload; treating outstanding items as completion criteria. No cloud account or cross-device sync is implied by an online static workbench.

## First usable loop / 首个可用闭环

Reliability protections from #43 remain in force. Continuous outstanding entry and a single-source, local-only client follow-up draft now form the first record-to-output loop. The same three-item task is checked using observed click events and dialog mounts (six/three versus four/one), not claimed human minutes saved. See `docs/client-follow-up.md` and the release PR. Native clipboard/device behavior and comparison against the user's prior method still require actual user validation.
