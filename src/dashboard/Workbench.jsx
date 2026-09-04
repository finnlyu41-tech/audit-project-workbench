import React from "react";
import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, BarChart3, BellRing, BookOpen, Building, Building2, CalendarRange, Copy, DatabaseBackup, Eye, EyeOff, House, Languages, LibraryBig, ListPlus, Palette,
  ListFilter, PanelRightClose, PanelRightOpen, PanelsTopLeft, Pencil, Plus, ReceiptText, Search, Settings, Settings2, Trash2, X } from "lucide-react";
import { Modal, NodeBoard, NodeForm, OutstandingStatusEditor, ProgressBar, ProjectForm, SampleEditor,
  SampleLibrary, UserGuide, WorkstreamCard, WorkstreamCategoryEditor, WorkstreamForm } from "./components.jsx";
import { GroupForm, GroupMatrix, GroupMemberAddForm, GroupMemberForm, GroupSampleEditor, GroupSampleLibrary,
  WorkspaceTree } from "./group-components.jsx";
import { activeOutstandingItems,
  assignProjectToGroup, canMoveEntity, canMoveWorkspaceItem, canNestGroup, collectGroupOutstandingEntries, collectGroupTaxDeadlineEntries,
  componentsForCurrentStructure,
  createDefaultGroupSample, createDefaultSample, duplicateGroupSample,
  canonicalStorePayload,
  convertGroupToProject, convertProjectToGroup, deadlineAlerts, duplicateSample, emptyStore, engagementsForEntity,
  engagementMatchesNavigationFilters, engagementReportingYears, engagementTypeLabel, engagementTypeValues, engagementTypesLabel, entityForEngagement, findParentMembership, formatDate, groupProgress, isValidStore, loadStore, localizeGroupSample,
  localizeGroupWorkflowNodes, localizeOutstandingStatuses, localizeReadinessConditions, localizeSample, localizeWorkstream, makeBlankGroupSample,
  makeBlankSample, makeEngagement, makeEntity, makeGroup, makeGroupMember, makeNode, makeOutstandingItem, makeProject, makeTaxDeadline, makeWorkstream,
  mergeEntities, moveEntity, moveWorkspaceItem,
  engagementNavigationStatusCounts, navigationStatusCounts, normalizeStore, outstandingIsOpen, preserveLegacyRecovery, projectStats, reconcileWorkbenchStore, redactSampleCompanies, reorderWorkstreams, reorderWorkspaceSchedule, reportingPeriodLabel, syncEngagementToCurrentStructure, taxDeadlineSummary, uid, V10_RECOVERY_KEY,
  workstreamStats, reviseTaxDeadline, workstreamCategoryLabel, workstreamTypeLabel } from "./model.js";
import { LanguageProvider, useUiLanguage } from "./i18n.jsx";
import { DeadlineAlertCentre } from "./deadline-alerts.jsx";
import { ProjectSchedule } from "./timeline.jsx";
import { TaxDeadlineManager, TaxDeadlineSummaryButton } from "./tax-deadlines.jsx";
import { OpenWorkspaceFileConfirm, PersistenceConflictDialog, PersistenceSettingsPanel,
  persistenceStatusLabel } from "./persistence-ui.jsx";
import { useWorkbenchPersistence } from "./use-workbench-persistence.js";
import { handleTabListKeyDown, tabIndexFor } from "./a11y.js";
import { ManagementReport } from "./management-report.jsx";
import { HomeOverview } from "./home-overview.jsx";
import { TemplateExportPanel, TemplateImportPreview, TemplateLibraryTools } from "./template-transfer.jsx";
import { CompanyForm, EngagementForm, EntityOverview, HoldingComponentsPanel, MergeEntitiesForm } from "./v11-components.jsx";
import { applyTemplatePackage, createTemplatePackage, TEMPLATE_PACKAGE_MAX_BYTES,
  templatePackagePreview } from "./template-packages.js";
import "./dashboard.css";

const SIDEBAR_PREFERENCE_KEY = "audit-progress-workbench:sidebar-collapsed";
const OUTSTANDING_PREFERENCE_KEY = "audit-progress-workbench:outstanding-collapsed";
const NAVIGATION_WIDTH_KEY = "audit-progress-workbench:navigation-width";
const NAVIGATION_VIEW_KEY = "audit-progress-workbench:navigation-view";
const SIMPLIFIED_VIEW_KEY = "audit-progress-workbench:simplified-view";
const DEFAULT_NAVIGATION_WIDTH = 320;
const MIN_NAVIGATION_WIDTH = 220;
const MAX_NAVIGATION_WIDTH = 520;
const EMPTY_GROUP_SAMPLE = Object.freeze({ id: "", name: "", nodes: [], readinessTemplates: {} });

function clampNavigationWidth(value) {
  return Math.min(MAX_NAVIGATION_WIDTH, Math.max(MIN_NAVIGATION_WIDTH,
    Math.round(Number(value) || DEFAULT_NAVIGATION_WIDTH)));
}

function loadNavigationWidth() {
  try { return clampNavigationWidth(localStorage.getItem(NAVIGATION_WIDTH_KEY)); }
  catch { return DEFAULT_NAVIGATION_WIDTH; }
}

function saveNavigationWidth(value) {
  try { localStorage.setItem(NAVIGATION_WIDTH_KEY, String(clampNavigationWidth(value))); }
  catch { /* Layout preferences can safely fall back to the default width. */ }
}

function loadInitialWorkspaceView() {
  try {
    const view = new URLSearchParams(window.location.search).get("view");
    return ["detail", "schedule", "report"].includes(view) ? view : "home";
  } catch { return "home"; }
}

export function DashboardContent() {
  return <LanguageProvider><DashboardWorkbench /></LanguageProvider>;
}

function revealOverflowText(event) {
  const origin = event.target;
  if (!(origin instanceof Element)) return;
  const target = origin.closest("input, textarea, select, button, dd, dt, strong, small, p, span");
  if (!target || !event.currentTarget.contains(target) || target.closest("[data-tooltip]")
    || (target.hasAttribute("title") && !target.dataset.generatedOverflowTitle)) return;
  const text = target instanceof HTMLSelectElement ? target.selectedOptions[0]?.textContent
    : target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target.value : target.textContent;
  const label = String(text || "").replace(/\s+/gu, " ").trim();
  const overflows = target instanceof HTMLSelectElement
    || target.scrollWidth > target.clientWidth + 1 || target.scrollHeight > target.clientHeight + 1;
  if (label && overflows) {
    target.title = label;
    target.dataset.generatedOverflowTitle = "true";
  } else if (target.dataset.generatedOverflowTitle) {
    target.removeAttribute("title");
    delete target.dataset.generatedOverflowTitle;
  }
}

