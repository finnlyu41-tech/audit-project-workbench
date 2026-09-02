import React from "react";
import { Modal, NodeCard, NodeForm, OutstandingStatusEditor, ProgressBar, ProjectForm, ProjectRow, SampleEditor,
  SampleLibrary } from "./components.jsx";
import { STORAGE_KEY, createDefaultSample, duplicateSample, formatDate, isValidStore, loadStore, localizeSample,
  localizeOutstandingStatuses, localizeWorkflowNodes, makeBlankSample, makeNode, makeOutstandingItem, makeProject,
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
  const [selectedId, setSelectedId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("active");
  const [modal, setModal] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true"; } catch { return false; }
  });
  const importRef = React.useRef(null);

  React.useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(store)), [store]);
  React.useEffect(() => {
    try { localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed)); } catch { /* preference is optional */ }
  }, [sidebarCollapsed]);
  React.useEffect(() => {
    if (!selectedId && store.projects.length) {
      setSelectedId((store.projects.find((project) => !project.archived) || store.projects[0]).id);
    } else if (selectedId && !store.projects.some((project) => project.id === selectedId)) {
      setSelectedId(store.projects[0]?.id || null);
    }
  }, [store.projects, selectedId]);
  React.useEffect(() => {
    if (store.samples.length && !store.samples.some((sample) => sample.id === store.selectedSampleId)) {
      setStore((current) => ({ ...current, selectedSampleId: current.samples[0]?.id || null }));
    }
  }, [store.samples, store.selectedSampleId]);
  React.useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const selectedProjectSource = store.projects.find((project) => project.id === selectedId) || null;
  const selectedProject = selectedProjectSource ? { ...selectedProjectSource,
    nodes: localizeWorkflowNodes(selectedProjectSource.nodes, language) } : null;
  const visibleProjects = store.projects.filter((project) => {
    const complete = project.nodes.length > 0 && project.nodes.every(nodeIsComplete);
    if (filter === "archived") return project.archived;
    if (project.archived) return false;
    if (filter === "completed" && !complete) return false;
    if (filter === "active" && complete) return false;
    const query = search.trim().toLowerCase();
    return !query || [project.name, project.entity, project.period].some((value) => value?.toLowerCase().includes(query));
  }).sort((left, right) => {
    if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.dueDate) return -1;
    if (right.dueDate) return 1;
    return right.updatedAt.localeCompare(left.updatedAt);
  });

  const active = store.projects.filter((project) => !project.archived);
  const completed = active.filter((project) => project.nodes.length > 0 && project.nodes.every(nodeIsComplete));
  const totalConditions = active.reduce((sum, project) => sum + projectStats(project).conditions, 0);
  const doneConditions = active.reduce((sum, project) => sum + projectStats(project).completedConditions, 0);
  const sampleViews = store.samples.map((sample) => localizeSample(sample, language));
  const outstandingStatusViews = localizeOutstandingStatuses(store.outstandingStatuses, language);
  const outstandingStatusUsage = store.projects.flatMap((project) => project.outstandingItems || [])
    .reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] || 0) + 1 }), {});
  const selectedSample = sampleViews.find((sample) => sample.id === store.selectedSampleId) || sampleViews[0] || null;
  const sampleConditionCount = selectedSample?.nodes.reduce((sum, node) => sum + node.conditions.length, 0) || 0;
  const editingSampleSource = modal?.type === "sample-edit"
    ? (modal.sample || store.samples.find((sample) => sample.id === modal.sampleId)) : null;
  const editingSample = editingSampleSource ? localizeSample(editingSampleSource, language) : null;

  const updateProject = React.useCallback((projectId, updater) => setStore((current) => ({
    ...current,
    projects: current.projects.map((project) => project.id === projectId
      ? { ...updater(project), updatedAt: new Date().toISOString() }
      : project),
  })), []);
  const notify = (text) => setMessage(text);
  const saveSample = (sample) => {
    const saved = { ...sample, updatedAt: new Date().toISOString() };
    setStore((current) => ({ ...current,
      samples: current.samples.some((item) => item.id === saved.id)
        ? current.samples.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current.samples],
      selectedSampleId: saved.id,
    }));
    setModal({ type: "sample-library" });
    notify(t("Sample 已更新；现有项目不受影响"));
  };
  const resetSample = (sampleId) => {
    if (!window.confirm(t("恢复基础 Sample？当前 Sample 的自定义内容将被替换。"))) return;
    const restored = { ...createDefaultSample(language), id: sampleId };
    setStore((current) => ({ ...current,
      samples: current.samples.map((sample) => sample.id === sampleId ? restored : sample),
      selectedSampleId: sampleId,
    }));
    setModal({ type: "sample-library" });
    notify(t("Sample 已恢复为基础范本"));
  };

  const redactSample = (sampleId, names, replacement) => {
    const source = store.samples.find((sample) => sample.id === sampleId);
    if (!source) return;
    const result = redactSampleCompanies(localizeSample(source, language), names, replacement);
    if (!result.replacements) {
      notify(t("没有找到完全匹配的公司名称"));
      return;
    }
    setStore((current) => ({ ...current,
      samples: current.samples.map((sample) => sample.id === sampleId ? result.sample : sample),
      selectedSampleId: sampleId,
    }));
    setModal({ type: "sample-library" });
    notify(t("{count} 处公司名称已去敏", { count: result.replacements }));
  };

  const copySample = (sampleId) => {
    const source = sampleViews.find((sample) => sample.id === sampleId);
    if (!source) return;
    const copy = duplicateSample(source, t("（副本）"));
    setStore((current) => ({ ...current, samples: [copy, ...current.samples], selectedSampleId: copy.id }));
    notify(t("Sample 已复制"));
  };

  const deleteSample = (sampleId) => {
    const sample = sampleViews.find((item) => item.id === sampleId);
    if (!sample || !window.confirm(t("删除 Sample“{name}”？", { name: sample.name }))) return;
    setStore((current) => {
      const samples = current.samples.filter((item) => item.id !== sampleId);
      return { ...current, samples,
        selectedSampleId: current.selectedSampleId === sampleId ? (samples[0]?.id || null) : current.selectedSampleId };
    });
    notify(t("Sample 已删除"));
  };

  const createProject = (values, useStarter) => {
    const project = makeProject(values, Boolean(useStarter && selectedSample), selectedSample?.nodes || []);
    setStore((current) => ({ ...current, projects: [project, ...current.projects] }));
    setSelectedId(project.id);
    setFilter("all");
    setModal(null);
    notify(t("项目已建立并自动保存"));
  };

  const duplicateProject = (project) => {
    const now = new Date().toISOString();
    const copy = {
      ...project,
      id: uid("project"),
      name: `${project.name}${t("（副本）")}`,
      archived: false,
      createdAt: now,
      updatedAt: now,
      outstandingItems: [],
      nodes: project.nodes.map((node) => makeNode({
        title: node.title,
        description: node.description,
        conditions: node.conditions.map((condition) => condition.label),
      })),
    };
    setStore((current) => ({ ...current, projects: [copy, ...current.projects] }));
    setSelectedId(copy.id);
    setFilter("all");
    notify(t("已复制流程，所有完成状态已重置"));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-project-workbench-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(t("备份已导出"));
  };

  const importBackup = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isValidStore(parsed)) throw new Error("invalid");
      if (!window.confirm(t("将导入 {count} 个项目和整个 Sample 范本库，并替换当前数据，是否继续？", {
        count: parsed.projects.length,
      }))) return;
      setStore(normalizeStore(parsed));
      setSelectedId(parsed.projects[0]?.id || null);
      notify(t("备份已恢复"));
    } catch {
      window.alert(t("这不是有效的工作台备份文件。"));
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  return <article className="audit-workbench">
    {message && <div className="save-toast" role="status">{message}</div>}
    <header className="workbench-toolbar">
      <div><h1>{t("审计项目工作台")}</h1><p>{t("用自定义节点和完成条件，追踪每个项目下一步要做什么。")}</p></div>
      <div className="toolbar-actions">
        <div className="language-toggle" role="group" aria-label={t("界面语言")}>
          <button type="button" aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>{t("中文")}</button>
          <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>{t("英文")}</button>
        </div>
        <input ref={importRef} type="file" accept="application/json" hidden
          onChange={(event) => importBackup(event.target.files?.[0])} />
        <button type="button" className="button secondary" onClick={() => importRef.current?.click()}>{t("恢复备份")}</button>
        <button type="button" className="button secondary" onClick={exportBackup}>{t("导出备份")}</button>
        <button type="button" className="button primary" onClick={() => setModal({ type: "create" })}>＋ {t("新建项目")}</button>
      </div>
    </header>

    <section className="summary-strip" aria-label={t("项目摘要")}>
      <div><span>{t("进行中")}</span><strong>{active.length - completed.length}</strong></div>
      <div><span>{t("已完成")}</span><strong>{completed.length}</strong></div>
      <div><span>{t("完成条件")}</span><strong>{doneConditions}<small> / {totalConditions}</small></strong></div>
      <div><span>{t("已归档")}</span><strong>{store.projects.filter((project) => project.archived).length}</strong></div>
    </section>

    <section className="workbench-layout" data-sidebar-collapsed={sidebarCollapsed || undefined}>
      <aside className="project-panel" aria-label={t("审计项目")}>
        {sidebarCollapsed ? <button type="button" className="sidebar-rail-toggle" aria-expanded="false"
          aria-label={t("展开项目栏")} title={t("展开项目栏")} onClick={() => setSidebarCollapsed(false)}>
          <span aria-hidden="true">›</span><small>{t("项目")}</small></button> : <>
        <div className="project-panel-controls">
          <div className="project-panel-title"><div><button type="button" className="sidebar-toggle" aria-expanded="true"
            aria-label={t("收起项目栏")} title={t("收起项目栏")} onClick={() => setSidebarCollapsed(true)}>‹</button>
            <strong>{t("项目列表")}</strong></div>
            <span>{visibleProjects.length} / {store.projects.length}</span></div>
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={search}
            onChange={(event) => setSearch(event.target.value)} placeholder={t("搜索项目或实体")} aria-label={t("搜索项目或实体")} /></label>
          <div className="filter-tabs" role="tablist" aria-label={t("项目状态")}>{
            [["active", "进行中"], ["completed", "已完成"], ["all", "全部"], ["archived", "归档"]]
              .map(([value, label]) => <button type="button" role="tab" key={value} aria-selected={filter === value}
                onClick={() => setFilter(value)}>{t(label)}</button>)}</div>
        </div>
        <section className="sample-shelf" aria-label={t("Sample 范本库")}>
          <div className="sample-shelf-label"><strong>{t("Sample 范本库")}</strong>
            <span>{t("{count} 个范本", { count: store.samples.length })}</span></div>
          {selectedSample ? <div className="sample-shelf-card">
            <span className="sample-mark" aria-hidden="true">S</span>
            <div><strong>{selectedSample.name}</strong><span>{t("{nodes} 个节点 · {conditions} 项条件", {
              nodes: selectedSample.nodes.length, conditions: sampleConditionCount })}</span></div>
          </div> : <div className="sample-shelf-card sample-shelf-empty"><span className="sample-mark" aria-hidden="true">S</span>
            <div><strong>{t("未选择 Sample")}</strong><span>{t("请先建立或选择一个范本")}</span></div></div>}
          <div className="sample-shelf-actions">
            <button type="button" onClick={() => setModal({ type: "sample-library" })}>{t("管理范本库")}</button>
            <button type="button" disabled={!selectedSample}
              onClick={() => setModal({ type: "create", source: "sample" })}>{t("使用此 Sample")}</button>
          </div>
        </section>
        <div className="project-list">
          {visibleProjects.map((project) => <ProjectRow key={project.id}
            project={{ ...project, nodes: localizeWorkflowNodes(project.nodes, language) }} outstandingStatuses={outstandingStatusViews}
            selected={project.id === selectedId} onSelect={() => setSelectedId(project.id)} />)}
          {!visibleProjects.length && <div className="list-empty"><strong>{t(store.projects.length ? "没有符合筛选的项目" : "还没有审计项目")}</strong>
            <span>{t(store.projects.length ? "可以切换状态或修改搜索条件。" : "先建立一个项目，再添加节点和完成条件。")}</span>
            {!store.projects.length && <button type="button" className="button primary"
              onClick={() => setModal({ type: "create" })}>{t("新建第一个项目")}</button>}</div>}
        </div>
        </>}
      </aside>
      <section className="project-detail" aria-label={t("项目详情")}>
        {selectedProject ? <ProjectDetail project={selectedProject} outstandingStatuses={outstandingStatusViews}
          updateProject={updateProject} setModal={setModal} notify={notify} duplicateProject={duplicateProject} /> : <div className="detail-empty">
          <span className="empty-mark">◎</span><h2>{t("选择一个项目")}</h2><p>{t("项目的节点、完成条件和进度会显示在这里。")}</p></div>}
      </section>
    </section>

    {modal?.type === "create" && <Modal title={t(modal.source === "sample" ? "使用 Sample 建立项目" : "新建审计项目")}
      onClose={() => setModal(null)}>
      <ProjectForm allowTemplate={modal.source !== "sample" && Boolean(selectedSample)} sampleName={selectedSample?.name || t("未选择 Sample")}
        onSubmit={createProject} onClose={() => setModal(null)} />
    </Modal>}
    {modal?.type === "sample-library" && <Modal wide title={t("Sample 范本库")} onClose={() => setModal(null)}>
      <SampleLibrary samples={sampleViews} selectedSampleId={store.selectedSampleId}
        onSelect={(sampleId) => setStore((current) => ({ ...current, selectedSampleId: sampleId }))}
        onCreate={() => setModal({ type: "sample-edit", sample: makeBlankSample(language) })}
        onEdit={(sampleId) => setModal({ type: "sample-edit", sampleId })}
        onDuplicate={copySample} onDelete={deleteSample}
        onUse={(sampleId) => {
          setStore((current) => ({ ...current, selectedSampleId: sampleId }));
          setModal({ type: "create", source: "sample" });
        }} />
    </Modal>}
    {modal?.type === "sample-edit" && editingSample && <Modal wide
      title={`${t(modal.sample ? "新建 Sample" : "编辑 Sample")} · ${editingSample.name}`}
      onClose={() => setModal({ type: "sample-library" })}>
      <SampleEditor key={`${editingSample.id}-${editingSample.updatedAt}-${language}`} sample={editingSample} onSave={saveSample}
        onClose={() => setModal({ type: "sample-library" })}
        onReset={editingSample.builtinKey ? () => resetSample(editingSample.id) : null}
        onRedact={modal.sample ? null : () => setModal({ type: "sample-redact", sampleId: editingSample.id })} />
    </Modal>}
    {modal?.type === "sample-redact" && <Modal title={t("Sample 公司去敏")}
      onClose={() => setModal({ type: "sample-edit", sampleId: modal.sampleId })}>
      <SampleRedactionForm language={language} onSubmit={(names, replacement) => redactSample(modal.sampleId, names, replacement)}
        onClose={() => setModal({ type: "sample-edit", sampleId: modal.sampleId })} />
    </Modal>}
    {modal?.type === "edit-project" && selectedProject && <Modal title={t("编辑项目资料")} onClose={() => setModal(null)}>
      <ProjectForm initial={selectedProject} allowTemplate={false} submitLabel="保存修改"
        onClose={() => setModal(null)} onSubmit={(values) => {
          updateProject(selectedProject.id, (project) => ({ ...project, ...values }));
          setModal(null); notify(t("项目资料已更新"));
        }} />
    </Modal>}
    {modal?.type === "node" && selectedProject && <Modal title={t(modal.node ? "编辑节点" : "添加节点")}
      onClose={() => setModal(null)}><NodeForm initial={modal.node} onClose={() => setModal(null)} onSubmit={(values) => {
        updateProject(selectedProject.id, (project) => ({ ...project, nodes: modal.node
          ? project.nodes.map((node) => node.id === modal.node.id ? { ...node, ...values } : node)
          : [...project.nodes, makeNode(values)] }));
        setModal(null); notify(t(modal.node ? "节点已更新" : "节点已添加"));
      }} /></Modal>}
    {modal?.type === "condition" && selectedProject && <Modal title={t(modal.condition ? "修改完成条件" : "添加完成条件")}
      onClose={() => setModal(null)}><ConditionForm initial={modal.condition?.label} onClose={() => setModal(null)}
        onSubmit={(label) => {
          updateProject(selectedProject.id, (project) => ({ ...project, nodes: project.nodes.map((node) => node.id !== modal.nodeId
            ? node : { ...node, conditions: modal.condition
              ? node.conditions.map((condition) => condition.id === modal.condition.id ? { ...condition, label } : condition)
              : [...node.conditions, { id: uid("condition"), label, done: false }] }) }));
          setModal(null); notify(t(modal.condition ? "条件已修改" : "条件已添加"));
        }} /></Modal>}
    {modal?.type === "outstanding" && selectedProject && <Modal title={t(modal.item ? "编辑待清事项" : "添加待清事项")}
      onClose={() => setModal(null)}><OutstandingForm initial={modal.item} statuses={outstandingStatusViews} onClose={() => setModal(null)}
        onSubmit={(values) => {
          updateProject(selectedProject.id, (project) => ({ ...project,
            outstandingItems: modal.item
              ? project.outstandingItems.map((item) => item.id === modal.item.id
                ? { ...item, ...values, updatedAt: new Date().toISOString() } : item)
              : [...project.outstandingItems, makeOutstandingItem(values, store.outstandingStatuses)] }));
          setModal(null); notify(t(modal.item ? "待清事项已更新" : "待清事项已添加"));
        }} /></Modal>}
    {modal?.type === "outstanding-statuses" && <Modal wide title={t("自定义待清状态")} onClose={() => setModal(null)}>
      <OutstandingStatusEditor key={language} statuses={outstandingStatusViews} usageCounts={outstandingStatusUsage}
        onClose={() => setModal(null)} onSave={(statuses) => {
          setStore((current) => ({ ...current, outstandingStatuses: statuses }));
          setModal(null); notify(t("待清状态已更新"));
        }} />
    </Modal>}
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
  }}>
    <label><span>{t("公司全名（每行一个）*")}</span><textarea autoFocus required rows="5" value={names}
      onChange={(event) => setNames(event.target.value)} placeholder={t("例如：示例航运有限公司")} />
      <small className="form-help">{t("仅替换你输入的完整名称，不会自动猜测公司名称。")}</small></label>
    <label><span>{t("替换为")}</span><input required value={replacement}
      onChange={(event) => setReplacement(event.target.value)} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("开始去敏")}</button></footer>
  </form>;
}

