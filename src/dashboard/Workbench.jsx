import React from "react";
import { Archive, ArchiveRestore, BookOpen, Building, Building2, Copy, DatabaseBackup, Languages, LibraryBig, ListPlus, Palette,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Modal, NodeBoard, NodeForm, OutstandingStatusEditor, ProgressBar, ProjectForm, SampleEditor,
  SampleLibrary, UserGuide, WorkstreamCard, WorkstreamCategoryEditor, WorkstreamForm } from "./components.jsx";
import { GroupForm, GroupMatrix, GroupMemberAddForm, GroupMemberForm, GroupSampleEditor, GroupSampleLibrary,
  WorkspaceTree } from "./group-components.jsx";
import { STORAGE_KEY, activeOutstandingItems,
  assignProjectToGroup, canMoveWorkspaceItem, canNestGroup, collectGroupOutstandingEntries, createDefaultGroupSample, createDefaultSample, duplicateGroupSample,
  duplicateSample, emptyStore, findParentMembership, formatDate, groupProgress, isValidStore, loadStore, localizeGroupSample,
  localizeGroupWorkflowNodes, localizeOutstandingStatuses, localizeReadinessConditions, localizeSample, localizeWorkstream, makeBlankGroupSample,
  makeBlankSample, makeGroup, makeGroupMember, makeNode, makeOutstandingItem, makeProject, makeWorkstream, moveWorkspaceItem,
  normalizeStore, outstandingIsOpen, projectStats, redactSampleCompanies, reportingPeriodLabel, uid, workstreamStats,
  workstreamCategoryLabel, workstreamTypeLabel } from "./model.js";
import { LanguageProvider, useUiLanguage } from "./i18n.jsx";
import "./dashboard.css";

const SIDEBAR_PREFERENCE_KEY = "audit-progress-workbench:sidebar-collapsed";
const OUTSTANDING_PREFERENCE_KEY = "audit-progress-workbench:outstanding-collapsed";

export function DashboardContent() {
  return <LanguageProvider><DashboardWorkbench /></LanguageProvider>;
}

