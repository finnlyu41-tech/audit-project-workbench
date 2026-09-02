import React from "react";
import { dueTone, formatDate, nodeIsComplete, nodeStatus, outstandingIsOpen, projectStats, uid } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

export function Modal({ title, onClose, children, wide = false }) {
  const { t } = useUiLanguage();
  React.useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="workbench-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="workbench-modal" data-wide={wide || undefined} role="dialog" aria-modal="true" aria-label={title}
      onMouseDown={(event) => event.stopPropagation()}>
      <header><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={t("关闭")}>×</button></header>
      {children}
    </section>
  </div>;
}
export function ProjectForm({ initial, onSubmit, onClose, submitLabel, allowTemplate = true,
  sampleName }) {
  const { t } = useUiLanguage();
  const resolvedSampleName = sampleName || t("基础审计流程");
  const [values, setValues] = React.useState(() => ({
    name: initial?.name || "",
    entity: initial?.entity || "",
    period: initial?.period || "",
    dueDate: initial?.dueDate || "",
    notes: initial?.notes || "",
  }));
  const [useStarter, setUseStarter] = React.useState(true);
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    if (values.name.trim()) onSubmit(values, useStarter);
  }}>
    <label><span>{t("项目名称 *")}</span><input autoFocus required value={values.name} onChange={update("name")}
      placeholder={t("例如：[公司名称] 2025年度审计")} /></label>
    <div className="form-grid">
      <label><span>{t("法律实体")}</span><input value={values.entity} onChange={update("entity")} placeholder={t("公司完整名称")} /></label>
      <label><span>{t("报告期间")}</span><input value={values.period} onChange={update("period")}
        placeholder={t("例如：截至2025年3月31日")} /></label>
    </div>
    <label><span>{t("目标完成日期")}</span><input type="date" value={values.dueDate} onChange={update("dueDate")} /></label>
    <label><span>{t("备注")}</span><textarea rows="3" value={values.notes} onChange={update("notes")}
      placeholder={t("可记录负责人、客户要求或其他背景")} /></label>
    {allowTemplate && <label className="check-option">
      <input type="checkbox" checked={useStarter} onChange={(event) => setUseStarter(event.target.checked)} />
      <span><strong>{t("套用 Sample：{name}", { name: resolvedSampleName })}</strong><small>{t("建立后仍可自由增加、修改、排序或删除。")}</small></span>
    </label>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(submitLabel || "建立项目")}</button></footer>
  </form>;
}

export function SampleLibrary({ samples, selectedSampleId, onSelect, onCreate, onEdit, onDuplicate, onDelete, onUse }) {
  const { t } = useUiLanguage();
  return <section className="sample-library">
    <header className="sample-library-header"><div><strong>{t("Sample 范本库")}</strong>
      <span>{t("可保存多个范本，并选择任一范本建立项目。")}</span></div>
      <button type="button" className="button primary" onClick={onCreate}>{t("＋ 新建 Sample")}</button></header>
    {samples.length ? <div className="sample-library-list">{samples.map((sample) => {
      const conditions = sample.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
      const selected = sample.id === selectedSampleId;
      return <article className="sample-library-card" data-selected={selected || undefined} key={sample.id}>
        <button type="button" className="sample-library-select" onClick={() => onSelect(sample.id)}>
          <span className="sample-mark" aria-hidden="true">S</span><span><strong>{sample.name}</strong>
            <small>{sample.description || t("没有说明")}</small>
            <em>{t("{nodes} 个节点 · {conditions} 项条件", { nodes: sample.nodes.length, conditions })}</em></span>
          {selected && <i>{t("当前使用")}</i>}
        </button>
        <footer><button type="button" onClick={() => onUse(sample.id)}>{t("使用此 Sample")}</button>
          <button type="button" onClick={() => onEdit(sample.id)}>{t("编辑")}</button>
          <button type="button" onClick={() => onDuplicate(sample.id)}>{t("复制")}</button>
          <button type="button" onClick={() => onDelete(sample.id)}>{t("删除")}</button></footer>
      </article>;
    })}</div> : <div className="sample-library-empty"><strong>{t("还没有 Sample")}</strong>
      <span>{t("建立第一个范本后，就能用它快速创建项目。")}</span>
      <button type="button" className="button primary" onClick={onCreate}>{t("新建 Sample")}</button></div>}
  </section>;
}