function ConditionForm({ initial = "", onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [label, setLabel] = React.useState(initial);
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault(); if (label.trim()) onSubmit(label.trim());
  }}><label><span>{t("达成条件 *")}</span><input autoFocus required value={label} onChange={(event) => setLabel(event.target.value)}
    placeholder={t("例如：管理层声明书已签署")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存条件")}</button></footer></form>;
}

function OutstandingForm({ initial, statuses, onSubmit, onClose }) {
  const { t } = useUiLanguage();
  const [values, setValues] = React.useState(() => ({
    title: initial?.title || "",
    status: initial?.status || statuses.find((status) => !status.closed)?.id || statuses[0]?.id || "",
    note: initial?.note || "",
  }));
  return <form className="workbench-form" onSubmit={(event) => {
    event.preventDefault();
    if (values.title.trim()) onSubmit({ ...values, title: values.title.trim(), note: values.note.trim() });
  }}>
    <label><span>{t("待清事项 *")}</span><input autoFocus required value={values.title}
      onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
      placeholder={t("例如：尚欠银行月结单")} /></label>
    <label><span>{t("当前状态")}</span><select value={values.status}
      onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}>{statuses
        .map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
    <label><span>{t("说明")}</span><textarea rows="3" value={values.note}
      onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
      placeholder={t("可记录所欠期间、已跟进日期或签署文件名称")} /></label>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{t("取消")}</button>
      <button type="submit" className="button primary">{t("保存待清事项")}</button></footer>
  </form>;
}

