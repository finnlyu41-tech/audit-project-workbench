import React from "react";
import { useUiLanguage } from "./i18n.jsx";

export function ReportTableRegion({ label, children, className = "" }) {
  const scrollWithKeyboard = (event) => {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const viewport = event.currentTarget;
    if (viewport.scrollWidth <= viewport.clientWidth) return;
    event.preventDefault();
    viewport.scrollLeft += event.key === "ArrowLeft" ? -64 : 64;
  };
  return <div className={`management-table-scroll ${className}`} role="region" aria-label={label} tabIndex={0}
    onKeyDown={scrollWithKeyboard}>
    {children}
  </div>;
}

export function ReportRiskPanel({ title, Icon, items, emptyText, kind }) {
  const { t } = useUiLanguage();
  const [expanded, setExpanded] = React.useState(false);
  const listId = React.useId();
  const toggleRef = React.useRef(null);
  const shown = expanded ? items.length : Math.min(20, items.length);
  return <article data-risk-kind={kind} aria-label={title}>
    <header><Icon aria-hidden="true" /><strong>{title}</strong><span>{items.length}</span></header>
    {items.length ? <>
      <div className="management-risk-items" id={listId} data-expanded={expanded || undefined}>
        {items.map((item, index) => <button type="button" className="management-risk-entry" key={item.key}
          data-extra={index >= 20 || undefined} onClick={item.onOpen}>
          <strong>{item.title}</strong><small>{item.context}</small>
        </button>)}
      </div>
      <footer className="report-risk-controls">
        <span role="status">{t("显示 {visible} / {total} 项", { visible: shown, total: items.length })}</span>
        {items.length > 20 && <>
          <button type="button" ref={toggleRef} className="button secondary" aria-expanded={expanded}
            aria-controls={listId} onClick={() => { setExpanded((value) => !value); toggleRef.current?.focus(); }}>
            {t(expanded ? "收起风险清单" : "展开全部风险")}</button>
          <small>{t("打印始终包含当前报告范围内的全部风险。")}</small>
        </>}
      </footer>
    </> : <p>{emptyText}</p>}
  </article>;
}
