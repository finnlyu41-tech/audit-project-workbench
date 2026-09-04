import React from "react";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  FilePlus2,
  FolderOpen,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { useUiLanguage } from "./i18n.jsx";

const STATUS_LABELS = {
  saved: "已保存",
  saving: "正在保存",
  unsynced: "有未同步更改",
  reconnect_required: "需要重新连接",
  conflict: "发现版本冲突",
  error: "保存失败",
};

const FAILURE_LABELS = {
  unsupported: "当前浏览器不支持关联本地文件。",
  permission_required: "浏览器需要你重新授权访问本地文件。",
  missing_handle: "找不到此前关联的文件，请重新选择文件。",
  invalid_file: "关联文件不是有效的工作台文件，系统没有覆盖它。",
  read_failed: "无法读取关联文件，浏览器安全副本仍然可用。",
  write_failed: "无法写入关联文件，浏览器安全副本仍然可用。",
  browser_write_failed: "浏览器无法保存资料，请立即导出备份并检查浏览器存储空间。",
  handle_storage_failed: "本次可以使用文件，但浏览器无法记住文件授权。",
  handle_storage_unavailable: "浏览器无法保存文件授权，请重新关联文件。",
  unknown_error: "保存时发生错误，浏览器安全副本仍然可用。",
};

