# Stability and recovery gate

## Scope and observed failures

The first reliability increment follows the agreed roadmap. On the pre-fix application, malformed JSON and unsupported future-version data fell back to an empty workspace, which the mounted persistence hook then saved over the original. Restoring a backup left quick-edit drafts keyed by matching engagement IDs in the previous session. Browser-write errors were confined to the backup/settings status.

Startup now reads before mounting the workbench or its persistence hook. Unreadable, unparseable or unsupported data block startup without writing replacement workspace data. The recovery screen can export the exact original string, retry the read, or restore a validated backup after explicit confirmation. It does not display client data in the warning. This is preservation, not automatic repair.

Recovery replacement checks the original still matches the inspected browser value, pauses linked-file mode before writing browser data, and does not open or overwrite a filesystem handle. A blocked write leaves the original workspace string intact; file-link preference may already be paused. Reconnect a file deliberately through settings afterward. A read-denied recovery must retry reading before replacement is available. Exported raw text is not guaranteed to be a valid backup.

A browser-write failure has a separate high-priority state, so a linked-file success callback cannot clear that warning. Its persistent in-flow actions export the latest applied in-memory workspace or retry saving. Export does not clear the error and does not include unsubmitted editor drafts. A successful browser write is required to clear the browser-failure state; errors leave the previous saved timestamp in place. Ordinary operation feedback does not replace this warning.

Explicit backup replacement clears quick drafts, recent navigation, old view history, filters and pending focus requests. Cancelled or invalid restores do not clear them. Explicit opening of another file, or choosing a conflicting file version, likewise resets the replaced session; choosing the current browser version does not. Native file-picker/permission behaviour still needs real-device smoke testing.

## Automated contract

`pnpm test:stability` runs startup/recovery, group quick-update, general quick-update and component flows in Chromium and WebKit. `pnpm check` includes the full Chromium suite and these WebKit stability files before building. CI and the Pages build install both engines. Automatic retries are disabled: retain and investigate failed traces rather than silently counting a retry as a clean pass.

The recovery tests perform group metadata edits, member readiness changes, ordinary-project archive/restore, a real JSON download, import into a fresh browser context, reload and re-export. The entire canonical payload is compared, not just counts. Synthetic data include multiple reporting periods, intermediate holdings, archived records, completion conditions, outstanding notes, template metadata, schedule order and a tax-deadline revision.

Negative cases cover malformed/future data, blocked reads/writes, unsuccessful retry, current-memory export, exact raw export, invalid restore input, refused confirmation, same-ID draft isolation and multilingual narrow-screen recovery. Unexpected page errors and console errors fail the recovery suite. No real customer data or browser profiles are used.

## Limits

No business schema, audit completion, group readiness or tax calculations change. This is not a cross-tab locking system, automatic cloud backup, encryption feature or guarantee of recovery from arbitrary corruption. Recovery does not prove that the browser retained a download on the user's disk. WebKit automation is not a test on every Safari/iOS device or assistive technology. The second and third roadmap phases remain planned.

Sources: https://playwright.dev/docs/browser-contexts (clean browser isolation); https://react.dev/learn/preserving-and-resetting-state (state identity and reset).

## Additional full-engine finding

The expanded WebKit run found the existing new-company modal return-focus assertion failing. Isolated focus logging reproduced it in three fresh contexts: pointer activation blurred the trigger before Modal captured document.activeElement, leaving body as the return target. The new-company action now explicitly focuses its own trigger before opening; no modal-wide focus behaviour or test timeouts are loosened. The same case is included in the permanent dual-engine stability gate. Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#clicking_and_focus .

The first Linux CI WebKit gate also rejected native option overflow in the 800px holding-component selector. Its label now clips native overflow while a separate focus-within outline remains visible; the complete selected period is already rendered below. The original geometry assertion remains unchanged. Short-window screenshot review additionally found that a mounted save warning could scroll above the viewport; the warning container now remains sticky, with focus scroll margin, and the fault-injection test requires the complete warning to be in the viewport at 800×560.