function OutstandingPanel({ project, statuses, updateProject, setModal, notify }) {
  const { t } = useUiLanguage();
  const items = project.outstandingItems || [];
  const openItems = items.filter((item) => outstandingIsOpen(item, statuses));
  const sortedItems = [...items].sort((left, right) => {
    if (outstandingIsOpen(left, statuses) !== outstandingIsOpen(right, statuses)) {
      return outstandingIsOpen(left, statuses) ? -1 : 1;
    }
    return (right.updatedAt || "").localeCompare(left.updatedAt || "");
  });
  const changeStatus = (itemId, status) => {
    updateProject(project.id, (current) => ({ ...current, outstandingItems: current.outstandingItems.map((item) =>
      item.id === itemId ? { ...item, status, updatedAt: new Date().toISOString() } : item) }));
    notify(t(statuses.find((item) => item.id === status)?.closed
      ? "待清事项已标记为解决" : "待清事项状态已更新"));
  };
  return <section className="outstanding-panel" aria-label={t("待清事项状态栏")}>
    <header className="outstanding-header"><div><div className="outstanding-title"><h3>{t("待清事项")}</h3>
      <span data-empty={!openItems.length || undefined}>{t("{count} 项未清", { count: openItems.length })}</span></div>
      <p>{t("独立追踪缺少文件、客户签署及其他阻塞事项，不计入节点进度。")}</p></div>
      <div className="outstanding-header-actions"><button type="button" className="button secondary"
        onClick={() => setModal({ type: "outstanding-statuses" })}>{t("管理状态")}</button>
        <button type="button" className="button secondary" onClick={() => setModal({ type: "outstanding" })}>{t("＋ 添加待清事项")}</button></div></header>
    <div className="outstanding-status-strip">{statuses.map((status) => {
      const count = items.filter((item) => item.status === status.id).length;
      return <span key={status.id} data-tone={status.tone} data-closed={status.closed || undefined}>
        <i />{status.label}<strong>{count}</strong></span>;
    })}</div>
    {sortedItems.length ? <div className="outstanding-list">{sortedItems.map((item) => <div className="outstanding-row"
      data-closed={!outstandingIsOpen(item, statuses) || undefined} key={item.id}><div className="outstanding-item-copy"><strong>{item.title}</strong>
        {item.note && <small>{item.note}</small>}</div>
      <select value={item.status} aria-label={t("{name}状态", { name: item.title })} onChange={(event) => changeStatus(item.id, event.target.value)}>
        {statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
      <div className="outstanding-actions"><button type="button" onClick={() => setModal({ type: "outstanding", item })}>{t("编辑")}</button>
        <button type="button" onClick={() => window.confirm(t("删除待清事项“{name}”？", { name: item.title })) &&
          updateProject(project.id, (current) => ({ ...current,
            outstandingItems: current.outstandingItems.filter((entry) => entry.id !== item.id) }))}>{t("删除")}</button></div></div>)}</div>
      : <div className="outstanding-empty"><strong>{t("目前没有待清事项")}</strong><span>{t("出现缺文件或等待签署时，可在这里随时添加。")}</span></div>}
  </section>;
}

function ProjectDetail({ project, outstandingStatuses, updateProject, setModal, notify, duplicateProject }) {
  const { language, t } = useUiLanguage();
  const stats = projectStats(project);
  const currentNode = project.nodes.find((node) => !nodeIsComplete(node));
  const nextCondition = currentNode?.conditions.find((condition) => !condition.done);
  const updateNodes = (updater) => updateProject(project.id, (current) => ({ ...current, nodes: updater(current.nodes) }));
  return <>
    <header className="detail-header"><div><span className="detail-kicker">{t(project.archived ? "已归档项目" : "审计项目")}</span>
      <h2>{project.name}</h2><p>{[project.entity, project.period].filter(Boolean).join(" · ") || t("尚未填写实体和报告期间")}</p></div>
      <div className="detail-actions"><button type="button" className="button secondary"
        onClick={() => duplicateProject(project)}>{t("复制流程")}</button>
        <button type="button" className="button secondary" onClick={() => setModal({ type: "edit-project" })}>{t("编辑项目")}</button>
        <button type="button" className="button secondary" onClick={() => {
          updateProject(project.id, (current) => ({ ...current, archived: !current.archived }));
          notify(t(project.archived ? "项目已恢复" : "项目已归档"));
        }}>{t(project.archived ? "恢复项目" : "归档项目")}</button></div></header>

    <div className="project-overview"><div className="overview-progress"><div><span>{t("整体进度")}</span><strong>{stats.percentage}%</strong></div>
      <ProgressBar value={stats.percentage} /><small>{t("{done} / {total} 个节点完成 · {criteriaDone} / {criteriaTotal} 项条件达成", {
        done: stats.completedNodes, total: stats.nodes, criteriaDone: stats.completedConditions, criteriaTotal: stats.conditions })}</small></div>
      <div className="next-action"><span>{t(stats.percentage === 100 && stats.nodes ? "项目状态" : "下一项条件")}</span>
        <strong>{stats.percentage === 100 && stats.nodes ? t("所有节点已经完成")
          : nextCondition?.label || t(currentNode ? "请为当前节点添加完成条件" : "请先添加项目节点")}</strong>
        <small>{currentNode ? t("当前节点：{name}", { name: currentNode.title }) : formatDate(project.dueDate, language)}</small></div></div>
    <OutstandingPanel project={project} statuses={outstandingStatuses} updateProject={updateProject}
      setModal={setModal} notify={notify} />
    {project.notes && <div className="project-note"><strong>{t("项目备注")}</strong><p>{project.notes}</p></div>}
    <div className="nodes-heading"><div><h3>{t("项目节点")}</h3><p>{t("勾选全部条件后，节点会自动完成。")}</p></div>
      <button type="button" className="button primary" onClick={() => setModal({ type: "node" })}>{t("＋ 添加节点")}</button></div>
    <div className="node-list">{project.nodes.map((node, index) => <NodeCard key={node.id} node={node} index={index}
      total={project.nodes.length} isCurrent={node.id === currentNode?.id} actions={{
        toggle: (conditionId) => updateNodes((nodes) => nodes.map((item) => item.id !== node.id ? item
          : { ...item, conditions: item.conditions.map((condition) => condition.id === conditionId
            ? { ...condition, done: !condition.done } : condition) })),
        addCondition: () => setModal({ type: "condition", nodeId: node.id }),
        editCondition: (condition) => setModal({ type: "condition", nodeId: node.id, condition }),
        deleteCondition: (conditionId) => window.confirm(t("删除这个完成条件？")) && updateNodes((nodes) => nodes.map((item) => item.id !== node.id
          ? item : { ...item, conditions: item.conditions.filter((condition) => condition.id !== conditionId) })),
        editNode: () => setModal({ type: "node", node }),
        move: (direction) => updateNodes((nodes) => { const next = [...nodes]; const target = index + direction;
          if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]; return next; }),
        deleteNode: () => window.confirm(t("删除节点“{name}”及其所有条件？", { name: node.title }))
          && updateNodes((nodes) => nodes.filter((item) => item.id !== node.id)),
      }} />)}
      {!project.nodes.length && <div className="nodes-empty"><span>{t("还没有项目节点")}</span>
        <p>{t("添加第一个节点，并设置它需要达成的条件。")}</p><button type="button" className="button primary"
          onClick={() => setModal({ type: "node" })}>{t("添加节点")}</button></div>}</div>
  </>;
}
