import React from "react";
import { Modal, NodeCard, NodeForm, OutstandingStatusEditor, ProgressBar, ProjectForm, SampleEditor,
  SampleLibrary } from "./components.jsx";
import { GroupForm, GroupMatrix, GroupMemberAddForm, GroupMemberForm, GroupSampleEditor, GroupSampleLibrary,
  WorkspaceTree } from "./group-components.jsx";
import { STORAGE_KEY, canNestGroup, collectGroupOutstandingEntries, createDefaultGroupSample, createDefaultSample,
  duplicateGroupSample, duplicateSample, findParentMembership, formatDate, groupProgress, isValidStore, loadStore,
  localizeGroupSample, localizeGroupWorkflowNodes, localizeOutstandingStatuses, localizeSample, localizeWorkflowNodes,
  makeBlankGroupSample, makeBlankSample, makeGroup, makeGroupMember, makeNode, makeOutstandingItem, makeProject,
  nodeIsComplete, normalizeStore, outstandingIsOpen, projectStats, redactSampleCompanies, uid } from "./model.js";
import { LanguageProvider, useUiLanguage } from "./i18n.jsx";
import "./dashboard.css";

const SIDEBAR_PREFERENCE_KEY = "audit-progress-workbench:sidebar-collapsed";

export function DashboardContent() {
  return <LanguageProvider><DashboardWorkbench /></LanguageProvider>;
}

