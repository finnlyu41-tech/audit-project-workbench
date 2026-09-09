# APW automation: resume, verify, report

This runbook and `pnpm automation:status` repair repository-side execution and reporting. They are not a scheduler and do not prove a ChatGPT/Codex task is created, enabled or running every two hours. Scheduler task ID, run history and permissions must be checked in the actual scheduler separately.

## Diagnosis recorded on 2026-09-09

The current failing CI was run `34317243603`, PR #75, head `5ffe99073eb1f48ae9177e6e8c2842eefd042277`. The downloaded artifact `10091178593` identified one failure in `linked-file-safety.spec.js`: after accepting the local file, a one-shot browser-storage read still contained the old note. The trace showed that the external file retained the correct selected content and had not been overwritten. Its source saves browser state in a React passive effect; closing the dialog is not a storage-commit acknowledgement. A 16-run local baseline passed, so this is not claimed as a deterministically reproduced data-loss defect.

The repair waits for the complete selected-file payload to reach browser storage, checks that the external file is not rewritten, and reloads to verify persistence. The adjacent open-file test now checks the same full-payload boundary. Expected data and timeout limits are not loosened; no test-level retry is enabled. This fixes the identified observation race, not every possible future failure.

## Every maintenance invocation

1. Read current main, open PRs and exact-head workflow states. `pnpm automation:status` does this without writes, retries or task creation. `TOOL_BLOCKED` means the inventory is incomplete, not that work is complete.
2. Resume a pending PR before proposing new work. If CI is running, link that run and stop launching duplicate work. If it failed, inspect the named phase and attached receipt/trace. Keep action polling read-only.
3. Apply only a focused, authorized repair. Preserve unrelated commits. Check the remote head again before pushing, and match the head before merge.
4. Distinguish local checks, PR checks, merge, main CI, Pages and actual public verification. Report every invocation, even when there is no code change. Never substitute an old passing SHA for the current one.

## Workflow safeguards

CI groups concurrent checks by PR/ref and cancels obsolete runs only for the same PR. Pages serializes releases without interrupting the active deployment; GitHub can still supersede pending jobs. Each job has a bounded 40-minute timeout. The four existing `pnpm check` commands run as distinct named phases, in the same order; none is omitted.

Development and production browser reports are stored separately, with machine-readable JSON and an exact-head/tested-merge receipt. Reports upload on success and failure, so a later invocation can inspect completed evidence instead of rebuilding it. The receipt explicitly does not claim deployment or scheduler verification.

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