export function OutstandingStatusEditor({ statuses, usageCounts, onSave, onClose }) {
  const { t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(statuses)));
  const updateStatus = (statusId, updater) => setDraft((current) => current.map((status) =>
    status.id === statusId ? updater(status) : status));
  const moveStatus = (index, direction) => setDraft((current) => {
    const next = [...current];
    const target = index + direction;
    if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const removeStatus = (status) => {
    const usage = usageCounts[status.id] || 0;
    if (usage) {
      window.alert(t("此状态正在被 {count} 项待清事项使用。请先把这些事项改到其他状态。", { count: usage }));
      return;
    }
    setDraft((current) => current.filter((item) => item.id !== status.id));
  };
  return <form className="status-editor" onSubmit={(event) => {
    event.preventDefault();
    const cleaned = draft.map((status) => ({ ...status, label: status.label.trim() }));
    if (!cleaned.length) {
      window.alert(t("至少保留一个状态。"));
      return;
    }
    if (!cleaned.some((status) => status.closed)) {
      window.alert(t("至少要有一个状态标记为已清。"));
      return;
    }
    onSave(cleaned);
  }}>
    <p className="status-editor-help">{t("新增、改名、排序状态，并指定哪些状态代表事项已经清理。")}</p>
    <div className="status-editor-list">{draft.map((status, index) => <section className="status-editor-row" key={status.id}>
      <span className="status-editor-dot" data-tone={status.tone} />
      <label><span>{t("状态名称 *")}</span><input required value={status.label}
        onChange={(event) => updateStatus(status.id, (current) => ({ ...current,
          builtinKey: undefined, label: event.target.value }))} /></label>
      <label className="status-closed-option"><input type="checkbox" checked={status.closed}
        onChange={(event) => updateStatus(status.id, (current) => ({ ...current, closed: event.target.checked }))} />
        <span>{t("视为已清")}</span></label>
      <small>{t("{count} 项使用中", { count: usageCounts[status.id] || 0 })}</small>
      <div><button type="button" disabled={index === 0} onClick={() => moveStatus(index, -1)} aria-label={t("上移状态")}>↑</button>
        <button type="button" disabled={index === draft.length - 1} onClick={() => moveStatus(index, 1)} aria-label={t("下移状态")}>↓</button>
        <button type="button" disabled={draft.length === 1} onClick={() => removeStatus(status)}>{t("删除")}</button></div>
    </section>)}</div>
    <button type="button" className="status-add-button" onClick={() => setDraft((current) => [...current, {
      id: uid("outstanding-status"), label: "", closed: false, tone: "neutral",
    }])}>{t("＋ 添加状态")}</button>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存状态")}</button></footer>
  </form>;
}

export function SampleEditor({ sample, onSave, onClose, onReset, onRedact }) {
  const { t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(sample)));
  const updateNode = (nodeId, updater) => setDraft((current) => ({ ...current,
    nodes: current.nodes.map((node) => node.id === nodeId ? updater(node) : node) }));
  const moveNode = (index, direction) => setDraft((current) => {
    const nodes = [...current.nodes];
    const target = index + direction;
    if (target >= 0 && target < nodes.length) [nodes[index], nodes[target]] = [nodes[target], nodes[index]];
    return { ...current, nodes };
  });
  const totalConditions = draft.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
  return <form className="sample-editor" onSubmit={(event) => {
    event.preventDefault();
    if (!draft.name.trim() || draft.nodes.some((node) => !node.title.trim())) return;
    onSave({ ...draft, builtinKey: undefined, name: draft.name.trim(), description: draft.description.trim(),
      nodes: draft.nodes.map((node) => ({ ...node, title: node.title.trim(), description: node.description.trim(),
        conditions: node.conditions.map((condition) => ({ ...condition, label: condition.label.trim(), done: false }))
          .filter((condition) => condition.label) })) });
  }}>
    <div className="sample-editor-summary">
      <label><span>{t("Sample 名称 *")}</span><input autoFocus required value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
      <label><span>{t("说明")}</span><input value={draft.description}
        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
        placeholder={t("说明这个 Sample 的适用范围")} /></label>
      <small>{t("{nodes} 个节点 · {conditions} 项条件", { nodes: draft.nodes.length, conditions: totalConditions })}</small>
    </div>
    <div className="sample-editor-list">{draft.nodes.map((node, index) => <section className="sample-edit-node" key={node.id}>
      <header><span>{index + 1}</span><input required value={node.title} aria-label={t("节点 {index} 名称", { index: index + 1 })}
        onChange={(event) => updateNode(node.id, (current) => ({ ...current, title: event.target.value }))} />
        <div><button type="button" disabled={index === 0} onClick={() => moveNode(index, -1)} aria-label={t("上移节点")}>↑</button>
          <button type="button" disabled={index === draft.nodes.length - 1} onClick={() => moveNode(index, 1)} aria-label={t("下移节点")}>↓</button>
          <button type="button" onClick={() => window.confirm(t("删除节点“{name}”？", { name: node.title || t("未命名") })) &&
            setDraft((current) => ({ ...current, nodes: current.nodes.filter((item) => item.id !== node.id) }))}>{t("删除")}</button></div></header>
      <input className="sample-node-description" value={node.description} aria-label={t("{name}说明", { name: node.title || t("节点 {index}", { index: index + 1 }) })}
        onChange={(event) => updateNode(node.id, (current) => ({ ...current, description: event.target.value }))}
        placeholder={t("节点说明")} />
      <div className="sample-condition-editor">{node.conditions.map((condition, conditionIndex) => <div key={condition.id}>
        <span>{conditionIndex + 1}</span><input value={condition.label} aria-label={t("{name}条件 {index}", {
          name: node.title || t("节点 {index}", { index: index + 1 }), index: conditionIndex + 1 })}
          onChange={(event) => updateNode(node.id, (current) => ({ ...current,
            conditions: current.conditions.map((item) => item.id === condition.id ? { ...item, label: event.target.value } : item) }))} />
        <button type="button" onClick={() => updateNode(node.id, (current) => ({ ...current,
          conditions: current.conditions.filter((item) => item.id !== condition.id) }))} aria-label={t("删除条件")}>×</button></div>)}</div>
      <footer><button type="button" onClick={() => updateNode(node.id, (current) => ({ ...current,
        conditions: [...current.conditions, { id: uid("sample-condition"), label: "", done: false }] }))}>{t("＋ 添加条件")}</button></footer>
    </section>)}</div>
    <button type="button" className="sample-add-node" onClick={() => setDraft((current) => ({ ...current,
      nodes: [...current.nodes, { id: uid("sample-node"), title: "", description: "", conditions: [] }] }))}>{t("＋ 添加节点")}</button>
    <footer className="sample-editor-actions">{onReset
      ? <button type="button" className="button secondary" onClick={onReset}>{t("恢复基础范本")}</button> : <span />}
      {onRedact ? <button type="button" className="button secondary" onClick={onRedact}>{t("公司去敏")}</button> : <span />}
      <span /><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存 Sample")}</button></footer>
  </form>;
}

