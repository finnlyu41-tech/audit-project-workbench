# Build and release maintenance / 构建与发布维护

This closes the packaging and Actions-runtime work deferred during the data-safety fixes. No application source, business schema, persistence behavior, dependency version or license changes are included.

## Packaging / 分包

The existing Vite/Rolldown build now emits statically preloaded chunks for vendor libraries, workspace core and UI translations. The entry continues to load synchronously. Opening an editor in an already loaded workspace does not acquire a new lazy-loading network dependency.

At baseline `e19093f`, the single JavaScript file was approximately 910 KB. The new largest file is approximately 423 KB; five JavaScript files total approximately 913 KB. **This does not reduce all first-load bytes and is not a measured startup-speed claim.** The benefit is avoiding a monolithic payload and retaining separate content-addressed cache entries for stable code. Cache behavior depends on the host/browser.

`pnpm build` checks the emitted manifest graph and real file bytes. Missing, circular or unreachable chunk references fail verification. Each JavaScript chunk must stay within 500,000 bytes, their total within 1,000,000 bytes, and combined gzip sizes within 300,000 bytes. The Vite warning threshold is not raised or suppressed. Styles and application text remain unchanged.

`pnpm check` retains the complete existing source suite, then builds and runs the existing core flows and recovery tests in Chromium and WebKit against the production output (68 checks). Failed production checks stop publication. Reports include `test-results-production`.

## Actions / 运行环境

Inspected official release manifests on 2026-09-06. Workflow actions are pinned to their immutable commit SHA. Application tooling remains Node 22 and pnpm 11.19.0; **Node 24 here is the action runner runtime**, not a forced application dependency upgrade.

| Action | Inspected release | Runtime |
| --- | --- | --- |
| actions/checkout | v7.0.1 | node24 |
| actions/setup-node | v7.0.0 | node24 |
| pnpm/action-setup | v6.1.0 | node24 |
| actions/upload-artifact | v7.0.1 | node24 |
| actions/configure-pages | v6.0.0 | node24 |
| actions/upload-pages-artifact | v5.0.0 | composite; pinned upload-artifact v7.0.0 uses node24 |
| actions/deploy-pages | v5.0.1 | node24 |

The existing token permissions, environments, triggers and zero-retry test settings are retained. Review both CI and Pages annotations after publication; do not equate build success with absence of all warnings.
