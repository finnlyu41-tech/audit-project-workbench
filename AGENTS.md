# APW maintenance and automation

Read the current applicable user/global instructions and `CONTRIBUTING.md` first. These repository instructions do not expand permission or create a scheduled task.

## Start from current evidence

Run `pnpm automation:status` before choosing new work. It performs bounded, read-only GitHub checks. Without a terminal, perform equivalent reads through the connected GitHub tool: current main SHA, open PR heads, latest exact-head CI and main/Pages results. GitHub-side work should not depend on an optional desktop connection; a desktop or TLS failure is a tool failure, not a failed application check. Never infer current state from an old conversation, filename or temporary path.

An existing PR takes priority over a new feature. `DIAGNOSE_PR_FAILURE` means inspect that run's failed step, `playwright-results/receipt.json`, report and trace before changing code. `WAIT_*` means report the in-progress run, not push an empty commit, launch duplicate tests or open another PR. Multiple open PRs require overlap review. A green check for an older SHA is not evidence for the latest SHA.

## Fix failures, do not conceal them

Keep the existing unit, browser and production gates, `retries: 0`, data assertions and archive/restore safeguards. Distinguish action completion from asynchronously persisted state; wait for the exact expected saved value rather than arbitrary sleeps. Never retry actions that write data inside a polling assertion. A demonstrably transient infrastructure failure may be retried once with its reason recorded; recurring failures need diagnosis, not an unlimited retry loop.

Use isolated fictional workspaces. Do not read or modify Database, client company folders, accounting records, customer files, browser profiles or credentials to test APW. Preserve concurrent work and re-check remote heads before pushing/merging. Do not change other automations or global skills.

## Complete the release, then report

When existing authorization permits a change, merge only the inspected head after its checks pass. Verify both main CI and Pages for the resulting merge SHA, then the public commit marker and core assets. Never call a candidate, green PR or deploy request a verified live release. Preserve exact run IDs, attempts and SHA values in the result.

For recurring maintenance, report each invocation, including no-change, waiting and blocked results. Use one small scope or complete existing work rather than manufacturing a new change every time. Do not promise background completion without a real enabled scheduler. Follow `docs/automation-maintenance.md` for failure triage and handoff.