export function NodeForm({ initial, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [title, setTitle] = React.useState(initial?.title || "");
  const [description, setDescription] = React.useState(initial?.description || "");
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    if (title.trim()) onSubmit({ title: title.trim(), description: description.trim() });
  }}>
    <label><span>{t("节点名称 *")}</span><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)}
      placeholder={t("例如：税务计算")} /></label>
    <label><span>{t("说明")}</span><textarea rows="3" value={description}
      onChange={(event) => setDescription(event.target.value)} placeholder={t("说明这个节点的目标")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存节点")}</button></footer>
  </form>;
}

export function ProgressBar({ value, compact = false }) {
  const { t } = useUiLanguage();
  return <div className="progress-track" data-compact={compact || undefined} aria-label={t("完成 {value}%", { value })}>
    <span style={{ width: `${value}%` }} />
  </div>;
}

export function ProjectRow({ project, outstandingStatuses, selected, onSelect }) {
  const { language, t } = useUiLanguage();
  const stats = projectStats(project);
  const currentNode = project.nodes.find((node) => !nodeIsComplete(node));
  const outstandingCount = (project.outstandingItems || []).filter((item) => outstandingIsOpen(item, outstandingStatuses)).length;
  return <button type="button" className="project-row" data-selected={selected || undefined} onClick={onSelect}>
    <div className="project-row-title"><strong>{project.name}</strong>
      <span>{project.entity || project.period || t("尚未填写项目资料")}</span></div>
    <div className="project-row-progress"><span>{stats.percentage}%</span><ProgressBar value={stats.percentage} compact /></div>
    <div className="project-row-next"><small>{t("当前节点")}</small>
      <span>{stats.percentage === 100 ? t("全部完成") : currentNode?.title || t("待新增节点")}</span>
      {outstandingCount > 0 && <em>{t("{count} 待清", { count: outstandingCount })}</em>}</div>
    <time data-tone={dueTone(project)}>{formatDate(project.dueDate, language)}</time>
  </button>;
}

