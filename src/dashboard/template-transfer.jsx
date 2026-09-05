import React from "react";
import { Download, FileJson2, Search, ShieldCheck, Upload } from "lucide-react";
import { workstreamCategoryLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { useModalDraft } from "./modal-draft.jsx";
import { templateExportRows, filterTemplateExportRows, toggleTemplateSelection, templateImportDecisions, templateImportDraft, templateImportCounts } from "./template-transfer-view.js";

export function TemplateLibraryTools({ tags, tag, sort, onTagChange, onSortChange, onImport, onExport,
  query = "", onQueryChange, searchRef, count, total, onClear }) {
  const { t } = useUiLanguage();
  return <div className="template-library-tools">
    <label className="template-library-search"><span>{t("查找当前种类范本")}</span><span><Search aria-hidden="true" />
      <input ref={searchRef} type="search" value={query} onChange={(event) => onQueryChange(event.target.value)}
        aria-label={t("查找当前种类范本")} placeholder={t("名称、说明、标签或版本")} /></span></label>
    <div className="template-library-filter"><label><span>{t("按标签筛选")}</span>
      <select aria-label={t("按标签筛选")} value={tag} onChange={(event) => onTagChange(event.target.value)}>
        <option value="all">{t("全部标签")}</option>{tags.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label><span>{t("范本排序")}</span><select aria-label={t("范本排序")} value={sort} onChange={(event) => onSortChange(event.target.value)}>
        <option value="updated">{t("最近更新")}</option><option value="name">{t("按名称")}</option>
        <option value="created">{t("最近建立")}</option></select></label></div>
    <div className="template-transfer-actions"><button type="button" className="button secondary" onClick={onImport}>
      <Upload aria-hidden="true" />{t("导入范本包")}</button><button type="button" className="button secondary" onClick={onExport}>
      <Download aria-hidden="true" />{t("导出范本包")}</button></div>
    <div className="template-library-results"><span role="status">{t("当前种类：显示 {visible} / {total} 个范本", { visible: count, total })}</span>
      {(query || tag !== "all") && <button type="button" className="button secondary" onClick={onClear}>{t("清除范本筛选")}</button>}</div>
  </div>;
}

function TemplateChoice({ sample, checked, onChange, kind, categoryName }) {
  const { t } = useUiLanguage();
  const conditions = sample.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
  return <label className="template-export-choice" data-template-key={`${kind}:${sample.id}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span aria-hidden="true"><FileJson2 /></span><span><strong>{sample.name}</strong>
      <small>{kind === "holding_company" ? t("控股公司范本") : categoryName}</small>
      <em>{t("{nodes} 个节点 · {conditions} 项条件", { nodes: sample.nodes.length, conditions })}</em>
      {sample.description && <small>{sample.description}</small>}
      {sample.tags?.length > 0 && <small>{sample.tags.join(" · ")}</small>}{sample.versionNote && <small>{sample.versionNote}</small>}</span></label>;
}

export function TemplateExportPanel({ samples, groupSamples, categories, initialSelection, onExport, onClose }) {
  const { language, t } = useUiLanguage();
  const [selected, setSelected] = React.useState(() => new Set(initialSelection || []));
  const [query, setQuery] = React.useState('');
  const searchRef = React.useRef(null);
  const all = templateExportRows(samples, groupSamples, categories, language, t("控股公司范本"));
  const visible = filterTemplateExportRows(all, query);
  const selectedRows = all.filter((row) => selected.has(row.key));
  const visibleSelected = visible.filter((row) => selected.has(row.key)).length;
  const hiddenSelected = selectedRows.length - visibleSelected;
  const toggle = (rows, checked) => setSelected((current) => toggleTemplateSelection(current, rows, checked));
  const clearSearch = () => { setQuery(''); searchRef.current?.focus(); };
  return <form className="template-transfer-panel" onSubmit={(event) => {
    event.preventDefault();
    onExport({ sampleIds: selectedRows.filter((row) => row.kind === 'workstream').map((row) => row.sample.id),
      groupSampleIds: selectedRows.filter((row) => row.kind === 'holding_company').map((row) => row.sample.id) });
  }}>
    <div className="template-package-note"><ShieldCheck aria-hidden="true" /><div><strong>{t("范本包只包含流程内容")}</strong>
      <span>{t("不会导出公司、负责人、待清事项或税务期限。分享前仍应检查范本文字，并在需要时使用公司去敏。")}</span></div></div>
    <div className="template-export-search"><label><span>{t("查找可导出范本")}</span><span><Search aria-hidden="true" />
      <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault(); }}
        aria-label={t("查找可导出范本")} placeholder={t("名称、说明、标签、版本或种类")} /></span></label>
      {query && <button type="button" className="button secondary" onClick={clearSearch}>{t("清除搜索")}</button>}</div>
    <div className="template-transfer-summary"><strong>{t("选择要导出的范本")}</strong>
      <div className="template-selection-actions"><button type="button" className="button secondary" onClick={() => toggle(all, true)}>{t("全选全部范本")}</button>
        <button type="button" className="button secondary" onClick={() => setSelected(new Set())}>{t("清除全部选择")}</button></div>
    </div>
    {query && <div className="template-filter-selection"><span>{t("筛选结果：{visible} / {total} 个范本", { visible: visible.length, total: all.length })}</span>
      <button type="button" className="button secondary" disabled={!visible.length} onClick={() => toggle(visible, true)}>{t("选择筛选结果")}</button>
      <button type="button" className="button secondary" disabled={!visibleSelected} onClick={() => toggle(visible, false)}>{t("取消选择筛选结果")}</button></div>}
    <div className="template-export-list">{visible.map((row) => <TemplateChoice key={row.key} sample={row.sample}
      checked={selected.has(row.key)} onChange={(checked) => toggle([row], checked)} kind={row.kind} categoryName={row.categoryName} />)}</div>
    {!visible.length && <div className="template-transfer-empty"><strong>{t(all.length ? "没有符合筛选的范本" : "还没有范本")}</strong>
      {query && <button type="button" className="button secondary" onClick={clearSearch}>{t("清除搜索")}</button>}</div>}
    <footer className="modal-actions"><div className="template-export-count" role="status">
      <strong>{t("已选择 {count} 个", { count: selectedRows.length })}</strong>
      {hiddenSelected > 0 && <small>{t("其中 {count} 个已选范本不在当前筛选中，仍会导出。", { count: hiddenSelected })}</small>}</div>
      <button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={!selectedRows.length}><Download aria-hidden="true" />{t("导出所选范本")}</button></footer>
  </form>;
}

function uniqueTargets(primary, secondary, all) {
  const seen = new Set();
  return [...primary, ...secondary, ...all].filter((target) => {
    if (seen.has(target.id)) return false; seen.add(target.id); return true;
  });
}

export function TemplateImportPreview({ preview, categories, samples, groupSamples, onApply, onClose }) {
  const { language, t } = useUiLanguage();
  const [decisions, setDecisions] = React.useState(() => templateImportDecisions(preview));
  const { closeEditor } = useModalDraft(templateImportDraft(decisions), onClose);
  const counts = templateImportCounts(decisions);
  const update = (templateKey, values) => setDecisions((current) => ({ ...current,
    [templateKey]: { ...current[templateKey], ...values } }));
  const packageCategory = (template) => preview.package.categories.find((category) => category.key === template.categoryKey);
  const selectedCount = Object.values(decisions).filter((decision) => decision.action !== "skip").length;
  return <form data-editor-guard className="template-transfer-panel" onSubmit={(event) => { event.preventDefault(); onApply(decisions); }}>
    <div className="template-package-note"><FileJson2 aria-hidden="true" /><div><strong>{t("范本包检查通过")}</strong>
      <span>{t("{templates} 个范本 · {nodes} 个节点 · {conditions} 项条件", preview.summary)}</span></div></div>
    <div className="template-import-decision-summary" role="status">{t("另存 {copy} · 替换 {replace} · 跳过 {skip}", counts)}</div>
    <div className="template-import-list">{preview.package.templates.map((template) => {
      const item = preview.items.find((candidate) => candidate.templateKey === template.templateKey);
      const decision = decisions[template.templateKey];
      const targets = uniqueTargets(item.matches, item.sameName, template.kind === "holding_company" ? groupSamples : samples);
      const sourceCategory = template.kind === "workstream" ? packageCategory(template) : null;
      return <section className="template-import-row" data-template-key={template.templateKey} key={template.templateKey} data-skipped={decision.action === "skip" || undefined}>
        <header><span className="sample-mark" aria-hidden="true">{template.kind === "holding_company" ? "H" : "T"}</span><div><strong>{template.name}</strong>
          <small>{template.kind === "holding_company" ? t("控股公司范本") : sourceCategory?.name
            || workstreamCategoryLabel({ builtinType: sourceCategory?.builtinType }, language)}</small></div>
          {(item.matches.length > 0 || item.sameName.length > 0) && <em>{t(item.matches.length ? "发现同来源范本" : "发现同名范本")}</em>}</header>
        <div className="template-import-controls"><label><span>{t("导入方式")}</span><select aria-label={t("导入方式")} value={decision.action}
          onChange={(event) => update(template.templateKey, { action: event.target.value })}>
          <option value="copy">{t("另存副本")}</option><option value="replace" disabled={!targets.length}>{t("替换现有范本")}</option>
          <option value="skip">{t("跳过")}</option></select></label>
          {decision.action === "replace" && <label><span>{t("要替换的范本")}</span><select aria-label={t("要替换的范本")} required value={decision.targetId}
            onChange={(event) => update(template.templateKey, { targetId: event.target.value })}>
            <option value="">{t("请选择")}</option>{targets.map((target) => <option value={target.id} key={target.id}>{target.name}</option>)}</select></label>}
          {template.kind === "workstream" && decision.action !== "skip" && <label><span>{t("导入到范本种类")}</span><select aria-label={t("导入到范本种类")} value={decision.categoryId}
            onChange={(event) => update(template.templateKey, { categoryId: event.target.value })}>
            {item.suggestedCategoryId.startsWith("__new__:") && <option value={item.suggestedCategoryId}>{t("建立种类：{name}", { name: sourceCategory?.name || template.name })}</option>}
            {item.suggestedCategoryId.startsWith("__builtin__:") && <option value={item.suggestedCategoryId}>{t("恢复系统种类")}</option>}
            {categories.map((category) => <option value={category.id} key={category.id}>{workstreamCategoryLabel(category, language)}</option>)}</select></label>}
        </div>
        {decision.action === "replace" && decision.targetId && <p className="template-replace-target">
          {t("要替换的范本")}：{targets.find((target) => target.id === decision.targetId)?.name}</p>}
        <footer><span>{t("{nodes} 个节点", { nodes: template.nodes.length })}</span>
          {template.tags.length > 0 && <span>{template.tags.join(" · ")}</span>}{template.versionNote && <span>{template.versionNote}</span>}</footer>
      </section>;
    })}</div>
    <footer className="modal-actions"><span className="template-import-count">{t("将导入 {count} 个范本", { count: selectedCount })}</span>
      <button type="button" className="button secondary" onClick={closeEditor}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={!selectedCount}><Upload aria-hidden="true" />{t("确认导入")}</button></footer>
  </form>;
}