function DashboardWorkbench() {
  const { language, setLanguage, t } = useUiLanguage();
  const [store, setStore] = React.useState(loadStore);
  const [selection, setSelection] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("active");
  const [sampleShelfType, setSampleShelfType] = React.useState("project");
  const [modal, setModal] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true"; } catch { return false; }
  });
  const importRef = React.useRef(null);

  React.useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(store)), [store]);
  React.useEffect(() => {
    try { localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed)); } catch { /* optional */ }
  }, [sidebarCollapsed]);
  React.useEffect(() => {
    const exists = selection?.kind === "group" ? store.groups.some((group) => group.id === selection.id)
      : selection?.kind === "project" ? store.projects.some((project) => project.id === selection.id) : false;
    if (!exists) {
      const group = store.groups.find((item) => !item.archived) || store.groups[0];
      const project = store.projects.find((item) => !item.archived) || store.projects[0];
      setSelection(group ? { kind: "group", id: group.id } : project ? { kind: "project", id: project.id } : null);
    }
  }, [store.groups, store.projects, selection]);
  React.useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const notify = (text) => setMessage(text);
  const selectedProjectSource = selection?.kind === "project"
    ? store.projects.find((project) => project.id === selection.id) || null : null;
  const selectedGroupSource = selection?.kind === "group"
    ? store.groups.find((group) => group.id === selection.id) || null : null;
  const selectedProject = selectedProjectSource ? { ...selectedProjectSource,
    nodes: localizeWorkflowNodes(selectedProjectSource.nodes, language) } : null;
  const selectedGroup = selectedGroupSource ? { ...selectedGroupSource,
    nodes: localizeGroupWorkflowNodes(selectedGroupSource.nodes, language) } : null;

  const sampleViews = store.samples.map((sample) => localizeSample(sample, language));
  const groupSampleViews = store.groupSamples.map((sample) => localizeGroupSample(sample, language));
  const selectedSample = sampleViews.find((sample) => sample.id === store.selectedSampleId) || sampleViews[0] || null;
  const selectedGroupSample = groupSampleViews.find((sample) => sample.id === store.selectedGroupSampleId)
    || groupSampleViews[0] || null;
  const outstandingStatusViews = localizeOutstandingStatuses(store.outstandingStatuses, language);
  const allOutstandingItems = [...store.projects, ...store.groups].flatMap((item) => item.outstandingItems || []);
  const outstandingStatusUsage = allOutstandingItems.reduce((counts, item) => ({
    ...counts, [item.status]: (counts[item.status] || 0) + 1,
  }), {});

  const updateProject = React.useCallback((projectId, updater) => setStore((current) => ({ ...current,
    projects: current.projects.map((project) => project.id === projectId
      ? { ...updater(project), updatedAt: new Date().toISOString() } : project),
  })), []);
  const updateGroup = React.useCallback((groupId, updater) => setStore((current) => ({ ...current,
    groups: current.groups.map((group) => group.id === groupId
      ? { ...updater(group), updatedAt: new Date().toISOString() } : group),
  })), []);
  const updateTarget = (kind, id, updater) => kind === "group" ? updateGroup(id, updater) : updateProject(id, updater);

  const createProject = (values, useStarter) => {
    const project = makeProject(values, Boolean(useStarter && selectedSample), selectedSample?.nodes || []);
    const parentGroupId = modal?.parentGroupId;
    setStore((current) => ({ ...current,
      projects: [project, ...current.projects],
      groups: parentGroupId ? current.groups.map((group) => group.id === parentGroupId
        ? { ...group, members: [...group.members, makeGroupMember({ kind: "project", refId: project.id,
          auditType: "internal_team", role: "" }, selectedGroupSample || createDefaultGroupSample())] } : group) : current.groups,
    }));
    setSelection({ kind: "project", id: project.id });
    setFilter("all"); setModal(null); notify(t("项目已建立并自动保存"));
  };

  const createGroup = (values, useStarter) => {
    const group = makeGroup(values, Boolean(useStarter && selectedGroupSample), selectedGroupSample || createDefaultGroupSample());
    const parentGroupId = modal?.parentGroupId;
    setStore((current) => ({ ...current,
      groups: [group, ...current.groups.map((item) => item.id === parentGroupId
        ? { ...item, members: [...item.members, makeGroupMember({ kind: "group", refId: group.id, role: "" },
          selectedGroupSample || createDefaultGroupSample())] } : item)],
    }));
    setSelection({ kind: "group", id: group.id });
    setFilter("all"); setModal(null); notify(t("集团已建立并自动保存"));
  };

  const duplicateProject = (project) => {
    const now = new Date().toISOString();
    const copy = { ...project, id: uid("project"), name: `${project.name}${t("（副本）")}`, archived: false,
      createdAt: now, updatedAt: now, outstandingItems: [], nodes: project.nodes.map((node) => makeNode({
        title: node.title, description: node.description, conditions: node.conditions.map((condition) => condition.label),
      })) };
    setStore((current) => ({ ...current, projects: [copy, ...current.projects] }));
    setSelection({ kind: "project", id: copy.id }); setFilter("all");
    notify(t("已复制流程，所有完成状态已重置"));
  };

  const linkMember = (groupId, values) => {
    if (values.kind === "project" && findParentMembership(store, "project", values.refId)) return;
    if (values.kind === "group" && !canNestGroup(store, groupId, values.refId)) return;
    updateGroup(groupId, (group) => ({ ...group,
      members: [...group.members, makeGroupMember(values, selectedGroupSample || createDefaultGroupSample())],
    }));
    setModal(null); notify(t("组成部分已加入集团"));
  };

  const saveSample = (sample) => {
    const saved = { ...sample, updatedAt: new Date().toISOString() };
    setStore((current) => ({ ...current, samples: current.samples.some((item) => item.id === saved.id)
      ? current.samples.map((item) => item.id === saved.id ? saved : item) : [saved, ...current.samples],
    selectedSampleId: saved.id }));
    setModal({ type: "sample-library" }); notify(t("Sample 已更新；现有项目不受影响"));
  };
  const saveGroupSample = (sample) => {
    const saved = { ...sample, updatedAt: new Date().toISOString() };
    setStore((current) => ({ ...current, groupSamples: current.groupSamples.some((item) => item.id === saved.id)
      ? current.groupSamples.map((item) => item.id === saved.id ? saved : item) : [saved, ...current.groupSamples],
    selectedGroupSampleId: saved.id }));
    setModal({ type: "group-sample-library" }); notify(t("集团 Sample 已更新；现有集团不受影响"));
  };
  const resetSample = (sampleId, groupType = false) => {
    if (!window.confirm(t(groupType ? "恢复基础集团 Sample？当前自定义内容将被替换。"
      : "恢复基础 Sample？当前 Sample 的自定义内容将被替换。"))) return;
    if (groupType) {
      const restored = { ...createDefaultGroupSample(language), id: sampleId };
      setStore((current) => ({ ...current, groupSamples: current.groupSamples.map((sample) => sample.id === sampleId ? restored : sample),
        selectedGroupSampleId: sampleId }));
      setModal({ type: "group-sample-library" }); notify(t("集团 Sample 已恢复为基础范本"));
    } else {
      const restored = { ...createDefaultSample(language), id: sampleId };
      setStore((current) => ({ ...current, samples: current.samples.map((sample) => sample.id === sampleId ? restored : sample),
        selectedSampleId: sampleId }));
      setModal({ type: "sample-library" }); notify(t("Sample 已恢复为基础范本"));
    }
  };
  const copySample = (sampleId, groupType = false) => {
    const views = groupType ? groupSampleViews : sampleViews;
    const source = views.find((sample) => sample.id === sampleId);
    if (!source) return;
    const copy = groupType ? duplicateGroupSample(source, t("（副本）")) : duplicateSample(source, t("（副本）"));
    setStore((current) => groupType
      ? { ...current, groupSamples: [copy, ...current.groupSamples], selectedGroupSampleId: copy.id }
      : { ...current, samples: [copy, ...current.samples], selectedSampleId: copy.id });
    notify(t(groupType ? "集团 Sample 已复制" : "Sample 已复制"));
  };
  const deleteSample = (sampleId, groupType = false) => {
    const views = groupType ? groupSampleViews : sampleViews;
    const sample = views.find((item) => item.id === sampleId);
    if (!sample || !window.confirm(t(groupType ? "删除集团 Sample“{name}”？" : "删除 Sample“{name}”？", { name: sample.name }))) return;
    setStore((current) => {
      if (groupType) {
        const groupSamples = current.groupSamples.filter((item) => item.id !== sampleId);
        return { ...current, groupSamples, selectedGroupSampleId: current.selectedGroupSampleId === sampleId
          ? groupSamples[0]?.id || null : current.selectedGroupSampleId };
      }
      const samples = current.samples.filter((item) => item.id !== sampleId);
      return { ...current, samples, selectedSampleId: current.selectedSampleId === sampleId
        ? samples[0]?.id || null : current.selectedSampleId };
    });
    notify(t(groupType ? "集团 Sample 已删除" : "Sample 已删除"));
  };
  const redactSample = (sampleId, names, replacement) => {
    const source = store.samples.find((sample) => sample.id === sampleId);
    if (!source) return;
    const result = redactSampleCompanies(localizeSample(source, language), names, replacement);
    if (!result.replacements) { notify(t("没有找到完全匹配的公司名称")); return; }
    setStore((current) => ({ ...current, samples: current.samples.map((sample) => sample.id === sampleId ? result.sample : sample),
      selectedSampleId: sampleId }));
    setModal({ type: "sample-library" }); notify(t("{count} 处公司名称已去敏", { count: result.replacements }));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `audit-project-workbench-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click(); URL.revokeObjectURL(url); notify(t("备份已导出"));
  };
  const importBackup = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isValidStore(parsed)) throw new Error("invalid");
      if (!window.confirm(t("将导入 {projects} 个项目、{groups} 个集团及全部范本，并替换当前数据，是否继续？",
        { projects: parsed.projects.length, groups: parsed.groups?.length || 0 }))) return;
      const normalized = normalizeStore(parsed); setStore(normalized);
      setSelection(normalized.groups[0] ? { kind: "group", id: normalized.groups[0].id }
        : normalized.projects[0] ? { kind: "project", id: normalized.projects[0].id } : null);
      notify(t("备份已恢复"));
    } catch { window.alert(t("这不是有效的工作台备份文件。")); }
    finally { if (importRef.current) importRef.current.value = ""; }
  };

  const activeProjects = store.projects.filter((item) => !item.archived);
  const activeGroups = store.groups.filter((item) => !item.archived);
  const completeProjects = activeProjects.filter((project) => project.nodes.length > 0 && project.nodes.every(nodeIsComplete));
  const completeGroups = activeGroups.filter((group) => groupProgress(store, group.id).ready);
  const openOutstanding = allOutstandingItems.filter((item) => outstandingIsOpen(item, store.outstandingStatuses)).length;
  const editingSampleSource = modal?.type === "sample-edit"
    ? modal.sample || store.samples.find((sample) => sample.id === modal.sampleId) : null;
  const editingSample = editingSampleSource ? localizeSample(editingSampleSource, language) : null;
  const editingGroupSampleSource = modal?.type === "group-sample-edit"
    ? modal.sample || store.groupSamples.find((sample) => sample.id === modal.sampleId) : null;
  const editingGroupSample = editingGroupSampleSource ? localizeGroupSample(editingGroupSampleSource, language) : null;
  const shelfSample = sampleShelfType === "group" ? selectedGroupSample : selectedSample;
  const shelfConditions = shelfSample?.nodes.reduce((sum, node) => sum + node.conditions.length, 0) || 0;

  const modalTargetKind = modal?.targetKind || selection?.kind;
  const modalTargetId = modal?.targetId || selection?.id;
  const modalTarget = modalTargetKind === "group" ? store.groups.find((item) => item.id === modalTargetId)
    : store.projects.find((item) => item.id === modalTargetId);

  return <article className="audit-workbench">
    {message && <div className="save-toast" role="status">{message}</div>}
    <header className="workbench-toolbar"><div><h1>{t("审计项目工作台")}</h1>
      <p>{t("从单家公司到多层集团，分别追踪审计进度、合并就绪和待清事项。")}</p></div>
      <div className="toolbar-actions"><div className="language-toggle" role="group" aria-label={t("界面语言")}>
        <button type="button" aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>{t("中文")}</button>
        <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>{t("英文")}</button></div>
        <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
        <button type="button" className="button secondary" onClick={() => importRef.current?.click()}>{t("恢复备份")}</button>
        <button type="button" className="button secondary" onClick={exportBackup}>{t("导出备份")}</button>
        <button type="button" className="button secondary" onClick={() => setModal({ type: "create-group" })}>＋ {t("新建集团")}</button>
        <button type="button" className="button primary" onClick={() => setModal({ type: "create-project" })}>＋ {t("新建项目")}</button>
      </div></header>

    <section className="summary-strip" aria-label={t("项目摘要")}>
      <div><span>{t("进行中")}</span><strong>{activeProjects.length + activeGroups.length - completeProjects.length - completeGroups.length}</strong></div>
      <div><span>{t("已完成")}</span><strong>{completeProjects.length + completeGroups.length}</strong></div>
      <div><span>{t("集团")}</span><strong>{activeGroups.length}</strong></div>
      <div><span>{t("未清事项")}</span><strong>{openOutstanding}</strong></div>
    </section>

    <section className="workbench-layout" data-sidebar-collapsed={sidebarCollapsed || undefined}>
      <aside className="project-panel" aria-label={t("项目与集团")}>
        {sidebarCollapsed ? <button type="button" className="sidebar-rail-toggle" aria-expanded="false"
          aria-label={t("展开项目栏")} title={t("展开项目栏")} onClick={() => setSidebarCollapsed(false)}>
          <span aria-hidden="true">›</span><small>{t("项目")}</small></button> : <>
          <div className="project-panel-controls"><div className="project-panel-title"><div><button type="button" className="sidebar-toggle"
            aria-expanded="true" aria-label={t("收起项目栏")} title={t("收起项目栏")} onClick={() => setSidebarCollapsed(true)}>‹</button>
            <strong>{t("项目与集团")}</strong></div><span>{store.projects.length + store.groups.length}</span></div>
            <label className="search-field"><span aria-hidden="true">⌕</span><input value={search}
              onChange={(event) => setSearch(event.target.value)} placeholder={t("搜索项目、集团或负责人")}
              aria-label={t("搜索项目、集团或负责人")} /></label>
            <div className="filter-tabs" role="tablist" aria-label={t("项目状态")}>{[["active", "进行中"], ["completed", "已完成"],
              ["all", "全部"], ["archived", "归档"]].map(([value, label]) => <button type="button" role="tab" key={value}
                aria-selected={filter === value} onClick={() => setFilter(value)}>{t(label)}</button>)}</div></div>
          <section className="sample-shelf" aria-label={t("Sample 范本库")}>
            <div className="sample-kind-tabs"><button type="button" aria-selected={sampleShelfType === "project"}
              onClick={() => setSampleShelfType("project")}>{t("公司 Sample")}</button><button type="button"
                aria-selected={sampleShelfType === "group"} onClick={() => setSampleShelfType("group")}>{t("集团 Sample")}</button></div>
            {shelfSample ? <div className="sample-shelf-card"><span className="sample-mark" aria-hidden="true">{sampleShelfType === "group" ? "G" : "S"}</span>
              <div><strong>{shelfSample.name}</strong><span>{t("{nodes} 个节点 · {conditions} 项条件",
                { nodes: shelfSample.nodes.length, conditions: shelfConditions })}</span></div></div>
              : <div className="sample-shelf-card sample-shelf-empty"><span className="sample-mark">{sampleShelfType === "group" ? "G" : "S"}</span>
                <div><strong>{t("未选择 Sample")}</strong><span>{t("请先建立或选择一个范本")}</span></div></div>}
            <div className="sample-shelf-actions"><button type="button" onClick={() => setModal({
              type: sampleShelfType === "group" ? "group-sample-library" : "sample-library" })}>{t("管理范本库")}</button>
              <button type="button" disabled={!shelfSample} onClick={() => setModal({
                type: sampleShelfType === "group" ? "create-group" : "create-project", source: "sample" })}>{t("使用此 Sample")}</button></div>
          </section>
          <WorkspaceTree store={store} selection={selection} onSelect={setSelection} search={search} filter={filter}
            statuses={store.outstandingStatuses} />
        </>}
      </aside>
      <section className="project-detail" aria-label={t("项目详情")}>
        {selectedProject ? <ProjectDetail project={selectedProject} outstandingStatuses={outstandingStatusViews}
          updateProject={updateProject} setModal={setModal} notify={notify} duplicateProject={duplicateProject} />
          : selectedGroup ? <GroupDetail store={store} group={selectedGroup} statuses={outstandingStatusViews}
            updateGroup={updateGroup} setModal={setModal} setSelection={setSelection} notify={notify} />
            : <div className="detail-empty"><span className="empty-mark">◎</span><h2>{t("选择一个项目或集团")}</h2>
              <p>{t("项目进度、集团合并就绪和待清事项会显示在这里。")}</p></div>}
      </section>
    </section>

    {modal?.type === "create-project" && <Modal title={t(modal.source === "sample" ? "使用 Sample 建立项目" : "新建审计项目")}
      onClose={() => setModal(null)}><ProjectForm allowTemplate={modal.source !== "sample" && Boolean(selectedSample)}
        sampleName={selectedSample?.name || t("未选择 Sample")} onSubmit={createProject} onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "create-group" && <Modal title={t(modal.parentGroupId ? "新建子集团" : modal.source === "sample"
      ? "使用集团 Sample 建立集团" : "新建集团")} onClose={() => setModal(null)}><GroupForm
        allowTemplate={modal.source !== "sample" && Boolean(selectedGroupSample)} sampleName={selectedGroupSample?.name || t("未选择 Sample")}
        onSubmit={createGroup} onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "edit-project" && selectedProject && <Modal title={t("编辑项目资料")} onClose={() => setModal(null)}>
      <ProjectForm initial={selectedProject} allowTemplate={false} submitLabel="保存修改" onClose={() => setModal(null)}
        onSubmit={(values) => { updateProject(selectedProject.id, (project) => ({ ...project, ...values }));
          setModal(null); notify(t("项目资料已更新")); }} /></Modal>}
    {modal?.type === "edit-group" && selectedGroup && <Modal title={t("编辑集团资料")} onClose={() => setModal(null)}>
      <GroupForm initial={selectedGroup} allowTemplate={false} onClose={() => setModal(null)} onSubmit={(values) => {
        updateGroup(selectedGroup.id, (group) => ({ ...group, ...values,
          nodes: values.consolidationEnabled && !group.consolidationEnabled && !group.nodes.length && selectedGroupSample
            ? selectedGroupSample.nodes.map((node) => makeNode({ title: node.title, description: node.description,
              conditions: node.conditions.map((condition) => condition.label) })) : group.nodes,
        })); setModal(null); notify(t("集团资料已更新"));
      }} /></Modal>}

    {modal?.type === "member-add" && selectedGroupSource && <Modal title={t("加入公司或子集团")} onClose={() => setModal(null)}>
      <GroupMemberAddForm availableProjects={store.projects.filter((project) => !findParentMembership(store, "project", project.id))}
        availableGroups={store.groups.filter((group) => canNestGroup(store, selectedGroupSource.id, group.id))}
        onLink={(values) => linkMember(selectedGroupSource.id, values)}
        onCreateProject={() => setModal({ type: "create-project", parentGroupId: selectedGroupSource.id })}
        onCreateGroup={() => setModal({ type: "create-group", parentGroupId: selectedGroupSource.id })}
        onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "member-edit" && (() => {
      const sourceGroup = store.groups.find((group) => group.id === modal.groupId);
      const member = sourceGroup?.members.find((item) => item.id === modal.memberId);
      if (!sourceGroup || !member) return null;
      return <Modal title={t("组成部分设置")} onClose={() => setModal(null)}><GroupMemberForm member={member}
        groupSample={selectedGroupSample || createDefaultGroupSample()} onClose={() => setModal(null)}
        onSubmit={(saved) => { updateGroup(sourceGroup.id, (group) => ({ ...group,
          members: group.members.map((item) => item.id === saved.id ? saved : item) }));
          setModal(null); notify(t("组成部分设置已更新")); }}
        onRemove={() => { if (!window.confirm(t("将这个组成部分移出集团？项目本身不会被删除。"))) return;
          updateGroup(sourceGroup.id, (group) => ({ ...group, members: group.members.filter((item) => item.id !== member.id) }));
          setModal(null); notify(t("组成部分已移出集团")); }} /></Modal>;
    })()}

    {modal?.type === "node" && modalTarget && <Modal title={t(modal.node ? "编辑节点" : "添加节点")} onClose={() => setModal(null)}>
      <NodeForm initial={modal.node} onClose={() => setModal(null)} onSubmit={(values) => {
        updateTarget(modalTargetKind, modalTargetId, (target) => ({ ...target, nodes: modal.node
          ? target.nodes.map((node) => node.id === modal.node.id ? { ...node, ...values } : node)
          : [...target.nodes, makeNode(values)] }));
        setModal(null); notify(t(modal.node ? "节点已更新" : "节点已添加"));
      }} /></Modal>}
    {modal?.type === "condition" && modalTarget && <Modal title={t(modal.condition ? "修改完成条件" : "添加完成条件")}
      onClose={() => setModal(null)}><ConditionForm initial={modal.condition?.label} onClose={() => setModal(null)} onSubmit={(label) => {
        updateTarget(modalTargetKind, modalTargetId, (target) => ({ ...target, nodes: target.nodes.map((node) => node.id !== modal.nodeId
          ? node : { ...node, conditions: modal.condition ? node.conditions.map((condition) => condition.id === modal.condition.id
            ? { ...condition, label } : condition) : [...node.conditions, { id: uid("condition"), label, done: false }] }) }));
        setModal(null); notify(t(modal.condition ? "条件已修改" : "条件已添加"));
      }} /></Modal>}
    {modal?.type === "outstanding" && modalTarget && <Modal title={t(modal.item ? "编辑待清事项" : "添加待清事项")}
      onClose={() => setModal(null)}><OutstandingForm initial={modal.item} statuses={outstandingStatusViews} onClose={() => setModal(null)}
        onSubmit={(values) => { updateTarget(modalTargetKind, modalTargetId, (target) => ({ ...target,
          outstandingItems: modal.item ? target.outstandingItems.map((item) => item.id === modal.item.id
            ? { ...item, ...values, updatedAt: new Date().toISOString() } : item)
            : [...target.outstandingItems, makeOutstandingItem(values, store.outstandingStatuses)] }));
          setModal(null); notify(t(modal.item ? "待清事项已更新" : "待清事项已添加")); }} /></Modal>}

    {modal?.type === "sample-library" && <Modal wide title={t("Sample 范本库")} onClose={() => setModal(null)}>
      <SampleLibrary samples={sampleViews} selectedSampleId={store.selectedSampleId}
        onSelect={(sampleId) => setStore((current) => ({ ...current, selectedSampleId: sampleId }))}
        onCreate={() => setModal({ type: "sample-edit", sample: makeBlankSample(language) })}
        onEdit={(sampleId) => setModal({ type: "sample-edit", sampleId })} onDuplicate={copySample} onDelete={deleteSample}
        onUse={(sampleId) => { setStore((current) => ({ ...current, selectedSampleId: sampleId }));
          setModal({ type: "create-project", source: "sample" }); }} /></Modal>}
    {modal?.type === "sample-edit" && editingSample && <Modal wide title={`${t(modal.sample ? "新建 Sample" : "编辑 Sample")} · ${editingSample.name}`}
      onClose={() => setModal({ type: "sample-library" })}><SampleEditor key={`${editingSample.id}-${editingSample.updatedAt}-${language}`}
        sample={editingSample} onSave={saveSample} onClose={() => setModal({ type: "sample-library" })}
        onReset={editingSample.builtinKey ? () => resetSample(editingSample.id) : null}
        onRedact={modal.sample ? null : () => setModal({ type: "sample-redact", sampleId: editingSample.id })} /></Modal>}
    {modal?.type === "sample-redact" && <Modal title={t("Sample 公司去敏")}
      onClose={() => setModal({ type: "sample-edit", sampleId: modal.sampleId })}><SampleRedactionForm language={language}
        onSubmit={(names, replacement) => redactSample(modal.sampleId, names, replacement)}
        onClose={() => setModal({ type: "sample-edit", sampleId: modal.sampleId })} /></Modal>}

    {modal?.type === "group-sample-library" && <Modal wide title={t("集团 Sample 范本库")} onClose={() => setModal(null)}>
      <GroupSampleLibrary samples={groupSampleViews} selectedSampleId={store.selectedGroupSampleId}
        onSelect={(sampleId) => setStore((current) => ({ ...current, selectedGroupSampleId: sampleId }))}
        onCreate={() => setModal({ type: "group-sample-edit", sample: makeBlankGroupSample(language) })}
        onEdit={(sampleId) => setModal({ type: "group-sample-edit", sampleId })}
        onDuplicate={(sampleId) => copySample(sampleId, true)} onDelete={(sampleId) => deleteSample(sampleId, true)}
        onUse={(sampleId) => { setStore((current) => ({ ...current, selectedGroupSampleId: sampleId }));
          setModal({ type: "create-group", source: "sample" }); }} /></Modal>}
    {modal?.type === "group-sample-edit" && editingGroupSample && <Modal wide
      title={`${t(modal.sample ? "新建集团 Sample" : "编辑集团 Sample")} · ${editingGroupSample.name}`}
      onClose={() => setModal({ type: "group-sample-library" })}><GroupSampleEditor
        key={`${editingGroupSample.id}-${editingGroupSample.updatedAt}-${language}`} sample={editingGroupSample}
        onSave={saveGroupSample} onClose={() => setModal({ type: "group-sample-library" })}
        onReset={editingGroupSample.builtinKey ? () => resetSample(editingGroupSample.id, true) : null} /></Modal>}

    {modal?.type === "outstanding-statuses" && <Modal wide title={t("自定义待清状态")} onClose={() => setModal(null)}>
      <OutstandingStatusEditor key={language} statuses={outstandingStatusViews} usageCounts={outstandingStatusUsage}
        onClose={() => setModal(null)} onSave={(statuses) => { setStore((current) => ({ ...current, outstandingStatuses: statuses }));
          setModal(null); notify(t("待清状态已更新")); }} /></Modal>}
  </article>;
}

function SampleRedactionForm({ language, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [names, setNames] = React.useState("");
  const [replacement, setReplacement] = React.useState(language === "en" ? "[Company Name]" : "[公司名称]");
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    const exactNames = names.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    if (exactNames.length && replacement.trim()) onSubmit(exactNames, replacement.trim());
  }}><label><span>{t("公司全名（每行一个）*")}</span><textarea autoFocus required rows="5" value={names}
    onChange={(event) => setNames(event.target.value)} placeholder={t("例如：示例航运有限公司")} />
    <small className="form-help">{t("仅替换你输入的完整名称，不会自动猜测公司名称。")}</small></label>
    <label><span>{t("替换为")}</span><input required value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("开始去敏")}</button></footer></form>;
}

function ConditionForm({ initial = "", onSubmit, onClose }) {
  const { t } = useUiLanguage(); const [label, setLabel] = React.useState(initial);
  return <form className="workbench-form" onSubmit={(event) => { event.preventDefault(); if (label.trim()) onSubmit(label.trim()); }}>
    <label><span>{t("达成条件 *")}</span><input autoFocus required value={label} onChange={(event) => setLabel(event.target.value)}
      placeholder={t("例如：管理层声明书已签署")} /></label><footer className="modal-actions">
      <button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存条件")}</button></footer></form>;
}

function OutstandingForm({ initial, statuses, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({ title: initial?.title || "",
    status: initial?.status || statuses.find((status) => !status.closed)?.id || statuses[0]?.id || "", note: initial?.note || "" }));
  return <form className="workbench-form" onSubmit={(event) => { event.preventDefault();
    if (values.title.trim()) onSubmit({ ...values, title: values.title.trim(), note: values.note.trim() }); }}>
    <label><span>{t("待清事项 *")}</span><input autoFocus required value={values.title}
      onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
      placeholder={t("例如：尚欠银行月结单")} /></label>
    <label><span>{t("当前状态")}</span><select value={values.status}
      onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}>{statuses.map((status) =>
        <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
    <label><span>{t("说明")}</span><textarea rows="3" value={values.note}
      onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
      placeholder={t("可记录所欠期间、已跟进日期或签署文件名称")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存待清事项")}</button></footer></form>;
}

function OutstandingPanel({ project, statuses, updateProject, setModal, notify }) {
  const { t } = useUiLanguage(); const items = project.outstandingItems || [];
  const openItems = items.filter((item) => outstandingIsOpen(item, statuses));
  const sortedItems = [...items].sort((left, right) => outstandingIsOpen(left, statuses) === outstandingIsOpen(right, statuses)
    ? (right.updatedAt || "").localeCompare(left.updatedAt || "") : outstandingIsOpen(left, statuses) ? -1 : 1);
  const changeStatus = (itemId, status) => { updateProject(project.id, (current) => ({ ...current,
    outstandingItems: current.outstandingItems.map((item) => item.id === itemId
      ? { ...item, status, updatedAt: new Date().toISOString() } : item) }));
    notify(t(statuses.find((item) => item.id === status)?.closed ? "待清事项已标记为解决" : "待清事项状态已更新")); };
  return <section className="outstanding-panel"><header className="outstanding-header"><div><div className="outstanding-title"><h3>{t("待清事项")}</h3>
    <span data-empty={!openItems.length || undefined}>{t("{count} 项未清", { count: openItems.length })}</span></div>
    <p>{t("独立追踪缺少文件、客户签署及其他阻塞事项，不计入节点进度。")}</p></div>
    <div className="outstanding-header-actions"><button type="button" className="button secondary"
      onClick={() => setModal({ type: "outstanding-statuses" })}>{t("管理状态")}</button><button type="button" className="button secondary"
        onClick={() => setModal({ type: "outstanding", targetKind: "project", targetId: project.id })}>{t("＋ 添加待清事项")}</button></div></header>
    <div className="outstanding-status-strip">{statuses.map((status) => <span key={status.id} data-tone={status.tone}
      data-closed={status.closed || undefined}><i />{status.label}<strong>{items.filter((item) => item.status === status.id).length}</strong></span>)}</div>
    {sortedItems.length ? <div className="outstanding-list">{sortedItems.map((item) => <div className="outstanding-row"
      data-closed={!outstandingIsOpen(item, statuses) || undefined} key={item.id}><div className="outstanding-item-copy"><strong>{item.title}</strong>
        {item.note && <small>{item.note}</small>}</div><select value={item.status} onChange={(event) => changeStatus(item.id, event.target.value)}>
        {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
      <div className="outstanding-actions"><button type="button" onClick={() => setModal({ type: "outstanding", targetKind: "project",
        targetId: project.id, item })}>{t("编辑")}</button><button type="button" onClick={() => window.confirm(t("删除待清事项“{name}”？", { name: item.title }))
          && updateProject(project.id, (current) => ({ ...current,
            outstandingItems: current.outstandingItems.filter((entry) => entry.id !== item.id) }))}>{t("删除")}</button></div></div>)}</div>
      : <div className="outstanding-empty"><strong>{t("目前没有待清事项")}</strong><span>{t("出现缺文件或等待签署时，可在这里随时添加。")}</span></div>}
  </section>;
}

function GroupOutstandingPanel({ store, group, statuses, updateGroup, setModal, setSelection, notify }) {
  const { t } = useUiLanguage();
  const entries = collectGroupOutstandingEntries(store, group.id).sort((left, right) => {
    const leftOpen = outstandingIsOpen(left.item, statuses); const rightOpen = outstandingIsOpen(right.item, statuses);
    return leftOpen === rightOpen ? (right.item.updatedAt || "").localeCompare(left.item.updatedAt || "") : leftOpen ? -1 : 1;
  });
  const openItems = entries.filter((entry) => outstandingIsOpen(entry.item, statuses));
  const changeOwnStatus = (itemId, status) => { updateGroup(group.id, (current) => ({ ...current,
    outstandingItems: current.outstandingItems.map((item) => item.id === itemId
      ? { ...item, status, updatedAt: new Date().toISOString() } : item) })); notify(t("待清事项状态已更新")); };
  return <section className="outstanding-panel group-outstanding-panel"><header className="outstanding-header"><div>
    <div className="outstanding-title"><h3>{t("集团待清事项")}</h3><span data-empty={!openItems.length || undefined}>{t("{count} 项未清", { count: openItems.length })}</span></div>
    <p>{t("本级可新增合并事项；下方同时汇总所有公司和子集团的事项。")}</p></div>
    <div className="outstanding-header-actions"><button type="button" className="button secondary"
      onClick={() => setModal({ type: "outstanding-statuses" })}>{t("管理状态")}</button><button type="button" className="button secondary"
        onClick={() => setModal({ type: "outstanding", targetKind: "group", targetId: group.id })}>{t("＋ 添加集团事项")}</button></div></header>
    <div className="outstanding-status-strip">{statuses.map((status) => <span key={status.id} data-tone={status.tone}
      data-closed={status.closed || undefined}><i />{status.label}<strong>{entries.filter((entry) => entry.item.status === status.id).length}</strong></span>)}</div>
    {entries.length ? <div className="outstanding-list">{entries.map((entry) => {
      const own = entry.sourceType === "group" && entry.sourceId === group.id;
      return <div className="outstanding-row group-outstanding-row" data-closed={!outstandingIsOpen(entry.item, statuses) || undefined}
        key={`${entry.sourceType}-${entry.sourceId}-${entry.item.id}`}><div className="outstanding-item-copy"><strong>{entry.item.title}</strong>
          <small className="outstanding-origin">{t("来源：{name}", { name: entry.sourceName })}</small>{entry.item.note && <small>{entry.item.note}</small>}</div>
        {own ? <select value={entry.item.status} onChange={(event) => changeOwnStatus(entry.item.id, event.target.value)}>{statuses.map((status) =>
          <option key={status.id} value={status.id}>{status.label}</option>)}</select> : <span className="rollup-status">{statuses.find((status) => status.id === entry.item.status)?.label}</span>}
        <div className="outstanding-actions">{own ? <><button type="button" onClick={() => setModal({ type: "outstanding", targetKind: "group",
          targetId: group.id, item: entry.item })}>{t("编辑")}</button><button type="button" onClick={() => window.confirm(t("删除待清事项“{name}”？", { name: entry.item.title }))
            && updateGroup(group.id, (current) => ({ ...current,
              outstandingItems: current.outstandingItems.filter((item) => item.id !== entry.item.id) }))}>{t("删除")}</button></>
          : <button type="button" onClick={() => setSelection({ kind: entry.sourceType, id: entry.sourceId })}>{t("打开来源")}</button>}</div></div>;
    })}</div> : <div className="outstanding-empty"><strong>{t("目前没有待清事项")}</strong><span>{t("集团及下级公司出现阻塞时，会集中显示在这里。")}</span></div>}
  </section>;
}

function WorkflowNodes({ target, targetKind, updateTarget, setModal }) {
  const { t } = useUiLanguage(); const currentNode = target.nodes.find((node) => !nodeIsComplete(node));
  const updateNodes = (updater) => updateTarget(target.id, (current) => ({ ...current, nodes: updater(current.nodes) }));
  return <><div className="nodes-heading"><div><h3>{t(targetKind === "group" ? "合并流程节点" : "项目节点")}</h3>
    <p>{t("勾选全部条件后，节点会自动完成。")}</p></div><button type="button" className="button primary"
      onClick={() => setModal({ type: "node", targetKind, targetId: target.id })}>{t("＋ 添加节点")}</button></div>
    <div className="node-list">{target.nodes.map((node, index) => <NodeCard key={node.id} node={node} index={index}
      total={target.nodes.length} isCurrent={node.id === currentNode?.id} actions={{
        toggle: (conditionId) => updateNodes((nodes) => nodes.map((item) => item.id !== node.id ? item
          : { ...item, conditions: item.conditions.map((condition) => condition.id === conditionId
            ? { ...condition, done: !condition.done } : condition) })),
        addCondition: () => setModal({ type: "condition", targetKind, targetId: target.id, nodeId: node.id }),
        editCondition: (condition) => setModal({ type: "condition", targetKind, targetId: target.id, nodeId: node.id, condition }),
        deleteCondition: (conditionId) => window.confirm(t("删除这个完成条件？")) && updateNodes((nodes) => nodes.map((item) => item.id !== node.id
          ? item : { ...item, conditions: item.conditions.filter((condition) => condition.id !== conditionId) })),
        editNode: () => setModal({ type: "node", targetKind, targetId: target.id, node }),
        move: (direction) => updateNodes((nodes) => { const next = [...nodes]; const indexTarget = index + direction;
          if (indexTarget >= 0 && indexTarget < next.length) [next[index], next[indexTarget]] = [next[indexTarget], next[index]]; return next; }),
        deleteNode: () => window.confirm(t("删除节点“{name}”及其所有条件？", { name: node.title }))
          && updateNodes((nodes) => nodes.filter((item) => item.id !== node.id)),
      }} />)}{!target.nodes.length && <div className="nodes-empty"><span>{t("还没有项目节点")}</span>
        <p>{t("添加第一个节点，并设置它需要达成的条件。")}</p><button type="button" className="button primary"
          onClick={() => setModal({ type: "node", targetKind, targetId: target.id })}>{t("添加节点")}</button></div>}</div></>;
}

function ProjectDetail({ project, outstandingStatuses, updateProject, setModal, notify, duplicateProject }) {
  const { language, t } = useUiLanguage(); const stats = projectStats(project);
  const currentNode = project.nodes.find((node) => !nodeIsComplete(node));
  const nextCondition = currentNode?.conditions.find((condition) => !condition.done);
  return <><header className="detail-header"><div><span className="detail-kicker">{t(project.archived ? "已归档项目" : "审计项目")}</span>
    <h2>{project.name}</h2><p>{[project.entity, project.period, project.owner].filter(Boolean).join(" · ") || t("尚未填写实体和报告期间")}</p></div>
    <div className="detail-actions"><button type="button" className="button secondary" onClick={() => duplicateProject(project)}>{t("复制流程")}</button>
      <button type="button" className="button secondary" onClick={() => setModal({ type: "edit-project" })}>{t("编辑项目")}</button>
      <button type="button" className="button secondary" onClick={() => { updateProject(project.id, (current) => ({ ...current, archived: !current.archived }));
        notify(t(project.archived ? "项目已恢复" : "项目已归档")); }}>{t(project.archived ? "恢复项目" : "归档项目")}</button></div></header>
    <div className="project-overview"><div className="overview-progress"><div><span>{t("整体进度")}</span><strong>{stats.percentage}%</strong></div>
      <ProgressBar value={stats.percentage} /><small>{t("{done} / {total} 个节点完成 · {criteriaDone} / {criteriaTotal} 项条件达成",
        { done: stats.completedNodes, total: stats.nodes, criteriaDone: stats.completedConditions, criteriaTotal: stats.conditions })}</small></div>
      <div className="next-action"><span>{t(stats.percentage === 100 && stats.nodes ? "项目状态" : "下一项条件")}</span>
        <strong>{stats.percentage === 100 && stats.nodes ? t("所有节点已经完成")
          : nextCondition?.label || t(currentNode ? "请为当前节点添加完成条件" : "请先添加项目节点")}</strong>
        <small>{currentNode ? t("当前节点：{name}", { name: currentNode.title }) : formatDate(project.dueDate, language)}</small></div></div>
    <OutstandingPanel project={project} statuses={outstandingStatuses} updateProject={updateProject} setModal={setModal} notify={notify} />
    {project.notes && <div className="project-note"><strong>{t("项目备注")}</strong><p>{project.notes}</p></div>}
    <WorkflowNodes target={project} targetKind="project" updateTarget={updateProject} setModal={setModal} /></>;
}

function GroupDetail({ store, group, statuses, updateGroup, setModal, setSelection, notify }) {
  const { language, t } = useUiLanguage(); const [tab, setTab] = React.useState("overview");
  React.useEffect(() => setTab("overview"), [group.id]);
  const stats = groupProgress(store, group.id);
  const openOutstanding = collectGroupOutstandingEntries(store, group.id).filter((entry) => outstandingIsOpen(entry.item, statuses)).length;
  return <><header className="detail-header group-detail-header"><div><span className="detail-kicker">{t(group.archived ? "已归档集团" : "集团审计")}</span>
    <h2>{group.name}</h2><p>{[group.period, group.owner, t(group.consolidationEnabled ? "本级需要合并" : "仅作分类")].filter(Boolean).join(" · ")}</p></div>
    <div className="detail-actions"><button type="button" className="button secondary" onClick={() => setModal({ type: "member-add" })}>{t("＋ 加入组成部分")}</button>
      <button type="button" className="button secondary" onClick={() => setModal({ type: "edit-group" })}>{t("编辑集团")}</button>
      <button type="button" className="button secondary" onClick={() => { updateGroup(group.id, (current) => ({ ...current, archived: !current.archived }));
        notify(t(group.archived ? "集团已恢复" : "集团已归档")); }}>{t(group.archived ? "恢复集团" : "归档集团")}</button></div></header>
    <section className="group-scorecards"><article><span>{t("集团整体进度")}</span><strong>{stats.percentage}%</strong><ProgressBar value={stats.percentage} compact /></article>
      <article><span>{t("公司平均进度 · 70%")}</span><strong>{stats.componentPercentage}%</strong><ProgressBar value={stats.componentPercentage} compact /></article>
      <article><span>{t(group.consolidationEnabled ? "合并流程 · 30%" : "合并流程")}</span><strong>{group.consolidationEnabled ? `${stats.consolidationPercentage}%` : "—"}</strong>
        <small>{t(group.consolidationEnabled ? "计入整体进度" : "本级不设合并流程")}</small></article>
      <article><span>{t("公司合并就绪")}</span><strong>{stats.readyCompanies}<small> / {stats.totalCompanies}</small></strong>
        <small>{t(stats.ready ? "本级已具备合并条件" : "仍有前置条件未完成")}</small></article>
      <article><span>{t("未清事项")}</span><strong>{openOutstanding}</strong><small>{t("集团及所有下级")}</small></article></section>
    <nav className="group-tabs" aria-label={t("集团工作区")}>{[["overview", "总览"], ["workflow", "合并流程"],
      ["outstanding", "待清事项"], ["settings", "集团设置"]].map(([value, label]) => <button type="button" key={value}
        aria-selected={tab === value} onClick={() => setTab(value)}>{t(label)}</button>)}</nav>
    {tab === "overview" && <><GroupMatrix store={store} group={group} statuses={statuses}
      onOpen={(kind, id) => setSelection({ kind, id })} onConfigure={(groupId, member) => setModal({ type: "member-edit",
        groupId, memberId: member.id })} />{group.notes && <div className="project-note"><strong>{t("集团备注")}</strong><p>{group.notes}</p></div>}</>}
    {tab === "workflow" && (group.consolidationEnabled
      ? <WorkflowNodes target={group} targetKind="group" updateTarget={updateGroup} setModal={setModal} />
      : <div className="classification-notice"><strong>{t("本级只作分类")}</strong>
        <p>{t("整体进度直接汇总下级成员，不应用30%的合并流程权重。需要时可在集团设置中开启合并流程。")}</p></div>)}
    {tab === "outstanding" && <GroupOutstandingPanel store={store} group={group} statuses={statuses}
      updateGroup={updateGroup} setModal={setModal} setSelection={setSelection} notify={notify} />}
    {tab === "settings" && <section className="group-settings-panel"><header className="group-section-header"><div><h3>{t("集团结构设置")}</h3>
      <p>{t("管理集团资料和成员；移出成员不会删除原项目。")}</p></div><button type="button" className="button primary"
        onClick={() => setModal({ type: "member-add" })}>{t("＋ 加入公司或子集团")}</button></header>
      <dl><div><dt>{t("集团负责人")}</dt><dd>{group.owner || "—"}</dd></div><div><dt>{t("报告期间")}</dt><dd>{group.period || "—"}</dd></div>
        <div><dt>{t("目标完成日期")}</dt><dd>{formatDate(group.dueDate, language)}</dd></div><div><dt>{t("本级模式")}</dt>
          <dd>{t(group.consolidationEnabled ? "需要合并" : "仅作分类")}</dd></div></dl>
      <div className="settings-member-list">{group.members.map((member) => {
        const target = member.kind === "group" ? store.groups.find((item) => item.id === member.refId) : store.projects.find((item) => item.id === member.refId);
        return target ? <button type="button" key={member.id} onClick={() => setModal({ type: "member-edit", groupId: group.id,
          memberId: member.id })}><span>{member.kind === "group" ? "G" : "C"}</span><strong>{target.name}</strong><small>{member.role || t("未设置角色")}</small></button> : null;
      })}</div></section>}
  </>;
}
