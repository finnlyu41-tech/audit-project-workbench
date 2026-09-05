import React from 'react';
import { CircleAlert, Download, RefreshCw } from 'lucide-react';
import { useUiLanguage } from './i18n.jsx';
import { parseStartupPayload, readWorkspaceStartup, restoreStartupBackup } from './workspace-startup.js';

export function WorkspaceBootstrap({ children }) {
  const [snapshot, setSnapshot] = React.useState(() => readWorkspaceStartup());
  if (!snapshot.error) return children(snapshot);
  return <WorkspaceRecovery snapshot={snapshot} onReady={setSnapshot} />;
}
function WorkspaceRecovery({ snapshot, onReady }) {
  const { t } = useUiLanguage(); const [error, setError] = React.useState('');
  const fileRef = React.useRef(null);
  const retry = () => { setError(''); onReady(readWorkspaceStartup()); };
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([snapshot.raw], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `apw-original-recovery-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(t('无法导出原始资料，请保留此页面并重试。')); }
  };
  const restore = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const raw = await file.text(); if (parseStartupPayload(raw).error) throw new Error('invalid_backup');
      if (!window.confirm(t('恢复备份将替换此浏览器资料，并暂停原文件关联；不会覆盖本地文件。请先导出原始资料。是否继续？'))) return;
      onReady(restoreStartupBackup(snapshot, raw));
    } catch (failure) { setError(t(failure.message === 'source_changed' ? '原始资料已变化或无法读取，请先重新读取。' : failure.message === 'invalid_backup' ? '这不是有效的工作台备份文件。' : '恢复未完成，原始资料没有被替换。请检查浏览器存储后重试。')); }
  };
  const explanation = { read_failed: '无法读取浏览器资料。已暂停启动和自动保存，请检查浏览器权限后重新读取。',
    newer_version: '资料来自较新版本。已暂停启动和自动保存，不会用空白工作台覆盖它。',
    invalid_data: '已有资料无法解析。已暂停启动和自动保存，不会用空白工作台覆盖它。' };
  return <section className="workspace-recovery" aria-labelledby="recovery-title">
    <CircleAlert aria-hidden="true" /><h1 id="recovery-title">{t('工作台资料需要恢复')}</h1>
    <p role="alert">{t(explanation[snapshot.error])}</p>
    <p>{t('原始资料仅保留在此浏览器，不会上传。导出的原始文件可能包含客户资料，不代表它是可直接恢复的有效备份。')}</p>
    <div className="recovery-actions">
      <button className="button secondary" type="button" disabled={snapshot.raw === null} onClick={download}><Download aria-hidden="true" />{t('导出原始资料')}</button>
      <button className="button secondary" type="button" onClick={retry}><RefreshCw aria-hidden="true" />{t('重新读取')}</button>
      <button className="button primary" type="button" disabled={snapshot.error === 'read_failed'} onClick={() => fileRef.current?.click()}>{t('从有效备份恢复')}</button>
      <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={restore} />
    </div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
export function PersistenceSafetyAlert({ persistence, onExport, onRetry }) {
  const { t } = useUiLanguage(); const [busy, setBusy] = React.useState(false);
  if (persistence.failure !== 'browser_write_failed') return null;
  return <section className="persistence-safety-alert" aria-label={t('保存需要处理')}>
    <div role="alert"><strong>{t('浏览器保存失败')}</strong>
      <p>{t('最新已应用的更改仍在本页内存中。请立即导出备份，不要刷新或关闭；未提交的表单草稿不包含在备份内。')}</p></div>
    <div className="recovery-actions"><button type="button" className="button secondary" onClick={onExport}><Download aria-hidden="true" />{t('导出备份')}</button>
      <button type="button" className="button primary" disabled={busy} onClick={async () => {
        setBusy(true); try { await onRetry(); } finally { setBusy(false); }
      }}><RefreshCw aria-hidden="true" />{t('重试保存')}</button></div>
  </section>;
}
