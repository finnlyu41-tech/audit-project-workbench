import React from "react";
import { BUILTIN_WORKSTREAM_TYPES, GROUP_AUDIT_TYPES, GROUP_AUDIT_TYPE_KEYS, WORKSTREAM_TYPE_KEYS, dueTone, formatDate,
  nodeStatus, outstandingIsOpen, projectStats, uid, workstreamStats, workstreamTypeLabel } from "./model.js";
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
export function ProjectForm({ initial, onSubmit, onClose, submitLabel, allowWorkstreams = true,
  samples = [], selectedSampleIdsByType = {}, initialWorkstreamTypes, groupOptions = null, initialMembership }) {
  const { language, t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({
    name: initial?.name || "",
    entity: initial?.entity || "",
    period: initial?.period || "",
    dueDate: initial?.dueDate || "",
    owner: initial?.owner || "",
    notes: initial?.notes || "",
  }));
  const [membership, setMembership] = React.useState(() => ({
    groupId: initialMembership?.group?.id || "",
    role: initialMembership?.member?.role || "",
    auditType: initialMembership?.member?.auditType || "internal_team",
  }));
  const [useStarter, setUseStarter] = React.useState(true);
  const [selections, setSelections] = React.useState(() => (initialWorkstreamTypes?.length
    ? initialWorkstreamTypes : ["audit"]).map((type) => ({ type, customName: "",
      sampleId: selectedSampleIdsByType[type] || samples.find((sample) => sample.workstreamType === type)?.id || "" })));
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const toggleBuiltin = (type) => setSelections((current) => current.some((item) => item.type === type)
    ? (current.length === 1 ? current : current.filter((item) => item.type !== type))
    : [...current, { type, customName: "", sampleId: selectedSampleIdsByType[type]
      || samples.find((sample) => sample.workstreamType === type)?.id || "" }]);
  const updateSelection = (index, patch) => setSelections((current) => current.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item));
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    const validSelections = selections.filter((item) => item.type !== "custom" || item.customName.trim());
    if (values.name.trim() && (!allowWorkstreams || validSelections.length)) {
      const submittedValues = allowWorkstreams ? { ...values, workstreamSelections: validSelections } : values;
      onSubmit(groupOptions ? { ...submittedValues, groupAssignment: { ...membership, role: membership.role.trim() } }
        : submittedValues, useStarter);
    }
  }}>
    <label><span>{t("项目名称 *")}</span><input autoFocus required value={values.name} onChange={update("name")}
      placeholder={t("例如：[公司名称] 2025年度审计")} /></label>
    <div className="form-grid">
      <label><span>{t("法律实体")}</span><input value={values.entity} onChange={update("entity")} placeholder={t("公司完整名称")} /></label>
      <label><span>{t("报告期间")}</span><input value={values.period} onChange={update("period")}
        placeholder={t("例如：截至2025年3月31日")} /></label>
    </div>
    <div className="form-grid">
      <label><span>{t("目标完成日期")}</span><input type="date" value={values.dueDate} onChange={update("dueDate")} /></label>
      <label><span>{t("负责人")}</span><input value={values.owner} onChange={update("owner")} placeholder={t("例如：项目经理或主审")}/></label>
    </div>
    <label><span>{t("备注")}</span><textarea rows="3" value={values.notes} onChange={update("notes")}
      placeholder={t("可记录负责人、客户要求或其他背景")} /></label>
    {groupOptions && <section className="project-group-assignment"><header><strong>{t("集团归属")}</strong>
      <span>{t("可在公司资料中直接加入、变更或移出集团。")}</span></header>
      <label><span>{t("所属集团")}</span><select value={membership.groupId}
        onChange={(event) => setMembership((current) => ({ ...current, groupId: event.target.value }))}>
        <option value="">{t("独立公司（不属于集团）")}</option>
        {groupOptions.map((group) => <option value={group.id} key={group.id} disabled={group.archived}>
          {group.name}{group.archived ? ` · ${t("已归档")}` : ""}</option>)}</select></label>
      {membership.groupId && <div className="form-grid"><label><span>{t("集团角色")}</span><input value={membership.role}
        onChange={(event) => setMembership((current) => ({ ...current, role: event.target.value }))}
        placeholder={t("例如：母公司、子公司或联营公司")} /></label>
        <label><span>{t("审计类别")}</span><select value={membership.auditType}
          onChange={(event) => setMembership((current) => ({ ...current, auditType: event.target.value }))}>
          {GROUP_AUDIT_TYPES.map((value) => <option value={value} key={value}>{t(GROUP_AUDIT_TYPE_KEYS[value])}</option>)}</select></label></div>}
      <small>{t("保存后，项目导航和集团汇总会立即更新。")}</small>
    </section>}
    {allowWorkstreams && <section className="project-workstream-picker"><header><strong>{t("选择业务模块")}</strong>
      <span>{t("每个模块独立追踪进度、负责人和截止日。")}</span></header>
      <div className="workstream-choice-grid">{BUILTIN_WORKSTREAM_TYPES.map((type) => <label className="workstream-choice" key={type}
        data-selected={selections.some((item) => item.type === type) || undefined}><input type="checkbox"
          checked={selections.some((item) => item.type === type)} onChange={() => toggleBuiltin(type)} />
        <span><strong>{t(WORKSTREAM_TYPE_KEYS[type])}</strong><small>{t(type === "audit" ? "新项目默认启用" : "按需要启用")}</small></span></label>)}</div>
      {selections.map((selection, index) => {
        const typeSamples = samples.filter((sample) => sample.workstreamType === selection.type);
        return <div className="workstream-selection-row" key={`${selection.type}-${index}`}><strong>{workstreamTypeLabel(selection.type, language, selection.customName)}</strong>
          {selection.type === "custom" && <input required value={selection.customName}
            onChange={(event) => updateSelection(index, { customName: event.target.value })} placeholder={t("自定义模块名称")} />}
          <select value={selection.sampleId} onChange={(event) => updateSelection(index, { sampleId: event.target.value })}>
            <option value="">{t("空白流程")}</option>{typeSamples.map((sample) => <option value={sample.id} key={sample.id}>{sample.name}</option>)}</select>
          {selection.type === "custom" && <button type="button" onClick={() => setSelections((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{t("移除")}</button>}</div>;
      })}
      <button type="button" className="add-custom-workstream" onClick={() => setSelections((current) => [...current,
        { type: "custom", customName: "", sampleId: selectedSampleIdsByType.custom || "" }])}>{t("＋ 添加自定义模块")}</button>
      <label className="check-option"><input type="checkbox" checked={useStarter}
        onChange={(event) => setUseStarter(event.target.checked)} /><span><strong>{t("套用所选业务范本")}</strong>
          <small>{t("建立后仍可自由增加、修改、排序或删除。")}</small></span></label></section>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(submitLabel || "建立项目")}</button></footer>
  </form>;
}

export function WorkstreamForm({ initial, availableTypes = BUILTIN_WORKSTREAM_TYPES, samples = [],
  selectedSampleIdsByType = {}, onSubmit, onRemove, onClose }) {
  const { language, t } = useUiLanguage();
  const firstType = initial?.type || availableTypes[0] || "custom";
  const [values, setValues] = React.useState(() => ({
    type: firstType,
    customName: initial?.customName || "",
    owner: initial?.owner || "",
    dueDate: initial?.dueDate || "",
    sampleId: initial ? "" : (selectedSampleIdsByType[firstType]
      || samples.find((sample) => sample.workstreamType === firstType)?.id || ""),
  }));
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const changeType = (event) => {
    const type = event.target.value;
    setValues((current) => ({ ...current, type, customName: type === "custom" ? current.customName : "",
      sampleId: selectedSampleIdsByType[type] || samples.find((sample) => sample.workstreamType === type)?.id || "" }));
  };
  const typeSamples = samples.filter((sample) => sample.workstreamType === values.type);
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    if (values.type !== "custom" || values.customName.trim()) onSubmit({ ...values, customName: values.customName.trim() });
  }}>
    <label><span>{t("模块类别")}</span><select value={values.type} disabled={Boolean(initial)} onChange={changeType}>
      {availableTypes.map((type) => <option value={type} key={type}>{workstreamTypeLabel(type, language)}</option>)}
      {!availableTypes.includes("custom") && initial?.type === "custom" && <option value="custom">{workstreamTypeLabel("custom", language)}</option>}
    </select></label>
    {values.type === "custom" && <label><span>{t("自定义模块名称 *")}</span><input autoFocus required value={values.customName}
      onChange={update("customName")} placeholder={t("例如：公司秘书服务")} /></label>}
    <div className="form-grid"><label><span>{t("负责人")}</span><input value={values.owner} onChange={update("owner")} /></label>
      <label><span>{t("模块截止日")}</span><input type="date" value={values.dueDate} onChange={update("dueDate")} /></label></div>
    {!initial && <label><span>{t("业务范本")}</span><select value={values.sampleId} onChange={update("sampleId")}>
      <option value="">{t("空白流程")}</option>{typeSamples.map((sample) => <option value={sample.id} key={sample.id}>{sample.name}</option>)}</select></label>}
    <footer className="modal-actions">{onRemove && <button type="button" className="button danger-quiet" onClick={onRemove}>{t("移除模块")}</button>}
      <span className="modal-action-spacer" /><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(initial ? "保存模块" : "添加模块")}</button></footer>
  </form>;
}

