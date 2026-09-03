import React from "react";
import { Download, FileJson2, ShieldCheck, Upload } from "lucide-react";
import { workstreamCategoryLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

export function TemplateLibraryTools({ tags, tag, sort, onTagChange, onSortChange, onImport, onExport }) {
  const { t } = useUiLanguage();
  return <div className="template-library-tools">
    <div className="template-library-filter"><select aria-label={t("按标签筛选")} value={tag} onChange={(event) => onTagChange(event.target.value)}>
      <option value="all">{t("全部标签")}</option>{tags.map((value) => <option value={value} key={value}>{value}</option>)}</select>
      <select aria-label={t("范本排序")} value={sort} onChange={(event) => onSortChange(event.target.value)}>
        <option value="updated">{t("最近更新")}</option><option value="name">{t("按名称")}</option>
        <option value="created">{t("最近建立")}</option></select></div>
    <div className="template-transfer-actions"><button type="button" className="button secondary" onClick={onImport}>
      <Upload aria-hidden="true" />{t("导入范本包")}</button><button type="button" className="button secondary" onClick={onExport}>
      <Download aria-hidden="true" />{t("导出范本包")}</button></div>
  </div>;
}

function TemplateChoice({ sample, checked, onChange, kind, categoryName }) {
  const { t } = useUiLanguage();
  const conditions = sample.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
  return <label className="template-export-choice"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span aria-hidden="true"><FileJson2 /></span><span><strong>{sample.name}</strong>
      <small>{kind === "holding_company" ? t("控股公司范本") : categoryName}</small>
      <em>{t("{nodes} 个节点 · {conditions} 项条件", { nodes: sample.nodes.length, conditions })}</em></span></label>;
}

export function TemplateExportPanel({ samples, groupSamples, categories, initialSelection, onExport, onClose }) {
  const { language, t } = useUiLanguage();
  const [selected, setSelected] = React.useState(() => new Set(initialSelection || []));
  const all = [...samples.map((sample) => ({ kind: "workstream", sample })),
    ...groupSamples.map((sample) => ({ kind: "holding_company", sample }))];
  const toggle = (key, checked) => setSelected((current) => {
    const next = new Set(current); if (checked) next.add(key); else next.delete(key); return next;
  });
  const selectionKey = (kind, sample) => `${kind}:${sample.id}`;
  const categoryName = (sample) => workstreamCategoryLabel(categories.find((category) => category.id === sample.categoryId), language);
  return <form className="template-transfer-panel" onSubmit={(event) => {
    event.preventDefault();
    onExport({
      sampleIds: samples.filter((sample) => selected.has(selectionKey("workstream", sample))).map((sample) => sample.id),
      groupSampleIds: groupSamples.filter((sample) => selected.has(selectionKey("holding_company", sample))).map((sample) => sample.id),
    });
  }}>
    <div className="template-package-note"><ShieldCheck aria-hidden="true" /><div><strong>{t("范本包只包含流程内容")}</strong>
      <span>{t("不会导出公司、负责人、待清事项或税务期限。分享前仍应检查范本文字，并在需要时使用公司去敏。")}</span></div></div>
    <div className="template-transfer-summary"><strong>{t("选择要导出的范本")}</strong><span>{t("已选择 {count} 个", { count: selected.size })}</span>
      <button type="button" onClick={() => setSelected(new Set(all.map(({ kind, sample }) => selectionKey(kind, sample))))}>{t("全选")}</button>
      <button type="button" onClick={() => setSelected(new Set())}>{t("清除")}</button></div>
    <div className="template-export-list">{samples.map((sample) => <TemplateChoice key={sample.id} sample={sample}
      checked={selected.has(selectionKey("workstream", sample))} onChange={(checked) => toggle(selectionKey("workstream", sample), checked)}
      kind="workstream" categoryName={categoryName(sample)} />)}
      {groupSamples.map((sample) => <TemplateChoice key={sample.id} sample={sample}
        checked={selected.has(selectionKey("holding_company", sample))} onChange={(checked) => toggle(selectionKey("holding_company", sample), checked)}
        kind="holding_company" categoryName="" />)}</div>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={!selected.size}><Download aria-hidden="true" />{t("导出所选范本")}</button></footer>
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
  const [decisions, setDecisions] = React.useState(() => Object.fromEntries(preview.items.map((item) => [item.templateKey, {
    action: "copy",
    targetId: item.matches[0]?.id || item.sameName[0]?.id || "",
    categoryId: item.suggestedCategoryId,
  }])));
  const update = (templateKey, values) => setDecisions((current) => ({ ...current,
    [templateKey]: { ...current[templateKey], ...values } }));
  const packageCategory = (template) => preview.package.categories.find((category) => category.key === template.categoryKey);
  const selectedCount = Object.values(decisions).filter((decision) => decision.action !== "skip").length;
  return <form className="template-transfer-panel" onSubmit={(event) => { event.preventDefault(); onApply(decisions); }}>
    <div className="template-package-note"><FileJson2 aria-hidden="true" /><div><strong>{t("范本包检查通过")}</strong>
      <span>{t("{templates} 个范本 · {nodes} 个节点 · {conditions} 项条件", preview.summary)}</span></div></div>
    <div className="template-import-list">{preview.package.templates.map((template) => {
      const item = preview.items.find((candidate) => candidate.templateKey === template.templateKey);
      const decision = decisions[template.templateKey];
      const targets = uniqueTargets(item.matches, item.sameName, template.kind === "holding_company" ? groupSamples : samples);
      const sourceCategory = template.kind === "workstream" ? packageCategory(template) : null;
      return <section className="template-import-row" key={template.templateKey} data-skipped={decision.action === "skip" || undefined}>
        <header><span className="sample-mark" aria-hidden="true">{template.kind === "holding_company" ? "H" : "T"}</span><div><strong>{template.name}</strong>
          <small>{template.kind === "holding_company" ? t("控股公司范本") : sourceCategory?.name
            || workstreamCategoryLabel({ builtinType: sourceCategory?.builtinType }, language)}</small></div>
          {(item.matches.length > 0 || item.sameName.length > 0) && <em>{t(item.matches.length ? "发现同来源范本" : "发现同名范本")}</em>}</header>
        <div className="template-import-controls"><label><span>{t("导入方式")}</span><select value={decision.action}
          onChange={(event) => update(template.templateKey, { action: event.target.value })}>
          <option value="copy">{t("另存副本")}</option><option value="replace" disabled={!targets.length}>{t("替换现有范本")}</option>
          <option value="skip">{t("跳过")}</option></select></label>
          {decision.action === "replace" && <label><span>{t("要替换的范本")}</span><select required value={decision.targetId}
            onChange={(event) => update(template.templateKey, { targetId: event.target.value })}>
            <option value="">{t("请选择")}</option>{targets.map((target) => <option value={target.id} key={target.id}>{target.name}</option>)}</select></label>}
          {template.kind === "workstream" && decision.action !== "skip" && <label><span>{t("导入到范本种类")}</span><select value={decision.categoryId}
            onChange={(event) => update(template.templateKey, { categoryId: event.target.value })}>
            {item.suggestedCategoryId.startsWith("__new__:") && <option value={item.suggestedCategoryId}>{t("建立种类：{name}", { name: sourceCategory?.name || template.name })}</option>}
            {item.suggestedCategoryId.startsWith("__builtin__:") && <option value={item.suggestedCategoryId}>{t("恢复系统种类")}</option>}
            {categories.map((category) => <option value={category.id} key={category.id}>{workstreamCategoryLabel(category, language)}</option>)}</select></label>}
        </div>
        <footer><span>{t("{nodes} 个节点", { nodes: template.nodes.length })}</span>
          {template.tags.length > 0 && <span>{template.tags.join(" · ")}</span>}{template.versionNote && <span>{template.versionNote}</span>}</footer>
      </section>;
    })}</div>
    <footer className="modal-actions"><span className="template-import-count">{t("将导入 {count} 个范本", { count: selectedCount })}</span>
      <button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary" disabled={!selectedCount}><Upload aria-hidden="true" />{t("确认导入")}</button></footer>
  </form>;
}
