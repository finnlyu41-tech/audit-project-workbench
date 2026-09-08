import React from 'react';
import { canonicalStorePayload, isValidStore } from './model.js';
import { WorkspaceDifferences } from './efficiency-controls.jsx';
import { useUiLanguage } from './i18n.jsx';

export function BackupCompare({ store, file, onRestore, onClose }) {
  const { t } = useUiLanguage(); const [parsed, setParsed] = React.useState(null), [error, setError] = React.useState('');
  React.useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        if (!file || file.size > 20_000_000) throw new Error('size');
        const data = JSON.parse(await file.text());
        if (!isValidStore(data)) throw new Error('invalid');
        if (!disposed) setParsed(data);
      } catch { if (!disposed) setError(t('无法比较：文件无效或超过 20 MB。未修改工作台。')); }
    })();
    return () => { disposed = true; };
  }, [file, t]);
  return <div className="workbench-form backup-compare">
    <strong>{file?.name}</strong><p>{t('只读比较当前工作台与所选备份。这里不会恢复、合并或写入文件。')}</p>
    {parsed && <WorkspaceDifferences before={canonicalStorePayload(store)} after={parsed} defaultOpen />}
    {error && <p role="alert" className="form-error">{error}</p>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t('关闭')}</button>
      <button type="button" className="button primary" disabled={!parsed} onClick={() => onRestore(file)}>{t('继续到恢复确认')}</button></footer>
  </div>;
}
