import React from "react";
import { Building2, CalendarDays, Search } from "lucide-react";
import { useUiLanguage } from "./i18n.jsx";
import { findQuickOpenRecords, quickOpenIndex } from "./quick-open-model.js";

export function QuickOpen({ store, recent, onOpen }) {
  const { language, t } = useUiLanguage();
  const [query, setQuery] = React.useState("");
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const index = React.useMemo(() => quickOpenIndex(store, language), [store, language]);
  const { total, records } = React.useMemo(() => findQuickOpenRecords(index, query, includeArchived, recent),
    [index, query, includeArchived, recent]);
  const active = Math.min(activeIndex, Math.max(0, records.length - 1));
  const listId = React.useId(); const helpId = React.useId();
  const listRef = React.useRef(null);
  React.useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, query, includeArchived]);
  const onKeyDown = (event) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") { event.preventDefault(); if (records[active]) onOpen(records[active]); }
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (records.length) setActiveIndex((active + (event.key === "ArrowDown" ? 1 : -1) + records.length) % records.length);
    }
  };
  return <div className="quick-open"><label className="quick-open-search"><Search aria-hidden="true" />
    <input autoFocus data-dialog-initial-focus type="text" role="combobox" aria-autocomplete="list" aria-expanded="true"
      aria-controls={listId} aria-activedescendant={records.length ? `${listId}-${active}` : undefined}
      aria-label={t("查找公司或年度项目")} aria-describedby={helpId} autoComplete="off" spellCheck="false"
      placeholder={t("公司名称、报告年度、项目类型或负责人")}
      value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={onKeyDown} /></label>
    <div className="quick-open-options"><label className="check-option"><input type="checkbox" checked={includeArchived}
      onChange={(event) => { setIncludeArchived(event.target.checked); setActiveIndex(0); }} /><span>{t("包含归档记录")}</span></label>
      <span role="status">{t("找到 {count} 项", { count: total })}</span></div>
    <ul className="quick-open-results" id={listId} ref={listRef} role="listbox" aria-label={t("快速打开结果")}>
      {records.map((record, i) => <li id={`${listId}-${i}`} key={record.key} role="option" aria-selected={i === active}
        onMouseDown={(event) => event.preventDefault()} onClick={() => onOpen(record)}>
        {record.kind === "entity" ? <Building2 aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
        <span className="quick-open-copy"><strong>{record.name}</strong>
          <small>{record.kind === "entity" ? t("公司主档") : [record.types, record.period].filter(Boolean).join(" · ")}</small>
          {record.owner && <small>{t("负责人")}：{record.owner}</small>}</span>
        <span className="quick-open-badge">{t(record.archived ? "已归档，只读" : record.kind === "entity" ? "公司" : "年度项目")}</span>
      </li>)}
    </ul>
    {!records.length && <div className="quick-open-empty"><strong>{t("没有找到匹配记录")}</strong>
      <p>{t("尝试公司名称或报告年度；历史记录可勾选“包含归档记录”。")}</p></div>}
    {total > records.length && <p className="quick-open-limit">{t("仅显示前 {count} 项，请增加关键词缩小范围。", { count: records.length })}</p>}
    <footer id={helpId}><span>{t("↑ ↓ 选择，Enter 打开，Esc 取消")}</span>
      <small>{t("只搜索当前工作台资料，不上传搜索内容。")}</small></footer>
  </div>;
}