export function WorkstreamCard({ workstream, selected, openItems = 0, onSelect, onEdit, readOnly = false }) {
  const { language, t } = useUiLanguage();
  const stats = workstreamStats(workstream);
  return <button type="button" className="workstream-card" data-selected={selected || undefined}
    data-complete={stats.complete || undefined} onClick={onSelect}>
    <span className="workstream-card-top"><i>{workstreamTypeLabel(workstream.type, language, workstream.customName).slice(0, 1)}</i>
      <span><strong>{workstreamTypeLabel(workstream.type, language, workstream.customName)}</strong>
        <small>{workstream.owner || t("未设置负责人")}</small></span>
      {!readOnly && <span role="button" tabIndex="0" className="workstream-edit" onClick={(event) => { event.stopPropagation(); onEdit(); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onEdit(); } }}>{t("设置")}</span>}</span>
    <span className="workstream-card-progress"><strong>{stats.percentage}%</strong><ProgressBar value={stats.percentage} compact /></span>
    <span className="workstream-card-meta"><small>{t("{done}/{total} 个节点", { done: stats.completedNodes, total: stats.nodes })}</small>
      <small>{openItems ? t("{count} 项未清", { count: openItems }) : t("无未清事项")}</small>
      <time data-tone={dueTone(workstream)}>{formatDate(workstream.dueDate, language)}</time></span>
  </button>;
}

