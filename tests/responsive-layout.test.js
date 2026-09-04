import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/dashboard/dashboard.css", import.meta.url), "utf8");
const workbench = readFileSync(new URL("../src/dashboard/Workbench.jsx", import.meta.url), "utf8");
const components = readFileSync(new URL("../src/dashboard/components.jsx", import.meta.url), "utf8");
const groupComponents = readFileSync(new URL("../src/dashboard/group-components.jsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../src/dashboard/timeline.jsx", import.meta.url), "utf8");
const deadlineAlerts = readFileSync(new URL("../src/dashboard/deadline-alerts.jsx", import.meta.url), "utf8");
const taxDeadlines = readFileSync(new URL("../src/dashboard/tax-deadlines.jsx", import.meta.url), "utf8");
const persistenceUi = readFileSync(new URL("../src/dashboard/persistence-ui.jsx", import.meta.url), "utf8");
const persistenceHook = readFileSync(new URL("../src/dashboard/use-workbench-persistence.js", import.meta.url), "utf8");
const managementReport = readFileSync(new URL("../src/dashboard/management-report.jsx", import.meta.url), "utf8");
const model = readFileSync(new URL("../src/dashboard/model.js", import.meta.url), "utf8");
const v11Components = readFileSync(new URL("../src/dashboard/v11-components.jsx", import.meta.url), "utf8");
const dateRangePicker = readFileSync(new URL("../src/dashboard/date-range-picker.jsx", import.meta.url), "utf8");
const homeOverview = readFileSync(new URL("../src/dashboard/home-overview.jsx", import.meta.url), "utf8");