function DashboardWorkbench() {
  const { language, setLanguage, t } = useUiLanguage();
  const [store, setRawStore] = React.useState(loadStore);
  const setStore = React.useCallback((action) => setRawStore((current) => reconcileWorkbenchStore(current,
    typeof action === "function" ? action(current) : action)), []);
  const persistence = useWorkbenchPersistence({ store, setStore });
  const [selection, setSelection] = React.useState(null);
  const [activeWorkstreamId, setActiveWorkstreamId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("active");
  const [navigationFiltersOpen, setNavigationFiltersOpen] = React.useState(false);
  const [navigationFilters, setNavigationFilters] = React.useState({ owner: "", engagementType: "", reportingYear: "" });
  const [navigationView, setNavigationView] = React.useState(() => {
    try { return localStorage.getItem(NAVIGATION_VIEW_KEY) === "projects" ? "projects" : "companies"; }
    catch { return "companies"; }
  });
  const [simplifiedView, setSimplifiedView] = React.useState(() => {
    try { return localStorage.getItem(SIMPLIFIED_VIEW_KEY) === "true"; }
    catch { return false; }
  });
  const [templateType, setTemplateType] = React.useState("audit");
  const [templateTag, setTemplateTag] = React.useState("all");
  const [templateSort, setTemplateSort] = React.useState("updated");
  const [workspaceView, setWorkspaceView] = React.useState(loadInitialWorkspaceView);
  const [modal, setModal] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [deadlineClock, setDeadlineClock] = React.useState(() => new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true"; } catch { return false; }
  });
  const [navigationWidth, setNavigationWidth] = React.useState(loadNavigationWidth);
  const [resizingNavigation, setResizingNavigation] = React.useState(false);
  const [outstandingCollapsed, setOutstandingCollapsed] = React.useState(() => {
    try { return localStorage.getItem(OUTSTANDING_PREFERENCE_KEY) === "true"; } catch { return false; }
  });
  const [compactLayout, setCompactLayout] = React.useState(() => {
    try { return window.matchMedia("(max-width: 1399px)").matches; } catch { return false; }
  });
  const [compactOutstandingOpen, setCompactOutstandingOpen] = React.useState(false);
  const importRef = React.useRef(null);
  const templateImportRef = React.useRef(null);
  const toolbarRef = React.useRef(null);
  const toolbarMenuRefs = React.useRef([]);
  const deadlineNoticeShownRef = React.useRef(false);
  const shownConflictRef = React.useRef(null);
  const navigationHistoryRef = React.useRef({ entries: [], index: -1, restoring: false });
  const navigationResizeRef = React.useRef(null);
  const [, setNavigationHistoryRevision] = React.useState(0);
  const deadlineAlertItems = React.useMemo(() => deadlineAlerts(store, deadlineClock), [store, deadlineClock]);
  const closeMenu = React.useCallback(() => toolbarMenuRefs.current.forEach((menu) => {
    if (menu) menu.open = false;
  }), []);
  const closeOtherMenus = React.useCallback((index) => {
    toolbarMenuRefs.current.forEach((menu, itemIndex) => {
      if (menu && itemIndex !== index) menu.open = false;
    });
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => setDeadlineClock(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed)); } catch { /* optional */ }
  }, [sidebarCollapsed]);
  React.useEffect(() => {
    try { localStorage.setItem(OUTSTANDING_PREFERENCE_KEY, String(outstandingCollapsed)); } catch { /* optional */ }
  }, [outstandingCollapsed]);
  React.useEffect(() => {
    try { localStorage.setItem(NAVIGATION_VIEW_KEY, navigationView); } catch { /* optional */ }
  }, [navigationView]);
  React.useEffect(() => {
    try { localStorage.setItem(SIMPLIFIED_VIEW_KEY, String(simplifiedView)); } catch { /* optional */ }
  }, [simplifiedView]);
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
    const advancedFiltersActive = Object.values(navigationFilters).some(Boolean);
    const engagementMatchesFilter = (engagement) => {
      if (!engagementMatchesNavigationFilters(engagement, navigationFilters)) return false;
      const entity = entityForEngagement(store, engagement);
      const archived = Boolean(entity?.archived || engagement.archived);
      if (filter === "archived") return archived;
      if (archived) return false;
      const view = entity?.kind === "holding_company" ? store.groups.find((item) => item.id === engagement.id)
        : store.projects.find((item) => item.id === engagement.id);
      const complete = entity?.kind === "holding_company" ? Boolean(view && groupProgress(store, engagement.id).ready)
        : Boolean(view && projectStats(view).complete);
      if (filter === "completed") return complete;
      if (filter === "active") return !complete;
      return true;
    };
    const selectedEngagement = ["project", "group"].includes(selection?.kind)
      ? store.engagements.find((engagement) => engagement.id === selection.id) : null;
    const selectedEntity = selection?.kind === "entity" ? store.entities.find((entity) => entity.id === selection.id) : null;
    const selectedEntityEngagements = selectedEntity ? engagementsForEntity(store, selectedEntity.id) : [];
    const selectedEntityMatchesAdvanced = !advancedFiltersActive
      || selectedEntityEngagements.some((engagement) => engagementMatchesNavigationFilters(engagement, navigationFilters));
    const selectedEntityVisible = selectedEntity && selectedEntityMatchesAdvanced && (filter === "all"
      ? !selectedEntity.archived
      : filter === "archived"
        ? selectedEntity.archived || selectedEntityEngagements.some(engagementMatchesFilter)
        : !selectedEntity.archived && (selectedEntityEngagements.some(engagementMatchesFilter)
          || (!advancedFiltersActive && filter === "active" && selectedEntityEngagements.length === 0)));
    if ((!selectedEngagement || !engagementMatchesFilter(selectedEngagement)) && !selectedEntityVisible) {
      const engagement = store.engagements.find(engagementMatchesFilter);
      if (engagement) {
        const entity = entityForEngagement(store, engagement);
        setSelection({ kind: entity?.kind === "holding_company" ? "group" : "project", id: engagement.id });
      } else {
        const entity = !advancedFiltersActive
          ? store.entities.find((item) => filter === "archived" ? item.archived : !item.archived) : null;
        setSelection(entity ? { kind: "entity", id: entity.id } : null);
      }
    }
  }, [store, selection, filter, navigationFilters]);
  React.useEffect(() => {
    if (!selection && store.entities.length) return;
    const history = navigationHistoryRef.current;
    if (history.restoring) { history.restoring = false; return; }
    const entry = { workspaceView, selection: selection ? { kind: selection.kind, id: selection.id } : null };
    const current = history.entries[history.index];
    if (current?.workspaceView === entry.workspaceView && current?.selection?.kind === entry.selection?.kind
      && current?.selection?.id === entry.selection?.id) return;
    history.entries = [...history.entries.slice(0, history.index + 1), entry].slice(-50);
    history.index = history.entries.length - 1;
    setNavigationHistoryRevision((value) => value + 1);
  }, [workspaceView, selection?.kind, selection?.id, store.entities.length]);
  React.useEffect(() => {
    if (selection?.kind !== "project") { setActiveWorkstreamId(null); return; }
    const project = store.projects.find((item) => item.id === selection.id);
    if (activeWorkstreamId && !project?.workstreams.some((workstream) => workstream.id === activeWorkstreamId)) setActiveWorkstreamId(null);
  }, [selection, store.projects, activeWorkstreamId]);
  React.useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);
  React.useEffect(() => {
    if (!persistence.conflict) { shownConflictRef.current = null; return; }
    if (!modal && shownConflictRef.current !== persistence.conflict) {
      shownConflictRef.current = persistence.conflict;
      setModal({ type: "persistence-conflict" });
    }
  }, [modal, persistence.conflict]);
  React.useEffect(() => {
    if (deadlineNoticeShownRef.current || !deadlineAlertItems.length) return;
    deadlineNoticeShownRef.current = true;
    setMessage(t("{count} 项期限需要关注", { count: deadlineAlertItems.length }));
  }, [deadlineAlertItems.length, t]);
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
  const openWorkspaceRecord = React.useCallback((kind, id) => {
    setSelection({ kind, id });
    setWorkspaceView("detail");
  }, []);
  const openScheduleEditor = React.useCallback((kind, id) => {
    const target = kind === "group" ? store.groups.find((item) => item.id === id)
      : store.projects.find((item) => item.id === id);
    if (!target || target.archived) {
      if (target) openWorkspaceRecord(kind, id);
      return;
    }
    setSelection({ kind, id });
    setModal({ type: "edit-engagement", targetKind: kind, targetId: id,
      quickField: "schedule" });
  }, [openWorkspaceRecord, store.groups, store.projects]);
  const openTaxDeadlineCentre = React.useCallback((kind, id, deadlineId = null) => {
    const engagement = kind === "entity" ? null : store.engagements.find((item) => item.id === id);
    const entityId = kind === "entity" ? id : engagement?.entityId;
    if (!entityId) return;
    if (kind === "entity") openWorkspaceRecord("entity", entityId); else openWorkspaceRecord(kind, id);
    setModal({ type: "tax-deadlines", targetKind: "entity", targetId: entityId, deadlineId,
      engagementId: engagement?.id || null });
  }, [openWorkspaceRecord, store.engagements]);
  const openDeadlineAlert = React.useCallback((alert) => {
    if (alert.scope === "tax") {
      setFilter("all");
      openTaxDeadlineCentre(alert.targetKind, alert.targetId, alert.taxDeadline?.id || null);
      return;
    }
    openWorkspaceRecord(alert.targetKind, alert.targetId);
    setActiveWorkstreamId(null);
    setModal(null);
  }, [openTaxDeadlineCentre, openWorkspaceRecord]);
  const selectedProjectSource = selection?.kind === "project"
    ? store.projects.find((project) => project.id === selection.id) || null : null;
  const selectedGroupSource = selection?.kind === "group"
    ? store.groups.find((group) => group.id === selection.id) || null : null;
  const selectedEntitySource = selection?.kind === "entity"
    ? store.entities.find((entity) => entity.id === selection.id) || null : null;
  const selectedEngagement = ["project", "group"].includes(selection?.kind)
    ? store.engagements.find((engagement) => engagement.id === selection.id) || null : null;
  const selectedRecordEntity = selectedEngagement ? entityForEngagement(store, selectedEngagement) : selectedEntitySource;
  const selectedProjectParentEntity = selectedRecordEntity?.parentEntityId
    ? store.entities.find((entity) => entity.id === selectedRecordEntity.parentEntityId) : null;
  const selectedProjectMembership = selectedProjectSource && selectedProjectParentEntity
    ? { group: { id: selectedProjectParentEntity.id, name: selectedProjectParentEntity.legalName } } : null;
  const selectedProject = selectedProjectSource ? { ...selectedProjectSource,
    workstreams: selectedProjectSource.workstreams.map((workstream) => localizeWorkstream(workstream, language)) } : null;
  const selectedGroup = selectedGroupSource ? { ...selectedGroupSource,
    nodes: localizeGroupWorkflowNodes(selectedGroupSource.nodes, language) } : null;
  const sampleViews = store.samples.map((sample) => localizeSample(sample, language));
  const workstreamCategoryViews = store.workstreamCategories.map((category) => ({ ...category,
    label: workstreamCategoryLabel(category, language) }));
  const groupSampleViews = store.groupSamples.map((sample) => localizeGroupSample(sample, language));
  const allTemplateTags = [...new Set([...sampleViews, ...groupSampleViews].flatMap((sample) => sample.tags || []))]
    .sort((left, right) => left.localeCompare(right));
  const sortTemplateViews = React.useCallback((samples) => [...samples].filter((sample) => templateTag === "all"
    || sample.tags?.includes(templateTag)).sort((left, right) => templateSort === "name"
    ? left.name.localeCompare(right.name) : templateSort === "created"
      ? (right.createdAt || "").localeCompare(left.createdAt || "") : (right.updatedAt || "").localeCompare(left.updatedAt || "")),
  [templateSort, templateTag]);
  const visibleSampleViews = sortTemplateViews(sampleViews);
  const visibleGroupSampleViews = sortTemplateViews(groupSampleViews);
  const selectedGroupSample = groupSampleViews.find((sample) => sample.id === store.selectedGroupSampleId)
    || groupSampleViews[0] || null;
  const outstandingStatusViews = localizeOutstandingStatuses(store.outstandingStatuses, language);
  const allOutstandingItems = store.engagements.flatMap((item) => item.outstandingItems || []);
  const outstandingStatusUsage = allOutstandingItems.reduce((counts, item) => ({
    ...counts, [item.status]: (counts[item.status] || 0) + 1,
  }), {});
  const workstreamCategoryUsage = Object.fromEntries(store.workstreamCategories.map((category) => [category.id, {
    templates: store.samples.filter((sample) => sample.categoryId === category.id).length,
    workstreams: store.projects.reduce((count, project) => count
      + project.workstreams.filter((workstream) => workstream.categoryId === category.id).length, 0),
  }]));
  const navigationOwnerOptions = [...new Set(store.engagements.map((engagement) => String(engagement.owner || "").trim())
    .filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const navigationTypeOptions = [...new Set(store.engagements.flatMap(engagementTypeValues)
    .filter(Boolean))].map((value) => ({ value, label: engagementTypeLabel(value, language) || value }))
    .sort((left, right) => left.label.localeCompare(right.label));
  const navigationYearOptions = [...new Set(store.engagements.flatMap(engagementReportingYears))]
    .sort((left, right) => right.localeCompare(left));
  const activeNavigationFilterCount = Object.values(navigationFilters).filter(Boolean).length;
  const updateNavigationFilter = (field) => (event) => setNavigationFilters((current) => ({
    ...current, [field]: event.target.value,
  }));
  const clearNavigationFilters = () => setNavigationFilters({ owner: "", engagementType: "", reportingYear: "" });
  const navigationCounts = navigationView === "projects"
    ? engagementNavigationStatusCounts(store) : navigationStatusCounts(store);

  const updateProject = React.useCallback((projectId, updater) => setStore((current) => ({ ...current,
    projects: current.projects.map((project) => project.id === projectId
      ? { ...updater(project), updatedAt: new Date().toISOString() } : project),
  })), []);
  const updateGroup = React.useCallback((groupId, updater) => setStore((current) => ({ ...current,
    groups: current.groups.map((group) => group.id === groupId
      ? { ...updater(group), updatedAt: new Date().toISOString() } : group),
  })), []);
  const updateEntity = React.useCallback((entityId, updater) => setStore((current) => ({ ...current,
    entities: current.entities.map((entity) => entity.id === entityId
      ? { ...updater(entity), updatedAt: new Date().toISOString() } : entity),
  })), []);
  const updateEngagement = React.useCallback((engagementId, updater) => setStore((current) => ({ ...current,
    engagements: current.engagements.map((engagement) => engagement.id === engagementId
      ? { ...updater(engagement), updatedAt: new Date().toISOString() } : engagement),
  })), []);
  const saveTaxDeadline = React.useCallback((kind, targetId, existing, values, revisionReason = "") => {
    const engagement = kind === "entity" ? null : store.engagements.find((item) => item.id === targetId);
    const entityId = kind === "entity" ? targetId : engagement?.entityId;
    if (!entityId) return;
    updateEntity(entityId, (target) => {
      const linkedEngagement = store.engagements.find((item) => item.id === values.linkedEngagementId
        && item.entityId === entityId);
      const cleanedValues = { ...values,
        linkedEngagementId: linkedEngagement?.id || null,
        linkedWorkstreamId: linkedEngagement?.workstreams.some((workstream) => workstream.id === values.linkedWorkstreamId)
          ? values.linkedWorkstreamId : null };
      const taxDeadlines = existing
        ? (target.taxDeadlines || []).map((deadline) => deadline.id === existing.id
          ? reviseTaxDeadline(deadline, cleanedValues, revisionReason) : deadline)
        : [...(target.taxDeadlines || []), makeTaxDeadline(cleanedValues)];
      return { ...target, taxDeadlines };
    });
    notify(t(existing ? "税务期限已更新" : "税务期限已新增"));
  }, [store.engagements, t, updateEntity]);
  const deleteTaxDeadline = React.useCallback((kind, targetId, deadlineId) => {
    const engagement = kind === "entity" ? null : store.engagements.find((item) => item.id === targetId);
    const entityId = kind === "entity" ? targetId : engagement?.entityId;
    if (!entityId) return;
    updateEntity(entityId, (target) => ({ ...target,
      taxDeadlines: (target.taxDeadlines || []).filter((deadline) => deadline.id !== deadlineId) }));
    notify(t("税务期限已删除"));
  }, [store.engagements, t, updateEntity]);
  const moveNavigationItem = (kind, refId, parentGroupId) => {
    if (kind === "entity") {
      if (!canMoveEntity(store, refId, parentGroupId)) { notify(t("无法移动到这个控股公司")); return; }
      const source = store.entities.find((entity) => entity.id === refId);
      const target = store.entities.find((entity) => entity.id === parentGroupId);
      if ((source?.parentEntityId || "") === parentGroupId) return;
      setStore((current) => moveEntity(current, refId, parentGroupId));
      notify(target ? t("{name} 已移到“{group}”", { name: source?.legalName || "", group: target.legalName })
        : t("{name} 已移到顶层", { name: source?.legalName || "" }));
      return;
    }
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
        || current.groupSamples[0] || EMPTY_GROUP_SAMPLE;
      return moveWorkspaceItem(current, kind, refId, parentGroupId, groupSample);
    });
    notify(target ? t("{name} 已移到“{group}”", { name: source?.name || "", group: target.name })
      : t("{name} 已移到顶层", { name: source?.name || "" }));
  };
  const reorderSchedule = (sourceKey, targetKey, position) => {
    setStore((current) => reorderWorkspaceSchedule(current, sourceKey, targetKey, position));
    notify(t("项目排期顺序已更新"));
  };
  const reorderProjectWorkstreams = (projectId, sourceId, targetId, position) => {
    updateProject(projectId, (project) => ({ ...project,
      workstreams: reorderWorkstreams(project.workstreams, sourceId, targetId, position) }));
    notify(t("业务模块顺序已更新"));
  };
  const updateWorkflowNodes = (targetKind, targetId, workstreamId, updater) => {
    if (targetKind === "group") updateGroup(targetId, (group) => ({ ...group, nodes: updater(group.nodes) }));
    else updateProject(targetId, (project) => ({ ...project, workstreams: project.workstreams.map((workstream) =>
      workstream.id === workstreamId ? { ...workstream, nodes: updater(workstream.nodes), updatedAt: new Date().toISOString() } : workstream) }));
  };

  const createEntity = (values) => {
    const { batchCompanies = [], ...entityValues } = values;
    const entity = makeEntity(entityValues);
    const members = batchCompanies.map((company) => makeEntity({ ...company,
      parentEntityId: entity.id, relationshipRole: company.relationshipRole || "子公司" }));
    const createdIds = [entity.id, ...members.map((member) => member.id)];
    setStore((current) => ({ ...current, entities: [entity, ...members, ...current.entities],
      entityOrder: [...createdIds, ...(current.entityOrder || []).filter((id) => !createdIds.includes(id))] }));
    setSelection({ kind: "entity", id: entity.id }); setWorkspaceView("detail"); setFilter("all"); setModal(null);
    notify(t(members.length ? "集团及 {count} 家公司已建立并自动保存" : "公司主档已建立并自动保存",
      { count: members.length }));
  };
  const createAnnualEngagement = (entity, values, options) => {
    try {
      let engagement = makeEngagement(values, { ...options, entity, store, samples: store.samples,
        workstreamCategories: store.workstreamCategories, outstandingStatuses: store.outstandingStatuses,
        groupSample: selectedGroupSample || EMPTY_GROUP_SAMPLE });
      if (entity.kind === "holding_company" && engagement.consolidation) engagement = { ...engagement,
        consolidation: { ...engagement.consolidation,
          components: componentsForCurrentStructure(store, entity.id, engagement.periodStart, engagement.periodEnd,
            selectedGroupSample || EMPTY_GROUP_SAMPLE, engagement.reportingPeriods) } };
      const kind = entity.kind === "holding_company" ? "group" : "project";
      setStore((current) => ({ ...current, engagements: [engagement, ...current.engagements],
        scheduleOrder: [`${kind}:${engagement.id}`, ...(current.scheduleOrder || []).filter((key) => !key.endsWith(`:${engagement.id}`))] }));
      setSelection({ kind, id: engagement.id }); setWorkspaceView("detail"); setFilter("active"); setModal(null);
      setActiveWorkstreamId(null); notify(t("年度项目已建立并自动保存"));
    } catch (error) { window.alert(t(error.message.includes("already exists")
      ? "这家公司已经有相同报告期间的项目，包括归档项目。" : "请检查报告期间后再建立项目。")); }
  };
  const duplicateProject = (project) => {
    const engagement = store.engagements.find((item) => item.id === project.id);
    const entity = entityForEngagement(store, engagement);
    if (entity) setModal({ type: "create-engagement", entityId: entity.id, sourceEngagementId: engagement.id });
  };
  const archiveTarget = (kind, id) => {
    updateEngagement(id, (item) => ({ ...item, archived: true }));
    notify(t("年度项目已归档"));
  };
  const restoreTarget = (kind, id) => {
    updateEngagement(id, (item) => ({ ...item, archived: false }));
    setFilter("active"); notify(t("年度项目已恢复"));
  };
  const permanentlyDeleteTarget = (kind, id) => {
    setStore((current) => ({ ...current, engagements: current.engagements.filter((engagement) => engagement.id !== id),
      scheduleOrder: (current.scheduleOrder || []).filter((key) => !key.endsWith(`:${id}`)) }));
    const entity = store.engagements.find((engagement) => engagement.id === id)?.entityId;
    setSelection(entity ? { kind: "entity", id: entity } : null); setModal(null); notify(t("年度项目已永久删除"));
  };

  const addWorkstream = (projectId, values) => {
    const sample = store.samples.find((item) => item.id === values.sampleId && item.categoryId === values.categoryId) || null;
    const workstream = makeWorkstream(values, sample);
    updateProject(projectId, (project) => ({ ...project, workstreams: [...project.workstreams, workstream] }));
    setActiveWorkstreamId(null); setModal(null); notify(t("业务模块已添加"));
  };
  const updateWorkstream = (projectId, workstreamId, values) => {
    updateProject(projectId, (project) => ({ ...project, workstreams: project.workstreams.map((workstream) =>
      workstream.id === workstreamId ? { ...workstream, customName: values.customName,
        updatedAt: new Date().toISOString() } : workstream) }));
    setModal(null); notify(t("业务模块已更新"));
  };
  const removeWorkstream = (projectId, workstreamId) => {
    const project = store.projects.find((item) => item.id === projectId);
    if (!project) return;
    if (!window.confirm(t("移除这个业务模块？其节点和条件将被永久删除，相关待清事项会改为项目级。"))) return;
    updateProject(projectId, (current) => ({ ...current,
      workstreams: current.workstreams.filter((workstream) => workstream.id !== workstreamId),
      outstandingItems: current.outstandingItems.map((item) => item.workstreamId === workstreamId
        ? { ...item, workstreamId: null } : item),
      taxDeadlines: (current.taxDeadlines || []).map((deadline) => deadline.linkedWorkstreamId === workstreamId
        ? { ...deadline, linkedWorkstreamId: null, updatedAt: new Date().toISOString() } : deadline) }));
    setActiveWorkstreamId(project.workstreams.find((workstream) => workstream.id !== workstreamId)?.id || null);
    setModal(null); notify(t("业务模块已移除"));
  };

  const saveSample = (sample) => {
    const saved = { ...sample, builtinKey: undefined, updatedAt: new Date().toISOString() };
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
    const saved = { ...sample, builtinKey: undefined, updatedAt: new Date().toISOString() };
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
      if (!window.confirm(t("删除集团范本“{name}”？", { name: source.name }))) return;
      setStore((current) => { const next = current.groupSamples.filter((sample) => sample.id !== sampleId); return { ...current,
        groupSamples: next, selectedGroupSampleId: current.selectedGroupSampleId === sampleId
          ? next[0]?.id || null : current.selectedGroupSampleId }; });
      notify(t("集团范本已删除")); return;
    }
    const source = store.samples.find((sample) => sample.id === sampleId); if (!source) return;
    if (!window.confirm(t("删除范本“{name}”？现有项目不会受影响；以后新建业务模块将不能再使用此范本。", { name: source.name }))) return;
    setStore((current) => { const next = current.samples.filter((sample) => sample.id !== sampleId);
      const replacement = next.find((sample) => sample.categoryId === source.categoryId)?.id || null;
      return { ...current, samples: next, selectedSampleIdsByCategory: { ...current.selectedSampleIdsByCategory,
        [source.categoryId]: current.selectedSampleIdsByCategory[source.categoryId] === sampleId
          ? replacement : current.selectedSampleIdsByCategory[source.categoryId] } }; }); notify(t("范本已删除"));
  };
  const saveWorkstreamCategories = (categories) => {
    const categoriesById = Object.fromEntries(categories.map((category) => [category.id, category]));
    setStore((current) => ({ ...current, workstreamCategories: categories,
      selectedSampleIdsByCategory: Object.fromEntries(categories.map((category) => [category.id,
        current.selectedSampleIdsByCategory[category.id]
          || current.samples.find((sample) => sample.categoryId === category.id)?.id || null])),
      projects: current.projects.map((project) => ({ ...project, workstreams: project.workstreams.map((workstream) => {
        const category = categoriesById[workstream.categoryId];
        if (!category || (category.id === "custom" && category.builtinType === "custom")) return workstream;
        return { ...workstream, customName: category.name || "", updatedAt: new Date().toISOString() };
      }) })),
    }));
    if (templateType !== "group" && !categories.some((category) => category.id === templateType)) {
      setTemplateType(categories[0]?.id || "group");
    }
    setModal({ type: "template-library" }); notify(t("范本种类已更新"));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(canonicalStorePayload(store), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `audit-project-workbench-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    URL.revokeObjectURL(url); closeMenu(); notify(t("备份已导出"));
  };
  const hasV10Recovery = (() => { try { return Boolean(localStorage.getItem(V10_RECOVERY_KEY)); } catch { return false; } })();
  const downloadV10Recovery = () => {
    try {
      const payload = localStorage.getItem(V10_RECOVERY_KEY);
      if (!payload) return;
      const blob = new Blob([`${JSON.stringify(JSON.parse(payload), null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `audit-project-workbench-v10-recovery-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
      URL.revokeObjectURL(url); closeMenu(); notify(t("V10 恢复副本已下载"));
    } catch { window.alert(t("无法读取 V10 恢复副本。")); }
  };
  const templatePackageErrorText = (error) => t({
    file_too_large: "范本包超过 5 MB 上限。",
    invalid_json: "范本包不是有效的 JSON 文件。",
    unsupported_package: "这不是受支持的 APW 范本包。",
    contains_workspace_data: "范本包不能包含公司、项目或税务资料。",
    empty_selection: "请至少选择一个范本。",
  }[error?.code] || "范本包结构无效或超过安全限制。");
  const readTemplatePackage = async (file) => {
    if (!file) return;
    try {
      if (file.size > TEMPLATE_PACKAGE_MAX_BYTES) {
        const error = new Error("file too large"); error.code = "file_too_large"; throw error;
      }
      const preview = templatePackagePreview(store, await file.text());
      setModal({ type: "template-import-preview", preview });
    } catch (error) {
      window.alert(templatePackageErrorText(error));
    } finally {
      if (templateImportRef.current) templateImportRef.current.value = "";
    }
  };
  const exportTemplatePackage = (selection) => {
    try {
      const packageStore = { ...store, samples: sampleViews, groupSamples: groupSampleViews };
      const payload = createTemplatePackage(packageStore, selection);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `apw-template-package-${new Date().toISOString().slice(0, 10)}.apw-template.json`; anchor.click();
      URL.revokeObjectURL(url); setModal({ type: "template-library" }); notify(t("范本包已导出"));
    } catch (error) { window.alert(templatePackageErrorText(error)); }
  };
  const importBackup = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()); if (!isValidStore(parsed)) throw new Error("invalid");
      const confirmKey = persistence.settings.mode === "linked_file"
        ? "将导入 {entities} 个公司主档、{engagements} 个年度项目及全部范本，并替换浏览器资料和当前关联文件，是否继续？"
        : "将导入 {entities} 个公司主档、{engagements} 个年度项目及全部范本，并替换当前数据，是否继续？";
      const engagementCount = Array.isArray(parsed.engagements) ? parsed.engagements.length
        : (parsed.projects?.length || 0) + (parsed.groups?.length || 0);
      const entityCount = Array.isArray(parsed.entities) ? parsed.entities.length : engagementCount;
      if (!window.confirm(t(confirmKey, { entities: entityCount, engagements: engagementCount }))) return;
      preserveLegacyRecovery(parsed);
      const normalized = normalizeStore(parsed); setStore(normalized); setSelection(null); setWorkspaceView("home"); setFilter("active"); notify(t("备份已恢复"));
    } catch { window.alert(t("这不是有效的工作台备份文件。")); }
    finally { if (importRef.current) importRef.current.value = ""; closeMenu(); }
  };
  const initializeWorkbench = async () => {
    if (persistence.settings.mode === "linked_file") await persistence.disconnect();
    setStore(emptyStore()); setSelection(null); setWorkspaceView("home"); setActiveWorkstreamId(null); setFilter("active"); setSearch("");
    setTemplateType("audit"); setModal(null); notify(t("工作台已初始化"));
  };
  const openExistingWorkspaceFile = async () => {
    const candidate = await persistence.chooseExistingFile();
    if (candidate) setModal({ type: "open-workspace-file", candidate });
  };

  const modalTargetProject = modal?.targetKind === "project" ? store.projects.find((item) => item.id === modal.targetId) : null;
  const modalTargetGroup = modal?.targetKind === "group" ? store.groups.find((item) => item.id === modal.targetId) : null;
  const modalTargetEngagement = modal?.targetId ? store.engagements.find((item) => item.id === modal.targetId) || null : null;
  const modalTargetEntity = modal?.targetKind === "entity"
    ? store.entities.find((item) => item.id === modal.targetId) || null
    : entityForEngagement(store, modalTargetEngagement);
  const modalTargetWorkstream = modalTargetProject?.workstreams.find((item) => item.id === modal.workstreamId) || null;
  const quickProjectTitle = ({ owner: "负责人", schedule: "项目排期", framework: "财务报告准则／框架" })[modal?.quickField];
  const modalWorkflowNodes = modal?.targetKind === "group" ? modalTargetGroup?.nodes : modalTargetWorkstream?.nodes;
  const modalNode = modalWorkflowNodes?.find((item) => item.id === modal?.nodeId) || modal?.node || null;
  const availableProjects = store.projects.filter((project) => !project.archived && !findParentMembership(store, "project", project.id));
  const availableGroups = store.groups.filter((group) => !group.archived && group.id !== selectedGroupSource?.id
    && canNestGroup(store, selectedGroupSource?.id, group.id));
  const activeOutstandingCount = activeOutstandingItems(store).filter((item) => outstandingIsOpen(item, store.outstandingStatuses)).length;
  const languageLabel = language === "en" ? "English" : language === "zh-Hant" ? "繁體中文" : "简体中文";
  const languageCode = language === "en" ? "EN" : language === "zh-Hant" ? "繁" : "简";
  const saveStateLabel = persistenceStatusLabel(persistence.status, t);
  const outstandingPanelCollapsed = compactLayout ? !compactOutstandingOpen : outstandingCollapsed;
  const expandOutstandingPanel = () => compactLayout ? setCompactOutstandingOpen(true) : setOutstandingCollapsed(false);
  const collapseOutstandingPanel = () => compactLayout ? setCompactOutstandingOpen(false) : setOutstandingCollapsed(true);
  const navigationEntryExists = (entry) => {
    if (!entry) return false;
    if (entry.workspaceView !== "detail") return true;
    if (!entry.selection) return store.entities.length === 0;
    if (entry.selection.kind === "entity") return store.entities.some((entity) => entity.id === entry.selection.id);
    return store.engagements.some((engagement) => engagement.id === entry.selection.id);
  };
  const nextHistoryIndex = (direction) => {
    const history = navigationHistoryRef.current;
    for (let index = history.index + direction; index >= 0 && index < history.entries.length; index += direction) {
      if (navigationEntryExists(history.entries[index])) return index;
    }
    return -1;
  };
  const goThroughHistory = (direction) => {
    const history = navigationHistoryRef.current;
    const index = nextHistoryIndex(direction);
    if (index < 0) return;
    const entry = history.entries[index];
    history.index = index;
    history.restoring = true;
    setSelection(entry.selection ? { ...entry.selection } : null);
    setWorkspaceView(entry.workspaceView);
    setModal(null);
    setNavigationHistoryRevision((value) => value + 1);
  };
  const backHistoryIndex = nextHistoryIndex(-1);
  const forwardHistoryIndex = nextHistoryIndex(1);
  const beginNavigationResize = (event) => {
    event.preventDefault();
    navigationResizeRef.current = { pointerId: event.pointerId, startX: event.clientX,
      startWidth: navigationWidth, currentWidth: navigationWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingNavigation(true);
  };
  const resizeNavigation = (event) => {
    const resize = navigationResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const width = clampNavigationWidth(resize.startWidth + event.clientX - resize.startX);
    resize.currentWidth = width;
    setNavigationWidth(width);
  };
  const finishNavigationResize = (event) => {
    const resize = navigationResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    saveNavigationWidth(resize.currentWidth);
    navigationResizeRef.current = null;
    setResizingNavigation(false);
  };
  const resizeNavigationWithKeyboard = (event) => {
    const increments = { ArrowLeft: -20, ArrowRight: 20, Home: MIN_NAVIGATION_WIDTH, End: MAX_NAVIGATION_WIDTH };
    if (!(event.key in increments)) return;
    event.preventDefault();
    const width = ["Home", "End"].includes(event.key) ? increments[event.key]
      : clampNavigationWidth(navigationWidth + increments[event.key]);
    setNavigationWidth(width);
    saveNavigationWidth(width);
  };
  const resetNavigationWidth = () => {
    setNavigationWidth(DEFAULT_NAVIGATION_WIDTH);
    saveNavigationWidth(DEFAULT_NAVIGATION_WIDTH);
  };
  React.useEffect(() => {
    if (!resizingNavigation) return undefined;
    const move = (event) => {
      const resize = navigationResizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      const width = clampNavigationWidth(resize.startWidth + event.clientX - resize.startX);
      resize.currentWidth = width;
      setNavigationWidth(width);
    };
    const finish = (event) => {
      const resize = navigationResizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      saveNavigationWidth(resize.currentWidth);
      navigationResizeRef.current = null;
      setResizingNavigation(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [resizingNavigation]);

  return <article className="audit-workbench" onMouseOver={revealOverflowText} onFocusCapture={revealOverflowText}>
    {message && <div className="save-toast" role="status">{message}</div>}
    <h1 className="visually-hidden">{t("审计项目工作台")}</h1>
    <aside className="app-rail" aria-label={t("工作台操作")}>
      <button type="button" className="app-mark" aria-expanded={!sidebarCollapsed}
        aria-label={t(sidebarCollapsed ? "展开项目导航" : "收起项目导航")}
        data-tooltip={t(sidebarCollapsed ? "展开项目导航" : "收起项目导航")} data-tooltip-side="right"
        onClick={() => { closeMenu(); setSidebarCollapsed((current) => !current); }}>
        <PanelsTopLeft aria-hidden="true" /></button>
      <nav className="app-rail-actions" aria-label={t("工作台操作")} ref={toolbarRef}>
        <div className="app-rail-primary">
          <button type="button" className="app-rail-button" data-active={workspaceView === "home" || undefined}
            aria-label={t("首页")} data-tooltip={t("首页")} data-tooltip-side="right"
            onClick={() => { closeMenu(); setModal(null); setWorkspaceView("home"); }}>
            <House aria-hidden="true" /></button>
          <button type="button" className="app-rail-button" data-active={workspaceView === "schedule" || undefined}
            aria-label={t("项目排期")} data-tooltip={t("项目排期")} data-tooltip-side="right"
            onClick={() => { closeMenu(); setWorkspaceView("schedule"); }}>
            <CalendarRange aria-hidden="true" /></button>
          <button type="button" className="app-rail-button" data-active={workspaceView === "report" || undefined}
            aria-label={t("管理层报告")} data-tooltip={t("管理层报告")} data-tooltip-side="right"
            onClick={() => { closeMenu(); setWorkspaceView("report"); }}>
            <BarChart3 aria-hidden="true" /></button>
          <button type="button" className="app-rail-button deadline-alert-trigger" aria-haspopup="dialog"
            data-active={modal?.type === "deadline-alerts" || undefined} data-alert={deadlineAlertItems.length > 0 || undefined}
            aria-label={deadlineAlertItems.length ? t("期限提醒 · {count}", { count: deadlineAlertItems.length }) : t("期限提醒")}
            data-tooltip={deadlineAlertItems.length ? t("期限提醒 · {count}", { count: deadlineAlertItems.length }) : t("期限提醒")}
            data-tooltip-side="right" onClick={() => { closeMenu(); setModal({ type: "deadline-alerts" }); }}>
            <BellRing aria-hidden="true" />{deadlineAlertItems.length > 0 && <strong className="app-rail-badge">
              {deadlineAlertItems.length > 99 ? "99+" : deadlineAlertItems.length}</strong>}</button>
          <button type="button" className="app-rail-button" aria-haspopup="dialog"
            data-active={modal?.type === "template-library" || undefined}
            aria-label={t("范本库")} data-tooltip={t("范本库")} data-tooltip-side="right"
            onClick={() => { closeMenu(); setModal({ type: "template-library" }); }}>
            <LibraryBig aria-hidden="true" /></button>
          <button type="button" className="app-rail-button" aria-haspopup="dialog"
            data-active={modal?.type === "user-guide" || undefined}
            aria-label={t("使用指南")} data-tooltip={t("使用指南")} data-tooltip-side="right"
            onClick={() => { closeMenu(); setModal({ type: "user-guide" }); }}>
            <BookOpen aria-hidden="true" /></button>
        </div>
        <div className="app-rail-secondary">
          <button type="button" className="app-rail-button" aria-haspopup="dialog"
            data-active={modal?.type === "persistence-settings" || undefined}
            aria-label={t("设置")} data-tooltip={t("设置")} data-tooltip-side="right"
            onClick={() => { closeMenu(); setModal({ type: "persistence-settings" }); }}>
            <Settings aria-hidden="true" /></button>
          <details className="toolbar-menu" ref={(element) => { toolbarMenuRefs.current[0] = element; }}>
            <summary className="toolbar-icon-summary" aria-label={`${t("备份")} · ${saveStateLabel}`}
              data-tooltip={`${t("备份")} · ${saveStateLabel}`} data-tooltip-side="right"
              onClick={() => closeOtherMenus(0)}><DatabaseBackup aria-hidden="true" />
              <span className="persistence-save-dot" data-status={persistence.status} aria-hidden="true" /></summary>
            <div className="toolbar-menu-popover"><input ref={importRef} type="file" accept="application/json" hidden
              onChange={(event) => importBackup(event.target.files?.[0])} />
              <div className="persistence-menu-status" role="status" aria-label={saveStateLabel}>
                <span className="persistence-save-dot" data-status={persistence.status} />
                <strong>{saveStateLabel}</strong></div>
              {persistence.settings.mode === "linked_file" && <button type="button" aria-label={t("立即保存")} onClick={async () => {
                closeMenu(); const saved = await persistence.saveNow();
                notify(t(saved ? "资料已保存" : "资料尚未同步，请检查保存设置"));
              }}>{t("立即保存")}</button>}
              <button type="button" aria-label={t("恢复备份")} onClick={() => { closeMenu(); importRef.current?.click(); }}>{t("恢复备份")}…</button>
              <button type="button" aria-label={t("导出备份")} onClick={exportBackup}>{t("导出备份")}</button>
              {hasV10Recovery && <button type="button" aria-label={t("下载 V10 恢复副本")} onClick={downloadV10Recovery}>{t("下载 V10 恢复副本")}</button>}
              <button type="button" className="toolbar-menu-danger" aria-label={t("初始化工作台")}
                onClick={() => { closeMenu(); setModal({ type: "initialize-workbench" }); }}>
                {t("初始化工作台")}…</button></div></details>
          <details className="toolbar-menu" ref={(element) => { toolbarMenuRefs.current[1] = element; }}>
            <summary className="language-summary toolbar-icon-summary" aria-label={`${t("语言")} · ${languageLabel}`}
              data-tooltip={`${t("语言")} · ${languageLabel}`} data-tooltip-side="right"
              onClick={() => closeOtherMenus(1)}><Languages aria-hidden="true" /><small>{languageCode}</small></summary>
            <div className="toolbar-menu-popover language-menu"><button type="button" aria-pressed={language === "zh-Hans"}
              onClick={() => { setLanguage("zh-Hans"); closeMenu(); }}><span>{t("简体中文")}</span>{language === "zh-Hans" && <small>{t("当前")}</small>}</button>
              <button type="button" aria-pressed={language === "zh-Hant"} onClick={() => { setLanguage("zh-Hant"); closeMenu(); }}>
                <span>繁體中文</span>{language === "zh-Hant" && <small>{t("当前")}</small>}</button>
              <button type="button" aria-pressed={language === "en"} onClick={() => { setLanguage("en"); closeMenu(); }}>
                <span>English</span>{language === "en" && <small>{t("当前")}</small>}</button></div></details>
        </div>
      </nav>
    </aside>

    <section className="workbench-layout" data-sidebar-collapsed={sidebarCollapsed || undefined}
      data-compact-layout={compactLayout || undefined} data-outstanding-collapsed={outstandingPanelCollapsed || undefined}
      data-resizing-navigation={resizingNavigation || undefined} data-simplified-view={simplifiedView || undefined}
      style={{ "--project-panel-width": `${navigationWidth}px` }}>
      <aside className="project-panel" aria-label={t("项目导航")}>
        {!sidebarCollapsed && <>
          <div className="project-panel-controls"><div className="project-panel-title"><div>
            <strong>{t(navigationView === "projects" ? "项目列表" : "公司列表")}</strong></div><div className="project-panel-actions">
              <button type="button" className="navigation-density-toggle" aria-pressed={simplifiedView}
                aria-label={t("简化视图")} data-tooltip={t(simplifiedView ? "显示导航和排期详情" : "隐藏导航和排期详情")}
                onClick={() => setSimplifiedView((current) => !current)}>
                {simplifiedView ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}<span>{t("简化")}</span></button>
              <button type="button" className="project-panel-new"
              aria-label={t("新建公司")} data-tooltip={t("新建公司")} data-tooltip-side="left"
              onClick={() => setModal({ type: "create-entity" })}><Plus aria-hidden="true" /><span>{t("新建公司")}</span></button></div></div>
            <div className="navigation-view-tabs" role="tablist" aria-label={t("公司与项目视图")} onKeyDown={handleTabListKeyDown}>
              {["companies", "projects"].map((value) => <button type="button" role="tab" key={value}
                aria-selected={navigationView === value} tabIndex={tabIndexFor(navigationView === value)}
                onClick={() => setNavigationView(value)}>{t(value === "companies" ? "公司" : "项目")}</button>)}</div>
            <div className="navigation-search-row"><label className="search-field"><Search aria-hidden="true" /><input value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(navigationView === "projects" ? "搜索项目、公司或负责人" : "搜索公司或负责人")}
              aria-label={t(navigationView === "projects" ? "搜索项目、公司或负责人" : "搜索公司、控股公司或负责人")} /></label>
              <button type="button" className="navigation-filter-toggle" aria-expanded={navigationFiltersOpen}
                aria-controls="navigation-filter-panel" aria-label={t(navigationFiltersOpen ? "收起导航筛选" : "打开导航筛选")}
                data-active={activeNavigationFilterCount > 0 || undefined}
                onClick={() => setNavigationFiltersOpen((current) => !current)}><ListFilter aria-hidden="true" />
                {activeNavigationFilterCount > 0 && <strong>{activeNavigationFilterCount}</strong>}</button></div>
            {navigationFiltersOpen && <section className="navigation-filter-panel" id="navigation-filter-panel"
              aria-label={t("导航筛选")}><label><span>{t("负责人")}</span><select value={navigationFilters.owner}
                aria-label={t("负责人筛选")} onChange={updateNavigationFilter("owner")}><option value="">{t("全部负责人")}</option>
                {navigationOwnerOptions.map((owner) => <option value={owner} key={owner}>{owner}</option>)}</select></label>
              <label><span>{t("项目类型")}</span><select value={navigationFilters.engagementType}
                aria-label={t("项目类型筛选")} onChange={updateNavigationFilter("engagementType")}><option value="">{t("全部项目类型")}</option>
                {navigationTypeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              <label><span>{t("报告年度")}</span><select value={navigationFilters.reportingYear}
                aria-label={t("报告年度筛选")} onChange={updateNavigationFilter("reportingYear")}><option value="">{t("全部报告年度")}</option>
                {navigationYearOptions.map((year) => <option value={year} key={year}>{year}</option>)}</select></label>
              <button type="button" className="navigation-filter-clear" disabled={!activeNavigationFilterCount}
                onClick={clearNavigationFilters}><X aria-hidden="true" />{t("清除筛选")}</button></section>}
            <div className="filter-tabs" role="tablist" aria-label={t("项目状态")} onKeyDown={handleTabListKeyDown}>{[["active", "活跃"], ["completed", "已完成"],
              ["all", "全部"], ["archived", "归档"]].map(([value, label]) => <button type="button" role="tab" key={value}
                aria-selected={filter === value} tabIndex={tabIndexFor(filter === value)} onClick={() => setFilter(value)}><span>{t(label)}</span>
                <strong>{navigationCounts[value]}</strong></button>)}</div></div>
          <WorkspaceTree store={store} selection={selection} onSelect={(next) => openWorkspaceRecord(next.kind, next.id)} search={search} filter={filter}
            navigationFilters={navigationFilters} statuses={store.outstandingStatuses} onMove={moveNavigationItem}
            viewMode={navigationView} simplifiedView={simplifiedView} /></>}
        {!sidebarCollapsed && <button type="button" className="project-panel-resizer" role="separator" aria-orientation="vertical"
          aria-label={t("拖动调整公司导航宽度")} aria-valuemin={MIN_NAVIGATION_WIDTH} aria-valuemax={MAX_NAVIGATION_WIDTH}
          aria-valuenow={navigationWidth} aria-keyshortcuts="ArrowLeft ArrowRight Home End"
          data-tooltip={t("拖动调整公司导航宽度；双击恢复默认宽度")} data-tooltip-side="right"
          onPointerDown={beginNavigationResize} onPointerMove={resizeNavigation} onPointerUp={finishNavigationResize}
          onPointerCancel={finishNavigationResize} onKeyDown={resizeNavigationWithKeyboard} onDoubleClick={resetNavigationWidth} />}
      </aside>
      <main className="project-detail" aria-label={t(workspaceView === "home" ? "首页" : workspaceView === "schedule" ? "项目排期"
        : workspaceView === "report" ? "管理层报告" : selectedEntitySource ? "公司概览" : selectedGroup ? "集团工作区" : "项目工作区")}>
        <nav className="workspace-history-controls" aria-label={t("查看历史")}>
          <button type="button" disabled={backHistoryIndex < 0} onClick={() => goThroughHistory(-1)}
            aria-label={t("返回上一个界面")} data-tooltip={t("返回上一个界面")}><ArrowLeft aria-hidden="true" /></button>
          <button type="button" disabled={forwardHistoryIndex < 0} onClick={() => goThroughHistory(1)}
            aria-label={t("前进到下一个界面")} data-tooltip={t("前进到下一个界面")}><ArrowRight aria-hidden="true" /></button>
        </nav>
        {workspaceView === "home" ? <HomeOverview store={store} now={deadlineClock} onOpen={openWorkspaceRecord}
          onOpenDeadline={openDeadlineAlert} onShowDeadlines={() => setModal({ type: "deadline-alerts" })}
          onNewCompany={() => setModal({ type: "create-entity" })}
          onNewEngagement={(entityId) => setModal({ type: "create-engagement", entityId })}
          onShowProjects={(status = "all") => { setSidebarCollapsed(false); setNavigationView("projects"); setFilter(status); }}
          onShowSchedule={() => setWorkspaceView("schedule")} />
          : workspaceView === "schedule" ? <ProjectSchedule store={store} filter={filter} onOpen={openWorkspaceRecord}
          onEditSchedule={openScheduleEditor} onOpenTaxDeadline={openTaxDeadlineCentre} onReorder={reorderSchedule}
          simplifiedView={simplifiedView} onToggleSimplifiedView={() => setSimplifiedView((current) => !current)} />
          : workspaceView === "report" ? <ManagementReport store={store} selection={selection} now={deadlineClock}
            onOpen={openWorkspaceRecord} />
          : selectedEntitySource ? <EntityOverview store={store} entity={selectedEntitySource}
            onEdit={() => setModal({ type: "edit-entity", entityId: selectedEntitySource.id })}
            onNewEngagement={() => setModal({ type: "create-engagement", entityId: selectedEntitySource.id })}
            onOpenEngagement={(engagement, childEntity) => childEntity ? openWorkspaceRecord("entity", childEntity.id)
              : openWorkspaceRecord(selectedEntitySource.kind === "holding_company" ? "group" : "project", engagement.id)}
            onEditEngagement={(engagement) => setModal({ type: "edit-engagement", targetKind: selectedEntitySource.kind === "holding_company" ? "group" : "project",
              targetId: engagement.id })}
            onTax={() => openTaxDeadlineCentre("entity", selectedEntitySource.id)}
            onArchive={() => {
              const active = engagementsForEntity(store, selectedEntitySource.id).filter((engagement) => !engagement.archived);
              if (active.length) { window.alert(t("归档公司前，请先归档以下 {count} 个活跃项目：{projects}", {
                count: active.length, projects: active.map((engagement) => reportingPeriodLabel(engagement, language)).join("、") })); return; }
              const openTax = selectedEntitySource.taxDeadlines.filter((deadline) => deadline.state === "open").length;
              if (openTax && !window.confirm(t("这家公司还有 {count} 项未完成税务期限。归档后相关提醒会隐藏，是否继续？", { count: openTax }))) return;
              updateEntity(selectedEntitySource.id, (entity) => ({ ...entity, archived: true })); notify(t("公司已归档"));
            }}
            onRestore={() => { updateEntity(selectedEntitySource.id, (entity) => ({ ...entity, archived: false })); setFilter("all"); notify(t("公司已恢复")); }}
            onDelete={() => setModal({ type: "delete-entity", targetId: selectedEntitySource.id, name: selectedEntitySource.legalName })}
            onMerge={() => setModal({ type: "merge-entities", entityId: selectedEntitySource.id })} />
          : selectedProject ? <ProjectDetail project={selectedProject} rawProject={selectedProjectSource} statuses={outstandingStatusViews}
          parentMembership={selectedProjectMembership}
          activeWorkstreamId={activeWorkstreamId} setActiveWorkstreamId={setActiveWorkstreamId} updateWorkflowNodes={updateWorkflowNodes}
          setModal={setModal} duplicateProject={duplicateProject} archiveTarget={archiveTarget} restoreTarget={restoreTarget}
          onReorderWorkstreams={reorderProjectWorkstreams} deadlineClock={deadlineClock} />
          : selectedGroup ? <GroupDetail store={store} group={selectedGroup} statuses={outstandingStatusViews}
            updateWorkflowNodes={updateWorkflowNodes} setModal={setModal} setSelection={(next) => openWorkspaceRecord(next.kind, next.id)}
            updateEngagement={updateEngagement} setStore={setStore} selectedGroupSample={selectedGroupSample}
            archiveTarget={archiveTarget} restoreTarget={restoreTarget} deadlineClock={deadlineClock} />
            : <div className="detail-empty"><span className="empty-mark">◎</span><h2>{t("选择公司或年度项目")}</h2>
              <p>{t("选择公司查看主档和历年项目；选择年度项目进入业务工作区。")}</p></div>}
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
          {workspaceView === "home" ? <div className="outstanding-center-empty">{t("首页已经汇总所有活跃项目的优先事项；打开项目后可处理该项目的待清事项。")}</div>
            : selectedProject ? <OutstandingCenter store={store} target={selectedProjectSource} targetKind="project" statuses={outstandingStatusViews}
            updateProject={updateProject} updateGroup={updateGroup} setModal={setModal} setSelection={(next) => openWorkspaceRecord(next.kind, next.id)} notify={notify}
            readOnly={selectedProjectSource.archived} activeWorkstreamId={activeWorkstreamId} />
            : selectedGroup ? <OutstandingCenter store={store} target={selectedGroupSource} targetKind="group" statuses={outstandingStatusViews}
              updateProject={updateProject} updateGroup={updateGroup} setModal={setModal} setSelection={(next) => openWorkspaceRecord(next.kind, next.id)} notify={notify}
              readOnly={selectedGroupSource.archived} />
              : selectedEntitySource ? <div className="outstanding-center-empty">{t("公司概览会汇总历年项目；进入某一年度查看该年度待清事项。")}</div>
                : <div className="outstanding-center-empty">{t("选择项目或集团后查看待清事项。")}</div>}</>}
      </aside>
    </section>

    {modal?.type === "deadline-alerts" && <Modal title={t("期限提醒")} onClose={() => setModal(null)} wide>
      <DeadlineAlertCentre alerts={deadlineAlertItems} onOpen={openDeadlineAlert} /></Modal>}
    {modal?.type === "tax-deadlines" && modalTargetEntity && <Modal title={`${t("税务期限")} · ${modalTargetEntity.legalName}`} onClose={() => setModal(null)} large>
      <TaxDeadlineManager store={store} targetKind={modal.targetKind} targetId={modal.targetId}
        focusDeadlineId={modal.deadlineId} initialEditDeadlineId={modal.editDeadlineId}
        initialEngagementId={modal.engagementId}
        readOnly={Boolean(modalTargetEntity.archived)}
        onSave={saveTaxDeadline} onDelete={deleteTaxDeadline}
        onOpenSource={(kind, id, deadlineId) => openTaxDeadlineCentre(kind, id, deadlineId)} /></Modal>}
    {modal?.type === "create-entity" && <Modal title={t("新建公司")} onClose={() => setModal(null)} large>
      <CompanyForm store={store} onSubmit={createEntity} onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "edit-entity" && store.entities.find((entity) => entity.id === modal.entityId) && <Modal title={t("编辑公司主档")}
      onClose={() => setModal(null)} wide><CompanyForm store={store} initial={store.entities.find((entity) => entity.id === modal.entityId)}
        onClose={() => setModal(null)} onSubmit={(values) => {
          const source = store.entities.find((entity) => entity.id === modal.entityId);
          if (!source) return;
          if (values.parentEntityId && !canMoveEntity(store, source.id, values.parentEntityId)) {
            window.alert(t("无法移动到这个控股公司")); return;
          }
          const kindChanged = source.kind !== values.kind;
          setStore((current) => {
            let next = { ...current, entities: current.entities.map((entity) => entity.id === source.id
              ? { ...entity, ...values, updatedAt: new Date().toISOString() } : entity) };
            if (kindChanged && values.kind === "holding_company") next = { ...next, engagements: next.engagements.map((engagement) => {
              if (engagement.entityId !== source.id || engagement.consolidation) return engagement;
              return { ...engagement, consolidation: { enabled: true,
                nodes: (selectedGroupSample?.nodes || []).map((node) => makeNode({ title: node.title, description: node.description,
                  conditions: node.conditions.map((condition) => condition.label) })),
                components: componentsForCurrentStructure(next, source.id, engagement.periodStart, engagement.periodEnd,
                  selectedGroupSample || EMPTY_GROUP_SAMPLE, engagement.reportingPeriods),
                structureSyncedAt: new Date().toISOString() } };
            }) };
            return next;
          });
          setSelection({ kind: "entity", id: source.id }); setModal(null); notify(t("公司主档已更新"));
        }} /></Modal>}
    {modal?.type === "create-engagement" && store.entities.find((entity) => entity.id === modal.entityId) && <Modal
      title={`${t("新建年度项目")} · ${store.entities.find((entity) => entity.id === modal.entityId).legalName}`} onClose={() => setModal(null)} large>
      <EngagementForm store={store} entity={store.entities.find((entity) => entity.id === modal.entityId)}
        preferredSourceId={modal.sourceEngagementId} onClose={() => setModal(null)}
        onSubmit={(values, options) => createAnnualEngagement(store.entities.find((entity) => entity.id === modal.entityId), values,
          modal.sourceEngagementId ? { ...options, sourceMode: "previous",
            sourceEngagement: store.engagements.find((engagement) => engagement.id === modal.sourceEngagementId) } : options)} /></Modal>}
    {modal?.type === "edit-engagement" && modalTargetEngagement && modalTargetEntity && <Modal title={`${t(quickProjectTitle || "编辑年度项目")} · ${modalTargetEntity.legalName}`}
      onClose={() => setModal(null)} large={!modal.quickField}>
      <EngagementForm store={store} entity={modalTargetEntity} initial={modalTargetEngagement} quickField={modal.quickField}
        onCreateAnotherYear={!modal.quickField ? () => setModal({ type: "create-engagement", entityId: modalTargetEntity.id,
          sourceEngagementId: modalTargetEngagement.id }) : null}
        onClose={() => setModal(null)} onSubmit={(values) => {
          updateEngagement(modalTargetEngagement.id, (engagement) => ({ ...engagement,
            internalName: values.internalName, engagementTypes: values.engagementTypes, engagementType: values.engagementType,
            periodPreset: values.periodPreset, periodStart: values.periodStart,
            periodEnd: values.periodEnd, reportingPeriods: values.reportingPeriods,
            reportingFramework: values.reportingFramework, owner: values.owner,
            startDate: values.startDate, dueDate: values.dueDate, notes: values.notes,
            consolidation: engagement.consolidation ? { ...engagement.consolidation,
              enabled: values.consolidationEnabled !== false } : engagement.consolidation }));
          setModal(null); notify(t(modal.quickField === "schedule" ? "项目排期已更新"
              : modal.quickField === "owner" ? "负责人已更新" : modal.quickField === "framework" ? "财务报告准则／框架已更新" : "年度项目已更新"));
        }} /></Modal>}
    {modal?.type === "merge-entities" && <Modal title={t("合并重复公司")} onClose={() => setModal(null)} wide>
      <MergeEntitiesForm store={store} initialEntityId={modal.entityId} onClose={() => setModal(null)} onSubmit={(sourceId, targetId) => {
        try { setStore((current) => mergeEntities(current, sourceId, targetId)); setSelection({ kind: "entity", id: targetId });
          setModal(null); notify(t("重复公司已合并")); } catch (error) { window.alert(t("公司无法合并，请先处理相同报告期间。")); }
      }} /></Modal>}
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
    {modal?.type === "template-library" && <Modal title={t("范本库")} onClose={() => setModal(null)} large>
      <input ref={templateImportRef} type="file" accept="application/json,.apw-template.json" hidden
        onChange={(event) => readTemplatePackage(event.target.files?.[0])} />
      <TemplateLibraryTools tags={allTemplateTags} tag={templateTag} sort={templateSort}
        onTagChange={setTemplateTag} onSortChange={setTemplateSort}
        onImport={() => templateImportRef.current?.click()}
        onExport={() => setModal({ type: "template-export", initialSelection: templateType === "group"
          ? [`holding_company:${store.selectedGroupSampleId}`]
          : store.selectedSampleIdsByCategory?.[templateType] ? [`workstream:${store.selectedSampleIdsByCategory[templateType]}`] : [] })} />
      <div className="template-category-bar"><div className="template-type-tabs" role="tablist" aria-label={t("范本种类")}
        onKeyDown={handleTabListKeyDown}>
        {[...workstreamCategoryViews, { id: "group", label: t("集团范本") }].map((category) => <button type="button" role="tab" key={category.id}
          aria-selected={templateType === category.id} tabIndex={tabIndexFor(templateType === category.id)}
          onClick={() => setTemplateType(category.id)}>{category.label}</button>)}</div></div>
      {templateType === "group" ? <GroupSampleLibrary samples={visibleGroupSampleViews} selectedSampleId={store.selectedGroupSampleId}
        onSelect={(sampleId) => setStore((current) => ({ ...current, selectedGroupSampleId: sampleId }))}
        onCreate={() => setModal({ type: "group-sample-edit", sample: makeBlankGroupSample(language) })}
        onEdit={(sampleId) => setModal({ type: "group-sample-edit", sampleId })} onDuplicate={(sampleId) => copySample(sampleId, true)}
        onDelete={(sampleId) => deleteSample(sampleId, true)} onUse={() => setModal({ type: "create-entity" })} />
        : <SampleLibrary samples={visibleSampleViews.filter((sample) => sample.categoryId === templateType)}
          categoryLabel={workstreamCategoryViews.find((category) => category.id === templateType)?.label}
          selectedSampleId={store.selectedSampleIdsByCategory?.[templateType]}
          onSelect={(sampleId) => setStore((current) => ({ ...current, selectedSampleIdsByCategory: {
            ...current.selectedSampleIdsByCategory, [templateType]: sampleId } }))}
          onCreate={() => { const category = store.workstreamCategories.find((item) => item.id === templateType);
            if (category) setModal({ type: "sample-edit", sample: makeBlankSample(language, category.builtinType || "custom", category.id) }); }}
          onEdit={(sampleId) => setModal({ type: "sample-edit", sampleId })} onDuplicate={copySample} onDelete={deleteSample}
          onManageCategories={() => setModal({ type: "workstream-categories" })}
          onUse={() => setModal({ type: "create-entity" })} />}
    </Modal>}
    {modal?.type === "template-export" && <Modal title={t("导出范本包")} onClose={() => setModal({ type: "template-library" })} wide>
      <TemplateExportPanel samples={sampleViews} groupSamples={groupSampleViews} categories={workstreamCategoryViews}
        initialSelection={modal.initialSelection} onExport={exportTemplatePackage}
        onClose={() => setModal({ type: "template-library" })} /></Modal>}
    {modal?.type === "template-import-preview" && <Modal title={t("导入范本包")} onClose={() => setModal({ type: "template-library" })} large>
      <TemplateImportPreview preview={modal.preview} categories={workstreamCategoryViews} samples={sampleViews}
        groupSamples={groupSampleViews} onClose={() => setModal({ type: "template-library" })}
        onApply={(decisions) => { try {
          const imported = Object.values(decisions).filter((decision) => decision.action !== "skip").length;
          setStore((current) => applyTemplatePackage(current, modal.preview.package, decisions));
          setModal({ type: "template-library" }); notify(t("已导入 {count} 个范本", { count: imported }));
        } catch (error) { window.alert(templatePackageErrorText(error)); } }} /></Modal>}
    {modal?.type === "workstream-categories" && <Modal title={t("范本种类")} onClose={() => setModal({ type: "template-library" })} wide>
      <WorkstreamCategoryEditor categories={store.workstreamCategories} usageCounts={workstreamCategoryUsage}
        onSave={saveWorkstreamCategories} onClose={() => setModal({ type: "template-library" })} /></Modal>}
    {modal?.type === "user-guide" && <Modal title={t("使用指南")} onClose={() => setModal(null)} large>
      <UserGuide /></Modal>}
    {modal?.type === "persistence-settings" && <Modal title={t("设置")} onClose={() => setModal(null)} wide>
      <PersistenceSettingsPanel persistence={persistence} onClose={() => setModal(null)}
        onOpenExisting={openExistingWorkspaceFile}
        onResolveConflict={() => setModal({ type: "persistence-conflict" })} /></Modal>}
    {modal?.type === "open-workspace-file" && <Modal title={t("打开工作台文件")} onClose={() => setModal({ type: "persistence-settings" })} wide>
      <OpenWorkspaceFileConfirm candidate={modal.candidate} onClose={() => setModal({ type: "persistence-settings" })}
        onConfirm={async (candidate) => {
          const opened = await persistence.activateExistingFile(candidate);
          if (opened) { setModal(null); notify(t("本地工作台文件已关联")); }
          return opened;
        }} /></Modal>}
    {modal?.type === "persistence-conflict" && persistence.conflict && <Modal title={t("处理版本冲突")} onClose={() => setModal(null)} wide>
      <PersistenceConflictDialog conflict={persistence.conflict} onClose={() => setModal(null)}
        onResolve={async (choice) => {
          const resolved = await persistence.resolveConflict(choice);
          if (resolved) { setModal(null); notify(t("版本冲突已处理并恢复自动保存")); }
          return resolved;
        }} /></Modal>}
    {modal?.type === "initialize-workbench" && <Modal title={t("初始化工作台")} onClose={() => setModal(null)}>
      <InitializeWorkbenchConfirm onExport={exportBackup} onInitialize={initializeWorkbench} onClose={() => setModal(null)}
        linkedFileName={persistence.settings.mode === "linked_file" ? persistence.linkedFileName : ""} /></Modal>}
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
          members: [...group.members, makeGroupMember(values, selectedGroupSample || EMPTY_GROUP_SAMPLE)] }));
          setModal(null); notify(t("组成部分已加入集团")); }}
        onCreateCompany={() => setModal({ type: "create-entity" })}
        onClose={() => setModal(null)} /></Modal>}
    {modal?.type === "member-edit" && <MemberEditModal modal={modal} store={store} selectedGroupSample={selectedGroupSample}
      updateGroup={updateGroup} setModal={setModal} notify={notify} t={t} language={language} />}
    {modal?.type === "delete-target" && <Modal title={t("永久删除")} onClose={() => setModal(null)}>
      <DeleteConfirm name={modal.name} kind={modal.targetKind} onClose={() => setModal(null)}
        onDelete={() => permanentlyDeleteTarget(modal.targetKind, modal.targetId)} /></Modal>}
    {modal?.type === "delete-entity" && <Modal title={t("永久删除公司")} onClose={() => setModal(null)}>
      <DeleteConfirm name={modal.name} kind="entity" onClose={() => setModal(null)} onDelete={() => {
        const engagementIds = new Set(store.engagements.filter((engagement) => engagement.entityId === modal.targetId)
          .map((engagement) => engagement.id));
        setStore((current) => ({ ...current,
          entities: current.entities.filter((entity) => entity.id !== modal.targetId).map((entity) => entity.parentEntityId === modal.targetId
            ? { ...entity, parentEntityId: null, updatedAt: new Date().toISOString() } : entity),
          engagements: current.engagements.filter((engagement) => !engagementIds.has(engagement.id)),
          entityOrder: (current.entityOrder || []).filter((id) => id !== modal.targetId),
          scheduleOrder: (current.scheduleOrder || []).filter((key) => !engagementIds.has(key.split(":").slice(1).join(":"))),
        }));
        setSelection(null); setModal(null); notify(t("公司及其年度项目已永久删除"));
      }} /></Modal>}
  </article>;
}

function CompanyCreateForm({ initialKind = "project", samples, workstreamCategories, selectedSampleIdsByCategory,
  selectedGroupSample, initialWorkstreamSelections, onCreateProject, onCreateGroup, onClose }) {
  const { t } = useUiLanguage();
  const [kind, setKind] = React.useState(initialKind === "group" ? "group" : "project");
  const structureSelector = <section className="company-kind-selector" data-inline="true"><strong>{t("公司结构")}</strong>
    <div className="choice-tabs" role="tablist" aria-label={t("公司结构")} onKeyDown={handleTabListKeyDown}>
      <button type="button" role="tab" aria-selected={kind === "project"} tabIndex={tabIndexFor(kind === "project")}
        onClick={() => setKind("project")}>{t("公司")}</button>
      <button type="button" role="tab" aria-selected={kind === "group"} tabIndex={tabIndexFor(kind === "group")}
        onClick={() => setKind("group")}>{t("控股公司")}</button>
    </div></section>;
  return <div className="company-create-flow">
    {kind === "project" ? <ProjectForm key="project" samples={samples} workstreamCategories={workstreamCategories}
      selectedSampleIdsByCategory={selectedSampleIdsByCategory} initialWorkstreamSelections={initialWorkstreamSelections}
      structureSelector={structureSelector} submitLabel="建立公司" onSubmit={onCreateProject} onClose={onClose} />
      : <GroupForm key="group" sampleName={selectedGroupSample?.name || t("未选择范本")}
        structureSelector={structureSelector} onSubmit={onCreateGroup} onClose={onClose} />}
  </div>;
}

function DetailFactAction({ label, children, onClick, actionLabel, icon: Icon = Pencil, className = "", urgency }) {
  return <div className={["detail-fact", onClick ? "detail-fact-action" : "", className].filter(Boolean).join(" ")}>
    <dt>{label}</dt><dd data-urgency={urgency || undefined}>{onClick ? <button type="button" className="detail-fact-link" onClick={onClick}
      aria-label={actionLabel} title={actionLabel}><span className="detail-fact-content">{children}</span>
      <Icon aria-hidden="true" /></button> : children}</dd>
  </div>;
}

function ProjectDetail({ project, rawProject, statuses, parentMembership, activeWorkstreamId, setActiveWorkstreamId,
  updateWorkflowNodes, setModal, duplicateProject, archiveTarget, restoreTarget, onReorderWorkstreams, deadlineClock }) {
  const { language, t } = useUiLanguage();
  const draggingWorkstreamRef = React.useRef(null);
  const [draggingWorkstreamId, setDraggingWorkstreamId] = React.useState(null);
  const [workstreamDropTarget, setWorkstreamDropTarget] = React.useState(null);
  const stats = projectStats(project);
  const readOnly = Boolean(rawProject.archived);
  const activeWorkstream = project.workstreams.find((workstream) => workstream.id === activeWorkstreamId) || null;
  const activeRawWorkstream = rawProject.workstreams.find((workstream) => workstream.id === activeWorkstream?.id) || null;
  const taxSummary = taxDeadlineSummary(rawProject.taxDeadlines, deadlineClock);
  const nextTaxDate = taxSummary.next ? formatDate(taxSummary.next.dueDate, language) : t("没有未完成期限");
  const taxFactValue = taxSummary.next ? `${nextTaxDate} · ${t("{count} 项未完成", { count: taxSummary.openCount })}` : nextTaxDate;
  const periodLabel = reportingPeriodLabel(project, language);
  const companyName = project.entity || project.name;
  const primaryName = engagementTypesLabel(rawProject, language) || t("项目类型未设置");
  const subtitle = [companyName, periodLabel].filter(Boolean).join(" · ")
    || t("尚未填写法律实体及报告期间");
  const finishWorkstreamDrag = () => {
    draggingWorkstreamRef.current = null;
    setDraggingWorkstreamId(null);
    setWorkstreamDropTarget(null);
  };
  const beginWorkstreamDrag = (event, workstreamId) => {
    draggingWorkstreamRef.current = workstreamId;
    setDraggingWorkstreamId(workstreamId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-audit-workbench-workstream", workstreamId);
    event.dataTransfer.setData("text/plain", workstreamId);
  };
  const workstreamDropPosition = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientY < bounds.top + bounds.height * 0.25) return "before";
    if (event.clientY > bounds.bottom - bounds.height * 0.25) return "after";
    return event.clientX < bounds.left + bounds.width / 2 ? "before" : "after";
  };
  const dragOverWorkstream = (event, targetId) => {
    const sourceId = draggingWorkstreamRef.current;
    if (!sourceId || sourceId === targetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setWorkstreamDropTarget({ id: targetId, position: workstreamDropPosition(event) });
  };
  const dropWorkstream = (event, targetId) => {
    const sourceId = draggingWorkstreamRef.current;
    if (!sourceId || sourceId === targetId) return;
    event.preventDefault();
    onReorderWorkstreams?.(rawProject.id, sourceId, targetId, workstreamDropPosition(event));
    finishWorkstreamDrag();
  };
  const reorderWorkstreamWithKeyboard = (event, workstreamId) => {
    if (!event.altKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const moveEarlier = ["ArrowLeft", "ArrowUp"].includes(event.key);
    const index = rawProject.workstreams.findIndex((workstream) => workstream.id === workstreamId);
    const target = rawProject.workstreams[index + (moveEarlier ? -1 : 1)];
    if (!target) return;
    event.preventDefault();
    onReorderWorkstreams?.(rawProject.id, workstreamId, target.id, moveEarlier ? "before" : "after");
  };
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
        <button type="button" className="button primary icon-only" aria-label={t("编辑年度项目")}
          data-tooltip={t("编辑年度项目")} onClick={() => setModal({ type: "edit-engagement", targetKind: "project", targetId: rawProject.id })}><Pencil aria-hidden="true" /></button>
        <button type="button" className="button secondary icon-only" aria-label={t("复制项目")}
          data-tooltip={t("复制项目")} onClick={() => duplicateProject(rawProject)}><Copy aria-hidden="true" /></button>
        <button type="button" className="button secondary icon-only" aria-label={t("归档项目")}
          data-tooltip={t("归档项目")} onClick={() => archiveTarget("project", rawProject.id)}><Archive aria-hidden="true" /></button></>}</div>
    </header>
    <dl className="detail-facts"><DetailFactAction label={t("负责人")} actionLabel={`${t("编辑项目资料")}：${t("负责人")}`}
      onClick={!readOnly ? () => setModal({ type: "edit-engagement", targetKind: "project", targetId: rawProject.id, quickField: "owner" }) : null}>
      {project.owner || t("未设置")}</DetailFactAction>
      <DetailFactAction className="date-range-fact" label={t("项目排期")} icon={CalendarRange}
        actionLabel={`${t("编辑项目资料")}：${t("项目排期")}`}
        onClick={!readOnly ? () => setModal({ type: "edit-engagement", targetKind: "project", targetId: rawProject.id, quickField: "schedule" }) : null}>
        <time>{project.startDate ? formatDate(project.startDate, language) : t("未设置开始日")}</time>
        <span aria-hidden="true">→</span><time>{project.dueDate ? formatDate(project.dueDate, language) : t("未设置截止日")}</time>
      </DetailFactAction>
      <DetailFactAction label={t("财务报告准则／框架")} actionLabel={`${t("编辑项目资料")}：${t("财务报告准则／框架")}`}
        onClick={!readOnly ? () => setModal({ type: "edit-engagement", targetKind: "project", targetId: rawProject.id, quickField: "framework" }) : null}>
        {project.reportingFramework ? t(project.reportingFramework) : t("未设置")}</DetailFactAction>
      <DetailFactAction label={t("所属控股公司")} actionLabel={t("编辑公司主档")}
        onClick={!readOnly ? () => setModal({ type: "edit-entity", entityId: rawProject.entityId }) : null}>
        {parentMembership?.group.name || t("独立公司")}</DetailFactAction>
      <DetailFactAction label={t("业务模块")}>
        {t("已完成 {done}/{total}", { done: stats.completedWorkstreams, total: stats.workstreams })}</DetailFactAction>
      <DetailFactAction className="tax-deadline-fact" label={t("税务期限")} icon={readOnly ? ReceiptText : Pencil}
        urgency={taxSummary.urgency} actionLabel={readOnly ? t("税务期限") : t(taxSummary.next ? "编辑税务期限" : "新增税务期限")}
        onClick={() => setModal({ type: "tax-deadlines", targetKind: "project", targetId: rawProject.id,
          ...(readOnly ? {} : { editDeadlineId: taxSummary.next?.id ?? null }) })}>{taxFactValue}</DetailFactAction></dl>

    <section className="workstream-overview"><header className="section-heading"><div><h3>{t("业务模块")}</h3>
      <p>{t("点击模块查看节点；再次点击可收起。模块只保留流程、完成条件和进度。")}</p></div>
      {!readOnly && <div className="section-heading-actions"><button type="button" className="button secondary icon-only"
        aria-label={t("添加业务模块")} data-tooltip={t("添加业务模块")} onClick={() => setModal({ type: "workstream-add",
          targetKind: "project", targetId: rawProject.id })}><ListPlus aria-hidden="true" /></button>
        <button type="button" className="button secondary icon-only" disabled={!activeRawWorkstream}
          aria-label={t("设置所选业务模块")} data-tooltip={t(activeRawWorkstream ? "设置所选业务模块" : "请先选择一个业务模块")}
          onClick={() => activeRawWorkstream && setModal({ type: "workstream-edit", targetKind: "project",
            targetId: rawProject.id, workstreamId: activeRawWorkstream.id })}><Settings2 aria-hidden="true" /></button></div>}</header>
      {project.workstreams.length ? <div className="workstream-card-grid">{project.workstreams.map((workstream) => <WorkstreamCard key={workstream.id}
        workstream={workstream} selected={workstream.id === activeWorkstream?.id}
        openItems={rawProject.outstandingItems.filter((item) => item.workstreamId === workstream.id
          && outstandingIsOpen(item, statuses)).length} readOnly={readOnly}
        dragging={draggingWorkstreamId === workstream.id}
        dropPosition={workstreamDropTarget?.id === workstream.id ? workstreamDropTarget.position : undefined}
        onDragStart={(event) => beginWorkstreamDrag(event, workstream.id)} onDragEnd={finishWorkstreamDrag}
        onDragOver={(event) => dragOverWorkstream(event, workstream.id)}
        onDrop={(event) => dropWorkstream(event, workstream.id)}
        onReorderKeyDown={(event) => reorderWorkstreamWithKeyboard(event, workstream.id)}
        onSelect={() => setActiveWorkstreamId((current) => current === workstream.id ? null : workstream.id)} />)}</div>
        : <button type="button" className="workstream-empty" disabled={readOnly}
          onClick={() => setModal({ type: "workstream-add", targetKind: "project", targetId: rawProject.id })}>
          <ListPlus aria-hidden="true" /><span><strong>{t("尚未启用业务模块")}</strong>
            <small>{t(readOnly ? "此公司没有业务模块。" : "选择此处添加第一个业务模块。")}</small></span></button>}
    </section>

    {activeWorkstream && activeRawWorkstream && <section className="workflow-panel">
      <WorkflowNodes targetKind="project" targetId={rawProject.id} workstreamId={activeRawWorkstream.id}
        nodes={activeWorkstream.nodes} updateWorkflowNodes={updateWorkflowNodes} setModal={setModal} readOnly={readOnly}
        label={t("模块节点")} title={workstreamTypeLabel(activeWorkstream.type, language, activeWorkstream.customName)}
        description={t("点击节点查看完成条件；再次点击可收起详情。")}
        percentage={workstreamStats(activeWorkstream).percentage} />
    </section>}
  </div>;
}

function GroupDetail({ store, group, statuses, updateWorkflowNodes, setModal, setSelection, updateEngagement, setStore,
  selectedGroupSample, archiveTarget, restoreTarget, deadlineClock }) {
  const { language, t } = useUiLanguage();
  const [tab, setTab] = React.useState("overview");
  const rawGroup = store.groups.find((item) => item.id === group.id);
  const engagement = store.engagements.find((item) => item.id === group.id);
  const readOnly = Boolean(rawGroup?.archived);
  const stats = groupProgress(store, group.id);
  const openItems = collectGroupOutstandingEntries(store, group.id, new Set(), 0, readOnly)
    .filter((entry) => outstandingIsOpen(entry.item, statuses)).length;
  const groupTaxDeadlines = collectGroupTaxDeadlineEntries(store, group.id, new Set(), 0, readOnly)
    .map((entry) => entry.deadline);
  const primaryName = engagementTypesLabel(engagement, language) || t("项目类型未设置");
  const subtitle = [group.name, reportingPeriodLabel(group, language)].filter(Boolean).join(" · ")
    || t("尚未填写集团资料");
  if (!rawGroup) return null;
  return <div className="workspace-detail-inner">
    {readOnly && <div className="archive-banner"><strong>{t("已归档，只读")}</strong>
      <span>{t("归档记录不能编辑；恢复后才可继续更新。")}</span></div>}
    <header className="detail-header"><div className="detail-title"><div><span className="workspace-label">{t("集团工作区")}</span><h2>{primaryName}</h2></div>
      <p>{subtitle}</p></div><div className="detail-actions">{readOnly ? <>
        <button type="button" className="button secondary icon-only" aria-label={t("恢复")} data-tooltip={t("恢复")}
          onClick={() => restoreTarget("group", group.id)}><ArchiveRestore aria-hidden="true" /></button>
        <button type="button" className="button danger-quiet icon-only" aria-label={t("永久删除")}
          data-tooltip={t("永久删除")} onClick={() => setModal({ type: "delete-target", targetKind: "group",
            targetId: group.id, name: group.name })}><Trash2 aria-hidden="true" /></button></> : <>
        <button type="button" className="button primary icon-only" aria-label={t("编辑年度项目")}
          data-tooltip={t("编辑年度项目")} onClick={() => setModal({ type: "edit-engagement", targetKind: "group", targetId: rawGroup.id })}><Pencil aria-hidden="true" /></button>
        <button type="button" className="button secondary icon-only" aria-label={t("归档集团")}
          data-tooltip={t("归档集团")} onClick={() => archiveTarget("group", group.id)}><Archive aria-hidden="true" /></button></>}</div></header>
    <section className="group-status-strip" aria-label={t("集团状态")}><article><span>{t("组成部分进度")}</span>
      <ProgressBar value={stats.componentPercentage} compact /></article>
      <article><span>{t("公司合并就绪")}</span><div><strong>{stats.readyCompanies}/{stats.totalCompanies}</strong><small>{t("家公司")}</small></div></article>
      <article><span>{t("本级合并流程")}</span>{group.consolidationEnabled
        ? <ProgressBar value={stats.consolidationPercentage} compact /> : <div><strong>{t("不适用")}</strong></div>}</article>
      <article><span>{t("未清事项")}</span><div><strong>{openItems}</strong><small>{t("项")}</small></div></article>
      <article className="group-tax-deadline"><span>{t("税务期限")}</span><TaxDeadlineSummaryButton deadlines={groupTaxDeadlines}
        now={deadlineClock} compact onClick={() => setModal({ type: "tax-deadlines", targetKind: "group", targetId: rawGroup.id })} /></article></section>
    <div className="group-tabs" role="tablist" aria-label={t("控股公司工作区")} onKeyDown={handleTabListKeyDown}>{[["overview", "组成部分"], ["workflow", "合并节点"], ["settings", "集团资料"]]
      .map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} key={value}
        tabIndex={tabIndexFor(tab === value)} onClick={() => setTab(value)}>{t(label)}</button>)}</div>
    {tab === "overview" && engagement && <HoldingComponentsPanel store={store} engagement={engagement} readOnly={readOnly}
      onOpen={(kind, id) => setSelection({ kind, id })}
      onUpdate={(componentId, patch) => updateEngagement(engagement.id, (current) => ({ ...current,
        consolidation: { ...current.consolidation, components: (current.consolidation?.components || []).map((component) =>
          component.id === componentId ? { ...component, ...patch } : component) } }))}
      onSync={() => {
        if (!window.confirm(t("用当前控股架构更新本年度组成部分？新增和移出的公司会在确认后更新，既有完成条件尽量保留。"))) return;
        setStore((current) => syncEngagementToCurrentStructure(current, engagement.id,
          selectedGroupSample || EMPTY_GROUP_SAMPLE));
      }} />}
    {tab === "workflow" && <section className="workflow-panel">
      {group.consolidationEnabled ? <WorkflowNodes targetKind="group" targetId={group.id} nodes={group.nodes}
        updateWorkflowNodes={updateWorkflowNodes} setModal={setModal} readOnly={readOnly} title={t("集团合并节点")}
        description={t("横向查看本级合并节点，并在下方管理完成条件。")}
        percentage={stats.consolidationPercentage} />
        : <div className="inline-empty">{t("本级无需独立合并；进度直接来自下级组成部分。")}</div>}</section>}
    {tab === "settings" && <section className="group-settings-panel"><dl><div><dt>{t("负责人")}</dt><dd>{group.owner || t("未设置")}</dd></div>
      <div className="date-range-fact"><dt>{t("项目排期")}</dt><dd><time>{group.startDate ? formatDate(group.startDate, language) : t("未设置开始日")}</time>
        <span aria-hidden="true">→</span><time>{group.dueDate ? formatDate(group.dueDate, language) : t("未设置截止日")}</time></dd></div>
      <div><dt>{t("合并方式")}</dt><dd>{t(group.consolidationEnabled ? "本级需要合并" : "仅作分类")}</dd></div>
      <div><dt>{t("组成部分")}</dt><dd>{engagement?.consolidation?.components?.length || 0}</dd></div></dl>
      <div className="group-structure-note"><Building2 aria-hidden="true" /><span><strong>{t("控股架构在公司主档管理")}</strong>
        <small>{t("本年度组成部分在“组成部分”页签中指定；当前公司层级不会自动改写历史年度。")}</small></span></div></section>}
  </div>;
}

function WorkflowNodes({ targetKind, targetId, workstreamId = null, nodes, updateWorkflowNodes, setModal, readOnly,
  label = "", title = "", description = "", percentage = null }) {
  const { t } = useUiLanguage();
  const update = (updater) => updateWorkflowNodes(targetKind, targetId, workstreamId, updater);
  const actions = {
    addNode: () => setModal({ type: "node", targetKind, targetId, workstreamId }),
    move: (nodeId, direction) => update((current) => {
      const next = [...current]; const index = next.findIndex((node) => node.id === nodeId); const target = index + direction;
      if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
      return next;
    }),
    reorderNode: (sourceId, targetId, position) => update((current) => reorderWorkstreams(current, sourceId, targetId, position)),
    reorderCondition: (nodeId, sourceId, targetId, position) => update((current) => current.map((node) => node.id === nodeId
      ? { ...node, conditions: reorderWorkstreams(node.conditions, sourceId, targetId, position) } : node)),
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
  return <NodeBoard nodes={nodes} readOnly={readOnly} actions={actions} label={label} title={title}
    description={description} percentage={percentage} />;
}

function OutstandingCenter({ store, target, targetKind, statuses, updateProject, updateGroup, setModal, setSelection,
  notify, readOnly = false, activeWorkstreamId = null }) {
  const { language, t } = useUiLanguage();
  const [visibilityFilter, setVisibilityFilter] = React.useState("open");
  const [statusFilter, setStatusFilter] = React.useState("all");
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
  const visibilityCounts = entries.reduce((counts, entry) => {
    const open = outstandingIsOpen(entry.item, store.outstandingStatuses);
    return { all: counts.all + 1, open: counts.open + (open ? 1 : 0), closed: counts.closed + (open ? 0 : 1) };
  }, { all: 0, open: 0, closed: 0 });
  const visible = entries.filter((entry) => {
    if (moduleFilter !== "all" && entry.moduleKey !== moduleFilter) return false;
    const open = outstandingIsOpen(entry.item, store.outstandingStatuses);
    if (visibilityFilter === "open" && !open) return false;
    if (visibilityFilter === "closed" && open) return false;
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
    <div className="outstanding-visibility-tabs" role="group" aria-label={t("待清事项显示范围")}>
      {["open", "closed", "all"].map((value) => <button type="button" key={value}
        aria-pressed={visibilityFilter === value} onClick={() => { setVisibilityFilter(value); setStatusFilter("all"); }}>
        <span>{t(value === "open" ? "未清" : value === "closed" ? "已清／归档" : "全部")}</span>
        <strong>{visibilityCounts[value]}</strong></button>)}
    </div>
    <div><select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} aria-label={t("按业务模块筛选")}>
      <option value="all">{t("全部层级与模块")}</option>{moduleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={t("按待清状态筛选")}>
        <option value="all">{t("全部状态")}</option>
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
    <p>{t(kind === "entity" ? "公司“{name}”及其全部年度项目和税务期限将被永久删除；下属公司会移到顶层，历史集团快照仍保留名称。"
      : kind === "project" ? "项目“{name}”及其业务模块和待清事项将被永久删除，集团引用也会一并移除。"
        : "集团“{name}”将被永久删除，但不会删除其中的成员项目或子集团。", { name })}</p>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="button" className="button danger" onClick={onDelete}>{t("确认永久删除")}</button></footer></div>;
}

function ConversionConfirm({ name, kind, memberCount, onConvert, onClose }) {
  const { t } = useUiLanguage();
  const toHolding = kind === "project";
  return <div className="conversion-confirm"><strong>{t(toHolding ? "确认转换为控股公司" : "确认转换为公司")}</strong>
    <p>{t(toHolding
      ? "将“{name}”转换为控股公司？业务模块会保留，以便以后转换回公司；模块级待清事项会改为公司级事项。"
      : "将“{name}”转换为公司？其 {count} 个下属公司或控股公司会移到顶层；合并节点会保留，以便以后转换回控股公司。",
    { name, count: memberCount })}</p>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="button" className="button primary" onClick={onConvert}>{t(toHolding ? "转换为控股公司" : "转换为公司")}</button></footer>
  </div>;
}

function InitializeWorkbenchConfirm({ onExport, onInitialize, onClose, linkedFileName = "" }) {
  const { t } = useUiLanguage();
  const [confirmed, setConfirmed] = React.useState(false);
  return <div className="initialize-confirm"><strong>{t("恢复为全新工作台")}</strong>
    <p>{t("初始化会清除当前浏览器内的全部项目、集团、待清事项、自定义范本、自定义种类及自定义状态，并恢复内置内容。此操作不可撤销。")}</p>
    {linkedFileName && <p className="initialize-file-note">{t("初始化前会断开“{name}”，该文件本身不会被清除或覆盖。",
      { name: linkedFileName })}</p>}
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
    <GroupMemberForm member={view} groupSample={selectedGroupSample || EMPTY_GROUP_SAMPLE}
      onClose={() => setModal(null)} onSubmit={(values) => { updateGroup(group.id, (current) => ({ ...current,
        members: current.members.map((item) => item.id === member.id ? values : item) })); setModal(null); notify(t("组成部分设置已更新")); }}
      onRemove={() => { if (!window.confirm(t("将“{name}”移出此集团？", { name: target?.name || t("此组成部分") }))) return;
        updateGroup(group.id, (current) => ({ ...current, members: current.members.filter((item) => item.id !== member.id) }));
        setModal(null); notify(t("组成部分已移出集团")); }} /></Modal>;
}