export function SampleLibrary({ samples, selectedSampleId, onSelect, onCreate, onEdit, onDuplicate, onDelete, onUse }) {
  const { language, t } = useUiLanguage();
  return <section className="sample-library">
    <header className="sample-library-header"><div><strong>{t("范本库")}</strong>
      <span>{t("可保存多个范本，并选择任一范本建立项目。")}</span></div>
      <button type="button" className="button primary" onClick={onCreate}>{t("新建范本")}</button></header>
    {samples.length ? <div className="sample-library-list">{samples.map((sample) => {
      const conditions = sample.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
      const selected = sample.id === selectedSampleId;
      return <article className="sample-library-card" data-selected={selected || undefined} key={sample.id}>
        <button type="button" className="sample-library-select" onClick={() => onSelect(sample.id)}>
          <span className="sample-mark" aria-hidden="true">{language === "en" ? "T" : language === "zh-Hant" ? "範" : "范"}</span><span><strong>{sample.name}</strong>
            <small>{sample.description || t("没有说明")}</small>
            <em>{workstreamTypeLabel(sample.workstreamType, language)} · {t("{nodes} 个节点 · {conditions} 项条件", { nodes: sample.nodes.length, conditions })}</em></span>
          {selected && <i>{t("当前使用")}</i>}
        </button>
        <footer><button type="button" onClick={() => onUse(sample.id)}>{t("使用此范本")}</button>
          <button type="button" onClick={() => onEdit(sample.id)}>{t("编辑")}</button>
          <button type="button" onClick={() => onDuplicate(sample.id)}>{t("复制")}</button>
          <button type="button" onClick={() => onDelete(sample.id)}>{t("删除")}</button></footer>
      </article>;
    })}</div> : <div className="sample-library-empty"><strong>{t("还没有范本")}</strong>
      <span>{t("建立第一个范本后，就能用它快速创建项目。")}</span>
      <button type="button" className="button primary" onClick={onCreate}>{t("新建范本")}</button></div>}
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
      <label className="status-color-field"><span>{t("状态颜色")}</span><input type="color" value={status.color || "#778078"}
        onChange={(event) => updateStatus(status.id, (current) => ({ ...current, color: event.target.value }))} /></label>
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
      id: uid("outstanding-status"), label: "", closed: false, tone: "neutral", color: "#778078",
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
      <label><span>{t("范本名称 *")}</span><input autoFocus required value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
      <label><span>{t("说明")}</span><input value={draft.description}
        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
        placeholder={t("说明这个范本的适用范围")} /></label>
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
      {onRedact ? <button type="button" className="button secondary" onClick={() => onRedact(draft)}>{t("公司去敏")}</button> : <span />}
      <span /><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存范本")}</button></footer>
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
  const outstandingCount = (project.outstandingItems || []).filter((item) => outstandingIsOpen(item, outstandingStatuses)).length;
  return <button type="button" className="project-row" data-selected={selected || undefined} onClick={onSelect}>
    <div className="project-row-title"><strong>{project.name}</strong>
      <span>{project.entity || project.period || t("尚未填写项目资料")}</span></div>
    <div className="project-row-progress"><span>{stats.completedWorkstreams}/{stats.workstreams}</span></div>
    <div className="project-row-next"><small>{t("业务模块")}</small>
      <span>{stats.complete ? t("全部完成") : t("{done}/{total} 个模块完成", { done: stats.completedWorkstreams, total: stats.workstreams })}</span>
      {outstandingCount > 0 && <em>{t("{count} 待清", { count: outstandingCount })}</em>}</div>
    <time data-tone={dueTone(project)}>{formatDate(project.dueDate, language)}</time>
  </button>;
}

