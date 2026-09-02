# Contributing / 参与贡献

Thank you for helping improve Audit Progress Workbench.

## Before starting

1. Search existing issues before creating a new one.
2. Keep changes focused and client-neutral.
3. Never commit real client names, engagement data, exported backups, credentials or screenshots containing confidential information.
4. For a larger change, open a proposal issue before implementation.

## Development

```bash
corepack enable
pnpm install
pnpm dev
pnpm check
```

## Pull requests

- Explain the user problem and the chosen behaviour.
- Include tests for data-model changes.
- Verify the desktop layout at common widths.
- Confirm that existing browser data still migrates correctly.
- Update bilingual user-facing text and documentation where relevant.

## Design principles

- Local-first by default.
- Progress stages and outstanding items remain separate concepts.
- User-entered audit information is never silently rewritten or translated.
- Public Samples and tests remain client-neutral.
- Audit judgement and sign-off remain human-owned.
