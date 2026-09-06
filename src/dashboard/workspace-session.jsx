import React from 'react';
import { LockKeyhole, RefreshCw, ShieldAlert } from 'lucide-react';
import { useUiLanguage } from './i18n.jsx';
import { requestWorkspaceSession } from './workspace-session.js';

export function WorkspaceSession({ children }) {
  const { t } = useUiLanguage();
  const [state, setState] = React.useState('checking');
  const [attempt, setAttempt] = React.useState(0);
  const [singleWindow, setSingleWindow] = React.useState(false);
  const [compatibility, setCompatibility] = React.useState(false);
  React.useEffect(() => {
    let dispose = () => {};
    // Defer the acquisition, not field focus, so StrictMode's rehearsal cannot self-lock.
    const timer = window.setTimeout(() => {
      try { dispose = requestWorkspaceSession(navigator.locks, setState); }
      catch { setState('error'); }
    }, 0);
    return () => { window.clearTimeout(timer); dispose(); };
  }, [attempt]);
  const retry = () => { setState('checking'); setSingleWindow(false); setAttempt(value => value + 1); };
  if (state === 'ready') return children;
  if (state === 'unsupported' && compatibility) return <>
    <aside className="workspace-session-warning" role="status">{t("多窗口保护未启用：请只保留这一个 APW 窗口，不要在其他窗口或浏览器同时编辑同一份资料。")}</aside>{children}</>;
  const heading = state === 'occupied' ? "工作台已在另一窗口打开" : state === 'unsupported'
    ? "当前浏览器没有多窗口保护" : state === 'error' ? "无法确认工作台编辑权限" : "正在检查工作台窗口";
  const explanation = state === 'occupied' ? "为避免旧资料覆盖新更改，此窗口尚未载入工作台，也不会自动保存。请先在原窗口保存并关闭，再在这里重新检查。"
    : state === 'unsupported' ? "当前环境不提供浏览器窗口锁。尚未载入工作台；确认没有其他 APW 窗口后，可以按原来的单窗口方式继续，但不会获得多窗口保护。"
    : state === 'error' ? "浏览器未能完成窗口保护检查，已暂停启动，不会覆盖现有资料。请检查浏览器权限后重试；不要清除网站数据。"
    : "检查完成后才会读取业务资料并启动自动保存。";
  return <section className="workspace-session-gate" data-session-state={state} aria-labelledby="workspace-session-heading">
    {state === 'occupied' ? <LockKeyhole aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
    <h1 id="workspace-session-heading">{t(heading)}</h1>
    <p role={state === 'checking' ? 'status' : undefined}>{t(explanation)}</p>
    {state !== 'checking' && <p className="workspace-session-scope">{t("此保护只协调同一浏览器配置中的新版 APW，不是云同步，也不能锁定其他浏览器、设备或外部文件。")}</p>}
    {state === 'unsupported' && <label className="workspace-session-consent"><input type="checkbox" checked={singleWindow}
      onChange={event => setSingleWindow(event.target.checked)} /><span>{t("我已确认没有其他 APW 窗口，按单窗口方式继续。")}</span></label>}
    <div className="workspace-session-actions">
      {state !== 'checking' && <button type="button" onClick={retry}><RefreshCw aria-hidden="true" />{t("重新检查并打开")}</button>}
      {state === 'unsupported' && <button type="button" disabled={!singleWindow} onClick={() => setCompatibility(true)}>{t("仅单窗口继续")}</button>}
    </div>
  </section>;
}