function DashboardWorkbench() {
  const { language, setLanguage, t } = useUiLanguage();
  const [store, setStore] = React.useState(loadStore);
  const [selection, setSelection] = React.useState(null);
  const [activeWorkstreamId, setActiveWorkstreamId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("active");
  const [templateType, setTemplateType] = React.useState("audit");
  const [modal, setModal] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true"; } catch { return false; }
  });
  const [outstandingCollapsed, setOutstandingCollapsed] = React.useState(() => {
    try { return localStorage.getItem(OUTSTANDING_PREFERENCE_KEY) === "true"; } catch { return false; }
  });
  const [compactLayout, setCompactLayout] = React.useState(() => {
    try { return window.matchMedia("(max-width: 1399px)").matches; } catch { return false; }
  });
  const [compactOutstandingOpen, setCompactOutstandingOpen] = React.useState(false);
  const importRef = React.useRef(null);
  const toolbarRef = React.useRef(null);
  const toolbarMenuRefs = React.useRef([]);
  const closeMenu = React.useCallback(() => toolbarMenuRefs.current.forEach((menu) => {
    if (menu) menu.open = false;
  }), []);
  const closeOtherMenus = React.useCallback((index) => {
    toolbarMenuRefs.current.forEach((menu, itemIndex) => {
      if (menu && itemIndex !== index) menu.open = false;
    });
  }, []);

  React.useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(store)), [store]);
  React.useEffect(() => {
    try { localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed)); } catch { /* optional */ }
  }, [sidebarCollapsed]);
  React.useEffect(() => {
    try { localStorage.setItem(OUTSTANDING_PREFERENCE_KEY, String(outstandingCollapsed)); } catch { /* optional */ }
  }, [outstandingCollapsed]);
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 1399px)");
    const updateCompactLayout = (event) => {
      setCompactLayout(event.matches);
      if (!event.matches) setCompactOutstandingOpen(false);
    };
    updateCompactLayout(query);
    query.addEventListener?.("change", updateCompactLayout);
    return () => query.removeEventListener?.("change", updateCompactLayout);
  }, []);
  React.useEffect(() => {
    const matchesFilter = (item, kind) => {
      if (filter === "archived") return item.archived;
      if (item.archived) return false;
      const complete = kind === "group" ? groupProgress(store, item.id).ready : projectStats(item).complete;
      if (filter === "completed") return complete;
      if (filter === "active") return !complete;
      return true;
    };
    const selectedItem = selection?.kind === "group" ? store.groups.find((group) => group.id === selection.id)
      : selection?.kind === "project" ? store.projects.find((project) => project.id === selection.id) : null;
    if (!selectedItem || !matchesFilter(selectedItem, selection.kind)) {
      const group = store.groups.find((item) => matchesFilter(item, "group"));
      const project = store.projects.find((item) => matchesFilter(item, "project"));
      setSelection(group ? { kind: "group", id: group.id } : project ? { kind: "project", id: project.id } : null);
    }
  }, [store, selection, filter]);
  React.useEffect(() => {
    if (selection?.kind !== "project") { setActiveWorkstreamId(null); return; }
    const project = store.projects.find((item) => item.id === selection.id);
    if (!project?.workstreams.some((workstream) => workstream.id === activeWorkstreamId)) {
      setActiveWorkstreamId(project?.workstreams.find((workstream) => workstream.type === "audit")?.id
        || project?.workstreams[0]?.id || null);
    }
  }, [selection, store.projects, activeWorkstreamId]);
  React.useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);
  React.useEffect(() => {
    const dismissMenus = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && toolbarRef.current?.contains(event.target)) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", dismissMenus);
    document.addEventListener("keydown", dismissMenus);
    return () => {
      document.removeEventListener("pointerdown", dismissMenus);
      document.removeEventListener("keydown", dismissMenus);
    };
  }, [closeMenu]);

  const notify = (text) => setMessage(text);
  const selectedProjectSource = selection?.kind === "project"
    ? store.projects.find((project) => project.id === selection.id) || null : null;
  const selectedGroupSource = selection?.kind === "group"
    ? store.groups.find((group) => group.id === selection.id) || null : null;
  const selectedProjectMembership = selectedProjectSource
    ? findParentMembership(store, "project", selectedProjectSource.id) : null;
  const selectedProject = selectedProjectSource ? { ...selectedProjectSource,
    workstreams: selectedProjectSource.workstreams.map((workstream) => localizeWorkstream(workstream, language)) } : null;
  const selectedGroup = selectedGroupSource ? { ...selectedGroupSource,
    nodes: localizeGroupWorkflowNodes(selectedGroupSource.nodes, language) } : null;
  const sampleViews = store.samples.map((sample) => localizeSample(sample, language));
  const workstreamCategoryViews = store.workstreamCategories.map((category) => ({ ...category,
    label: workstreamCategoryLabel(category, language) }));
  const groupSampleViews = store.groupSamples.map((sample) => localizeGroupSample(sample, language));
  const selectedGroupSample = groupSampleViews.find((sample) => sample.id === store.selectedGroupSampleId)
    || groupSampleViews[0] || null;
  const outstandingStatusViews = localizeOutstandingStatuses(store.outstandingStatuses, language);
  const allOutstandingItems = [...store.projects, ...store.groups].flatMap((item) => item.outstandingItems || []);
  const outstandingStatusUsage = allOutstandingItems.reduce((counts, item) => ({
    ...counts, [item.status]: (counts[item.status] || 0) + 1,
  }), {});
  const workstreamCategoryUsage = Object.fromEntries(store.workstreamCategories.map((category) => [category.id, {
    templates: store.samples.filter((sample) => sample.categoryId === category.id).length,
    workstreams: store.projects.reduce((count, project) => count
      + project.workstreams.filter((workstream) => workstream.categoryId === category.id).length, 0),
  }]));

  const updateProject = React.useCallback((projectId, updater) => setStore((current) => ({ ...current,
    projects: current.projects.map((project) => project.id === projectId
      ? { ...updater(project), updatedAt: new Date().toISOString() } : project),
  })), []);
  const updateGroup = React.useCallback((groupId, updater) => setStore((current) => ({ ...current,
    groups: current.groups.map((group) => group.id === groupId
      ? { ...updater(group), updatedAt: new Date().toISOString() } : group),
  })), []);
  const moveNavigationItem = (kind, refId, parentGroupId) => {
    if (!canMoveWorkspaceItem(store, kind, refId, parentGroupId)) {
      notify(t("无法移动到这个集团")); return;
    }
    const currentParentId = findParentMembership(store, kind, refId)?.group.id || "";
    if (currentParentId === parentGroupId) return;
    const source = kind === "project" ? store.projects.find((item) => item.id === refId)
      : store.groups.find((item) => item.id === refId);
    const target = store.groups.find((item) => item.id === parentGroupId);
    setStore((current) => {
      const groupSample = current.groupSamples.find((sample) => sample.id === current.selectedGroupSampleId)
        || current.groupSamples[0] || createDefaultGroupSample();
      return moveWorkspaceItem(current, kind, refId, parentGroupId, groupSample);
    });
    notify(target ? t("{name} 已移到“{group}”", { name: source?.name || "", group: target.name })
      : t("{name} 已移到顶层", { name: source?.name || "" }));
  };
  const updateWorkflowNodes = (targetKind, targetId, workstreamId, updater) => {
    if (targetKind === "group") updateGroup(targetId, (group) => ({ ...group, nodes: updater(group.nodes) }));
    else updateProject(targetId, (project) => ({ ...project, workstreams: project.workstreams.map((workstream) =>
      workstream.id === workstreamId ? { ...workstream, nodes: updater(workstream.nodes), updatedAt: new Date().toISOString() } : workstream) }));
  };

  const createProject = (values, useStarter) => {
    const project = makeProject(values, useStarter, store.samples, store.workstreamCategories);
    const parentGroupId = modal?.parentGroupId;
    setStore((current) => ({ ...current, projects: [project, ...current.projects],
      groups: parentGroupId ? current.groups.map((group) => group.id === parentGroupId
        ? { ...group, members: [...group.members, makeGroupMember({ kind: "project", refId: project.id,
          auditType: "internal_team", role: "" }, selectedGroupSample || createDefaultGroupSample())] } : group) : current.groups }));
    setSelection({ kind: "project", id: project.id }); setActiveWorkstreamId(project.workstreams[0]?.id || null);
    setFilter("active"); setModal(null); notify(t("项目已建立并自动保存"));
  };
  const createGroup = (values, useStarter) => {
    const group = makeGroup(values, Boolean(useStarter && selectedGroupSample), selectedGroupSample || createDefaultGroupSample());
    const parentGroupId = modal?.parentGroupId;
    setStore((current) => ({ ...current, groups: [group, ...current.groups.map((item) => item.id === parentGroupId
      ? { ...item, members: [...item.members, makeGroupMember({ kind: "group", refId: group.id, role: "" },
        selectedGroupSample || createDefaultGroupSample())] } : item)] }));
    setSelection({ kind: "group", id: group.id }); setFilter("active"); setModal(null); notify(t("集团已建立并自动保存"));
  };
  const duplicateProject = (project) => {
    const now = new Date().toISOString();
    const copy = { ...project, id: uid("project"), name: `${project.name}${t("（副本）")}`, archived: false,
      createdAt: now, updatedAt: now, outstandingItems: [], workstreams: project.workstreams.map((workstream) => makeWorkstream({
        type: workstream.type, categoryId: workstream.categoryId, customName: workstream.customName,
        owner: workstream.owner, dueDate: workstream.dueDate,
      }, workstream.nodes)) };
    setStore((current) => ({ ...current, projects: [copy, ...current.projects] }));
    setSelection({ kind: "project", id: copy.id }); setActiveWorkstreamId(copy.workstreams[0]?.id || null); setFilter("active");
    notify(t("已复制流程，所有完成状态已重置"));
  };
  const archiveTarget = (kind, id) => {
    (kind === "project" ? updateProject : updateGroup)(id, (item) => ({ ...item, archived: true }));
    setFilter("archived"); notify(t(kind === "project" ? "项目已归档" : "集团已归档"));
  };
  const restoreTarget = (kind, id) => {
    (kind === "project" ? updateProject : updateGroup)(id, (item) => ({ ...item, archived: false }));
    setFilter("active"); notify(t(kind === "project" ? "项目已恢复" : "集团已恢复"));
  };
  const permanentlyDeleteTarget = (kind, id) => {
    setStore((current) => kind === "project" ? { ...current,
      projects: current.projects.filter((project) => project.id !== id),
      groups: current.groups.map((group) => ({ ...group,
        members: group.members.filter((member) => !(member.kind === "project" && member.refId === id)) })) }
      : { ...current, groups: current.groups.filter((group) => group.id !== id).map((group) => ({ ...group,
        members: group.members.filter((member) => !(member.kind === "group" && member.refId === id)) })) });
    setSelection(null); setModal(null); notify(t(kind === "project" ? "项目已永久删除" : "集团已永久删除"));
  };

  const addWorkstream = (projectId, values) => {
    const sample = store.samples.find((item) => item.id === values.sampleId && item.categoryId === values.categoryId) || null;
    const workstream = makeWorkstream(values, sample);
    updateProject(projectId, (project) => ({ ...project, workstreams: [...project.workstreams, workstream] }));
    setActiveWorkstreamId(workstream.id); setModal(null); notify(t("业务模块已添加"));
  };
  const updateWorkstream = (projectId, workstreamId, values) => {
    updateProject(projectId, (project) => ({ ...project, workstreams: project.workstreams.map((workstream) =>
      workstream.id === workstreamId ? { ...workstream, customName: values.customName, owner: values.owner,
        dueDate: values.dueDate, updatedAt: new Date().toISOString() } : workstream) }));
    setModal(null); notify(t("业务模块已更新"));
  };
  const removeWorkstream = (projectId, workstreamId) => {
    const project = store.projects.find((item) => item.id === projectId);
    if (!project || project.workstreams.length <= 1) { window.alert(t("项目至少要保留一个业务模块。")); return; }
    if (!window.confirm(t("移除这个业务模块？其节点和条件将被永久删除，相关待清事项会改为项目级。"))) return;
    updateProject(projectId, (current) => ({ ...current,
      workstreams: current.workstreams.filter((workstream) => workstream.id !== workstreamId),
      outstandingItems: current.outstandingItems.map((item) => item.workstreamId === workstreamId
        ? { ...item, workstreamId: null } : item) }));
    setActiveWorkstreamId(project.workstreams.find((workstream) => workstream.id !== workstreamId)?.id || null);
    setModal(null); notify(t("业务模块已移除"));
  };

  const saveSample = (sample) => {
    const saved = { ...sample, updatedAt: new Date().toISOString() };
    setStore((current) => {
      const previous = current.samples.find((item) => item.id === saved.id);
      const samples = previous ? current.samples.map((item) => item.id === saved.id ? saved : item) : [...current.samples, saved];
      const selected = { ...current.selectedSampleIdsByCategory, [saved.categoryId]: saved.id };
      if (previous && previous.categoryId !== saved.categoryId && selected[previous.categoryId] === saved.id) {
        selected[previous.categoryId] = samples.find((item) => item.categoryId === previous.categoryId)?.id || null;
      }
      return { ...current, samples, selectedSampleIdsByCategory: selected };
    });
    setTemplateType(saved.categoryId); setModal({ type: "template-library" }); notify(t("范本已更新；现有项目不受影响"));
  };
  const saveGroupSample = (sample) => {
    const saved = { ...sample, updatedAt: new Date().toISOString() };
    setStore((current) => ({ ...current, groupSamples: current.groupSamples.some((item) => item.id === saved.id)
      ? current.groupSamples.map((item) => item.id === saved.id ? saved : item) : [...current.groupSamples, saved],
      selectedGroupSampleId: saved.id }));
    setTemplateType("group"); setModal({ type: "template-library" }); notify(t("集团范本已更新；现有集团不受影响"));
  };
  const resetSample = (sampleId) => {
    const current = store.samples.find((sample) => sample.id === sampleId);
    if (!current || !window.confirm(t("恢复基础范本？当前范本的自定义内容将被替换。"))) return;
    const restored = { ...createDefaultSample(language, current.workstreamType), id: current.id };
    setStore((state) => ({ ...state, samples: state.samples.map((sample) => sample.id === sampleId ? restored : sample) }));
    setModal({ type: "sample-edit", sampleId }); notify(t("范本已恢复为基础范本"));
  };
  const copySample = (sampleId, groupType = false) => {
    if (groupType) {
      const source = store.groupSamples.find((sample) => sample.id === sampleId); if (!source) return;
      const copy = duplicateGroupSample(source, t("（副本）"));
      setStore((current) => ({ ...current, groupSamples: [...current.groupSamples, copy], selectedGroupSampleId: copy.id }));
      notify(t("集团范本已复制")); return;
    }
    const source = store.samples.find((sample) => sample.id === sampleId); if (!source) return;
    const copy = duplicateSample(source, t("（副本）"));
    setStore((current) => ({ ...current, samples: [...current.samples, copy], selectedSampleIdsByCategory: {
      ...current.selectedSampleIdsByCategory, [copy.categoryId]: copy.id } })); notify(t("范本已复制"));
  };
  const deleteSample = (sampleId, groupType = false) => {
    if (groupType) {
      const source = store.groupSamples.find((sample) => sample.id === sampleId); if (!source) return;
      if (store.groupSamples.length <= 1) { window.alert(t("至少保留一个集团范本。")); return; }
      if (!window.confirm(t("删除集团范本“{name}”？", { name: source.name }))) return;
      setStore((current) => { const next = current.groupSamples.filter((sample) => sample.id !== sampleId); return { ...current,
        groupSamples: next, selectedGroupSampleId: current.selectedGroupSampleId === sampleId ? next[0]?.id : current.selectedGroupSampleId }; });
      notify(t("集团范本已删除")); return;
    }
    const source = store.samples.find((sample) => sample.id === sampleId); if (!source) return;
    const category = store.workstreamCategories.find((item) => item.id === source.categoryId);
    const sameType = store.samples.filter((sample) => sample.categoryId === source.categoryId);
    if (category?.builtinType && sameType.length <= 1) { window.alert(t("每个系统种类至少保留一个范本。")); return; }
    if (!window.confirm(t("删除范本“{name}”？", { name: source.name }))) return;
    setStore((current) => { const next = current.samples.filter((sample) => sample.id !== sampleId);
      const replacement = next.find((sample) => sample.categoryId === source.categoryId)?.id || null;
      return { ...current, samples: next, selectedSampleIdsByCategory: { ...current.selectedSampleIdsByCategory,
        [source.categoryId]: current.selectedSampleIdsByCategory[source.categoryId] === sampleId
          ? replacement : current.selectedSampleIdsByCategory[source.categoryId] } }; }); notify(t("范本已删除"));
  };
  const saveWorkstreamCategories = (categories) => {
    const customNames = Object.fromEntries(categories.filter((category) => !category.builtinType)
      .map((category) => [category.id, category.name]));
    setStore((current) => ({ ...current, workstreamCategories: categories,
      selectedSampleIdsByCategory: Object.fromEntries(categories.map((category) => [category.id,
        current.selectedSampleIdsByCategory[category.id]
          || current.samples.find((sample) => sample.categoryId === category.id)?.id || null])),
      projects: current.projects.map((project) => ({ ...project, workstreams: project.workstreams.map((workstream) =>
        workstream.type === "custom" && customNames[workstream.categoryId]
          ? { ...workstream, customName: customNames[workstream.categoryId], updatedAt: new Date().toISOString() } : workstream) })),
    }));
    if (templateType !== "group" && !categories.some((category) => category.id === templateType)) setTemplateType("audit");
    setModal({ type: "template-library" }); notify(t("范本种类已更新"));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `audit-project-workbench-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    URL.revokeObjectURL(url); closeMenu(); notify(t("备份已导出"));
  };
  const importBackup = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()); if (!isValidStore(parsed)) throw new Error("invalid");
      if (!window.confirm(t("将导入 {projects} 个项目、{groups} 个集团及全部范本，并替换当前数据，是否继续？",
        { projects: parsed.projects.length, groups: parsed.groups?.length || 0 }))) return;
      const normalized = normalizeStore(parsed); setStore(normalized); setSelection(null); setFilter("active"); notify(t("备份已恢复"));
    } catch { window.alert(t("这不是有效的工作台备份文件。")); }
    finally { if (importRef.current) importRef.current.value = ""; closeMenu(); }
  };
  const initializeWorkbench = () => {
    setStore(emptyStore()); setSelection(null); setActiveWorkstreamId(null); setFilter("active"); setSearch("");
    setTemplateType("audit"); setModal(null); notify(t("工作台已初始化"));
  };

  const modalTargetProject = modal?.targetKind === "project" ? store.projects.find((item) => item.id === modal.targetId) : null;
  const modalTargetGroup = modal?.targetKind === "group" ? store.groups.find((item) => item.id === modal.targetId) : null;
  const modalTargetWorkstream = modalTargetProject?.workstreams.find((item) => item.id === modal.workstreamId) || null;
  const modalWorkflowNodes = modal?.targetKind === "group" ? modalTargetGroup?.nodes : modalTargetWorkstream?.nodes;
  const modalNode = modalWorkflowNodes?.find((item) => item.id === modal?.nodeId) || modal?.node || null;
  const availableProjects = store.projects.filter((project) => !project.archived && !findParentMembership(store, "project", project.id));
  const availableGroups = store.groups.filter((group) => !group.archived && group.id !== selectedGroupSource?.id
    && canNestGroup(store, selectedGroupSource?.id, group.id));
  const activeOutstandingCount = activeOutstandingItems(store).filter((item) => outstandingIsOpen(item, store.outstandingStatuses)).length;
  const languageLabel = language === "en" ? "English" : language === "zh-Hant" ? "繁體中文" : "简体中文";
  const languageCode = language === "en" ? "EN" : language === "zh-Hant" ? "繁" : "简";
  const outstandingPanelCollapsed = compactLayout ? !compactOutstandingOpen : outstandingCollapsed;
  const expandOutstandingPanel = () => compactLayout ? setCompactOutstandingOpen(true) : setOutstandingCollapsed(false);
  const collapseOutstandingPanel = () => compactLayout ? setCompactOutstandingOpen(false) : setOutstandingCollapsed(true);

  return <article className="audit-workbench">
    {message && <div className="save-toast" role="status">{message}</div>}
    <header className="workbench-toolbar"><div className="workbench-brand"><h1>{t("审计项目工作台")}</h1>
      <p>{t("以项目为容器，并行追踪审计、税务、客户尽职调查及收费工作。")}</p></div>
      <nav className="toolbar-actions" aria-label={t("工作台操作")} ref={toolbarRef}>
        <button type="button" className="toolbar-action-button icon-only" aria-label={t("范本库")}
          data-tooltip={t("范本库")} onClick={() => { closeMenu(); setModal({ type: "template-library" }); }}>
          <LibraryBig aria-hidden="true" /></button>
        <button type="button" className="toolbar-action-button icon-only" aria-label={t("使用指南")}
          data-tooltip={t("使用指南")} onClick={() => { closeMenu(); setModal({ type: "user-guide" }); }}>
          <BookOpen aria-hidden="true" /></button>
        <span className="toolbar-divider" aria-hidden="true" />
        <details className="toolbar-menu" ref={(element) => { toolbarMenuRefs.current[0] = element; }}>
          <summary className="toolbar-icon-summary" aria-label={t("备份")} data-tooltip={t("备份")}
            onClick={() => closeOtherMenus(0)}><DatabaseBackup aria-hidden="true" /></summary>
          <div className="toolbar-menu-popover"><input ref={importRef} type="file" accept="application/json" hidden
            onChange={(event) => importBackup(event.target.files?.[0])} />
            <button type="button" onClick={() => { closeMenu(); importRef.current?.click(); }}>{t("恢复备份")}…</button>
            <button type="button" onClick={exportBackup}>{t("导出备份")}</button>
            <button type="button" className="toolbar-menu-danger" onClick={() => { closeMenu(); setModal({ type: "initialize-workbench" }); }}>
              {t("初始化工作台")}…</button></div></details>
        <details className="toolbar-menu" ref={(element) => { toolbarMenuRefs.current[1] = element; }}>
          <summary className="language-summary toolbar-icon-summary" aria-label={`${t("语言")} · ${languageLabel}`}
            data-tooltip={`${t("语言")} · ${languageLabel}`} data-tooltip-side="left"
            onClick={() => closeOtherMenus(1)}><Languages aria-hidden="true" /><small>{languageCode}</small></summary>
          <div className="toolbar-menu-popover language-menu"><button type="button" aria-pressed={language === "zh-Hans"}
            onClick={() => { setLanguage("zh-Hans"); closeMenu(); }}><span>{t("简体中文")}</span>{language === "zh-Hans" && <small>{t("当前")}</small>}</button>
            <button type="button" aria-pressed={language === "zh-Hant"} onClick={() => { setLanguage("zh-Hant"); closeMenu(); }}>
              <span>繁體中文</span>{language === "zh-Hant" && <small>{t("当前")}</small>}</button>
            <button type="button" aria-pressed={language === "en"} onClick={() => { setLanguage("en"); closeMenu(); }}>
              <span>English</span>{language === "en" && <small>{t("当前")}</small>}</button></div></details>
      </nav></header>

    <section className="workbench-layout" data-sidebar-collapsed={sidebarCollapsed || undefined}
      data-compact-layout={compactLayout || undefined} data-outstanding-collapsed={outstandingPanelCollapsed || undefined}>
      <aside className="project-panel" aria-label={t("项目导航")}>
        {sidebarCollapsed ? <button type="button" className="sidebar-rail-toggle" aria-expanded="false" aria-label={t("展开项目导航")}
          data-tooltip={t("展开项目导航")} data-tooltip-side="right"
          onClick={() => setSidebarCollapsed(false)}><PanelLeftOpen aria-hidden="true" /><small>{t("项目")}</small></button> : <>
          <div className="project-panel-controls"><div className="project-panel-title"><div><button type="button" className="sidebar-toggle"
            aria-expanded="true" aria-label={t("收起项目导航")} data-tooltip={t("收起项目导航")}
            onClick={() => setSidebarCollapsed(true)}><PanelLeftClose aria-hidden="true" /></button>
            <strong>{t("公司列表")}</strong></div><button type="button" className="project-panel-new"
              onClick={() => setModal({ type: "create-company" })}><Plus aria-hidden="true" /><span>{t("新建公司")}</span></button></div>
            <label className="search-field"><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder={t("搜索公司或负责人")} aria-label={t("搜索公司、控股公司或负责人")} /></label>
            <div className="filter-tabs" role="tablist" aria-label={t("项目状态")}>{[["active", "活跃"], ["completed", "已完成"],
              ["all", "全部"], ["archived", "归档"]].map(([value, label]) => <button type="button" role="tab" key={value}
                aria-selected={filter === value} onClick={() => setFilter(value)}>{t(label)}</button>)}</div></div>
          <WorkspaceTree store={store} selection={selection} onSelect={setSelection} search={search} filter={filter}
            statuses={store.outstandingStatuses} onMove={moveNavigationItem} /></>}
      </aside>
      <main className="project-detail" aria-label={t(selectedGroup ? "集团工作区" : "项目工作区")}>
        {selectedProject ? <ProjectDetail project={selectedProject} rawProject={selectedProjectSource} statuses={outstandingStatusViews}
          parentMembership={selectedProjectMembership}
          activeWorkstreamId={activeWorkstreamId} setActiveWorkstreamId={setActiveWorkstreamId} updateWorkflowNodes={updateWorkflowNodes}
          setModal={setModal} duplicateProject={duplicateProject} archiveTarget={archiveTarget} restoreTarget={restoreTarget} />
          : selectedGroup ? <GroupDetail store={store} group={selectedGroup} statuses={outstandingStatusViews}
            updateWorkflowNodes={updateWorkflowNodes} setModal={setModal} setSelection={setSelection}
            archiveTarget={archiveTarget} restoreTarget={restoreTarget} />
            : <div className="detail-empty"><span className="empty-mark">◎</span><h2>{t("选择一个项目或集团")}</h2>
              <p>{t("选择后可查看业务模块、集团合并及待清事项。")}</p></div>}
      </main>
      <aside className="outstanding-center-shell" aria-label={t("待清中心")}>
        {outstandingPanelCollapsed ? <button type="button" className="outstanding-rail-toggle" aria-expanded="false"
          aria-label={t("展开待清中心")} data-tooltip={t("展开待清中心")}
          data-tooltip-side="left" onClick={expandOutstandingPanel}>
          <PanelRightOpen aria-hidden="true" /><strong>{activeOutstandingCount}</strong><small>{t("待清")}</small></button> : <>
          <header className="outstanding-shell-title"><div><strong>{t("待清中心")}</strong><span>{t("项目级及业务模块阻塞事项")}</span></div>
            <button type="button" className="icon-only" aria-label={t("收起待清中心")}
              data-tooltip={t("收起待清中心")} data-tooltip-side="left" onClick={collapseOutstandingPanel}>
              <PanelRightClose aria-hidden="true" /></button></header>
          {selectedProject ? <OutstandingCenter store={store} target={selectedProjectSource} targetKind="project" statuses={outstandingStatusViews}
            updateProject={updateProject} updateGroup={updateGroup} setModal={setModal} setSelection={setSelection} notify={notify}
            readOnly={selectedProjectSource.archived} activeWorkstreamId={activeWorkstreamId} />
            : selectedGroup ? <OutstandingCenter store={store} target={selectedGroupSource} targetKind="group" statuses={outstandingStatusViews}
              updateProject={updateProject} updateGroup={updateGroup} setModal={setModal} setSelection={setSelection} notify={notify}
              readOnly={selectedGroupSource.archived} />
              : <div className="outstanding-center-empty">{t("选择项目或集团后查看待清事项。")}</div>}</>}
      </aside>
    </section>

    {modal?.type === "create-company" && <Modal title={t("新建公司")} onClose={() => setModal(null)} wide>
      <CompanyCreateForm initialKind={modal.initialKind} samples={sampleViews} workstreamCategories={workstreamCategoryViews}
        selectedSampleIdsByCategory={store.selectedSampleIdsByCategory} selectedGroupSample={selectedGroupSample}
        initialWorkstreamSelections={modal.initialWorkstreamSelections} onCreateProject={createProject}
        onCreateGroup={createGroup} onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "edit-project" && selectedProjectSource && <Modal title={t("编辑项目资料")} onClose={() => setModal(null)} wide>
      <ProjectForm initial={selectedProjectSource} allowWorkstreams={false} onClose={() => setModal(null)} submitLabel="保存修改"
        initialMembership={selectedProjectMembership} groupOptions={store.groups.filter((group) => !group.archived
          || group.id === selectedProjectMembership?.group.id)} onSubmit={(values) => {
          const { groupAssignment, ...projectValues } = values;
          setStore((current) => {
            const next = { ...current, projects: current.projects.map((project) => project.id === selectedProjectSource.id
              ? { ...project, ...projectValues, updatedAt: new Date().toISOString() } : project) };
            const groupSample = current.groupSamples.find((sample) => sample.id === current.selectedGroupSampleId)
              || current.groupSamples[0] || createDefaultGroupSample();
            return assignProjectToGroup(next, selectedProjectSource.id, groupAssignment, groupSample);
          });
          setModal(null); notify(t("项目资料及集团归属已更新")); }} /></Modal>}
    {modal?.type === "edit-group" && selectedGroupSource && <Modal title={t("编辑集团资料")} onClose={() => setModal(null)} wide>
      <GroupForm initial={selectedGroupSource} sampleName={selectedGroupSample?.name || ""} allowTemplate={false}
        memberTargets={{ projects: store.projects, groups: store.groups }} availableProjects={availableProjects}
        availableGroups={availableGroups} groupSample={selectedGroupSample || createDefaultGroupSample()}
        onSubmit={(values) => { updateGroup(selectedGroupSource.id, (group) => ({ ...group, ...values,
          nodes: values.consolidationEnabled ? group.nodes : [] })); setModal(null); notify(t("集团资料已更新")); }}
        onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "workstream-add" && modalTargetProject && <Modal title={t("添加业务模块")} onClose={() => setModal(null)}>
      <WorkstreamForm availableCategories={workstreamCategoryViews.filter((category) => !category.builtinType
        || category.builtinType === "custom" || !modalTargetProject.workstreams.some((item) => item.type === category.builtinType))}
        samples={sampleViews} selectedSampleIdsByCategory={store.selectedSampleIdsByCategory} onSubmit={(values) => addWorkstream(modalTargetProject.id, values)}
        onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "workstream-edit" && modalTargetProject && modalTargetWorkstream && <Modal title={t("业务模块设置")} onClose={() => setModal(null)}>
      <WorkstreamForm initial={modalTargetWorkstream} availableCategories={workstreamCategoryViews} samples={sampleViews}
        selectedSampleIdsByCategory={store.selectedSampleIdsByCategory}
        onSubmit={(values) => updateWorkstream(modalTargetProject.id, modalTargetWorkstream.id, values)}
        onRemove={() => removeWorkstream(modalTargetProject.id, modalTargetWorkstream.id)} onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "node" && modalWorkflowNodes && <Modal title={t(modalNode ? "编辑节点" : "添加节点")} onClose={() => setModal(null)}>
      <NodeForm initial={modalNode} onClose={() => setModal(null)} onSubmit={(values) => {
        updateWorkflowNodes(modal.targetKind, modal.targetId, modal.workstreamId, (nodes) => modalNode
          ? nodes.map((node) => node.id === modalNode.id ? { ...node, ...values } : node) : [...nodes, makeNode(values)]);
        setModal(null); notify(t(modalNode ? "节点已更新" : "节点已添加")); }} /></Modal>}
    {modal?.type === "condition" && modalNode && <Modal title={t(modal.condition ? "修改完成条件" : "添加完成条件")} onClose={() => setModal(null)}>
      <ConditionForm initial={modal.condition?.label || ""} onClose={() => setModal(null)} onSubmit={(label) => {
        updateWorkflowNodes(modal.targetKind, modal.targetId, modal.workstreamId, (nodes) => nodes.map((node) => node.id !== modal.nodeId
          ? node : { ...node, conditions: modal.condition
            ? node.conditions.map((condition) => condition.id === modal.condition.id ? { ...condition, label } : condition)
            : [...node.conditions, { id: uid("condition"), label, done: false }] }));
        setModal(null); notify(t(modal.condition ? "条件已修改" : "条件已添加")); }} /></Modal>}
    {modal?.type === "outstanding" && (modalTargetProject || modalTargetGroup) && <Modal title={t(modal.item ? "编辑待清事项" : "添加待清事项")} onClose={() => setModal(null)}>
      <OutstandingForm initial={modal.item} statuses={outstandingStatusViews}
        workstreams={modalTargetProject?.workstreams.map((workstream) => localizeWorkstream(workstream, language)) || []}
        defaultWorkstreamId={modal.defaultWorkstreamId} onClose={() => setModal(null)} onSubmit={(values) => {
          const updateTarget = modal.targetKind === "group" ? updateGroup : updateProject;
          updateTarget(modal.targetId, (target) => ({ ...target, outstandingItems: modal.item
            ? target.outstandingItems.map((item) => item.id === modal.item.id ? { ...item, ...values, updatedAt: new Date().toISOString() } : item)
            : [...target.outstandingItems, makeOutstandingItem(values, store.outstandingStatuses)] }));
          setModal(null); notify(t(modal.item ? "待清事项已更新" : "待清事项已添加")); }} /></Modal>}
    {modal?.type === "template-library" && <Modal title={t("范本库")} onClose={() => setModal(null)} wide>
      <div className="template-category-bar"><div className="template-type-tabs" role="tablist">
        {[...workstreamCategoryViews, { id: "group", label: t("集团范本") }].map((category) => <button type="button" key={category.id}
          aria-selected={templateType === category.id} onClick={() => setTemplateType(category.id)}>{category.label}</button>)}</div>
        <button type="button" className="template-category-manage" onClick={() => setModal({ type: "workstream-categories" })}>{t("管理种类")}…</button></div>
      {templateType === "group" ? <GroupSampleLibrary samples={groupSampleViews} selectedSampleId={store.selectedGroupSampleId}
        onSelect={(sampleId) => setStore((current) => ({ ...current, selectedGroupSampleId: sampleId }))}
        onCreate={() => setModal({ type: "group-sample-edit", sample: makeBlankGroupSample(language) })}
        onEdit={(sampleId) => setModal({ type: "group-sample-edit", sampleId })} onDuplicate={(sampleId) => copySample(sampleId, true)}
        onDelete={(sampleId) => deleteSample(sampleId, true)} onUse={() => setModal({ type: "create-company", initialKind: "group" })} />
        : <SampleLibrary samples={sampleViews.filter((sample) => sample.categoryId === templateType)}
          categoryLabel={workstreamCategoryViews.find((category) => category.id === templateType)?.label}
          selectedSampleId={store.selectedSampleIdsByCategory?.[templateType]}
          onSelect={(sampleId) => setStore((current) => ({ ...current, selectedSampleIdsByCategory: {
            ...current.selectedSampleIdsByCategory, [templateType]: sampleId } }))}
          onCreate={() => { const category = store.workstreamCategories.find((item) => item.id === templateType);
            if (category) setModal({ type: "sample-edit", sample: makeBlankSample(language, category.builtinType || "custom", category.id) }); }}
          onEdit={(sampleId) => setModal({ type: "sample-edit", sampleId })} onDuplicate={copySample} onDelete={deleteSample}
          onUse={(sampleId) => setModal({ type: "create-company", initialKind: "project",
            initialWorkstreamSelections: [{ categoryId: templateType, sampleId }] })} />}
    </Modal>}
    {modal?.type === "workstream-categories" && <Modal title={t("范本种类")} onClose={() => setModal({ type: "template-library" })} wide>
      <WorkstreamCategoryEditor categories={store.workstreamCategories} usageCounts={workstreamCategoryUsage}
        onSave={saveWorkstreamCategories} onClose={() => setModal({ type: "template-library" })} /></Modal>}
    {modal?.type === "user-guide" && <Modal title={t("使用指南")} onClose={() => setModal(null)} large>
      <UserGuide /></Modal>}
    {modal?.type === "initialize-workbench" && <Modal title={t("初始化工作台")} onClose={() => setModal(null)}>
      <InitializeWorkbenchConfirm onExport={exportBackup} onInitialize={initializeWorkbench} onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "sample-edit" && <SampleEditModal modal={modal} store={store} language={language} t={t}
      categories={workstreamCategoryViews} saveSample={saveSample} resetSample={resetSample} setModal={setModal} />}
    {modal?.type === "sample-redact" && <Modal title={t("范本公司名称去敏")} onClose={() => setModal(null)}>
      <SampleRedactionForm language={language} onClose={() => setModal(null)} onSubmit={(names, replacement) => {
        const result = redactSampleCompanies(modal.sample, names, replacement); saveSample(result.sample);
        notify(t(result.replacements ? "{count} 处公司名称已去敏" : "没有找到完全匹配的公司名称", { count: result.replacements })); }} /></Modal>}
    {modal?.type === "group-sample-edit" && <GroupSampleEditModal modal={modal} store={store} language={language} t={t}
      saveGroupSample={saveGroupSample} setStore={setStore} setModal={setModal} notify={notify} />}
    {modal?.type === "outstanding-statuses" && <Modal title={t("自定义待清状态")} onClose={() => setModal(null)} wide>
      <OutstandingStatusEditor statuses={outstandingStatusViews} usageCounts={outstandingStatusUsage} onClose={() => setModal(null)}
        onSave={(statuses) => { setStore((current) => ({ ...current, outstandingStatuses: statuses })); setModal(null); notify(t("待清状态已更新")); }} /></Modal>}
    {modal?.type === "member-add" && selectedGroupSource && <Modal title={t("加入公司或子集团")} onClose={() => setModal(null)}>
      <GroupMemberAddForm availableProjects={availableProjects} availableGroups={availableGroups}
        onLink={(values) => { updateGroup(selectedGroupSource.id, (group) => ({ ...group,
          members: [...group.members, makeGroupMember(values, selectedGroupSample || createDefaultGroupSample())] }));
          setModal(null); notify(t("组成部分已加入集团")); }}
        onCreateCompany={() => setModal({ type: "create-company", parentGroupId: selectedGroupSource.id })}
        onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "member-edit" && <MemberEditModal modal={modal} store={store} selectedGroupSample={selectedGroupSample}
      updateGroup={updateGroup} setModal={setModal} notify={notify} t={t} language={language} />}
    {modal?.type === "delete-target" && <Modal title={t("永久删除")} onClose={() => setModal(null)}>
      <DeleteConfirm name={modal.name} kind={modal.targetKind} onClose={() => setModal(null)}
        onDelete={() => permanentlyDeleteTarget(modal.targetKind, modal.targetId)} /></Modal>}
  </article>;
}

function CompanyCreateForm({ initialKind = "project", samples, workstreamCategories, selectedSampleIdsByCategory,
  selectedGroupSample, initialWorkstreamSelections, onCreateProject, onCreateGroup, onClose }) {
  const { t } = useUiLanguage();
  const [kind, setKind] = React.useState(initialKind === "group" ? "group" : "project");
  return <div className="company-create-flow">
    <section className="company-kind-selector"><div><strong>{t("公司结构")}</strong>
      <span>{t(kind === "group" ? "控股公司可管理下属公司、合并就绪及合并节点。"
        : "公司可追踪业务模块，并可随时加入控股公司层级。")}</span></div>
      <div className="choice-tabs" role="tablist" aria-label={t("公司结构")}>
        <button type="button" role="tab" aria-selected={kind === "project"} onClick={() => setKind("project")}>{t("公司")}</button>
        <button type="button" role="tab" aria-selected={kind === "group"} onClick={() => setKind("group")}>{t("控股公司")}</button>
      </div></section>
    {kind === "project" ? <ProjectForm key="project" samples={samples} workstreamCategories={workstreamCategories}
      selectedSampleIdsByCategory={selectedSampleIdsByCategory} initialWorkstreamSelections={initialWorkstreamSelections}
      submitLabel="建立公司" onSubmit={onCreateProject} onClose={onClose} />
      : <GroupForm key="group" sampleName={selectedGroupSample?.name || t("未选择范本")}
        onSubmit={onCreateGroup} onClose={onClose} />}
  </div>;
}

function ProjectDetail({ project, rawProject, statuses, parentMembership, activeWorkstreamId, setActiveWorkstreamId,
  updateWorkflowNodes, setModal, duplicateProject, archiveTarget, restoreTarget }) {
  const { language, t } = useUiLanguage();
  const stats = projectStats(project);
  const readOnly = Boolean(rawProject.archived);
  const activeWorkstream = project.workstreams.find((workstream) => workstream.id === activeWorkstreamId)
    || project.workstreams[0] || null;
  const activeRawWorkstream = rawProject.workstreams.find((workstream) => workstream.id === activeWorkstream?.id) || null;
  const periodLabel = reportingPeriodLabel(project, language);
  const primaryName = project.entity || project.name;
  const secondaryName = project.entity && project.name !== project.entity ? project.name : "";
  const subtitle = [secondaryName, periodLabel].filter(Boolean).join(" · ")
    || t(primaryName ? "尚未填写报告期间" : "尚未填写法律实体及报告期间");
  return <div className="workspace-detail-inner">
    {readOnly && <div className="archive-banner"><strong>{t("已归档，只读")}</strong>
      <span>{t("归档记录不能编辑；恢复后才可继续更新。")}</span></div>}
    <header className="detail-header"><div className="detail-title"><div><span className="workspace-label">{t("项目工作区")}</span><h2>{primaryName}</h2></div>
      <p>{subtitle}</p></div>
      <div className="detail-actions">{readOnly ? <>
        <button type="button" className="button secondary icon-only" aria-label={t("恢复")} data-tooltip={t("恢复")}
          onClick={() => restoreTarget("project", rawProject.id)}><ArchiveRestore aria-hidden="true" /></button>
        <button type="button" className="button danger-quiet icon-only" aria-label={t("永久删除")}
          data-tooltip={t("永久删除")} onClick={() => setModal({ type: "delete-target", targetKind: "project",
            targetId: rawProject.id, name: rawProject.name })}><Trash2 aria-hidden="true" /></button></> : <>
        <button type="button" className="button primary icon-only" aria-label={t("编辑公司及集团归属")}
          data-tooltip={t("编辑公司及集团归属")} onClick={() => setModal({ type: "edit-project" })}><Pencil aria-hidden="true" /></button>
        <button type="button" className="button secondary icon-only" aria-label={t("复制项目")}
          data-tooltip={t("复制项目")} onClick={() => duplicateProject(rawProject)}><Copy aria-hidden="true" /></button>
        <button type="button" className="button secondary icon-only" aria-label={t("归档项目")}
          data-tooltip={t("归档项目")} onClick={() => archiveTarget("project", rawProject.id)}><Archive aria-hidden="true" /></button></>}</div>
    </header>
    <dl className="detail-facts"><div><dt>{t("负责人")}</dt><dd>{project.owner || t("未设置")}</dd></div>
      <div><dt>{t("目标完成日期")}</dt><dd>{formatDate(project.dueDate, language)}</dd></div>
      <div><dt>{t("财务报告准则／框架")}</dt><dd>{project.reportingFramework || t("未设置")}</dd></div>
      <div><dt>{t("所属集团")}</dt><dd>{parentMembership?.group.name || t("独立公司")}</dd></div>
      <div><dt>{t("业务模块")}</dt><dd>{t("已完成 {done}/{total}", { done: stats.completedWorkstreams, total: stats.workstreams })}</dd></div>
      <div><dt>{t("项目状态")}</dt><dd>{t(stats.complete ? "已完成" : "进行中")}</dd></div></dl>

    <section className="workstream-overview"><header className="section-heading"><div><h3>{t("业务模块")}</h3>
      <p>{t("各模块并行推进，并分别追踪负责人、截止日和完成条件。")}</p></div>
      {!readOnly && <button type="button" className="button secondary icon-only" aria-label={t("添加业务模块")}
        data-tooltip={t("添加业务模块")} onClick={() => setModal({ type: "workstream-add",
          targetKind: "project", targetId: rawProject.id })}><ListPlus aria-hidden="true" /></button>}</header>
      <div className="workstream-card-grid">{project.workstreams.map((workstream) => <WorkstreamCard key={workstream.id}
        workstream={workstream} selected={workstream.id === activeWorkstream?.id}
        openItems={rawProject.outstandingItems.filter((item) => item.workstreamId === workstream.id
          && outstandingIsOpen(item, statuses)).length} readOnly={readOnly}
        onSelect={() => setActiveWorkstreamId(workstream.id)} onEdit={() => setModal({ type: "workstream-edit",
          targetKind: "project", targetId: rawProject.id, workstreamId: workstream.id })} />)}</div>
    </section>

    {activeWorkstream && activeRawWorkstream && <section className="workflow-panel"><header className="section-heading"><div>
      <span className="workspace-label">{t("模块节点")}</span><h3>{workstreamTypeLabel(activeWorkstream.type, language, activeWorkstream.customName)}</h3>
      <p>{t("横向查看全部节点；所选节点的完成条件固定显示在下方。")}</p></div>
      <div className="workflow-panel-progress"><strong>{workstreamStats(activeWorkstream).percentage}%</strong>
        <ProgressBar value={workstreamStats(activeWorkstream).percentage} compact /></div></header>
      <WorkflowNodes targetKind="project" targetId={rawProject.id} workstreamId={activeRawWorkstream.id}
        nodes={activeWorkstream.nodes} updateWorkflowNodes={updateWorkflowNodes} setModal={setModal} readOnly={readOnly} />
    </section>}
  </div>;
}

function GroupDetail({ store, group, statuses, updateWorkflowNodes, setModal, setSelection, archiveTarget, restoreTarget }) {
  const { language, t } = useUiLanguage();
  const [tab, setTab] = React.useState("overview");
  const rawGroup = store.groups.find((item) => item.id === group.id);
  const readOnly = Boolean(rawGroup?.archived);
  const stats = groupProgress(store, group.id);
  const openItems = collectGroupOutstandingEntries(store, group.id, new Set(), 0, readOnly)
    .filter((entry) => outstandingIsOpen(entry.item, statuses)).length;
  if (!rawGroup) return null;
  return <div className="workspace-detail-inner">
    {readOnly && <div className="archive-banner"><strong>{t("已归档，只读")}</strong>
      <span>{t("归档记录不能编辑；恢复后才可继续更新。")}</span></div>}
    <header className="detail-header"><div className="detail-title"><div><span className="workspace-label">{t("集团工作区")}</span><h2>{group.name}</h2></div>
      <p>{reportingPeriodLabel(group, language) || t("尚未填写集团资料")}</p></div><div className="detail-actions">{readOnly ? <>
        <button type="button" className="button secondary icon-only" aria-label={t("恢复")} data-tooltip={t("恢复")}
          onClick={() => restoreTarget("group", group.id)}><ArchiveRestore aria-hidden="true" /></button>
        <button type="button" className="button danger-quiet icon-only" aria-label={t("永久删除")}
          data-tooltip={t("永久删除")} onClick={() => setModal({ type: "delete-target", targetKind: "group",
            targetId: group.id, name: group.name })}><Trash2 aria-hidden="true" /></button></> : <>
        <button type="button" className="button primary icon-only" aria-label={t("编辑集团及成员")}
          data-tooltip={t("编辑集团及成员")} onClick={() => setModal({ type: "edit-group" })}><Pencil aria-hidden="true" /></button>
        <button type="button" className="button secondary icon-only" aria-label={t("归档集团")}
          data-tooltip={t("归档集团")} onClick={() => archiveTarget("group", group.id)}><Archive aria-hidden="true" /></button></>}</div></header>
    <section className="group-status-strip" aria-label={t("集团状态")}><article><span>{t("组成部分进度")}</span>
      <div><strong>{stats.componentPercentage}%</strong></div><ProgressBar value={stats.componentPercentage} compact /></article>
      <article><span>{t("公司合并就绪")}</span><div><strong>{stats.readyCompanies}/{stats.totalCompanies}</strong><small>{t("家公司")}</small></div></article>
      <article><span>{t("本级合并流程")}</span><div><strong>{group.consolidationEnabled ? `${stats.consolidationPercentage}%` : t("不适用")}</strong></div>
        {group.consolidationEnabled && <ProgressBar value={stats.consolidationPercentage} compact />}</article>
      <article><span>{t("未清事项")}</span><div><strong>{openItems}</strong><small>{t("项")}</small></div></article></section>
    <div className="group-tabs" role="tablist">{[["overview", "组成部分"], ["workflow", "合并节点"], ["settings", "集团资料"]]
      .map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} key={value}
        onClick={() => setTab(value)}>{t(label)}</button>)}</div>
    {tab === "overview" && <GroupMatrix store={store} group={rawGroup} statuses={statuses} readOnly={readOnly}
      onOpen={(kind, id) => setSelection({ kind, id })} onConfigure={(sourceGroupId, member) => setModal({ type: "member-edit",
        sourceGroupId, memberId: member.id })} />}
    {tab === "workflow" && <section className="workflow-panel"><header className="section-heading"><div><h3>{t("集团合并节点")}</h3>
      <p>{group.consolidationEnabled ? t("横向查看本级合并节点，并在下方管理完成条件。")
        : t("此集团只用于分类，不设本级合并流程。")}</p></div></header>
      {group.consolidationEnabled ? <WorkflowNodes targetKind="group" targetId={group.id} nodes={group.nodes}
        updateWorkflowNodes={updateWorkflowNodes} setModal={setModal} readOnly={readOnly} />
        : <div className="inline-empty">{t("本级无需独立合并；进度直接来自下级组成部分。")}</div>}</section>}
    {tab === "settings" && <section className="group-settings-panel"><dl><div><dt>{t("负责人")}</dt><dd>{group.owner || t("未设置")}</dd></div>
      <div><dt>{t("目标完成日期")}</dt><dd>{formatDate(group.dueDate, language)}</dd></div>
      <div><dt>{t("合并方式")}</dt><dd>{t(group.consolidationEnabled ? "本级需要合并" : "仅作分类")}</dd></div>
      <div><dt>{t("组成部分")}</dt><dd>{rawGroup.members.length}</dd></div></dl>
      {group.notes && <p className="group-notes">{group.notes}</p>}
      <header className="section-heading"><div><h3>{t("公司与子集团")}</h3><p>{t("管理集团层级、角色和合并就绪条件。")}</p></div>
        {!readOnly && <button type="button" className="button primary" onClick={() => setModal({ type: "member-add" })}>{t("添加公司／子集团")}</button>}</header>
      <div className="settings-member-list">{rawGroup.members.map((member) => {
        const target = member.kind === "project" ? store.projects.find((item) => item.id === member.refId)
          : store.groups.find((item) => item.id === member.refId);
        if (!target) return null;
        return <button type="button" disabled={readOnly} key={member.id}
          onClick={() => setModal({ type: "member-edit", sourceGroupId: rawGroup.id, memberId: member.id })}>
          <span>{member.kind === "project" ? <Building aria-hidden="true" /> : <Building2 aria-hidden="true" />}</span><strong>{target.name}</strong>
          <small>{member.role || t(member.kind === "project" ? "组成部分" : "子集团")}</small></button>;
      })}</div></section>}
  </div>;
}

function WorkflowNodes({ targetKind, targetId, workstreamId = null, nodes, updateWorkflowNodes, setModal, readOnly }) {
  const { t } = useUiLanguage();
  const update = (updater) => updateWorkflowNodes(targetKind, targetId, workstreamId, updater);
  const actions = {
    addNode: () => setModal({ type: "node", targetKind, targetId, workstreamId }),
    move: (nodeId, direction) => update((current) => {
      const next = [...current]; const index = next.findIndex((node) => node.id === nodeId); const target = index + direction;
      if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
      return next;
    }),
    toggle: (nodeId, conditionId) => update((current) => current.map((node) => node.id === nodeId
      ? { ...node, conditions: node.conditions.map((condition) => condition.id === conditionId
        ? { ...condition, done: !condition.done } : condition) } : node)),
    editNode: (node) => setModal({ type: "node", targetKind, targetId, workstreamId, nodeId: node.id }),
    addCondition: (node) => setModal({ type: "condition", targetKind, targetId, workstreamId, nodeId: node.id }),
    editCondition: (node, condition) => setModal({ type: "condition", targetKind, targetId, workstreamId,
      nodeId: node.id, condition }),
    deleteCondition: (nodeId, conditionId) => {
      if (!window.confirm(t("删除这个完成条件？"))) return;
      update((current) => current.map((node) => node.id === nodeId
        ? { ...node, conditions: node.conditions.filter((condition) => condition.id !== conditionId) } : node));
    },
    deleteNode: (node) => {
      if (!window.confirm(t("删除节点“{name}”？", { name: node.title }))) return;
      update((current) => current.filter((item) => item.id !== node.id));
    },
  };
  return <NodeBoard nodes={nodes} readOnly={readOnly} actions={actions} />;
}

function OutstandingCenter({ store, target, targetKind, statuses, updateProject, updateGroup, setModal, setSelection,
  notify, readOnly = false, activeWorkstreamId = null }) {
  const { language, t } = useUiLanguage();
  const [statusFilter, setStatusFilter] = React.useState("open");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const rawEntries = targetKind === "group"
    ? collectGroupOutstandingEntries(store, target.id, new Set(), 0, readOnly)
    : (target.outstandingItems || []).map((item) => ({ item, sourceType: "project", sourceId: target.id,
      sourceName: target.name, depth: 0 }));
  const decorate = (entry) => {
    const source = entry.sourceType === "project" ? store.projects.find((item) => item.id === entry.sourceId)
      : store.groups.find((item) => item.id === entry.sourceId);
    const workstream = entry.item.workstreamId && entry.sourceType === "project"
      ? source?.workstreams.find((item) => item.id === entry.item.workstreamId) : null;
    return { ...entry, source, workstream, moduleKey: workstream ? `${entry.sourceId}:${workstream.id}` : `${entry.sourceId}:project`,
      moduleLabel: workstream ? workstreamTypeLabel(workstream.type, language, workstream.customName)
        : t(entry.sourceType === "group" ? "集团级" : "项目级") };
  };
  const entries = rawEntries.map(decorate);
  const moduleOptions = [...new Map(entries.map((entry) => [entry.moduleKey,
    targetKind === "group" ? `${entry.sourceName} · ${entry.moduleLabel}` : entry.moduleLabel])).entries()];
  const visible = entries.filter((entry) => {
    if (moduleFilter !== "all" && entry.moduleKey !== moduleFilter) return false;
    if (statusFilter === "open") return outstandingIsOpen(entry.item, store.outstandingStatuses);
    return statusFilter === "all" || entry.item.status === statusFilter;
  });
  const statusById = (id) => statuses.find((status) => status.id === id) || statuses[0];
  const updateSource = (entry, updater) => (entry.sourceType === "group" ? updateGroup : updateProject)(entry.sourceId,
    (source) => ({ ...source, outstandingItems: updater(source.outstandingItems || []) }));
  const updateStatus = (entry, status) => updateSource(entry, (items) => items.map((item) => item.id === entry.item.id
    ? { ...item, status, updatedAt: new Date().toISOString() } : item));
  const removeItem = (entry) => {
    if (!window.confirm(t("删除待清事项“{name}”？", { name: entry.item.title }))) return;
    updateSource(entry, (items) => items.filter((item) => item.id !== entry.item.id)); notify(t("待清事项已删除"));
  };
  return <div className="outstanding-center"><div className="outstanding-center-tools">
    <div><select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} aria-label={t("按业务模块筛选")}>
      <option value="all">{t("全部层级与模块")}</option>{moduleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={t("按待清状态筛选")}>
        <option value="open">{t("全部未清")}</option><option value="all">{t("全部状态")}</option>
        {statuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></div>
    {!readOnly && <div className="outstanding-center-actions"><button type="button" className="icon-only" aria-label={t("状态与颜色")}
      data-tooltip={t("状态与颜色")} onClick={() => setModal({ type: "outstanding-statuses" })}><Palette aria-hidden="true" /></button>
      <button type="button" className="button primary icon-only" aria-label={t("添加待清")}
        data-tooltip={t("添加待清")} data-tooltip-side="left" onClick={() => setModal({ type: "outstanding", targetKind,
          targetId: target.id, defaultWorkstreamId: targetKind === "project" ? activeWorkstreamId : null })}><ListPlus aria-hidden="true" /></button></div>}</div>
    <div className="outstanding-list">{visible.map((entry) => {
      const status = statusById(entry.item.status);
      return <article className="outstanding-item" style={{ "--status-color": status?.color || "#778078" }} key={`${entry.sourceId}-${entry.item.id}`}>
        <header><span className="status-color-dot" aria-hidden="true" /><strong>{entry.item.title}</strong></header>
        <div className="outstanding-source"><button type="button" onClick={() => setSelection({ kind: entry.sourceType, id: entry.sourceId })}>{entry.sourceName}</button>
          <span>{entry.moduleLabel}</span></div>{entry.item.note && <p>{entry.item.note}</p>}
        <footer>{readOnly ? <span className="status-color-pill">{status?.label || entry.item.status}</span> : <select value={entry.item.status}
          style={{ "--status-color": status?.color || "#778078" }} onChange={(event) => updateStatus(entry, event.target.value)}>
          {statuses.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select>}
          {!readOnly && <div><button type="button" onClick={() => setModal({ type: "outstanding", targetKind: entry.sourceType,
            targetId: entry.sourceId, item: entry.item })}>{t("编辑")}</button><button type="button" onClick={() => removeItem(entry)}>{t("删除")}</button></div>}</footer>
      </article>;
    })}{!visible.length && <div className="outstanding-center-empty"><strong>{t("没有符合筛选的待清事项")}</strong>
      <span>{t("待清事项会独立于业务节点持续更新。")}</span></div>}</div>
  </div>;
}

function ConditionForm({ initial, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [label, setLabel] = React.useState(initial);
  return <form className="workbench-form" onSubmit={(event) => { event.preventDefault(); if (label.trim()) onSubmit(label.trim()); }}>
    <label><span>{t("完成条件 *")}</span><input autoFocus required value={label} onChange={(event) => setLabel(event.target.value)}
      placeholder={t("说明可客观确认的达成条件")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存条件")}</button></footer></form>;
}

function OutstandingForm({ initial, statuses, workstreams, defaultWorkstreamId, onSubmit, onClose }) {
  const { language, t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({ title: initial?.title || "", note: initial?.note || "",
    status: initial?.status || statuses.find((status) => !status.closed)?.id || statuses[0]?.id || "",
    workstreamId: initial?.workstreamId || defaultWorkstreamId || "" }));
  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  return <form className="workbench-form" onSubmit={(event) => { event.preventDefault(); if (values.title.trim()) onSubmit({ ...values,
    title: values.title.trim(), note: values.note.trim(), workstreamId: values.workstreamId || null }); }}>
    <label><span>{t("待清事项 *")}</span><input autoFocus required value={values.title} onChange={update("title")}
      placeholder={t("例如：尚欠银行月结单")} /></label>
    {workstreams.length > 0 && <label><span>{t("所属层级或业务模块")}</span><select value={values.workstreamId} onChange={update("workstreamId")}>
      <option value="">{t("项目级")}</option>{workstreams.map((workstream) => <option value={workstream.id} key={workstream.id}>
        {workstreamTypeLabel(workstream.type, language, workstream.customName)}</option>)}</select></label>}
    <label><span>{t("待清状态")}</span><select value={values.status} onChange={update("status")}>{statuses.map((status) =>
      <option value={status.id} key={status.id}>{status.label}</option>)}</select></label>
    <label><span>{t("说明")}</span><textarea rows="4" value={values.note} onChange={update("note")}
      placeholder={t("记录缺少内容、负责方或下一步跟进")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存待清事项")}</button></footer></form>;
}

function SampleRedactionForm({ language, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [names, setNames] = React.useState("");
  const [replacement, setReplacement] = React.useState(language === "en" ? "[Company Name]" : "[公司名称]");
  return <form className="workbench-form" onSubmit={(event) => { event.preventDefault(); const values = names.split(/\r?\n/u)
    .map((name) => name.trim()).filter(Boolean); if (values.length) onSubmit(values, replacement.trim() || "[公司名称]"); }}>
    <p className="form-help">{t("每行输入一个完整公司名称；系统只替换完全匹配的名称，完成后仍需人工复核。")}</p>
    <label><span>{t("需要去敏的完整公司名称 *")}</span><textarea autoFocus required rows="6" value={names}
      onChange={(event) => setNames(event.target.value)} placeholder={t("每行一个名称")} /></label>
    <label><span>{t("替换为")}</span><input value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("开始去敏")}</button></footer></form>;
}

function DeleteConfirm({ name, kind, onDelete, onClose }) {
  const { t } = useUiLanguage();
  return <div className="delete-confirm"><strong>{t("此操作不可撤销")}</strong>
    <p>{t(kind === "project" ? "项目“{name}”及其业务模块和待清事项将被永久删除，集团引用也会一并移除。"
      : "集团“{name}”将被永久删除，但不会删除其中的成员项目或子集团。", { name })}</p>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="button" className="button danger" onClick={onDelete}>{t("确认永久删除")}</button></footer></div>;
}

function InitializeWorkbenchConfirm({ onExport, onInitialize, onClose }) {
  const { t } = useUiLanguage();
  const [confirmed, setConfirmed] = React.useState(false);
  return <div className="initialize-confirm"><strong>{t("恢复为全新工作台")}</strong>
    <p>{t("初始化会清除当前浏览器内的全部项目、集团、待清事项、自定义范本、自定义种类及自定义状态，并恢复内置内容。此操作不可撤销。")}</p>
    <section><span>{t("建议先导出当前备份；如需找回资料，只能从备份文件恢复。")}</span>
      <button type="button" className="button secondary" onClick={onExport}>{t("先导出备份")}</button></section>
    <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
      <span>{t("我已了解上述资料会被清除。")}</span></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="button" className="button danger" disabled={!confirmed} onClick={onInitialize}>{t("确认初始化")}</button></footer></div>;
}

function SampleEditModal({ modal, store, language, t, categories, saveSample, resetSample, setModal }) {
  const source = modal.sample || store.samples.find((sample) => sample.id === modal.sampleId);
  if (!source) return null;
  const view = localizeSample(source, language);
  return <Modal title={t(source.id && store.samples.some((sample) => sample.id === source.id) ? "编辑范本" : "新建范本")}
    onClose={() => setModal({ type: "template-library" })} wide><SampleEditor sample={view} categories={categories} onSave={saveSample}
      onClose={() => setModal({ type: "template-library" })} onReset={source.builtinKey ? () => resetSample(source.id) : null}
      onRedact={(draft) => setModal({ type: "sample-redact", sample: draft || view })} /></Modal>;
}

function GroupSampleEditModal({ modal, store, language, t, saveGroupSample, setStore, setModal, notify }) {
  const source = modal.sample || store.groupSamples.find((sample) => sample.id === modal.sampleId);
  if (!source) return null;
  const view = localizeGroupSample(source, language);
  const reset = source.builtinKey ? () => {
    if (!window.confirm(t("恢复基础集团范本？当前自定义内容将被替换。"))) return;
    const restored = { ...createDefaultGroupSample(language), id: source.id };
    setStore((current) => ({ ...current, groupSamples: current.groupSamples.map((sample) => sample.id === source.id ? restored : sample) }));
    setModal({ type: "group-sample-edit", sampleId: source.id }); notify(t("集团范本已恢复为基础范本"));
  } : null;
  return <Modal title={t(store.groupSamples.some((sample) => sample.id === source.id) ? "编辑集团范本" : "新建集团范本")}
    onClose={() => setModal({ type: "template-library" })} wide><GroupSampleEditor sample={view} onSave={saveGroupSample}
      onClose={() => setModal({ type: "template-library" })} onReset={reset} /></Modal>;
}

function MemberEditModal({ modal, store, selectedGroupSample, updateGroup, setModal, notify, t, language }) {
  const group = store.groups.find((item) => item.id === modal.sourceGroupId);
  const member = group?.members.find((item) => item.id === modal.memberId);
  if (!group || !member) return null;
  const target = member.kind === "project" ? store.projects.find((item) => item.id === member.refId)
    : store.groups.find((item) => item.id === member.refId);
  const view = member.kind === "project" ? { ...member,
    readinessConditions: localizeReadinessConditions(member.readinessConditions, language) } : member;
  return <Modal title={t("组成部分设置：{name}", { name: target?.name || t("未知组成部分") })} onClose={() => setModal(null)}>
    <GroupMemberForm member={view} groupSample={selectedGroupSample || createDefaultGroupSample(language)}
      onClose={() => setModal(null)} onSubmit={(values) => { updateGroup(group.id, (current) => ({ ...current,
        members: current.members.map((item) => item.id === member.id ? values : item) })); setModal(null); notify(t("组成部分设置已更新")); }}
      onRemove={() => { if (!window.confirm(t("将“{name}”移出此集团？", { name: target?.name || t("此组成部分") }))) return;
        updateGroup(group.id, (current) => ({ ...current, members: current.members.filter((item) => item.id !== member.id) }));
        setModal(null); notify(t("组成部分已移出集团")); }} /></Modal>;
}
