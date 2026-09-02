import React from "react";
import { Building, Building2, Minus, Plus } from "lucide-react";
import { ProgressBar } from "./components.jsx";
import { GROUP_AUDIT_TYPES, GROUP_AUDIT_TYPE_KEYS, canMoveWorkspaceItem, collectGroupOutstandingEntries, formatDate,
  groupProgress, makeGroupMember, memberIsReady, memberProgressPercentage, outstandingIsOpen, projectStats,
  reportingPeriodLabel, uid } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";

export const auditTypeKeys = GROUP_AUDIT_TYPE_KEYS;

export function GroupForm({ initial, sampleName, allowTemplate = true, memberTargets = { projects: [], groups: [] },
  availableProjects = [], availableGroups = [], groupSample, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({
    name: initial?.name || "",
    period: initial?.period || "",
    periodStart: initial?.periodStart || "",
    periodEnd: initial?.periodEnd || "",
    dueDate: initial?.dueDate || "",
    owner: initial?.owner || "",
    notes: initial?.notes || "",
    consolidationEnabled: initial?.consolidationEnabled !== false,
  }));
  const [members, setMembers] = React.useState(() => JSON.parse(JSON.stringify(initial?.members || [])));
  const [memberKind, setMemberKind] = React.useState("project");
  const [memberRefId, setMemberRefId] = React.useState("");
  const [useStarter, setUseStarter] = React.useState(true);
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const initialProjectTargets = (initial?.members || []).filter((member) => member.kind === "project")
    .map((member) => memberTargets.projects.find((project) => project.id === member.refId)).filter(Boolean);
  const initialGroupTargets = (initial?.members || []).filter((member) => member.kind === "group")
    .map((member) => memberTargets.groups.find((group) => group.id === member.refId)).filter(Boolean);
  const uniqueTargets = (targets) => [...new Map(targets.map((target) => [target.id, target])).values()];
  const projectCandidates = uniqueTargets([...availableProjects, ...initialProjectTargets])
    .filter((project) => !project.archived && !members.some((member) => member.kind === "project" && member.refId === project.id));
  const groupCandidates = uniqueTargets([...availableGroups, ...initialGroupTargets])
    .filter((group) => !group.archived && !members.some((member) => member.kind === "group" && member.refId === group.id));
  const candidates = memberKind === "project" ? projectCandidates : groupCandidates;
  const effectiveRefId = candidates.some((candidate) => candidate.id === memberRefId) ? memberRefId : candidates[0]?.id || "";
  const memberTarget = (member) => (member.kind === "project" ? memberTargets.projects : memberTargets.groups)
    .find((target) => target.id === member.refId);
  const updateMember = (memberId, patch) => setMembers((current) => current.map((member) => member.id === memberId
    ? { ...member, ...patch } : member));
  const changeMemberAuditType = (member, auditType) => updateMember(member.id, { auditType,
    readinessConditions: (groupSample?.readinessTemplates?.[auditType] || []).map((condition) => ({
      id: uid("readiness-condition"), label: condition.label, done: false,
    })) });
  const addMember = () => {
    if (!effectiveRefId) return;
    setMembers((current) => [...current, makeGroupMember({ kind: memberKind, refId: effectiveRefId,
      auditType: "internal_team", role: "" }, groupSample)]);
    setMemberRefId("");
  };
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    if (values.name.trim()) onSubmit({ ...values, name: values.name.trim(), period: values.period.trim(),
      owner: values.owner.trim(), notes: values.notes.trim(), ...(initial ? { members } : {}) }, useStarter);
  }}>
    <label><span>{t("集团名称 *")}</span><input autoFocus required value={values.name} onChange={update("name")}
      placeholder={t("例如：[集团名称] 2025年度集团审计")} /></label>
    <div className="form-grid" data-columns="3">
      <label><span>{t("报告期开始日")}</span><input type="date" value={values.periodStart} max={values.periodEnd || undefined}
        required={Boolean(values.periodEnd)} onChange={update("periodStart")} /></label>
      <label><span>{t("报告期结束日")}</span><input type="date" value={values.periodEnd} min={values.periodStart || undefined}
        required={Boolean(values.periodStart)} onChange={update("periodEnd")} /></label>
      <label><span>{t("目标完成日期")}</span><input type="date" value={values.dueDate} onChange={update("dueDate")} /></label>
    </div>
    {values.period && !values.periodStart && !values.periodEnd && <small className="form-help">
      {t("原有报告期间：{period}。请在适当时补充开始日和结束日。", { period: values.period })}</small>}
    <label><span>{t("集团负责人")}</span><input value={values.owner} onChange={update("owner")}
      placeholder={t("例如：集团项目经理")} /></label>
    <label className="check-option"><input type="checkbox" checked={values.consolidationEnabled}
      onChange={(event) => setValues((current) => ({ ...current, consolidationEnabled: event.target.checked }))} />
      <span><strong>{t("本级需要独立合并流程")}</strong><small>{t("关闭后，本级只作分类并直接汇总下级进度。")}</small></span></label>
    <label><span>{t("备注")}</span><textarea rows="3" value={values.notes} onChange={update("notes")}
      placeholder={t("可记录集团范围、报告要求或其他背景")} /></label>
    {initial && <section className="group-membership-editor"><header><div><strong>{t("集团成员")}</strong>
      <span>{t("在集团资料中直接添加、移除或修改公司与子集团。")}</span></div>
      <em>{t("{count} 个组成部分", { count: members.length })}</em></header>
      <div className="group-membership-list">{members.map((member) => {
        const target = memberTarget(member);
        const archived = Boolean(target?.archived);
        return <article className="group-membership-row" key={member.id} data-archived={archived || undefined}>
          <div className="group-member-identity"><i>{member.kind === "project" ? <Building aria-hidden="true" /> : <Building2 aria-hidden="true" />}</i><span><strong>{target?.name || t("未找到组成部分")}</strong>
            <small>{t(member.kind === "project" ? "公司项目" : "子集团")}{archived ? ` · ${t("已归档")}` : ""}</small></span></div>
          <label><span>{t("集团角色")}</span><input disabled={archived} value={member.role || ""}
            onChange={(event) => updateMember(member.id, { role: event.target.value })} placeholder={t("例如：母公司、子公司或地区子集团")} /></label>
          {member.kind === "project" ? <label><span>{t("审计类别")}</span><select disabled={archived} value={member.auditType}
            onChange={(event) => changeMemberAuditType(member, event.target.value)}>{GROUP_AUDIT_TYPES.map((value) =>
              <option value={value} key={value}>{t(auditTypeKeys[value])}</option>)}</select></label>
            : <div className="group-member-type"><span>{t("组成部分类型")}</span><strong>{t("子集团")}</strong></div>}
          <button type="button" disabled={archived} onClick={() => setMembers((current) => current.filter((item) => item.id !== member.id))}>{t("移除")}</button>
        </article>;
      })}{!members.length && <div className="group-membership-empty">{t("这个集团还没有公司或子集团。")}</div>}</div>
      <div className="group-member-adder"><div className="choice-tabs" role="tablist"><button type="button" aria-selected={memberKind === "project"}
        onClick={() => { setMemberKind("project"); setMemberRefId(""); }}>{t("公司项目")}</button>
        <button type="button" aria-selected={memberKind === "group"} onClick={() => { setMemberKind("group"); setMemberRefId(""); }}>{t("子集团")}</button></div>
        <select aria-label={t("选择要加入的组成部分")} value={effectiveRefId} onChange={(event) => setMemberRefId(event.target.value)}>
          {candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select>
        <button type="button" className="button secondary" disabled={!effectiveRefId} onClick={addMember}>{t("添加到集团")}</button></div>
      {!candidates.length && <small className="form-help">{t(memberKind === "project" ? "没有可加入的独立公司项目。" : "没有可加入的集团。")}</small>}
    </section>}
    {allowTemplate && values.consolidationEnabled && <label className="check-option">
      <input type="checkbox" checked={useStarter} onChange={(event) => setUseStarter(event.target.checked)} />
      <span><strong>{t("套用集团范本：{name}", { name: sampleName })}</strong>
        <small>{t("建立后仍可自由修改合并节点和完成条件。")}</small></span></label>}
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t(initial ? "保存修改" : "建立集团")}</button></footer>
  </form>;
}

