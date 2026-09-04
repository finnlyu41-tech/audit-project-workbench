import React from "react";
import { ArrowRightLeft, Building, Building2, ChevronsDown, ChevronsUp, Copy, Minus, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { ProgressBar } from "./components.jsx";
import { handleTabListKeyDown, tabIndexFor } from "./a11y.js";
import { GROUP_AUDIT_TYPES, GROUP_AUDIT_TYPE_KEYS, canMoveWorkspaceItem, collectGroupOutstandingEntries, formatDate,
  engagementMatchesNavigationFilters, engagementTypeValues, engagementTypesLabel,
  groupProgress, makeGroupMember, memberIsReady, memberProgressPercentage, normalizeTemplateTags,
  outstandingIsOpen, projectStats, fiscalPeriodShortLabel, reportingPeriodLabel, uid, yearEndOrPeriodLabel } from "./model.js";
import { useUiLanguage } from "./i18n.jsx";
import { ReportingPeriodSummary } from "./reporting-period-summary.jsx";

export const auditTypeKeys = GROUP_AUDIT_TYPE_KEYS;

export function GroupForm({ initial, sampleName, allowTemplate = true, memberTargets = { projects: [], groups: [] },
  availableProjects = [], availableGroups = [], groupSample, onSubmit, onClose, onConvert, structureSelector = null,
  quickField = null }) {
  const { t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({
    name: initial?.name || "",
    period: initial?.period || "",
    periodStart: initial?.periodStart || "",
    periodEnd: initial?.periodEnd || "",
    startDate: initial?.startDate || "",
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
  if (quickField === "schedule") return <form className="workbench-form" data-quick-field="schedule" onSubmit={(event) => {
    event.preventDefault();
    onSubmit(values, false);
  }}>
    <div className="project-date-groups" data-single="true"><fieldset><legend>{t("项目排期")}</legend><div>
      <label><span>{t("开始日")}</span><input autoFocus aria-label={t("项目开始日")} type="date"
        value={values.startDate} max={values.dueDate || undefined} onChange={update("startDate")} /></label>
      <label><span>{t("截止日")}</span><input aria-label={t("项目截止日")} type="date"
        value={values.dueDate} min={values.startDate || undefined} onChange={update("dueDate")} /></label>
    </div></fieldset></div>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存修改")}</button></footer>
  </form>;
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
    {initial && onConvert && <section className="structure-conversion"><div><span>{t("公司结构")}</span>
      <strong>{t("控股公司")}</strong><small>{t("转换后，下属成员会移到顶层；合并节点会保留以供以后恢复。")}</small></div>
      <button type="button" className="button secondary" onClick={onConvert}><ArrowRightLeft aria-hidden="true" />
        {t("转换为公司")}</button></section>}
    <div className="project-identity-row" data-single={!structureSelector || undefined}><label><span>{t("集团名称 *")}</span>
      <input autoFocus required value={values.name} onChange={update("name")}
        placeholder={t("例如：[集团名称] 2025年度集团审计")} /></label>{structureSelector}</div>
    <div className="project-date-groups"><fieldset><legend>{t("报告期间")}</legend><div>
      <label><span>{t("开始日")}</span><input type="date" value={values.periodStart} max={values.periodEnd || undefined}
        required={Boolean(values.periodEnd)} onChange={update("periodStart")} /></label>
      <label><span>{t("结束日")}</span><input type="date" value={values.periodEnd} min={values.periodStart || undefined}
        required={Boolean(values.periodStart)} onChange={update("periodEnd")} /></label></div></fieldset>
      <fieldset><legend>{t("项目排期")}</legend><div><label><span>{t("开始日")}</span>
        <input aria-label={t("项目开始日")} type="date" value={values.startDate} max={values.dueDate || undefined}
          onChange={update("startDate")} /></label>
        <label><span>{t("截止日")}</span><input aria-label={t("项目截止日")} type="date" value={values.dueDate}
          min={values.startDate || undefined} onChange={update("dueDate")} /></label></div></fieldset>
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
      <div className="group-member-adder"><div className="choice-tabs" role="tablist" onKeyDown={handleTabListKeyDown}><button type="button" role="tab"
        aria-selected={memberKind === "project"} tabIndex={tabIndexFor(memberKind === "project")}
        onClick={() => { setMemberKind("project"); setMemberRefId(""); }}>{t("公司项目")}</button>
        <button type="button" role="tab" aria-selected={memberKind === "group"} tabIndex={tabIndexFor(memberKind === "group")}
          onClick={() => { setMemberKind("group"); setMemberRefId(""); }}>{t("子集团")}</button></div>
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

export function WorkspaceTree(props) {
  if (Array.isArray(props.store?.entities) && Array.isArray(props.store?.engagements)) {
    if (props.viewMode === "projects") return <EntityEngagementWorkspaceList {...props} />;
    return <EntityWorkspaceTree {...props} />;
  }
  return <LegacyWorkspaceTree {...props} />;
}

function EntityEngagementWorkspaceList({ store, selection, onSelect, search, filter, statuses, navigationFilters, simplifiedView }) {
  const { language, t } = useUiLanguage();
  const query = search.trim().toLocaleLowerCase();
  const entityById = new Map(store.entities.map((entity) => [entity.id, entity]));
  const entityOrder = new Map((store.entityOrder || []).map((id, index) => [id, index]));
  const scheduleOrder = new Map((store.scheduleOrder || []).map((key, index) => [key, index]));
  const rows = store.engagements.map((engagement) => {
    const entity = entityById.get(engagement.entityId);
    if (!entity) return null;
    const kind = entity.kind === "holding_company" ? "group" : "project";
    const view = kind === "group" ? store.groups.find((group) => group.id === engagement.id)
      : store.projects.find((project) => project.id === engagement.id);
    const progress = kind === "group" ? groupProgress(store, engagement.id).percentage
      : projectStats(view || { workstreams: [] }).percentage;
    const complete = kind === "group" ? Boolean(view && groupProgress(store, engagement.id).ready)
      : Boolean(view && projectStats(view).complete);
    const archived = Boolean(entity.archived || engagement.archived);
    const periodLabel = yearEndOrPeriodLabel(engagement, language) || t("未设置报告期间");
    const typeLabel = engagementTypesLabel(engagement, language) || t("项目类型未设置");
    const searchable = [entity.legalName, ...engagementTypeValues(engagement), engagement.internalName, engagement.owner,
      periodLabel, reportingPeriodLabel(engagement, language)];
    if (!engagementMatchesNavigationFilters(engagement, navigationFilters)) return null;
    if (filter === "archived" ? !archived : archived) return null;
    if (filter === "active" && complete) return null;
    if (filter === "completed" && !complete) return null;
    if (query && !searchable.some((value) => String(value || "").toLocaleLowerCase().includes(query))) return null;
    return { engagement, entity, kind, progress, complete, periodLabel, typeLabel,
      outstanding: (engagement.outstandingItems || []).filter((item) => outstandingIsOpen(item, statuses)).length };
  }).filter(Boolean).sort((left, right) => {
    const leftKey = `${left.kind}:${left.engagement.id}`;
    const rightKey = `${right.kind}:${right.engagement.id}`;
    return (scheduleOrder.get(leftKey) ?? Number.MAX_SAFE_INTEGER) - (scheduleOrder.get(rightKey) ?? Number.MAX_SAFE_INTEGER)
      || (entityOrder.get(left.entity.id) ?? Number.MAX_SAFE_INTEGER) - (entityOrder.get(right.entity.id) ?? Number.MAX_SAFE_INTEGER)
      || (right.engagement.periodEnd || "").localeCompare(left.engagement.periodEnd || "")
      || left.entity.legalName.localeCompare(right.entity.legalName);
  });
  return <div className="workspace-tree flat-engagement-list" data-simplified={simplifiedView || undefined}>
    {rows.length ? rows.map(({ engagement, entity, kind, progress, complete, periodLabel, typeLabel, outstanding }) =>
      <button type="button" className="tree-row flat-engagement-row" key={engagement.id}
        data-selected={selection?.kind === kind && selection.id === engagement.id || undefined}
        onClick={() => onSelect({ kind, id: engagement.id, entityId: entity.id })}>
        <span className="tree-copy"><strong className="flat-engagement-type">{typeLabel}</strong>
          <ReportingPeriodSummary engagement={engagement} language={language} t={t} className="flat-engagement-period"
            compact={simplifiedView} />
          <small className="flat-engagement-company">{[entity.legalName, simplifiedView ? "" : engagement.owner]
            .filter(Boolean).join(" · ")}</small></span>
        {!simplifiedView && outstanding > 0 && <em>{outstanding}</em>}{!simplifiedView && <span className="tree-progress">{complete ? "✓" : `${progress}%`}</span>}
      </button>) : <div className="list-empty"><strong>{t(store.engagements.length ? "没有符合筛选的年度项目" : "还没有年度项目")}</strong>
      <span>{t(store.engagements.length ? "更改状态筛选或搜索内容。" : "先在公司主档中建立年度项目。")}</span></div>}
  </div>;
}

function EntityWorkspaceTree({ store, selection, onSelect, onMove, search, filter, statuses, navigationFilters, simplifiedView }) {
  const { language, t } = useUiLanguage();
  const [expanded, setExpanded] = React.useState(() => new Set());
  const [draggingId, setDraggingId] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);
  const draggingRef = React.useRef(null);
  const entityById = new Map(store.entities.map((entity) => [entity.id, entity]));
  const entityOrder = new Map((store.entityOrder || []).map((id, index) => [id, index]));
  React.useEffect(() => {
    if (!["project", "group"].includes(selection?.kind)) return;
    const engagement = store.engagements.find((item) => item.id === selection.id);
    if (!engagement?.entityId) return;
    setExpanded((current) => {
      const next = new Set(current);
      let entity = store.entities.find((item) => item.id === engagement.entityId);
      let changed = false;
      while (entity) {
        if (!next.has(entity.id)) { next.add(entity.id); changed = true; }
        entity = store.entities.find((item) => item.id === entity.parentEntityId);
      }
      return changed ? next : current;
    });
  }, [selection?.kind, selection?.id, store.engagements, store.entities]);
  const query = search.trim().toLocaleLowerCase();
  const advancedFiltersActive = Object.values(navigationFilters || {}).some(Boolean);
  const entityEngagements = (entityId) => store.engagements.filter((engagement) => engagement.entityId === entityId)
    .sort((left, right) => (right.periodEnd || "").localeCompare(left.periodEnd || "")
      || (right.createdAt || "").localeCompare(left.createdAt || ""));
  const engagementComplete = (engagement, entity) => {
    if (entity.kind === "holding_company") return groupProgress(store, engagement.id).ready;
    const project = store.projects.find((item) => item.id === engagement.id);
    return project ? projectStats(project).complete : false;
  };
  const engagementMatches = (engagement, entity) => {
    if (!engagementMatchesNavigationFilters(engagement, navigationFilters)) return false;
    const archived = Boolean(entity.archived || engagement.archived);
    if (filter === "archived" ? !archived : archived) return false;
    const complete = engagementComplete(engagement, entity);
    if (filter === "active" && complete) return false;
    if (filter === "completed" && !complete) return false;
    if (query && ![entity.legalName, ...engagementTypeValues(engagement), engagement.internalName, engagement.owner,
      fiscalPeriodShortLabel(engagement, language), yearEndOrPeriodLabel(engagement, language), reportingPeriodLabel(engagement, language)]
      .some((value) => String(value || "").toLocaleLowerCase().includes(query))) return false;
    return true;
  };
  const entityOwnVisible = (entity) => {
    const archivedMode = filter === "archived";
    const ownArchiveMatch = archivedMode ? entity.archived : !entity.archived;
    const engagements = entityEngagements(entity.id).filter((engagement) => engagementMatches(engagement, entity));
    const ownText = !query || [entity.legalName, entity.entityType, entity.relationshipRole].some((value) =>
      String(value || "").toLocaleLowerCase().includes(query));
    const zeroEngagementVisible = !advancedFiltersActive && ["active", "all", "archived"].includes(filter) && ownArchiveMatch
      && !entityEngagements(entity.id).length && ownText;
    return engagements.length > 0 || zeroEngagementVisible || (ownArchiveMatch && ownText && query);
  };
  const entityVisible = (entity, visited = new Set()) => {
    if (visited.has(entity.id)) return false;
    const children = store.entities.filter((child) => child.parentEntityId === entity.id);
    const childVisible = children.some((child) => entityVisible(child, new Set(visited).add(entity.id)));
    return entityOwnVisible(entity) || childVisible;
  };
  const sortedEntities = (items) => [...items].sort((left, right) =>
    (entityOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (entityOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      || left.legalName.localeCompare(right.legalName));
  const isOpen = (entityId) => query || expanded.has(entityId);
  const toggle = (entityId) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(entityId)) next.delete(entityId); else next.add(entityId);
    return next;
  });
  const beginDrag = (event, entityId) => {
    draggingRef.current = entityId; setDraggingId(entityId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-audit-workbench-entity", entityId);
    event.dataTransfer.setData("text/plain", entityId);
  };
  const finishDrag = () => { draggingRef.current = null; setDraggingId(null); setDropTarget(null); };
  const canDrop = (parentEntityId) => {
    const sourceId = draggingRef.current || draggingId;
    if (!sourceId) return false;
    if (!parentEntityId) return true;
    const parent = entityById.get(parentEntityId);
    if (!parent || parent.kind !== "holding_company" || parent.archived || parent.id === sourceId) return false;
    let cursor = parent;
    while (cursor?.parentEntityId) {
      if (cursor.parentEntityId === sourceId) return false;
      cursor = entityById.get(cursor.parentEntityId);
    }
    return true;
  };
  const dragOver = (event, parentEntityId) => {
    if (!canDrop(parentEntityId)) return;
    event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move";
    setDropTarget(parentEntityId || "root");
  };
  const drop = (event, parentEntityId) => {
    const sourceId = draggingRef.current || draggingId;
    if (!sourceId || !canDrop(parentEntityId)) return;
    event.preventDefault(); event.stopPropagation();
    onMove?.("entity", sourceId, parentEntityId || "");
    if (parentEntityId) setExpanded((current) => new Set(current).add(parentEntityId));
    finishDrag();
  };
  const renderEngagement = (engagement, entity, depth) => {
    if (!engagementMatches(engagement, entity)) return null;
    const complete = engagementComplete(engagement, entity);
    const outstanding = (engagement.outstandingItems || []).filter((item) => outstandingIsOpen(item, statuses)).length;
    const kind = entity.kind === "holding_company" ? "group" : "project";
    const typeLabel = engagementTypesLabel(engagement, language) || t("项目类型未设置");
    return <button type="button" className="tree-row tree-engagement-row" style={{ "--tree-depth": depth }} key={engagement.id}
      data-selected={selection?.kind === kind && selection.id === engagement.id || undefined}
      onClick={() => onSelect({ kind, id: engagement.id, entityId: entity.id })}>
        <span className="tree-copy"><strong className="tree-engagement-type">{typeLabel}</strong>
        <ReportingPeriodSummary engagement={engagement} language={language} t={t} className="tree-engagement-period"
          owner={simplifiedView ? "" : engagement.owner} compact={simplifiedView} /></span>
      {!simplifiedView && outstanding > 0 && <em>{outstanding}</em>}{!simplifiedView && <span className="tree-progress">{complete ? "✓" : entity.kind === "company"
        ? `${projectStats(store.projects.find((item) => item.id === engagement.id) || { workstreams: [] }).percentage}%` : `${groupProgress(store, engagement.id).percentage}%`}</span>}
    </button>;
  };
  const renderEntity = (entity, depth, visited = new Set()) => {
    if (!entityVisible(entity, visited) || visited.has(entity.id)) return null;
    const nextVisited = new Set(visited).add(entity.id);
    const ownVisible = entityOwnVisible(entity);
    const childDepth = ownVisible ? depth + 1 : depth;
    const children = sortedEntities(store.entities.filter((child) => child.parentEntityId === entity.id))
      .map((child) => renderEntity(child, childDepth, nextVisited)).filter(Boolean);
    if (!ownVisible) return children.length ? <React.Fragment key={entity.id}>{children}</React.Fragment> : null;
    const engagements = entityEngagements(entity.id).map((engagement) => renderEngagement(engagement, entity, depth + 1)).filter(Boolean);
    const hasChildren = engagements.length > 0 || children.length > 0;
    const open = hasChildren && isOpen(entity.id);
    const activeEngagements = entityEngagements(entity.id).filter((engagement) => !engagement.archived).length;
    return <div className="tree-branch tree-entity-branch" key={entity.id}><div className="tree-group-line" style={{ "--tree-depth": depth }}>
      {hasChildren ? <button type="button" className="tree-expander" aria-expanded={open}
        aria-label={t(open ? "收起公司" : "展开公司")} onClick={() => toggle(entity.id)}>{open ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}</button>
        : <span className="tree-expander-spacer" />}
      <button type="button" className="tree-row tree-entity-row" data-kind={entity.kind}
        data-selected={selection?.kind === "entity" && selection.id === entity.id || undefined}
        data-dragging={draggingId === entity.id || undefined} data-drop-target={dropTarget === entity.id || undefined}
        draggable={filter !== "archived" && !entity.archived} onDragStart={(event) => beginDrag(event, entity.id)} onDragEnd={finishDrag}
        onDragEnter={(event) => dragOver(event, entity.id)} onDragOver={(event) => dragOver(event, entity.id)} onDrop={(event) => drop(event, entity.id)}
        onClick={() => onSelect({ kind: "entity", id: entity.id })}>
        <span className="tree-copy"><strong>{entity.legalName}</strong></span>
        {!simplifiedView && <span className="tree-progress">{activeEngagements}</span>}</button></div>{open && <div className="tree-children">{engagements}{children}</div>}</div>;
  };
  const roots = sortedEntities(store.entities.filter((entity) => !entity.parentEntityId || !entityById.has(entity.parentEntityId)));
  const rendered = roots.map((entity) => renderEntity(entity, 0)).filter(Boolean);
  const expandableEntityIds = query ? [] : store.entities.filter((entity) => entityOwnVisible(entity) && entityVisible(entity))
    .filter((entity) => entityEngagements(entity.id).some((engagement) => engagementMatches(engagement, entity))
      || store.entities.some((child) => child.parentEntityId === entity.id && entityVisible(child)))
    .map((entity) => entity.id);
  const allExpanded = expandableEntityIds.length > 0 && expandableEntityIds.every((id) => expanded.has(id));
  return <div className="workspace-tree" data-dragging={Boolean(draggingId) || undefined} data-simplified={simplifiedView || undefined}
    onDragEnter={(event) => dragOver(event, "")} onDragOver={(event) => dragOver(event, "")} onDrop={(event) => drop(event, "")}>
    {expandableEntityIds.length > 0 && <div className="workspace-tree-bulk-actions"><button type="button"
      aria-label={t(allExpanded ? "收起全部公司" : "展开全部公司")}
      onClick={() => setExpanded(allExpanded ? new Set() : new Set(expandableEntityIds))}>
      {allExpanded ? <ChevronsUp aria-hidden="true" /> : <ChevronsDown aria-hidden="true" />}
      <span>{t(allExpanded ? "收起全部" : "展开全部")}</span></button></div>}
    {rendered.length ? rendered : <div className="list-empty"><strong>{t(store.entities.length ? "没有符合筛选的项目" : "还没有公司")}</strong>
      <span>{t(store.entities.length ? "更改状态筛选或搜索内容。" : "使用上方加号先建立公司主档。")}</span></div>}
    {draggingId && <div className="tree-root-drop" data-active={dropTarget === "root" || undefined}>{t("拖到这里移出控股公司")}</div>}
  </div>;
}

function LegacyWorkspaceTree({ store, selection, onSelect, onMove, search, filter, statuses, navigationFilters }) {
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
  const matchesText = (item) => !query || [item.name, item.entity, ...engagementTypeValues(item), item.reportingFramework, item.period, item.periodStart,
    item.periodEnd, reportingPeriodLabel(item, language), item.owner]
    .some((value) => value?.toLowerCase().includes(query));
  const visibleProject = (project) => itemMatchesFilter(project, "project", filter, store) && matchesText(project)
    && engagementMatchesNavigationFilters(project, navigationFilters);
  const groupHasVisibleContent = (group, visited = new Set()) => {
    if (visited.has(group.id)) return false;
    if (group.archived !== archiveMode) return false;
    const next = new Set(visited).add(group.id);
    if (itemMatchesFilter(group, "group", filter, store) && matchesText(group)
      && engagementMatchesNavigationFilters(group, navigationFilters)) return true;
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
      <span className="tree-copy"><strong>{project.entity || project.name}</strong>
        <small>{[engagementTypesLabel(project, language), project.name !== project.entity ? project.name : "", project.owner].filter(Boolean).join(" · ")
          || reportingPeriodLabel(project, language) || t("尚未填写项目资料")}</small></span>
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
        <span className="tree-copy"><strong>{group.name}</strong>
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
      <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder={t("筛选负责人")} aria-label={t("筛选负责人")} />
      <select value={auditType} onChange={(event) => setAuditType(event.target.value)} aria-label={t("按审计类别筛选")}><option value="all">{t("全部审计类别")}</option>
        {GROUP_AUDIT_TYPES.map((value) => <option value={value} key={value}>{t(auditTypeKeys[value])}</option>)}</select>
      <select value={readiness} onChange={(event) => setReadiness(event.target.value)} aria-label={t("按就绪状态筛选")}><option value="all">{t("全部就绪状态")}</option>
        <option value="ready">{t("已具备合并条件")}</option><option value="not_ready">{t("尚未具备合并条件")}</option></select>
    </div>
    <div className="group-matrix" role="table" aria-label={t("集团组成部分矩阵")}>
      <div className="group-matrix-head" role="row"><span role="columnheader">{t("公司／子集团")}</span><span role="columnheader">{t("角色")}</span>
        <span role="columnheader">{t("审计类别")}</span><span role="columnheader">{t("负责人")}</span><span role="columnheader">{t("审计进度")}</span>
        <span role="columnheader">{t("合并就绪")}</span><span role="columnheader">{t("待清")}</span><span role="columnheader">{t("截止日")}</span>
        <span role="columnheader" aria-label={t("操作")} /></div>
      {rows.map(({ member, target, sourceGroupId, depth }) => {
        const isGroup = member.kind === "group";
        const percentage = isGroup ? groupProgress(store, target.id).percentage : memberProgressPercentage(store, member);
        const ready = memberIsReady(store, member);
        const openOutstanding = isGroup ? collectGroupOutstandingEntries(store, target.id)
          .filter((entry) => outstandingIsOpen(entry.item, statuses)).length
          : target.outstandingItems.filter((item) => outstandingIsOpen(item, statuses)).length;
        const completedReadiness = member.readinessConditions?.filter((condition) => condition.done).length || 0;
        return <div className="group-matrix-row" role="row" key={member.id}>
          <div role="cell" className="matrix-name-cell"><button type="button" className="matrix-name" style={{ "--matrix-depth": depth }} onClick={() => onOpen(member.kind, target.id)}>
            <span className="matrix-kind">{isGroup ? <Building2 aria-hidden="true" /> : <Building aria-hidden="true" />}</span><span><strong>{target.name}</strong>
              <small>{target.entity || reportingPeriodLabel(target, language) || t(isGroup ? "子集团" : "公司项目")}</small></span></button></div>
          <span role="cell">{member.role || t(isGroup ? "子集团" : "组成部分")}</span>
          <span role="cell">{isGroup ? t(target.consolidationEnabled ? "子集团合并" : "分类集团") : t(auditTypeKeys[member.auditType])}</span>
          <span role="cell">{target.owner || "—"}</span><span role="cell" className="matrix-progress">
            <ProgressBar value={percentage} compact /></span>
          <span role="cell"><i className="readiness-pill" data-ready={ready || undefined}>{t(ready ? "已就绪" : "未就绪")}</i>
            {!isGroup && <small>{completedReadiness}/{member.readinessConditions.length}</small>}</span>
          <span role="cell">{openOutstanding || "—"}</span><time role="cell">{formatDate(target.dueDate, language)}</time>
          <div role="cell" className="matrix-action-cell">{!readOnly && <button type="button" className="matrix-settings"
            onClick={() => onConfigure(sourceGroupId, member)}>{t("设置")}</button>}</div>
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
    <div className="choice-tabs" role="tablist" onKeyDown={handleTabListKeyDown}><button type="button" role="tab"
      aria-selected={kind === "project"} tabIndex={tabIndexFor(kind === "project")}
      onClick={() => setKind("project")}>{t("公司项目")}</button><button type="button" role="tab"
        aria-selected={kind === "group"} tabIndex={tabIndexFor(kind === "group")}
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
    <button type="button" className="button primary" onClick={onCreate}><Plus aria-hidden="true" />{t("新建集团范本")}</button></header>
    {samples.length ? <div className="sample-library-list">{samples.map((sample) => {
      const conditions = sample.nodes.reduce((sum, node) => sum + node.conditions.length, 0);
      const readiness = Object.values(sample.readinessTemplates).reduce((sum, list) => sum + list.length, 0);
      const selected = sample.id === selectedSampleId;
      return <article className="sample-library-card" data-selected={selected || undefined} key={sample.id}>
        <button type="button" className="sample-library-select" onClick={() => onSelect(sample.id)}>
          <span className="sample-mark group-sample-mark">H</span><span><strong>{sample.name}</strong>
            <small>{sample.description || t("没有说明")}</small><em>{t("{nodes} 个合并节点 · {conditions} 项条件 · {readiness} 项就绪条件",
              { nodes: sample.nodes.length, conditions, readiness })}</em>
            {(sample.tags?.length > 0 || sample.versionNote) && <span className="sample-library-metadata">
              {sample.tags?.map((tag) => <i key={tag}>{tag}</i>)}{sample.versionNote && <small>{sample.versionNote}</small>}</span>}</span>
          {selected && <i>{t("当前使用")}</i>}</button>
        <footer><button type="button" className="icon-only" aria-label={t("使用此范本")} title={t("使用此范本")} data-tooltip={t("使用此范本")}
          data-tooltip-side="right" onClick={() => onUse(sample.id)}><Play aria-hidden="true" /></button>
          <button type="button" className="icon-only" aria-label={t("编辑范本")} title={t("编辑范本")} data-tooltip={t("编辑范本")}
            onClick={() => onEdit(sample.id)}><Pencil aria-hidden="true" /></button>
          <button type="button" className="icon-only" aria-label={t("复制范本")} title={t("复制范本")} data-tooltip={t("复制范本")}
            onClick={() => onDuplicate(sample.id)}><Copy aria-hidden="true" /></button>
          <button type="button" className="icon-only" aria-label={t("删除范本")} title={t("删除范本")} data-tooltip={t("删除范本")}
            data-tooltip-side="left" onClick={() => onDelete(sample.id)}><Trash2 aria-hidden="true" /></button></footer>
      </article>;
    })}</div> : <div className="sample-library-empty"><strong>{t("还没有集团范本")}</strong>
      <span>{t("可以建立新集团范本，或暂时使用空白合并流程。")}</span>
      <button type="button" className="button primary" onClick={onCreate}>{t("新建集团范本")}</button></div>}</section>;
}

export function GroupSampleEditor({ sample, onSave, onClose, onReset }) {
  const { t } = useUiLanguage();
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(sample)));
  const [tags, setTags] = React.useState(() => (sample.tags || []).join(", "));
  const updateNode = (nodeId, updater) => setDraft((current) => ({ ...current,
    nodes: current.nodes.map((node) => node.id === nodeId ? updater(node) : node) }));
  return <form className="group-sample-editor" onSubmit={(event) => {
    event.preventDefault();
    if (!draft.name.trim() || draft.nodes.some((node) => !node.title.trim())) return;
    onSave({ ...draft, builtinKey: undefined, name: draft.name.trim(), description: draft.description.trim(),
      tags: normalizeTemplateTags(tags), versionNote: draft.versionNote?.trim() || "",
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
      <label><span>{t("标签")}</span><input value={tags} onChange={(event) => setTags(event.target.value)}
        placeholder={t("例如：集团审计，香港")} /></label>
      <label><span>{t("版本备注")}</span><input maxLength="240" value={draft.versionNote || ""}
        onChange={(event) => setDraft((current) => ({ ...current, versionNote: event.target.value }))}
        placeholder={t("说明本次范本修改")} /></label>
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
