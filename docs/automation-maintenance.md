# APW automation: resume, verify, report

This runbook and `pnpm automation:status` repair repository-side execution and reporting. They are not a scheduler and do not prove a ChatGPT/Codex task is created, enabled or running every two hours. Scheduler task ID, run history and permissions must be checked in the actual scheduler separately.

## Diagnosis recorded on 2026-09-09

The current failing CI was run `34317243603`, PR #75, head `5ffe99073eb1f48ae9177e6e8c2842eefd042277`. The downloaded artifact `10091178593` identified one failure in `linked-file-safety.spec.js`: after accepting the local file, a one-shot browser-storage read still contained the old note. The trace showed that the external file retained the correct selected content and had not been overwritten. Its source saves browser state in a React passive effect; closing the dialog is not a storage-commit acknowledgement. A 16-run local baseline passed, so this is not claimed as a deterministically reproduced data-loss defect.

The repair waits for the complete selected-file payload to reach browser storage, checks that the external file is not rewritten, and reloads to verify persistence. The adjacent open-file test now checks the same full-payload boundary. Expected data and timeout limits are not loosened; no test-level retry is enabled. This fixes the identified observation race, not every possible future failure.

## Every maintenance invocation

1. Read current main, open PRs and exact-head workflow states. `pnpm automation:status` does this without writes, retries or task creation. `TOOL_BLOCKED` means the inventory is incomplete, not that work is complete. Only if the local public-marker fetch fails at the network/TLS request layer, the status command may accept the exact main Pages run only when its `deploy` job itself succeeded and the named `Verify deployed commit and core assets` step succeeded for that same SHA. An explicit public SHA mismatch still fails closed and requires deployment verification.
2. Resume a pending PR before proposing new work. If CI is running, link that run and stop launching duplicate work. If it failed, inspect the named phase and attached receipt/trace. Keep action polling read-only.
3. Apply only a focused, authorized repair. Preserve unrelated commits. Check the remote head again before pushing, and match the head before merge.
4. Distinguish local checks, PR checks, merge, main CI, Pages and actual public verification. Report every invocation, even when there is no code change. Never substitute an old passing SHA for the current one.

## Single verified release chain — approved 2026-09-26

The owner approved replacing the duplicate CI/Pages runs after #97's Pages job exceeded its 40-minute budget. `ci.yml` now owns one same-run chain; `pages.yml` is removed, not left as a second trigger:

1. **Unit:** run the existing complete unit command once.
2. **Browser:** run the existing Chromium and WebKit projects in separate jobs, with the same three workers, tests, timeouts and zero retries. Both must finish; `fail-fast: false` retains the other engine's evidence.
3. **Check:** require successful prerequisites, download their exact run/attempt artifacts, and compare actual case IDs against a fresh full inventory from the checked-out commit. Build once, stamp its core-file hashes, run the complete production suite on that build, and seal its successful receipt into the release manifest. Re-check hashes before packaging so a changed build cannot be substituted after tests.
4. **Deploy:** only trusted `main` push/manual runs can publish. Download the exact artifact ID from `check`, fail on digest mismatch, inspect the archive safely, and validate commit/run/attempt/receipt and core-file bytes. Refuse a superseded main SHA. Deploy that same artifact by its unique name; do not rebuild or repeat application tests. Finally verify the public marker and core-file hashes.

Each job retains the existing 40-minute cap; the complete browser and production phases no longer compete for one job budget. This is a bounded dependency graph on standard runners, not a new scheduler or paid runner. Actual cloud duration still requires measurement; splitting does not promise immunity from every infrastructure failure.

All PRs run the full gates and packaging checks, but have no Pages/id-token write permissions and cannot deploy. A merged main commit is validated afresh; a PR's tested merge ref is not substituted for main. Only the deploy job has Pages permissions, behind the existing `github-pages` environment.

Phase evidence includes repository, head SHA, tested SHA, run ID and attempt. Missing engines, changed report bytes, a substituted/skipped/retried test, a false receipt or mismatched provenance fail closed. Reports and traces are retained for 14 days; the immutable Pages artifact for 7 days. Re-run **all jobs** only after diagnosing a justified transient failure: partial re-runs deliberately cannot mix old-attempt evidence with a new receipt. Expired artifacts require a fresh complete run.

`automation:status` recognises the named `deploy` job within the exact CI run and still reads historical separate Pages runs. Neither a successful `check` job nor a skipped deploy counts as a live release. Public-byte verification remains mandatory; no external scheduler state is inferred.

中文：完整验收一次，发布同一份已验收构建。两种浏览器分开执行，但不删测试、不增加重试、不放宽 40 分钟单任务时限。所有证据与产物绑定同一仓库、提交、运行及尝试；缺少或混入旧证据就停止。仅 main 通过完整检查后能发布，发布阶段不重新构建，也不重复测试。

### Preserved failure evidence

On merge `31c3206`, runs `35621864864` / `35621864953` passed their test assertions but were cancelled at the job budget; #96 changed workers from two to three. On merge `a4d9261`, main CI `35842923759` passed in 39m12s, but Pages `35842923770` was cancelled during production checks. Its receipt correctly has `verification_passed=false`, deploy was skipped, and public SHA remained `6be5fa5`. These records are failures, not successful releases or a reason to rerun for luck.

The approved repair removes the repeated full run and gives each engine and production its own bounded job. It does not claim the prior three-worker adjustment permanently solved timing.

References: [GitHub same-workflow Pages jobs](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data), [official artifact download](https://github.com/actions/download-artifact).

## Failure routing

Authentication, tool connection, dependency installation, unit failure, browser assertion, production build and Pages propagation are different failures. Diagnose the actual failing phase. A missing screenshot/report is not a passing test. Do not increase timeouts, remove assertions or repeatedly rerun an unchanged failed head merely to obtain a green badge. A verified temporary runner/network outage may justify one documented retry.

The latest global/user rules continue to govern local paths, Database protection, candidate outputs and approved deliverables. These changes do not access real client data, alter another automation, enable paid services or install a new recurring job.

## Public deployment verification

Pages stamps the tested build with its commit marker and a manifest of SHA-256 hashes for index.html and every built JavaScript/CSS asset. The post-deploy check requires the expected commit, validates only the known Pages origin and safe asset paths, and compares actual public bytes. A fresh marker with stale HTML, missing/changed assets, redirect or mixed version fails. Cache-busting/no-cache reads have a bounded propagation retry; this is not an application-test retry. Unit fixtures cover these negative cases without internet or client files.

## Sources

- Playwright non-retrying versus polling assertions: https://playwright.dev/docs/test-assertions
- React passive effect timing: https://react.dev/reference/react/useEffect
- GitHub workflow concurrency: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- Playwright machine-readable reports: https://playwright.dev/docs/test-reporters
