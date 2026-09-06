# Linked-file conflict safety / 关联文件冲突保护

The browser workbench remains the primary in-memory editing session. A linked file is not a cloud database or a cross-device collaboration service.

## Behaviour

- Before each queued file write, read and validate the current file against the last synchronized content. Check again after writing the temporary stream and before closing it. A detected external change aborts the stream and opens the existing version-conflict dialog; a corrupt or unreadable file is not overwritten.
- Browser changes continue to be saved locally while file synchronization is blocked. The conflict dialog uses the latest applied browser snapshot when refreshed. Unsubmitted editor drafts are still outside a business backup.
- Opening an existing file rechecks the reviewed candidate and the browser copy. An outdated preview stays open with an explanation, rather than silently loading a stale file snapshot. Cancel and choose the file again to review it.
- Both conflict choices reread the file. If either side changed after the preview, refresh the comparison and require another explicit choice. Only then download the version being replaced and apply the selected side. The browser-side recovery download includes later applied edits, not the first conflict's obsolete snapshot.
- File activation/reconnection/disconnection operations are single-flight. While an explicit operation is pending, the relevant dialog cannot be dismissed through its header, Escape or backdrop. A cancelled native picker releases the busy state without switching modes.
- A delayed startup permission/read request checks its original session before resuming. Explicitly disconnecting prevents that obsolete request from reopening the file or reporting a new file conflict.
- Ordinary slow writes remain serial: pending intermediate versions are coalesced and the newest applied version is written last. Retiring a file session stops additional queue entries and rejects its pending commit.
- Reviewed unchanged legacy files reuse their existing migration result instead of generating new company identities on every verification. They are not rewritten just by opening the confirmation dialog.

## Boundaries

These are optimistic content checks, **not an atomic cross-process file lock**. Another program can still race in the final interval between the check and stream close. Do not deliberately edit the same file concurrently in several applications or devices; sync-folder providers also have independent behaviour. No real client histories are automatically inspected or repaired.

The automated integration suite uses the actual APW UI with isolated in-memory file handles and a simulated permission-handle store. This deliberately tests late changes, write failures, permission rejection, stale decisions and slow operations without reading client files. A separate Chromium browser-private-file probe exercises native file streams and IndexedDB; it is not a test of the user's native operating-system picker or every Safari/iOS device.

## 中文说明

关联文件在保存前和提交前都会核对。检测到外部变化时停止覆盖，保留浏览器与文件两边资料，再由使用者明确选择；选择前版本再变，会更新比较并要求重新确认。预览过期、写入失败、权限失效或文件损坏会说明原因，不将其静默覆盖。

本次没有改变备份格式、公司／年度归属或审计计算。未提交草稿仍不在业务备份内；文件冲突保护不是云同步、无限版本历史或跨软件原子锁。不要通过清除浏览器资料来处理文件冲突。
