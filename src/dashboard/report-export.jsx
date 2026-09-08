import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { reportTableMatrix, delimitedTable, requestTextDownload, outputFileName } from './efficiency-export.js';
export function ReportTableExport({ rows }) {
  const { language, t } = useUiLanguage(); const [message, setMessage] = React.useState(''), [fallback, setFallback] = React.useState('');
  const [busy, setBusy] = React.useState(false); const fallbackRef = React.useRef(null);
  React.useEffect(() => { if (fallback) { fallbackRef.current?.focus(); fallbackRef.current?.select(); } }, [fallback]);
  const output = async mode => {
    if (busy || !rows.length) return; setBusy(true); setMessage(''); setFallback('');
    const matrix = reportTableMatrix(rows, language, t), text = delimitedTable(matrix, mode === 'copy' ? '\t' : ',');
    try {
      if (mode === 'copy') { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(text); }
      else requestTextDownload('\uFEFF' + text, outputFileName({ purpose: 'apw-report', generic: true, extension: 'csv' }), 'text/csv;charset=utf-8');
      setMessage(t(mode === 'copy' ? '当前表格已复制；未发送。' : '已请求下载当前表格，请确认文件已保存。'));
    } catch { setFallback(text); setMessage(t('无法自动输出，请手动复制下方表格文字。')); }
    finally { setBusy(false); }
  };
  return <details className="efficiency-compact report-table-export"><summary>{t('复制／导出当前表格')}</summary>
    <p className="efficiency-note">{t('仅包含当前筛选和排序下的表格列；不含内部备注、税务编号或隐藏记录。字符串公式前缀已保护。')}</p>
    <div className="efficiency-actions"><button type="button" className="button secondary" disabled={busy || !rows.length} onClick={() => output('copy')}>{t('复制当前表格')}</button>
      <button type="button" className="button secondary" disabled={busy || !rows.length} onClick={() => output('csv')}>{t('下载当前表格 CSV')}</button></div>
    {message && <p role="status">{message}</p>}{fallback && <textarea ref={fallbackRef} aria-label={t('可手动复制的表格')} rows="5" readOnly value={fallback} />}
  </details>;
}