export function NodeBoard({ nodes, readOnly = false, actions }) {
  const { t } = useUiLanguage();
  const currentNode = nodes.find((node) => !workstreamStats({ nodes: [node] }).complete);
  const [selectedId, setSelectedId] = React.useState(() => currentNode?.id || nodes[0]?.id || null);
  React.useEffect(() => {
    if (!nodes.some((node) => node.id === selectedId)) setSelectedId(currentNode?.id || nodes[0]?.id || null);
  }, [nodes, selectedId, currentNode?.id]);
  const selected = nodes.find((node) => node.id === selectedId) || nodes[0];
  return <div className="node-board" style={{ "--node-count": Math.max(nodes.length, 1) }}>
    <div className="node-track" role="tablist" aria-label={t("项目节点")}>{nodes.map((node, index) => {
      const status = nodeStatus(node); const done = node.conditions.filter((condition) => condition.done).length;
      return <button type="button" role="tab" aria-selected={selected?.id === node.id} className="node-track-card"
        data-status={status} data-current={currentNode?.id === node.id || undefined} key={node.id} onClick={() => setSelectedId(node.id)}>
        <span className="node-track-number">{index + 1}</span><span><strong>{node.title}</strong>
          <small>{done}/{node.conditions.length} {t("项条件")}</small></span><i>{t(status)}</i></button>;
    })}</div>
    {selected && <section className="node-detail-panel"><header><div><span>{t("节点详情")}</span><h4>{selected.title}</h4>
      {selected.description && <p>{selected.description}</p>}</div>{!readOnly && <div className="node-detail-actions">
        <button type="button" disabled={nodes.indexOf(selected) === 0} onClick={() => actions.move(selected.id, -1)} aria-label={t("上移节点")}>←</button>
        <button type="button" disabled={nodes.indexOf(selected) === nodes.length - 1} onClick={() => actions.move(selected.id, 1)} aria-label={t("下移节点")}>→</button>
        <button type="button" onClick={() => actions.editNode(selected)}>{t("编辑节点")}</button></div>}</header>
      {selected.conditions.length ? <div className="condition-list">{selected.conditions.map((condition) => <div className="condition-row"
        data-done={condition.done || undefined} key={condition.id}><label><input type="checkbox" disabled={readOnly}
          checked={condition.done} onChange={() => actions.toggle(selected.id, condition.id)} /><span>{condition.label}</span></label>
        {!readOnly && <div className="condition-actions"><button type="button" onClick={() => actions.editCondition(selected, condition)}>{t("修改")}</button>
          <button type="button" onClick={() => actions.deleteCondition(selected.id, condition.id)}>{t("删除")}</button></div>}</div>)}</div>
        : <div className="condition-empty">{t("这个节点还没有完成条件。")}</div>}
      {!readOnly && <footer className="node-footer"><button type="button" className="add-condition" onClick={() => actions.addCondition(selected)}>{t("＋ 添加完成条件")}</button>
        <button type="button" className="delete-link" onClick={() => actions.deleteNode(selected)}>{t("删除节点")}</button></footer>}
    </section>}
  </div>;
}

export function NodeCard({ node, index, total, isCurrent, actions, readOnly = false }) {
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
        {!readOnly && <><button type="button" className="text-button" disabled={index === 0} onClick={() => actions.move(-1)} aria-label={t("上移节点")}>↑</button>
          <button type="button" className="text-button" disabled={index === total - 1} onClick={() => actions.move(1)} aria-label={t("下移节点")}>↓</button>
          <button type="button" className="text-button" onClick={actions.editNode}>{t("编辑")}</button></>}</div>
    </header>
    {expanded && <div className="node-body">
      {node.conditions.length ? <div className="condition-list">{node.conditions.map((condition) =>
        <div className="condition-row" data-done={condition.done || undefined} key={condition.id}>
          <label><input type="checkbox" disabled={readOnly} checked={condition.done} onChange={() => actions.toggle(condition.id)} />
            <span>{condition.label}</span></label>
          {!readOnly && <div className="condition-actions"><button type="button" onClick={() => actions.editCondition(condition)}>{t("修改")}</button>
            <button type="button" onClick={() => actions.deleteCondition(condition.id)}>{t("删除")}</button></div>}
        </div>)}</div> : <div className="condition-empty">{t("这个节点还没有完成条件。")}</div>}
      {!readOnly && <footer className="node-footer"><button type="button" className="add-condition" onClick={actions.addCondition}>{t("＋ 添加完成条件")}</button>
        <button type="button" className="delete-link" onClick={actions.deleteNode}>{t("删除节点")}</button></footer>}
    </div>}
  </section>;
}