function itemMatchesFilter(item, kind, filter, store) {
  const complete = kind === "group" ? groupProgress(store, item.id).ready
    : projectStats(item).complete;
  if (filter === "archived") return item.archived;
  if (item.archived) return false;
  if (filter === "completed") return complete;
  if (filter === "active") return !complete;
  return true;
}

export function WorkspaceTree({ store, selection, onSelect, onMove, search, filter, statuses }) {
  const { language, t } = useUiLanguage();
  const [expanded, setExpanded] = React.useState(() => new Set());
  const [dragging, setDragging] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);
  const draggingRef = React.useRef(null);
  const archiveMode = filter === "archived";
  const eligibleParentGroups = store.groups.filter((group) => group.archived === archiveMode);
  const projectParents = new Set(eligibleParentGroups.flatMap((group) => group.members
    .filter((member) => member.kind === "project" && store.projects.some((project) => project.id === member.refId
      && project.archived === archiveMode)).map((member) => member.refId)));
  const groupParents = new Set(eligibleParentGroups.flatMap((group) => group.members
    .filter((member) => member.kind === "group" && store.groups.some((child) => child.id === member.refId
      && child.archived === archiveMode)).map((member) => member.refId)));
  const query = search.trim().toLowerCase();
  const matchesText = (item) => !query || [item.name, item.entity, item.reportingFramework, item.period, item.periodStart,
    item.periodEnd, reportingPeriodLabel(item, language), item.owner]
    .some((value) => value?.toLowerCase().includes(query));
  const visibleProject = (project) => itemMatchesFilter(project, "project", filter, store) && matchesText(project);
  const groupHasVisibleContent = (group, visited = new Set()) => {
    if (visited.has(group.id)) return false;
    if (group.archived !== archiveMode) return false;
    const next = new Set(visited).add(group.id);
    if (itemMatchesFilter(group, "group", filter, store) && matchesText(group)) return true;
    return group.members.some((member) => member.kind === "project"
      ? Boolean(store.projects.find((project) => project.id === member.refId && visibleProject(project)))
      : Boolean(store.groups.find((child) => child.id === member.refId && groupHasVisibleContent(child, next))));
  };
  const groupOpen = (groupId) => query || expanded.has(groupId);
  const toggle = (groupId) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
    return next;
  });
  const beginDrag = (event, kind, id) => {
    const payload = JSON.stringify({ kind, id });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-audit-workbench-item", payload);
    event.dataTransfer.setData("text/plain", payload);
    draggingRef.current = { kind, id };
    setDragging({ kind, id });
  };
  const finishDrag = () => { draggingRef.current = null; setDragging(null); setDropTarget(null); };
  const canDrop = (parentGroupId) => {
    const activeDrag = draggingRef.current || dragging;
    return activeDrag && canMoveWorkspaceItem(store, activeDrag.kind, activeDrag.id, parentGroupId);
  };
  const dragOver = (event, parentGroupId) => {
    if (!canDrop(parentGroupId)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(parentGroupId || "root");
  };
  const drop = (event, parentGroupId) => {
    const activeDrag = draggingRef.current || dragging;
    if (!activeDrag || !canMoveWorkspaceItem(store, activeDrag.kind, activeDrag.id, parentGroupId)) return;
    event.preventDefault();
    event.stopPropagation();
    onMove?.(activeDrag.kind, activeDrag.id, parentGroupId);
    if (parentGroupId) setExpanded((current) => new Set(current).add(parentGroupId));
    finishDrag();
  };

  const renderProject = (project, depth) => {
    if (!visibleProject(project)) return null;
    const stats = projectStats(project);
    const outstanding = project.outstandingItems.filter((item) => outstandingIsOpen(item, statuses)).length;
    return <button type="button" className="tree-row tree-project-row" data-depth={depth}
      style={{ "--tree-depth": depth }} key={project.id}
      data-selected={selection?.kind === "project" && selection.id === project.id || undefined}
      data-dragging={dragging?.kind === "project" && dragging.id === project.id || undefined}
      draggable={!archiveMode} title={!archiveMode ? t("拖动以更改所属集团或层级") : undefined}
      onDragStart={(event) => beginDrag(event, "project", project.id)} onDragEnd={finishDrag}
      onClick={() => onSelect({ kind: "project", id: project.id })}>
      <span className="tree-kind-mark"><Building aria-hidden="true" /></span><span className="tree-copy"><strong>{project.name}</strong>
        <small>{project.owner || project.entity || reportingPeriodLabel(project, language) || t("尚未填写项目资料")}</small></span>
      {outstanding > 0 && <em>{outstanding}</em>}<span className="tree-progress">{stats.completedWorkstreams}/{stats.workstreams}</span>
    </button>;
  };

  const renderGroup = (group, depth, visited = new Set()) => {
    if (visited.has(group.id) || !groupHasVisibleContent(group, visited)) return null;
    const next = new Set(visited).add(group.id);
    const stats = groupProgress(store, group.id);
    const openOutstanding = collectGroupOutstandingEntries(store, group.id)
      .filter((entry) => outstandingIsOpen(entry.item, statuses)).length;
    const children = group.members.map((member) => {
      if (member.kind === "project") {
        const project = store.projects.find((item) => item.id === member.refId);
        return project ? renderProject(project, depth + 1) : null;
      }
      const child = store.groups.find((item) => item.id === member.refId);
      return child ? renderGroup(child, depth + 1, next) : null;
    }).filter(Boolean);
    const hasChildren = children.length > 0;
    const open = hasChildren && groupOpen(group.id);
    const dropEligible = Boolean(dragging && canDrop(group.id));
    return <div className="tree-branch" key={group.id}><div className="tree-group-line" data-depth={depth}
      style={{ "--tree-depth": depth }}>
      {hasChildren ? <button type="button" className="tree-expander" aria-expanded={open}
        aria-label={t(open ? "收起集团" : "展开集团")} title={t(open ? "收起集团" : "展开集团")}
        onClick={() => toggle(group.id)}>{open ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}</button>
        : <span className="tree-expander-spacer" aria-hidden="true" />}
      <button type="button" className="tree-row tree-group-row"
        data-selected={selection?.kind === "group" && selection.id === group.id || undefined}
        data-dragging={dragging?.kind === "group" && dragging.id === group.id || undefined}
        data-drop-eligible={dropEligible || undefined} data-drop-target={dropTarget === group.id || undefined}
        draggable={!archiveMode} title={!archiveMode ? t("拖动以更改所属集团或层级") : undefined}
        onDragStart={(event) => beginDrag(event, "group", group.id)} onDragEnd={finishDrag}
        onDragEnter={(event) => dragOver(event, group.id)} onDragOver={(event) => dragOver(event, group.id)}
        onDrop={(event) => drop(event, group.id)} onClick={() => onSelect({ kind: "group", id: group.id })}>
        <span className="tree-kind-mark"><Building2 aria-hidden="true" /></span><span className="tree-copy"><strong>{group.name}</strong>
          <small>{group.owner || reportingPeriodLabel(group, language) || t("尚未填写集团资料")}</small></span>
        {openOutstanding > 0 && <em>{openOutstanding}</em>}<span className="tree-progress">{dropEligible
          ? <span className="tree-drop-hint">{t(dropTarget === group.id ? "松开放入" : "可放入")}</span>
          : <span>{stats.percentage}%</span>}</span>
      </button></div>{open && <div className="tree-children" style={{ "--tree-line-offset": `${depth * 15 + 9}px` }}>{children}</div>}</div>;
  };

  const rootGroups = store.groups.filter((group) => !groupParents.has(group.id));
  const standalone = store.projects.filter((project) => !projectParents.has(project.id));
  const content = [...rootGroups.map((group) => renderGroup(group, 0)),
    ...standalone.map((project) => renderProject(project, 0))].filter(Boolean);
  return <div className="workspace-tree">{content.length ? content
    : <div className="list-empty"><strong>{t(store.projects.length || store.groups.length
      ? "没有符合筛选的项目" : "还没有审计项目")}</strong>
      <span>{t(store.projects.length || store.groups.length
        ? "可以切换状态或修改搜索条件。" : "先建立一个项目或集团。")}</span></div>}
    {dragging && !archiveMode && canDrop("") && <div className="tree-root-drop"
      data-drop-target={dropTarget === "root" || undefined} onDragEnter={(event) => dragOver(event, "")}
      onDragOver={(event) => dragOver(event, "")} onDrop={(event) => drop(event, "")}>{t("移到顶层（不属于集团）")}</div>}</div>;
}