test("compact outstanding centre remains recoverable at narrow viewport widths", () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.workbench-layout\[data-compact-layout\] > \.outstanding-center-shell\s*{[\s\S]*?position:\s*fixed/);
  assert.match(css, /\.workbench-layout\[data-compact-layout\]\[data-outstanding-collapsed\] > \.outstanding-center-shell\s*{[\s\S]*?inset:\s*auto 12px 12px auto/);
  assert.match(css, /\.workbench-layout\[data-compact-layout\]\[data-outstanding-collapsed\] \.outstanding-rail-toggle\s*{[\s\S]*?width:\s*46px;\s*height:\s*46px/);
});

test("compact outstanding drawer spans the full grid instead of the 48px rail", () => {
  assert.match(css, /:not\(\[data-outstanding-collapsed\]\) > \.outstanding-center-shell\s*{[\s\S]*?grid-column:\s*1 \/ -1;[\s\S]*?width:\s*min\(360px, calc\(100% - 64px\)\)/);
});

test("global actions use a persistent slim rail instead of a large header", () => {
  assert.match(workbench, /className="app-rail"/);
  assert.match(workbench, /<button type="button" className="app-mark" aria-expanded={!sidebarCollapsed}[\s\S]*?<PanelsTopLeft/);
  assert.equal((workbench.match(/setSidebarCollapsed\(\(current\) => !current\)/g) || []).length, 1);
  assert.match(workbench, /<h1 className="visually-hidden">/);
  assert.doesNotMatch(workbench, /className="workbench-toolbar"/);
  assert.match(css, /\.audit-workbench\s*{[\s\S]*?grid-template-columns:\s*54px minmax\(0, 1fr\)/);
});

test("home is the default actionable overview and remains available from the slim rail", () => {
  assert.match(workbench, /return \["detail", "schedule", "report"\]\.includes\(view\) \? view : "home"/);
  assert.match(workbench, /data-active={workspaceView === "home"/);
  assert.match(workbench, /<HomeOverview store={store}/);
  assert.match(homeOverview, /className="home-metric-grid"/);
  assert.match(homeOverview, /className="home-overview-panel home-priority-panel"/);
  assert.match(homeOverview, /className="home-project-row"/);
  assert.match(css, /\.home-overview-columns\s*{[^}]*grid-template-columns:/);
  assert.match(css, /@container workspace \(max-width: 900px\)[\s\S]*?\.home-overview-columns\s*{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("storage settings stay in the slim rail and expose compact save state", () => {
  assert.match(workbench, /<Settings aria-hidden="true"/);
  assert.match(workbench, /className="persistence-save-dot" data-status={persistence\.status}/);
  assert.match(workbench, /<PersistenceSettingsPanel persistence={persistence}/);
  assert.match(persistenceUi, /className="persistence-mode-grid"/);
  assert.match(persistenceUi, /connectCurrentToNewFile/);
  assert.match(persistenceUi, /chooseExistingFile|onOpenExisting/);
  assert.match(css, /\.persistence-mode-grid[\s\S]*?grid-template-columns:\s*repeat\(2,/);
});

test("leave protection and local-file sync are conditional on real unsaved state", () => {
  assert.match(persistenceHook, /shouldWarnBeforeUnload\(settings, status\)/);
  assert.match(persistenceHook, /window\.addEventListener\("beforeunload", warn\)/);
  assert.match(persistenceHook, /document\.visibilityState === "hidden"[\s\S]*?writerRef\.current\?\.flush\(\)/);
  assert.match(persistenceHook, /localStorage\.setItem\(STORAGE_KEY, payload\)/);
  assert.match(persistenceHook, /enqueueLinkedPayload\(payload\)/);
  assert.match(persistenceHook, /enqueue\(\{ payload, handle, session: writerSessionRef\.current \}\)/);
});

test("linked-file replacement, conflict recovery and initialisation are explicit", () => {
  assert.match(workbench, /type: "open-workspace-file"/);
  assert.match(workbench, /type: "persistence-conflict"/);
  assert.match(workbench, /if \(persistence\.settings\.mode === "linked_file"\) await persistence\.disconnect\(\)/);
  assert.match(persistenceUi, /download|被替换的版本会先下载为恢复备份/);
  assert.match(persistenceUi, /使用本地文件/);
  assert.match(persistenceUi, /使用浏览器副本/);
});

test("navigation filters show numeric counts without widening the compact tabs", () => {
  assert.match(workbench, /<strong>{navigationCounts\[value\]}<\/strong>/);
  assert.match(css, /\.filter-tabs button > strong\s*{[\s\S]*?font-variant-numeric:\s*tabular-nums/);
});

test("navigation switches between a company hierarchy and a flat annual-project list", () => {
  assert.match(workbench, /NAVIGATION_VIEW_KEY = "audit-progress-workbench:navigation-view"/);
  assert.match(workbench, /className="navigation-view-tabs"/);
  assert.match(workbench, /viewMode={navigationView}/);
  assert.match(groupComponents, /className="tree-row flat-engagement-row"/);
  assert.match(groupComponents, /yearEndOrPeriodLabel\(engagement, language\)/);
  assert.match(groupComponents, /className="workspace-tree-bulk-actions"/);
});

test("one persistent simplified-view toggle compacts both navigation and project schedule details", () => {
  assert.match(workbench, /SIMPLIFIED_VIEW_KEY = "audit-progress-workbench:simplified-view"/);
  assert.match(workbench, /localStorage\.setItem\(SIMPLIFIED_VIEW_KEY, String\(simplifiedView\)\)/);
  assert.match(workbench, /viewMode={navigationView} simplifiedView={simplifiedView}/);
  assert.match(workbench, /simplifiedView={simplifiedView} onToggleSimplifiedView=/);
  assert.match(groupComponents, /data-simplified={simplifiedView \|\| undefined}/);
  assert.match(timeline, /className="button secondary schedule-detail-toggle" aria-pressed={simplifiedView}/);
  assert.match(timeline, /data-simplified={simplifiedView \|\| undefined}/);
  assert.match(css, /\.workspace-tree\[data-simplified\] \.tree-row\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /\.schedule-grid\[data-simplified\] \.schedule-row-meta,[^}]*min-height:\s*56px/);
});

test("navigation exposes combinable owner, engagement-type and reporting-year filters", () => {
  assert.match(workbench, /className="navigation-filter-toggle"/);
  assert.match(workbench, /aria-label={t\("负责人筛选"\)}/);
  assert.match(workbench, /aria-label={t\("项目类型筛选"\)}/);
  assert.match(workbench, /aria-label={t\("报告年度筛选"\)}/);
  assert.match(workbench, /navigationFilters={navigationFilters}/);
  assert.match(groupComponents, /engagementMatchesNavigationFilters\(engagement, navigationFilters\)/);
  assert.match(css, /\.navigation-filter-panel\s*{[^}]*display:\s*grid/);
});

test("company and project navigation use text-first rows without decorative entity icons or company-type labels", () => {
  const projectList = groupComponents.match(/function EntityEngagementWorkspaceList[\s\S]*?function EntityWorkspaceTree/)?.[0] || "";
  const companyTree = groupComponents.match(/function EntityWorkspaceTree[\s\S]*?function LegacyWorkspaceTree/)?.[0] || "";
  assert.doesNotMatch(projectList, /tree-kind-mark/);
  assert.doesNotMatch(companyTree, /tree-kind-mark/);
  assert.doesNotMatch(companyTree, /entity\.relationshipRole\s*\|\|\s*entity\.entityType/);
  assert.match(css, /\.flat-engagement-row\s*{\s*grid-template-columns:\s*minmax\(0, 1fr\) auto 38px/);
});

test("company hierarchy renders nonmatching ancestors as transparent context instead of mislabelling their archive state", () => {
  assert.match(groupComponents, /const ownVisible = entityOwnVisible\(entity\)/);
  assert.match(groupComponents, /if \(!ownVisible\) return children\.length \? <React\.Fragment/);
  assert.match(groupComponents, /const childDepth = ownVisible \? depth \+ 1 : depth/);
  assert.match(groupComponents, /\["active", "all", "archived"\]\.includes\(filter\)/);
});

test("archiving records preserves the current navigation status view", () => {
  assert.doesNotMatch(workbench, /setFilter\("archived"\)/);
  assert.match(workbench, /updateEngagement\(id, \(item\) => \(\{ \.\.\.item, archived: true \}\)\);\s*notify/);
  assert.match(workbench, /updateEntity\(selectedEntitySource\.id,[\s\S]*?archived: true[\s\S]*?notify\(t\("公司已归档"\)\)/);
});

test("workflow controls share one compact row and template category management stays in the content header", () => {
  assert.match(components, /className="node-board-toolbar"[\s\S]*?className="node-structure-actions"/);
  assert.match(components, /className="sample-library-actions"[\s\S]*?onManageCategories/);
  assert.doesNotMatch(css, /\.template-category-manage/);
  assert.match(css, /\.node-board-toolbar\s*{[\s\S]*?grid-template-columns:/);
});

test("consolidation readiness and structure conversion use aligned compact controls", () => {
  assert.match(css, /\.group-matrix-row > span:has\(\.readiness-pill\)\s*{[\s\S]*?display:\s*flex/);
  assert.match(components, /转换为控股公司/);
  assert.match(groupComponents, /转换为公司/);
});

test("project schedule uses a two-click date range picker and day, week or month canvas", () => {
  assert.match(workbench, /<CalendarRange aria-hidden="true"/);
  assert.match(v11Components, /<DateRangePicker[\s\S]*?startDate={values\.startDate}[\s\S]*?dueDate={values\.dueDate}/);
  assert.match(dateRangePicker, /if \(!anchorDate\)[\s\S]*?setAnchorDate\(dateValue\)[\s\S]*?orderedRange\(anchorDate, dateValue\)/);
  assert.match(timeline, /className="schedule-grid"/);
  assert.match(timeline, /SCHEDULE_PRECISIONS = \["day", "week", "month"\]/);
  assert.match(timeline, /timeline\.ticks\.map/);
  assert.match(timeline, /className="schedule-precision"/);
  assert.match(timeline, /项目类型 · 负责人/);
  assert.match(timeline, /className="schedule-project-type">{projectTypeOwner}<\/small>/);
  assert.doesNotMatch(timeline, /schedule-delivery-period/);
  assert.match(timeline, /className="schedule-bar"[\s\S]*?title={`\$\{formatDate\(row\.startDate/);
  assert.match(css, /\.schedule-scroll\s*{[\s\S]*?overflow:\s*auto/);
  assert.match(css, /\.schedule-row-meta\s*{[\s\S]*?position:\s*sticky/);
  assert.match(css, /var\(--time-grid-width\)/);
});

test("project schedule rows support direct date editing and persistent drag ordering", () => {
  assert.match(timeline, /className="schedule-row-meta"[\s\S]*?draggable={canReorder}/);
  assert.doesNotMatch(timeline, /schedule-drag-handle|GripVertical/);
  assert.match(timeline, /onReorder\?\.\(sourceKey, targetKey/);
  assert.match(timeline, /onEditSchedule\?\.\(row\.kind, row\.id\)/);
  assert.match(workbench, /onEditSchedule={openScheduleEditor}/);
  assert.match(workbench, /reorderWorkspaceSchedule\(current, sourceKey, targetKey, position\)/);
  assert.match(groupComponents, /quickField === "schedule"/);
  assert.match(css, /\.schedule-row-meta\[data-drop-position="before"\]/);
});

test("company navigation and schedule metadata columns are resizable and remember their width", () => {
  assert.match(workbench, /NAVIGATION_WIDTH_KEY = "audit-progress-workbench:navigation-width"/);
  assert.match(workbench, /className="project-panel-resizer" role="separator"/);
  assert.match(workbench, /--project-panel-width/);
  assert.match(css, /grid-template-columns:\s*var\(--project-panel-width/);
  assert.match(timeline, /SCHEDULE_META_WIDTH_KEY = "audit-progress-workbench:schedule-meta-width"/);
  assert.match(timeline, /className="schedule-column-resizer" role="separator"/);
  assert.match(css, /grid-template-columns:\s*var\(--schedule-meta-width/);
  assert.match(css, /\.project-panel-resizer[\s\S]*?cursor:\s*col-resize/);
  assert.match(css, /\.schedule-column-resizer[\s\S]*?cursor:\s*col-resize/);
});

test("workstream cards reorder directly and contain long text inside each card", () => {
  assert.match(components, /className="workstream-card"[\s\S]*?draggable={!readOnly}/);
  assert.doesNotMatch(components, /workstream-drag-handle/);
  assert.match(workbench, /reorderWorkstreams\(project\.workstreams, sourceId, targetId, position\)/);
  assert.match(css, /\.workstream-card\s*{[^}]*overflow:\s*hidden/);
  assert.match(css, /\.workstream-card-top strong, \.workstream-card-top small\s*{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.workstream-card-meta\s*{[^}]*flex-wrap:\s*wrap/);
  assert.doesNotMatch(components, /workstream\.owner \|\| t\("未设置负责人"\)/);
  assert.doesNotMatch(components, /dueTone\(workstream\)/);
  assert.doesNotMatch(components, /stats\.completedNodes/);
});

test("workstreams and stages disclose one level at a time while stages and criteria remain draggable", () => {
  assert.match(workbench, /current === workstream\.id \? null : workstream\.id/);
  assert.match(components, /setSelectedId\(\(current\) => current === node\.id \? null : node\.id\)/);
  assert.match(components, /draggable={!readOnly} onDragStart={\(event\) => beginNodeDrag/);
  assert.match(components, /className="condition-row"[\s\S]*?draggable={!readOnly}/);
  assert.doesNotMatch(components, /condition-drag-handle|node-track-grip/);
  assert.match(workbench, /reorderCondition:[\s\S]*?reorderWorkstreams\(node\.conditions/);
  assert.match(css, /\.condition-row\[data-drop-position="before"\]/);
});

test("completion progress uses one compact green ring instead of horizontal bars", () => {
  assert.match(components, /--progress-angle/);
  assert.match(css, /\.progress-track\s*{[^}]*border-radius:\s*50%;[^}]*conic-gradient/);
  assert.match(css, /\.progress-track\[data-compact\]\s*{[^}]*width:\s*32px/);
  assert.match(components, /className="workstream-card-top"><ProgressBar value={stats\.percentage} compact/);
  assert.doesNotMatch(components, /className="workstream-card-progress"/);
  assert.doesNotMatch(css, /\.progress-track > span\s*{[^}]*width:/);
});

test("annual engagement forms omit internal names and project notes", () => {
  assert.doesNotMatch(v11Components, /<span>{t\("内部项目名称（可选）"\)}<\/span>/);
  assert.doesNotMatch(v11Components, /<span>{t\("项目备注"\)}<\/span>/);
});

test("annual engagements expose multiple preset and custom types throughout navigation and reporting", () => {
  assert.match(v11Components, /className="engagement-type-selector"/);
  assert.match(v11Components, /type="checkbox" checked={engagementTypeSelected\(type\)}/);
  assert.match(v11Components, /id="v11-custom-engagement-type"/);
  assert.match(v11Components, /可同时选择多个预设类型，也可以添加自定义类型/);
  assert.match(groupComponents, /engagementTypesLabel\(engagement, language\)/);
  assert.match(groupComponents, /<strong className="flat-engagement-type">{typeLabel}<\/strong>[\s\S]*?flat-engagement-period[\s\S]*?flat-engagement-company/);
  assert.match(groupComponents, /<strong className="tree-engagement-type">{typeLabel}<\/strong>[\s\S]*?tree-engagement-period/);
  assert.match(managementReport, /className="management-company-cell" rowSpan={group\.rows\.length}/);
  assert.match(managementReport, /className="management-period-cell"/);
  assert.match(managementReport, /engagementTypesLabel\(row, language\)/);
  assert.match(css, /\.engagement-type-selector\s*{/);
});

test("workstream controls use one shared settings action beside add and history controls share the title row", () => {
  assert.match(workbench, /className="section-heading-actions"[\s\S]*?设置所选业务模块/);
  assert.doesNotMatch(components, /className="workstream-edit/);
  assert.match(css, /\.workspace-history-controls\s*{[^}]*height:\s*0/);
  assert.match(css, /\.detail-header\s*{[^}]*padding:[^;}]*66px/);
});

test("screen typography keeps supporting interface text readable", () => {
  assert.match(css, /@media screen\s*{[\s\S]*?\.audit-workbench small\s*{[^}]*font-size:\s*13px !important/);
  assert.match(css, /\.management-report-table, \.record-risk-tables table\s*{\s*font-size:\s*13px/);
  assert.match(css, /\.schedule-corner strong, \.schedule-row-open strong\s*{\s*font-size:\s*14px/);
});

test("workstream settings omit owner and deadline because both belong to the annual engagement", () => {
  const workstreamForm = components.match(/export function WorkstreamForm[\s\S]*?export function WorkstreamCard/)?.[0] || "";
  assert.doesNotMatch(v11Components, /applyOwnerToWorkstreams/);
  assert.doesNotMatch(workstreamForm, /模块截止日|values\.dueDate/);
  assert.doesNotMatch(workstreamForm, /负责人|values\.owner/);
  assert.doesNotMatch(managementReport, /workstream\.owner|workstream\.dueDate/);
  assert.doesNotMatch(deadlineAlerts, /scope === "workstream"/);
});

test("cleared outstanding items remain discoverable through explicit visibility tabs", () => {
  assert.match(workbench, /visibilityFilter/);
  assert.match(workbench, /\["open", "closed", "all"\]/);
  assert.match(workbench, /已清／归档/);
  assert.match(css, /\.outstanding-visibility-tabs button\[aria-pressed="true"\]/);
});

test("print styles use one unnamed page context without named-page transitions", () => {
  assert.match(css, /@media print\s*{[\s\S]*?@page\s*{/);
  assert.doesNotMatch(css, /@page apw-report/);
  assert.doesNotMatch(css, /\.management-report\s*{[^}]*page:\s*apw-report/);
  assert.match(css, /\.workspace-history-controls/);
});

test("overdue deadlines use a compact global badge and open a navigable alert list", () => {
  assert.match(workbench, /className="app-rail-button deadline-alert-trigger"/);
  assert.match(workbench, /<strong className="app-rail-badge">/);
  assert.match(workbench, /<DeadlineAlertCentre alerts={deadlineAlertItems} onOpen={openDeadlineAlert}/);
  assert.match(deadlineAlerts, /visible\.map\(\(alert\) => <button/);
  assert.match(deadlineAlerts, /onClick=\{\(\) => onOpen\(alert\)\}/);
  assert.match(css, /\.app-rail-badge\s*{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.deadline-alert-list\s*{[\s\S]*?overflow-y:\s*auto/);
});

test("tax deadlines have a compact register, global filter and schedule markers", () => {
  assert.match(workbench, /<TaxDeadlineSummaryButton deadlines={groupTaxDeadlines}/);
  assert.match(workbench, /<TaxDeadlineManager store={store}/);
  assert.match(deadlineAlerts, /\["tax", "税务", taxCount\]/);
  assert.match(timeline, /className="schedule-tax-marker"/);
  assert.match(timeline, /className="schedule-tax-marker"[\s\S]*?title={`\$\{formatDate/);
  assert.doesNotMatch(timeline, /className="schedule-tax-marker"[\s\S]{0,700}?data-tooltip=/);
  assert.match(timeline, /deadlines\.length > 1 && <strong>{deadlines\.length}<\/strong>/);
  assert.match(taxDeadlines, /collectGroupTaxDeadlineEntries/);
  assert.match(taxDeadlines, /value={values\.reminderDays}/);
  assert.match(taxDeadlines, /className="tax-deadline-wide-field revision-reason"/);
  assert.match(css, /\.group-status-strip\s*{[\s\S]*?grid-template-columns:\s*repeat\(5,/);
  assert.match(css, /\.tax-deadline-form-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(3,/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.tax-deadline-row\s*{[\s\S]*?grid-template-columns:/);
});

test("annual duplication omits actual tax dates and removing a workstream only unlinks deadlines", () => {
  assert.match(model, /export function makeEngagement[\s\S]*?outstandingItems:\s*\[\],[\s\S]*?consolidation/);
  assert.match(model, /taxDeadlines:\s*Array\.isArray\(value\.taxDeadlines\)/);
  assert.match(workbench, /taxDeadlines:\s*\(current\.taxDeadlines \|\| \[\]\)\.map/);
  assert.match(workbench, /linkedWorkstreamId:\s*null/);
});

test("project summary facts open focused settings without exposing the full edit form", () => {
  for (const quickField of ["owner", "schedule", "framework"]) {
    assert.match(workbench, new RegExp(`quickField: "${quickField}"`));
  }
  assert.match(workbench, /type: "edit-entity", entityId: rawProject\.entityId/);
  assert.match(workbench, /className="detail-fact-link"/);
  assert.match(workbench, /设置所选业务模块[\s\S]*?activeRawWorkstream && setModal\(\{ type: "workstream-edit"/);
  assert.match(v11Components, /data-quick-field="schedule"/);
  assert.match(v11Components, /data-quick-field={quickField}/);
  assert.match(v11Components, /<DateRangePicker autoFocus/);
  assert.match(v11Components, /<input autoFocus list="v11-quick-framework-options"/);
  assert.match(v11Components, /: <input autoFocus value={values\[field\]}/);
  assert.match(css, /\.detail-fact-link::before\s*{[^}]*inset:\s*0/);
});

test("V11 company masters and annual engagement forms have compact responsive layouts", () => {
  assert.match(v11Components, /className="workbench-form company-master-form"/);
  assert.match(v11Components, /className="period-builder-controls"/);
  assert.match(v11Components, /className="annual-template-picker"/);
  assert.match(v11Components, /className="annual-project-rows"/);
  assert.match(v11Components, /className="holding-component-rows"/);
  assert.match(css, /\.period-builder-controls\s*{[\s\S]*?grid-template-columns:/);
  assert.match(css, /\.entity-facts\s*{[\s\S]*?grid-template-columns:\s*repeat\(4,/);
  assert.match(css, /@container workspace \(max-width: 820px\)[\s\S]*?\.entity-facts\s*{\s*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@media \(max-width: 500px\)[\s\S]*?\.period-builder-controls, \.entity-facts, \.merge-preview/);
  assert.match(workbench, /className="workspace-history-controls"/);
  assert.match(css, /\.workbench-modal-body\s*{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.entity-facts strong\s*{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*normal/);
  assert.match(v11Components, /formalReportingPeriodLabel\(latestEngagement, language\)/);
});

test("company creation supports a saved holding-company batch and engagements support multiple reporting periods", () => {
  assert.match(v11Components, /t\("集团批量"\)/);
  assert.match(v11Components, /batchCompanies\.map/);
  assert.match(v11Components, /className="group-batch-list"/);
  assert.match(workbench, /const \{ batchCompanies = \[\], \.\.\.entityValues \} = values/);
  assert.match(workbench, /parentEntityId: entity\.id/);
  assert.match(v11Components, /className="reporting-period-list"/);
  assert.match(v11Components, /t\("添加报告年度"\)/);
  assert.match(v11Components, /reportingPeriods: sortedPeriods/);
  assert.match(workbench, /modal\?\.type === "create-entity"[\s\S]{0,200}<Modal[\s\S]{0,200}\blarge>/);
  assert.match(workbench, /modal\?\.type === "edit-engagement"[\s\S]{0,240}large={!modal\.quickField}/);
  assert.match(css, /\.group-batch-list > article/);
  assert.match(css, /\.reporting-period-list > article/);
});

test("the tax deadline fact matches the other editable summary cells and opens direct editing", () => {
  assert.match(workbench, /<DetailFactAction className="tax-deadline-fact"/);
  assert.match(workbench, /editDeadlineId: taxSummary\.next\?\.id \?\? null/);
  assert.match(workbench, /initialEditDeadlineId={modal\.editDeadlineId}/);
  assert.match(taxDeadlines, /initialEditDeadlineId !== undefined/);
  assert.doesNotMatch(workbench, /<div className="tax-deadline-fact">/);
  assert.doesNotMatch(css, /\.tax-deadline-fact dd\s*{\s*overflow:\s*visible/);
});

test("management reports keep sortable detail and one continuous paged-media context", () => {
  assert.match(workbench, /<ManagementReport store={store}/);
  assert.match(managementReport, /function SortableHeading/);
  assert.match(managementReport, /<PrintScope filters={filters}/);
  assert.match(css, /@page\s*{[\s\S]*?@bottom-right\s*{[\s\S]*?counter\(page\)[\s\S]*?counter\(pages\)/);
  assert.doesNotMatch(css, /@page apw-report|page:\s*apw-report/);
  assert.doesNotMatch(css, /\.print-report-footer\s*{[\s\S]*?position:\s*fixed/);
});