export function NodeCard({ node, index, total, isCurrent, actions }) {
  const { t } = useUiLanguage();
  const status = nodeStatus(node);
  const completedConditions = node.conditions.filter((item) => item.done).length;
  const [expanded, setExpanded] = React.useState(() => isCurrent || status === "待设置条件");
  React.useEffect(() => {
    if (isCurrent) setExpanded(true);
  }, [isCurrent]);
  return <section className="node-card" data-status={status} data-current={isCurrent || undefined}>
    <header className="node-header">
      <button type="button" className="node-expand" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="node-index">{index + 1}</span>
        <span className="node-heading"><strong>{node.title}</strong>
          <small>{node.description || t("{done} / {total} 项条件", { done: completedConditions, total: node.conditions.length })}</small></span>
      </button>
      <div className="node-header-actions">
        <span className="node-condition-count" title={t("已达成条件 / 全部条件")}>{completedConditions} / {node.conditions.length}</span>
        {isCurrent && <span className="current-pill">{t("当前")}</span>}
        <span className="status-pill" data-status={status}>{t(status)}</span>
        <button type="button" className="text-button" disabled={index === 0} onClick={() => actions.move(-1)} aria-label={t("上移节点")}>↑</button>
        <button type="button" className="text-button" disabled={index === total - 1} onClick={() => actions.move(1)} aria-label={t("下移节点")}>↓</button>
        <button type="button" className="text-button" onClick={actions.editNode}>{t("编辑")}</button></div>
    </header>
    {expanded && <div className="node-body">
      {node.conditions.length ? <div className="condition-list">{node.conditions.map((condition) =>
        <div className="condition-row" data-done={condition.done || undefined} key={condition.id}>
          <label><input type="checkbox" checked={condition.done} onChange={() => actions.toggle(condition.id)} />
            <span>{condition.label}</span></label>
          <div className="condition-actions"><button type="button" onClick={() => actions.editCondition(condition)}>{t("修改")}</button>
            <button type="button" onClick={() => actions.deleteCondition(condition.id)}>{t("删除")}</button></div>
        </div>)}</div> : <div className="condition-empty">{t("这个节点还没有完成条件。")}</div>}
      <footer className="node-footer"><button type="button" className="add-condition" onClick={actions.addCondition}>{t("＋ 添加完成条件")}</button>
        <button type="button" className="delete-link" onClick={actions.deleteNode}>{t("删除节点")}</button></footer>
    </div>}
  </section>;
}