function flattenGroupRows(store, groupId, depth = 0, visited = new Set(), includeArchived = false) {
  if (visited.has(groupId)) return [];
  const group = store.groups.find((item) => item.id === groupId);
  if (!group) return [];
  const next = new Set(visited).add(groupId);
  return group.members.flatMap((member) => {
    const target = member.kind === "project" ? store.projects.find((item) => item.id === member.refId)
      : store.groups.find((item) => item.id === member.refId);
    if (!target || (!includeArchived && target.archived)) return [];
    const row = { member, target, sourceGroupId: group.id, depth };
    return member.kind === "group" ? [row, ...flattenGroupRows(store, member.refId, depth + 1, next, includeArchived)] : [row];
  });
}

export function GroupMatrix({ store, group, statuses, onOpen, onConfigure, readOnly = false }) {
  const { language, t } = useUiLanguage();
  const [owner, setOwner] = React.useState("");
  const [auditType, setAuditType] = React.useState("all");
  const [readiness, setReadiness] = React.useState("all");
  const rows = flattenGroupRows(store, group.id, 0, new Set(), readOnly).filter((row) => {
    const resolvedOwner = row.target.owner || "";
    const ready = memberIsReady(store, row.member);
    if (owner && !resolvedOwner.toLowerCase().includes(owner.toLowerCase())) return false;
    if (auditType !== "all" && row.member.auditType !== auditType) return false;
    if (readiness === "ready" && !ready) return false;
    if (readiness === "not_ready" && ready) return false;
    return true;
  });
  return <section className="group-matrix-panel">
    <header className="group-section-header"><div><h3>{t("公司与子集团")}</h3>
      <p>{t("集中查看负责人、审计进度和进入合并前的条件。")}</p></div></header>
    <div className="group-matrix-filters">
      <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder={t("筛选负责人")} />
      <select value={auditType} onChange={(event) => setAuditType(event.target.value)}><option value="all">{t("全部审计类别")}</option>
        {GROUP_AUDIT_TYPES.map((value) => <option value={value} key={value}>{t(auditTypeKeys[value])}</option>)}</select>
      <select value={readiness} onChange={(event) => setReadiness(event.target.value)}><option value="all">{t("全部就绪状态")}</option>
        <option value="ready">{t("已具备合并条件")}</option><option value="not_ready">{t("尚未具备合并条件")}</option></select>
    </div>
    <div className="group-matrix" role="table" aria-label={t("集团组成部分矩阵")}>
      <div className="group-matrix-head" role="row"><span>{t("公司／子集团")}</span><span>{t("角色")}</span>
        <span>{t("审计类别")}</span><span>{t("负责人")}</span><span>{t("审计进度")}</span>
        <span>{t("合并就绪")}</span><span>{t("待清")}</span><span>{t("截止日")}</span><span /></div>
      {rows.map(({ member, target, sourceGroupId, depth }) => {
        const isGroup = member.kind === "group";
        const percentage = isGroup ? groupProgress(store, target.id).percentage : memberProgressPercentage(store, member);
        const ready = memberIsReady(store, member);
        const openOutstanding = isGroup ? collectGroupOutstandingEntries(store, target.id)
          .filter((entry) => outstandingIsOpen(entry.item, statuses)).length
          : target.outstandingItems.filter((item) => outstandingIsOpen(item, statuses)).length;
        const completedReadiness = member.readinessConditions?.filter((condition) => condition.done).length || 0;
        return <div className="group-matrix-row" role="row" key={member.id}>
          <button type="button" className="matrix-name" style={{ "--matrix-depth": depth }} onClick={() => onOpen(member.kind, target.id)}>
            <span className="matrix-kind">{isGroup ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</span><span><strong>{target.name}</strong>
              <small>{target.entity || reportingPeriodLabel(target, language) || t(isGroup ? "子集团" : "公司项目")}</small></span></button>
          <span>{member.role || t(isGroup ? "子集团" : "组成部分")}</span>
          <span>{isGroup ? t(target.consolidationEnabled ? "子集团合并" : "分类集团") : t(auditTypeKeys[member.auditType])}</span>
          <span>{target.owner || "—"}</span><span className="matrix-progress"><strong>{percentage}%</strong>
            <ProgressBar value={percentage} compact /></span>
          <span><i className="readiness-pill" data-ready={ready || undefined}>{t(ready ? "已就绪" : "未就绪")}</i>
            {!isGroup && <small>{completedReadiness}/{member.readinessConditions.length}</small>}</span>
          <span>{openOutstanding || "—"}</span><time>{formatDate(target.dueDate, language)}</time>
          {readOnly ? <span /> : <button type="button" className="matrix-settings" onClick={() => onConfigure(sourceGroupId, member)}>{t("设置")}</button>}
        </div>;
      })}
      {!rows.length && <div className="matrix-empty">{t(group.members.length ? "没有符合筛选的组成部分" : "还没有加入公司或子集团")}</div>}
    </div>
  </section>;
}

export function GroupMemberAddForm({ availableProjects, availableGroups, onLink, onCreateCompany, onClose }) {
  const { t } = useUiLanguage();
  const [kind, setKind] = React.useState("project");
  const candidates = kind === "project" ? availableProjects : availableGroups;
  const [refId, setRefId] = React.useState(candidates[0]?.id || "");
  const [role, setRole] = React.useState("");
  const [auditType, setAuditType] = React.useState("internal_team");
  React.useEffect(() => setRefId((current) => candidates.some((item) => item.id === current) ? current : candidates[0]?.id || ""),
    [kind, candidates]);
  return <form className="workbench-form member-add-form" onSubmit={(event) => {
    event.preventDefault(); if (refId) onLink({ kind, refId, role, auditType });
  }}>
    <div className="choice-tabs" role="tablist"><button type="button" aria-selected={kind === "project"}
      onClick={() => setKind("project")}>{t("公司项目")}</button><button type="button" aria-selected={kind === "group"}
        onClick={() => setKind("group")}>{t("子集团")}</button></div>
    <label><span>{t(kind === "project" ? "选择未归属的公司项目" : "选择未归属的集团")}</span>
      <select value={refId} onChange={(event) => setRefId(event.target.value)}>{candidates.map((item) =>
        <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      {!candidates.length && <small className="form-help">{t(kind === "project" ? "没有可关联的独立公司项目。" : "没有可关联的集团。")}</small>}</label>
    <label><span>{t("角色")}</span><input value={role} onChange={(event) => setRole(event.target.value)}
      placeholder={t(kind === "project" ? "例如：母公司、子公司或联营公司" : "例如：地区子集团")} /></label>
    {kind === "project" && <label><span>{t("审计类别")}</span><select value={auditType}
      onChange={(event) => setAuditType(event.target.value)}>{GROUP_AUDIT_TYPES.map((value) =>
        <option value={value} key={value}>{t(auditTypeKeys[value])}</option>)}</select></label>}
    <div className="member-create-shortcuts"><span>{t("或直接建立新的组成部分")}</span>
      <button type="button" onClick={onCreateCompany}>{t("＋ 新建公司")}</button></div>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" disabled={!refId} className="button primary">{t("加入集团")}</button></footer>
  </form>;
}

export function GroupMemberForm({ member, groupSample, onSubmit, onRemove, onClose }) {
  const { t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(member)));
  const changeAuditType = (auditType) => setDraft((current) => ({ ...current, auditType,
    readinessConditions: (groupSample.readinessTemplates[auditType] || []).map((condition) => ({
      id: uid("readiness-condition"), label: condition.label, done: false,
    })) }));
  return <form className="workbench-form member-settings-form" onSubmit={(event) => { event.preventDefault(); onSubmit(draft); }}>
    <label><span>{t("角色")}</span><input value={draft.role || ""}
      onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} /></label>
    {draft.kind === "project" && <><label><span>{t("审计类别")}</span><select value={draft.auditType}
      onChange={(event) => changeAuditType(event.target.value)}>{GROUP_AUDIT_TYPES.map((value) =>
        <option value={value} key={value}>{t(auditTypeKeys[value])}</option>)}</select></label>
      <section className="readiness-editor"><header><div><strong>{t("合并就绪条件")}</strong>
        <span>{t("全部勾选后，公司才会显示为已就绪。")}</span></div></header>
        {draft.readinessConditions.map((condition, index) => <div className="readiness-edit-row" key={condition.id}>
          <input type="checkbox" checked={condition.done} aria-label={t("条件已达成")}
            onChange={(event) => setDraft((current) => ({ ...current, readinessConditions: current.readinessConditions.map((item) =>
              item.id === condition.id ? { ...item, done: event.target.checked } : item) }))} />
          <input value={condition.label} onChange={(event) => setDraft((current) => ({ ...current,
            readinessConditions: current.readinessConditions.map((item) => item.id === condition.id
              ? { ...item, label: event.target.value } : item) }))} />
          <button type="button" onClick={() => setDraft((current) => ({ ...current,
            readinessConditions: current.readinessConditions.filter((_, itemIndex) => itemIndex !== index) }))}>×</button></div>)}
        <button type="button" className="readiness-add" onClick={() => setDraft((current) => ({ ...current,
          readinessConditions: [...current.readinessConditions, { id: uid("readiness-condition"), label: "", done: false }] }))}>
          {t("＋ 添加就绪条件")}</button></section></>}
    <footer className="member-settings-actions"><button type="button" className="button danger-quiet" onClick={onRemove}>{t("移出集团")}</button>
      <span /><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存设置")}</button></footer>
  </form>;
}

export function GroupSampleLibrary({ samples, selectedSampleId, onSelect, onCreate, onEdit, onDuplicate, onDelete, onUse }) {
  const { t } = useUiLanguage();
  return <section className="sample-library"><header className="sample-library-header"><div><strong>{t("集团范本库")}</strong>
    <span>{t("保存合并节点，以及不同审计类别的默认就绪条件。")}</span></div>
    <button type="button" className="button primary" onClick={onCreate}>{t("新建集团范本")}</button></header>
    <div className="sample-library-list">{samples.map((sample) => {
      const conditions = sample.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
      const readiness = Object.values(sample.readinessTemplates).reduce((sum, list) => sum + list.length, 0);
      const selected = sample.id === selectedSampleId;
      return <article className="sample-library-card" data-selected={selected || undefined} key={sample.id}>
        <button type="button" className="sample-library-select" onClick={() => onSelect(sample.id)}>
          <span className="sample-mark group-sample-mark">H</span><span><strong>{sample.name}</strong>
            <small>{sample.description || t("没有说明")}</small><em>{t("{nodes} 个合并节点 · {conditions} 项条件 · {readiness} 项就绪条件",
              { nodes: sample.nodes.length, conditions, readiness })}</em></span>{selected && <i>{t("当前使用")}</i>}</button>
        <footer><button type="button" onClick={() => onUse(sample.id)}>{t("使用此范本")}</button>
          <button type="button" onClick={() => onEdit(sample.id)}>{t("编辑")}</button>
          <button type="button" onClick={() => onDuplicate(sample.id)}>{t("复制")}</button>
          <button type="button" onClick={() => onDelete(sample.id)}>{t("删除")}</button></footer>
      </article>;
    })}</div></section>;
}

export function GroupSampleEditor({ sample, onSave, onClose, onReset }) {
  const { t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(sample)));
  const updateNode = (nodeId, updater) => setDraft((current) => ({ ...current,
    nodes: current.nodes.map((node) => node.id === nodeId ? updater(node) : node) }));
  return <form className="group-sample-editor" onSubmit={(event) => {
    event.preventDefault();
    if (!draft.name.trim() || draft.nodes.some((node) => !node.title.trim())) return;
    onSave({ ...draft, builtinKey: undefined, name: draft.name.trim(), description: draft.description.trim(),
      nodes: draft.nodes.map((node) => ({ ...node, title: node.title.trim(), description: node.description.trim(),
        conditions: node.conditions.filter((condition) => condition.label.trim()).map((condition) => ({ ...condition,
          label: condition.label.trim(), done: false })) })),
      readinessTemplates: Object.fromEntries(Object.entries(draft.readinessTemplates).map(([key, conditions]) => [key,
        conditions.filter((condition) => condition.label.trim()).map((condition) => ({ ...condition,
          label: condition.label.trim(), done: false }))])) });
  }}>
    <div className="sample-editor-summary"><label><span>{t("集团范本名称 *")}</span><input required value={draft.name}
      onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
      <label><span>{t("说明")}</span><input value={draft.description}
        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
      <small>{t("{count} 个合并节点", { count: draft.nodes.length })}</small></div>
    <section className="group-sample-section"><header><strong>{t("合并工作流")}</strong>
      <span>{t("用于每一级选择“需要合并”的集团。")}</span></header>
      <div className="sample-editor-list">{draft.nodes.map((node, index) => <section className="sample-edit-node" key={node.id}>
        <header><span>{index + 1}</span><input required value={node.title}
          onChange={(event) => updateNode(node.id, (current) => ({ ...current, title: event.target.value }))} />
          <div><button type="button" disabled={index === 0} onClick={() => setDraft((current) => {
            const nodes = [...current.nodes]; [nodes[index - 1], nodes[index]] = [nodes[index], nodes[index - 1]]; return { ...current, nodes };
          })}>↑</button><button type="button" disabled={index === draft.nodes.length - 1} onClick={() => setDraft((current) => {
            const nodes = [...current.nodes]; [nodes[index + 1], nodes[index]] = [nodes[index], nodes[index + 1]]; return { ...current, nodes };
          })}>↓</button><button type="button" onClick={() => setDraft((current) => ({ ...current,
            nodes: current.nodes.filter((item) => item.id !== node.id) }))}>{t("删除")}</button></div></header>
        <input className="sample-node-description" value={node.description}
          onChange={(event) => updateNode(node.id, (current) => ({ ...current, description: event.target.value }))} />
        <div className="sample-condition-editor">{node.conditions.map((condition) => <div key={condition.id}><span>•</span>
          <input value={condition.label} onChange={(event) => updateNode(node.id, (current) => ({ ...current,
            conditions: current.conditions.map((item) => item.id === condition.id ? { ...item, label: event.target.value } : item) }))} />
          <button type="button" onClick={() => updateNode(node.id, (current) => ({ ...current,
            conditions: current.conditions.filter((item) => item.id !== condition.id) }))}>×</button></div>)}</div>
        <footer><button type="button" onClick={() => updateNode(node.id, (current) => ({ ...current,
          conditions: [...current.conditions, { id: uid("group-sample-condition"), label: "", done: false }] }))}>{t("＋ 添加条件")}</button></footer>
      </section>)}</div><button type="button" className="sample-add-node" onClick={() => setDraft((current) => ({ ...current,
        nodes: [...current.nodes, { id: uid("group-sample-node"), title: "", description: "", conditions: [] }] }))}>{t("＋ 添加合并节点")}</button></section>
    <section className="group-sample-section"><header><strong>{t("公司合并就绪条件")}</strong>
      <span>{t("按审计类别设置默认值；建立公司成员后仍可单独覆盖。")}</span></header>
      <div className="readiness-template-grid">{GROUP_AUDIT_TYPES.map((auditType) => <section key={auditType}><h4>{t(auditTypeKeys[auditType])}</h4>
        {draft.readinessTemplates[auditType].map((condition) => <div key={condition.id}><input value={condition.label}
          onChange={(event) => setDraft((current) => ({ ...current, readinessTemplates: { ...current.readinessTemplates,
            [auditType]: current.readinessTemplates[auditType].map((item) => item.id === condition.id
              ? { ...item, label: event.target.value } : item) } }))} />
          <button type="button" onClick={() => setDraft((current) => ({ ...current, readinessTemplates: { ...current.readinessTemplates,
            [auditType]: current.readinessTemplates[auditType].filter((item) => item.id !== condition.id) } }))}>×</button></div>)}
        <button type="button" onClick={() => setDraft((current) => ({ ...current, readinessTemplates: { ...current.readinessTemplates,
          [auditType]: [...current.readinessTemplates[auditType], { id: uid("readiness-condition"), label: "", done: false }] } }))}>
          {t("＋ 添加就绪条件")}</button></section>)}</div></section>
    <footer className="sample-editor-actions">{onReset ? <button type="button" className="button secondary" onClick={onReset}>{t("恢复基础范本")}</button> : <span />}
      <span /><span /><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存集团范本")}</button></footer>
  </form>;
}
