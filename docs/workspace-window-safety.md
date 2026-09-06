# One editing window / 单窗口编辑保护

## Why / 原因

On the pre-change release caf95dd, two tabs could load the same workspace, then silently replace each other's changes. In the fictional two-engine reproduction, A changed the owner and B changed only notes; B's autosave restored the old owner. This is a whole-workspace snapshot conflict, not an audit calculation defect.

## Behaviour / 行为

An updated APW window requests the exclusive `audit-progress-workbench:workspace-session` Web Lock **before mounting WorkspaceBootstrap**. Until it owns the lock, it does not read, migrate or autosave the business payload, mount the file-sync hook, or display customer details. Another updated window receives an occupied page rather than another editor.

To move to another window: save in the original, check the backup menu, close it, then press **Check again and open / 重新检查并打开** in the waiting window. It reads the newest saved payload only after acquisition. Switching tabs or backgrounding the owner does not release the lock. No timeout-based takeover or `steal` is used. The browser releases document-owned locks on document termination; cleanup also settles the held promise when the gate unmounts.

如需换窗口：在原窗口保存并确认保存状态，关闭原窗口，再在等待窗口点「重新检查并打开」。未提交草稿不会迁移；保存失败时先导出当前已应用资料，不要直接关闭。保护提示不是资料被删除或账号被锁。

If the native API is missing, startup explains that protection is unavailable. The user must explicitly confirm they have only one APW window before using the previous single-window behaviour. A visible warning remains; that mode is **not protected against multiple windows**. A present API that rejects access fails closed and offers retry, not a silent fallback.

## Boundaries / 边界

The lock coordinates participating updated documents sharing a browser storage context. It does not coordinate separate browser profiles, different browsers, devices, other applications writing an external file, or old APW documents that do not request the lock. It is not cloud synchronization, merging, a file lock, an account permission system or a backup. Save and close old-version tabs before opening this update.

没有新增后端、持久化锁记录、自动接管或业务数据结构迁移；公司层级、报告期间、审计完成、税务和集团就绪规则不变。无法使用窗口锁的兼容模式仍须由使用者维持单窗口。

## Verification / 验证

Permanent tests cover actual same-context windows, latest-data handover, competing waiting windows, owner reload, navigation away and Back, independent contexts, blocked startup without payload reads/writes or pickers, original recovery bytes, an unsubmitted draft, denied/missing API, three languages at 480px and accessibility. Existing full-browser, recovery, continuous-entry and follow-up gates remain required. Only synthetic records may be used. Release evidence is recorded in the PR, not inferred from test-file counts.

Native window coordination is exercised in Chromium and WebKit; denied/missing API paths are injected. This is not every Safari/iOS device or a real user file-permission test.

References: https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request ; https://www.w3.org/TR/web-locks/#termination-of-locks .

## Release-handover timing

Linux WebKit CI caught an immediate retry arriving before the closed document had finished releasing its native lock. The blocked state was safe but required an unnecessary second retry. Initial visits still use `ifAvailable`; an explicit retry now queues one normal exclusive request for at most two seconds. If the owner is still active, only the waiting request is cancelled. No lock is stolen and no automatic polling is introduced. A deterministic native-holder test verifies the queue before releasing the holder, without extending test timeouts.
