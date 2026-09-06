import React from 'react';
import { ChevronDown, ChevronRight, Ellipsis, ListFilter, ListPlus, MessageSquareText, Palette, Pencil, Trash2 } from 'lucide-react';
import { useUiLanguage } from './i18n.jsx';
import { collectGroupOutstandingEntries, reportingPeriodLabel, outstandingIsOpen, workstreamTypeLabel } from './model.js';
import { filterOutstandingEntries, outstandingEntryKey, outstandingVisibilityCounts, groupOutstandingEntries } from './outstanding-center-model.js';

export function OutstandingCenter({ store, target, targetKind, statuses, updateProject, updateGroup, setModal, onOpenItem,
  notify, readOnly = false, activeWorkstreamId = null, revealRequest = null, onRevealHandled }) {
  const { language, t } = useUiLanguage();
  const [visibilityFilter, setVisibilityFilter] = React.useState("open");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [revealedItemKey, setRevealedItemKey] = React.useState(null);
  const [pendingFocus, setPendingFocus] = React.useState(null);
  const [expandedItemKey, setExpandedItemKey] = React.useState(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const panelId = React.useId(); const filterRef = React.useRef(null); const moreRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const cardsRef = React.useRef(new Map());
  const rawEntries = targetKind === "group"
    ? collectGroupOutstandingEntries(store, target.id, new Set(), 0, readOnly)
    : (target.outstandingItems || []).map((item) => ({ item, sourceType: "project", sourceId: target.id,
      sourceName: target.name, depth: 0 }));
  const entries = rawEntries.map((entry) => {
    const source = entry.sourceType === "project" ? store.projects.find((item) => item.id === entry.sourceId)
      : store.groups.find((item) => item.id === entry.sourceId);
    const engagement = store.engagements.find((item) => item.id === entry.sourceId);
    const entity = store.entities.find((item) => item.id === engagement?.entityId);
    const workstream = entry.item.workstreamId && entry.sourceType === "project"
      ? source?.workstreams.find((item) => item.id === entry.item.workstreamId) : null;
    return { ...entry, source, workstream, companyName: entity?.legalName || source?.entity || entry.sourceName,
      sourceOwner: source?.owner || "", periodLabel: reportingPeriodLabel(engagement || source, language),
      readOnly: readOnly || !source || Boolean(source.archived || entity?.archived),
      moduleKey: workstream ? `${entry.sourceId}:${workstream.id}` : `${entry.sourceId}:project`,
      moduleLabel: workstream ? workstreamTypeLabel(workstream.type, language, workstream.customName)
        : t(entry.sourceType === "group" ? "集团级" : "项目级") };
  });
  const moduleOptions = [...new Map(entries.map((entry) => [entry.moduleKey,
    targetKind === "group" ? `${entry.companyName} · ${entry.moduleLabel}` : entry.moduleLabel])).entries()];
  const visibilityCounts = outstandingVisibilityCounts(entries, store.outstandingStatuses);
  const filters = { query, visibility: visibilityFilter, status: statusFilter, module: moduleFilter };
  const visible = filterOutstandingEntries(entries, store.outstandingStatuses, filters);
  const filtered = Boolean(query.trim() || visibilityFilter !== "open" || statusFilter !== "all" || moduleFilter !== "all");
  const clearFilters = () => {
    setQuery(""); setVisibilityFilter("open"); setStatusFilter("all"); setModuleFilter("all"); (searchRef.current || filterRef.current)?.focus();
  };
  React.useEffect(() => {
    if (!revealRequest || revealRequest.targetId !== target.id) return;
    const entry = entries.find((item) => item.sourceId === (revealRequest.sourceId || target.id)
      && item.item.id === revealRequest.itemId);
    if (!entry) { onRevealHandled?.(); return; }
    setVisibilityFilter(outstandingIsOpen(entry.item, store.outstandingStatuses) ? "open" : "closed");
    setQuery(""); setStatusFilter("all"); setModuleFilter("all"); setRevealedItemKey(outstandingEntryKey(entry)); setExpandedItemKey(outstandingEntryKey(entry));
  }, [revealRequest, target.id]);
  React.useEffect(() => {
    if (!revealRequest || revealRequest.targetId !== target.id || query || statusFilter !== "all" || moduleFilter !== "all") return;
    const entry = visible.find((item) => item.sourceId === (revealRequest.sourceId || target.id)
      && item.item.id === revealRequest.itemId && outstandingEntryKey(item) === revealedItemKey);
    const card = entry && cardsRef.current.get(outstandingEntryKey(entry));
    if (!card) return;
    const frame = window.requestAnimationFrame(() => {
      card.focus({ preventScroll: true }); card.scrollIntoView({ block: "nearest", inline: "nearest" }); onRevealHandled?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [revealRequest, revealedItemKey, query, visibilityFilter, statusFilter, moduleFilter, target.id, onRevealHandled]);
  React.useEffect(() => {
    if (!pendingFocus) return;
    const frame = window.requestAnimationFrame(() => {
      const card = cardsRef.current.get(pendingFocus.key);
      const control = (pendingFocus.status ? card?.querySelector("select") : card) || searchRef.current || filterRef.current;
      control?.focus({ preventScroll: true }); control?.scrollIntoView({ block: "nearest", inline: "nearest" });
      setPendingFocus(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingFocus]);
  const focusAfterChange = (entry, nextEntries, status = false) => {
    const next = filterOutstandingEntries(nextEntries, store.outstandingStatuses, filters);
    const key = outstandingEntryKey(entry);
    const index = visible.findIndex((item) => outstandingEntryKey(item) === key);
    const selected = next.find((item) => outstandingEntryKey(item) === key) || next[Math.min(index, next.length - 1)];
    setPendingFocus({ key: selected ? outstandingEntryKey(selected) : null, status });
  };
  const updateSource = (entry, updater) => {
    if (entry.readOnly) return;
    (entry.sourceType === "group" ? updateGroup : updateProject)(entry.sourceId,
      (source) => ({ ...source, outstandingItems: updater(source.outstandingItems || []) }));
  };
  const updateStatus = (entry, status) => {
    if (entry.readOnly) return;
    updateSource(entry, (items) => items.map((item) => item.id === entry.item.id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    focusAfterChange(entry, entries.map((item) => outstandingEntryKey(item) === outstandingEntryKey(entry)
      ? { ...item, item: { ...item.item, status } } : item), true);
    notify(t("事项状态已更新"));
  };
  const removeItem = (entry) => {
    if (entry.readOnly || !window.confirm(t("删除待清事项“{name}”？", { name: entry.item.title }))) return;
    updateSource(entry, (items) => items.filter((item) => item.id !== entry.item.id));
    focusAfterChange(entry, entries.filter((item) => outstandingEntryKey(item) !== outstandingEntryKey(entry)));
    notify(t("待清事项已删除"));
  };
  const groups = groupOutstandingEntries(visible);
  const activeFilterCount = Number(Boolean(query.trim())) + Number(visibilityFilter !== 'open')
    + Number(statusFilter !== 'all') + Number(moduleFilter !== 'all');
  const currentEngagement = store.engagements.find(item => item.id === target.id);
  const company = store.entities.find(item => item.id === currentEngagement?.entityId);
  const displayScope = t(visibilityFilter === 'open' ? "未清" : visibilityFilter === 'closed' ? "已清／归档" : "全部");
  return <div className="outstanding-center" data-layout="light">
    <div className="outstanding-center-tools">
      <div className="outstanding-toolbar">
        <span className="outstanding-result-count" role="status" aria-label={t("显示 {visible} / {total} 项", { visible: visible.length, total: entries.length })}>
          <strong>{displayScope}</strong> <span>{visible.length}</span></span>
        <div className="outstanding-center-actions">
          {!readOnly && <button type="button" className="button primary outstanding-add" aria-label={t("添加待清")}
            onClick={event => { event.currentTarget.focus(); setModal({ type: 'outstanding', targetKind,
              targetId: target.id, defaultWorkstreamId: targetKind === 'project' ? activeWorkstreamId : null }); }}>
            <ListPlus aria-hidden="true" /><span>{t("新增")}</span></button>}
          <button ref={filterRef} type="button" className="button secondary outstanding-filter-toggle" aria-label={t("搜索与筛选待清事项")}
            aria-expanded={filtersOpen} aria-controls={`${panelId}-filters`} onClick={() => { setFiltersOpen(value => !value); setMoreOpen(false); }}>
            <ListFilter aria-hidden="true" />{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>
          {!readOnly && <button ref={moreRef} type="button" className="button secondary outstanding-more-toggle" aria-label={t("更多待清操作")}
            aria-expanded={moreOpen} aria-controls={`${panelId}-more`} onClick={() => { setMoreOpen(value => !value); setFiltersOpen(false); }}>
            <Ellipsis aria-hidden="true" /></button>}
        </div>
      </div>
      {filtered && <div className="outstanding-active-filters"><span>{t("筛选已启用")} · {activeFilterCount}</span>
        <button type="button" onClick={clearFilters}>{t("重置为未清事项")}</button></div>}
    </div>
    <div className="outstanding-body">
      {moreOpen && <div id={`${panelId}-more`} className="outstanding-more-actions" role="group" aria-label={t("更多待清操作")}
        onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setMoreOpen(false); moreRef.current?.focus(); } }}>
        <button type="button" className="button secondary outstanding-followup-trigger"
          disabled={!entries.some(entry => !entry.readOnly && outstandingIsOpen(entry.item, store.outstandingStatuses))}
          onClick={event => { event.currentTarget.focus(); setModal({ type: 'client-follow-up', targetKind, targetId: target.id }); }}>{t("客户跟进草稿")}</button>
        <button type="button" className="button secondary" onClick={event => { event.currentTarget.focus(); setModal({ type: 'outstanding-statuses' }); }}>
          <Palette aria-hidden="true" />{t("状态与颜色")}</button>
      </div>}
      {filtersOpen && <div id={`${panelId}-filters`} className="outstanding-tools-panel" role="group" aria-label={t("搜索与筛选待清事项")}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setFiltersOpen(false); filterRef.current?.focus(); } }}>
        <label className="outstanding-search"><span>{t("查找待清事项")}</span>
          <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder={t("标题、来源、模块或项目负责人")} /></label>
        <div className="outstanding-visibility-tabs" role="group" aria-label={t("待清事项显示范围")}>
          {['open', 'closed', 'all'].map(value => <button type="button" key={value}
            aria-pressed={visibilityFilter === value} onClick={() => { setVisibilityFilter(value); setStatusFilter('all'); }}>
            <span>{t(value === 'open' ? "未清" : value === 'closed' ? "已清／归档" : "全部")}</span><strong>{visibilityCounts[value]}</strong></button>)}
        </div>
        <div className="outstanding-filter-selects">
          <label><span>{t("按业务模块筛选")}</span><select value={moduleFilter} onChange={event => setModuleFilter(event.target.value)}>
            <option value="all">{t("全部层级与模块")}</option>{moduleOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>{t("按待清状态筛选")}</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">{t("全部状态")}</option>{statuses.map(status => <option value={status.id} key={status.id}>{status.label}</option>)}</select></label>
        </div>
      </div>}
      {targetKind === 'project' && <div className="outstanding-context-summary">
        <strong>{company?.legalName || target.entity || target.name}</strong>
        <span>{reportingPeriodLabel(currentEngagement || target, language)}</span>
      </div>}
      <div className="outstanding-list">{groups.map(group => <section key={group.key} className="outstanding-source-group" data-source-id={group.sourceId} data-source-kind={group.sourceType}
        aria-label={targetKind === 'group' ? `${group.companyName} · ${group.periodLabel}` : undefined}>
        {targetKind === 'group' && <header className="outstanding-group-heading"><strong>{group.companyName}</strong>
          <span>{group.periodLabel}</span><small>{t("显示 {visible} / {total} 项", { visible: group.entries.length,
            total: entries.filter(entry => entry.sourceId === group.sourceId && entry.sourceType === group.sourceType).length })}
            {group.readOnly ? ` · ${t("已归档，只读")}` : ''}</small></header>}
        {group.entries.map(entry => {
          const key = outstandingEntryKey(entry);
          return <OutstandingRow key={key} entry={entry} statuses={statuses} expanded={expandedItemKey === key}
            revealed={revealedItemKey === key} register={element => { if (element) cardsRef.current.set(key, element); else cardsRef.current.delete(key); }}
            onExpand={() => setExpandedItemKey(value => value === key ? null : key)} onStatus={status => updateStatus(entry, status)}
            onEdit={() => setModal({ type: 'outstanding', targetKind: entry.sourceType, targetId: entry.sourceId, item: entry.item })}
            onOpen={() => onOpenItem(entry.sourceType, entry.sourceId, entry.item.id)} onDelete={() => removeItem(entry)} />;
        })}
      </section>)}{!visible.length && <div className="outstanding-center-empty"><strong>{t(filtered ? "没有符合筛选的待清事项" : entries.length ? "当前没有未清事项" : "尚无待清事项")}</strong>
        {filtered && <button type="button" className="button secondary" onClick={clearFilters}>{t("重置为未清事项")}</button>}
      </div>}</div>
    </div>
  </div>;
}

function OutstandingRow({ entry, statuses, expanded, revealed, register, onExpand, onStatus, onEdit, onOpen, onDelete }) {
  const { t } = useUiLanguage(); const detailsId = React.useId();
  const [more, setMore] = React.useState(false); const moreRef = React.useRef(null);
  const status = statuses.find(option => option.id === entry.item.status);
  React.useEffect(() => { if (!expanded) setMore(false); }, [expanded]);
  return <article className="outstanding-item" tabIndex="-1" aria-label={entry.item.title}
    data-outstanding-key={outstandingEntryKey(entry)} data-revealed={revealed || undefined} data-expanded={expanded || undefined}
    ref={register} style={{ '--status-color': status?.color || '#778078' }}>
    <div className="outstanding-item-summary">
      <button type="button" className="outstanding-item-toggle" aria-expanded={expanded} aria-controls={detailsId}
        onClick={onExpand}><ChevronRight aria-hidden="true" /><span><strong>{entry.item.title}</strong>
        <small>{entry.moduleLabel}{entry.item.note && <><span aria-hidden="true"> · </span><span className="outstanding-note-indicator" title={t("有补充说明")}><MessageSquareText aria-hidden="true" /><span>{t("有补充说明")}</span></span></>}</small></span></button>
      {entry.readOnly ? <span className="outstanding-status-chip readonly">{status?.label || entry.item.status}</span>
        : <label className="outstanding-status-chip">
          <span aria-hidden="true"><i />{status?.label || entry.item.status}<ChevronDown /></span>
          {/* Keep the native select as the pointer/keyboard control over one fully wrapped visible label. */}
          <select aria-label={t("待清事项状态：{name}", { name: entry.item.title })} value={entry.item.status}
            onChange={event => onStatus(event.target.value)}>
            {!status && <option value={entry.item.status}>{entry.item.status}</option>}
            {statuses.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>}
    </div>
    {expanded && <div id={detailsId} className="outstanding-item-details">
      <div className="outstanding-context">{[entry.periodLabel, entry.sourceOwner].filter(Boolean).join(' · ')}</div>
      {entry.item.note && <p className="outstanding-note">{entry.item.note}</p>}
      <div className="outstanding-source"><button type="button" onClick={onOpen}>{t("查看原事项")}</button></div>
      {!entry.readOnly && <div className="outstanding-item-actions">
        <button type="button" className="button secondary" onClick={event => { event.currentTarget.focus(); onEdit(); }}><Pencil aria-hidden="true" />{t("编辑")}</button>
        <button ref={moreRef} type="button" className="button secondary" aria-label={t("更多事项操作")}
          aria-expanded={more} aria-controls={`${detailsId}-more`} onClick={() => setMore(value => !value)}><Ellipsis aria-hidden="true" /></button>
        {more && <div id={`${detailsId}-more`} className="outstanding-item-more" onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); setMore(false); moreRef.current?.focus(); }
        }}><button type="button" className="button danger-quiet" onClick={onDelete}><Trash2 aria-hidden="true" />{t("删除")}</button></div>}
      </div>}
    </div>}
  </article>;
}