function formatSavedAt(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function StatusIcon({ status }) {
  if (status === "saved") return <CheckCircle2 aria-hidden="true" />;
  if (status === "saving") return <LoaderCircle aria-hidden="true" />;
  return <CircleAlert aria-hidden="true" />;
}

export function persistenceStatusLabel(status, t) {
  return t(STATUS_LABELS[status] || "保存状态未知");
}

export function PersistenceSettingsPanel({ persistence, onOpenExisting, onResolveConflict, onClose }) {
  const { language, t } = useUiLanguage();
  const linked = persistence.settings.mode === "linked_file";
  const busy = persistence.status === "saving";
  const savedAt = formatSavedAt(persistence.lastSavedAt, language);
  const failureText = persistence.failure ? t(FAILURE_LABELS[persistence.failure] || FAILURE_LABELS.unknown_error) : "";

  return <div className="persistence-settings">
    <section className="persistence-status-card" data-status={persistence.status}>
      <span className="persistence-status-icon"><StatusIcon status={persistence.status} /></span>
      <div><strong>{persistenceStatusLabel(persistence.status, t)}</strong>
        <span>{linked ? (persistence.linkedFileName || t("尚未关联文件")) : t("浏览器自动保存")}</span></div>
      {savedAt && <time dateTime={persistence.lastSavedAt}>{t("最后保存：{time}", { time: savedAt })}</time>}
    </section>
    {failureText && <p className="persistence-message" role="status"><CircleAlert aria-hidden="true" />{failureText}</p>}

    <section className="persistence-section"><header><strong>{t("保存位置")}</strong>
      <span>{t("浏览器副本始终保留，本地文件模式会再同步一份可见文件。")}</span></header>
      <div className="persistence-mode-grid">
        <button type="button" className="persistence-mode-card" aria-pressed={!linked}
          disabled={busy}
          onClick={() => linked && persistence.disconnect()}>
          <Database aria-hidden="true" /><span><strong>{t("浏览器自动保存")}</strong>
            <small>{t("适合单一浏览器使用；需要迁移时导出备份。")}</small></span>
          {!linked && <CheckCircle2 className="persistence-mode-check" aria-hidden="true" />}</button>
        <button type="button" className="persistence-mode-card" aria-pressed={linked} disabled={!persistence.supported || busy}
          onClick={() => !linked && persistence.connectCurrentToNewFile()}>
          <HardDrive aria-hidden="true" /><span><strong>{t("关联本地文件")}</strong>
            <small>{t("持续同步到你选择的 .apw.json 文件，并保留浏览器安全副本。")}</small></span>
          {linked && <CheckCircle2 className="persistence-mode-check" aria-hidden="true" />}</button>
      </div>
      {!persistence.supported && <div className="persistence-unsupported"><ShieldCheck aria-hidden="true" /><span>
        <strong>{t("当前使用浏览器自动保存")}</strong>
        <small>{t("关联本地文件需要桌面版 Chrome 或 Edge 的安全网页环境；导出和恢复备份仍可使用。")}</small>
      </span></div>}
    </section>

    {persistence.supported && <section className="persistence-section"><header><strong>{t("本地文件操作")}</strong>
      <span>{t("文件选择和授权只会在你点击按钮后出现。")}</span></header>
      <div className="persistence-actions">
        {linked && <button type="button" className="button primary" disabled={busy || persistence.status === "conflict"}
          onClick={persistence.saveNow}><Save aria-hidden="true" />{t("立即保存")}</button>}
        {linked && ["reconnect_required", "error"].includes(persistence.status) && <button type="button" className="button secondary"
          disabled={busy} onClick={persistence.reconnect}><RefreshCw aria-hidden="true" />{t("重新连接")}</button>}
        {persistence.status === "conflict" && <button type="button" className="button primary" onClick={onResolveConflict}>
          <CircleAlert aria-hidden="true" />{t("处理版本冲突")}</button>}
        <button type="button" className="button secondary" disabled={busy} onClick={persistence.connectCurrentToNewFile}>
          <FilePlus2 aria-hidden="true" />{t(linked ? "更换本地文件" : "新建并关联文件")}</button>
        <button type="button" className="button secondary" disabled={busy} onClick={onOpenExisting}>
          <FolderOpen aria-hidden="true" />{t("打开现有工作台文件")}</button>
        {linked && <button type="button" className="button secondary persistence-disconnect" disabled={busy}
          onClick={persistence.disconnect}><Unlink aria-hidden="true" />{t("断开文件关联")}</button>}
      </div>
    </section>}

    <section className="persistence-section persistence-preferences"><header><strong>{t("离开保护")}</strong></header>
      <label className="persistence-toggle"><input type="checkbox" checked={persistence.settings.warnBeforeUnsyncedLeave}
        onChange={(event) => persistence.setWarnBeforeUnsyncedLeave(event.target.checked)} />
        <span><strong>{t("资料未同步时，离开页面前提醒")}</strong>
          <small>{t("正常保存完成后不会提示；浏览器原生提示的文字和按钮由浏览器决定。")}</small></span></label>
    </section>

    <p className="persistence-privacy"><ShieldCheck aria-hidden="true" />
      <span>{t("工作台不会上传项目或税务资料；本地文件也不会自动成为多人协作文件。")}</span></p>
    <footer className="modal-actions"><button type="button" className="button primary" onClick={onClose}>{t("完成")}</button></footer>
  </div>;
}

function SummaryCard({ label, summary, timestamp }) {
  const { language, t } = useUiLanguage();
  const time = formatSavedAt(timestamp, language);
  return <article className="workspace-version-card"><strong>{t(label)}</strong>
    <dl><div><dt>{t("公司主档")}</dt><dd>{summary.entities}</dd></div>
      <div><dt>{t("年度项目")}</dt><dd>{summary.engagements}</dd></div>
      <div><dt>{t("控股公司")}</dt><dd>{summary.holdingCompanies}</dd></div>
      <div><dt>{t("数据版本")}</dt><dd>V{summary.version}</dd></div></dl>
    {time && <time dateTime={timestamp}>{time}</time>}</article>;
}

export function OpenWorkspaceFileConfirm({ candidate, onConfirm, onClose }) {
  const { t } = useUiLanguage();
  const [busy, setBusy] = React.useState(false);
  return <div className="workspace-file-confirm"><p>{t("将打开“{name}”并替换当前工作台资料。文件通过验证后才会建立关联。",
    { name: candidate.fileName })}</p>
    <div className="workspace-version-grid"><SummaryCard label="当前浏览器资料" summary={candidate.currentSummary} />
      <SummaryCard label="所选文件" summary={candidate.summary}
        timestamp={candidate.lastModified ? new Date(candidate.lastModified).toISOString() : ""} /></div>
    <p className="workspace-file-warning"><CircleAlert aria-hidden="true" />
      {t("如需保留当前资料，请先取消并从备份菜单导出备份。")}</p>
    <footer className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>{t("取消")}</button>
      <button type="button" className="button primary" disabled={busy} onClick={async () => {
        setBusy(true); const completed = await onConfirm(candidate); if (!completed) setBusy(false);
      }}>{busy ? t("正在连接") : t("打开并关联")}</button></footer>
  </div>;
}

export function PersistenceConflictDialog({ conflict, onResolve, onClose }) {
  const { t } = useUiLanguage();
  const [busy, setBusy] = React.useState(false);
  const resolve = async (choice) => {
    setBusy(true);
    const completed = await onResolve(choice);
    if (!completed) setBusy(false);
  };
  return <div className="persistence-conflict"><p>{t("浏览器副本和“{name}”都在上次同步后发生了变化，系统已暂停自动保存。",
    { name: conflict.fileName })}</p>
    <div className="workspace-version-grid"><SummaryCard label="浏览器副本" summary={conflict.browserSummary} />
      <SummaryCard label="本地文件" summary={conflict.fileSummary}
        timestamp={conflict.fileLastModified ? new Date(conflict.fileLastModified).toISOString() : ""} /></div>
    <p className="workspace-file-warning"><ShieldCheck aria-hidden="true" />
      {t("选择一个版本继续；被替换的版本会先下载为恢复备份。")}</p>
    <div className="conflict-actions"><button type="button" className="button secondary" disabled={busy}
      onClick={() => resolve("file")}><HardDrive aria-hidden="true" />{t("使用本地文件")}</button>
      <button type="button" className="button primary" disabled={busy}
        onClick={() => resolve("browser")}><Database aria-hidden="true" />{t("使用浏览器副本")}</button></div>
    <footer className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>{t("稍后处理")}</button></footer>
  </div>;
}
