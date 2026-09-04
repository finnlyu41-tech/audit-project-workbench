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

test("project schedule uses separate start and deadline fields and a horizontally scrollable weekly canvas", () => {
  assert.match(workbench, /<CalendarRange aria-hidden="true"/);
  assert.match(components, /value={values\.startDate}[\s\S]*?value={values\.dueDate}/);
  assert.match(groupComponents, /value={values\.startDate}[\s\S]*?value={values\.dueDate}/);
  assert.match(timeline, /className="schedule-grid"/);
  assert.match(timeline, /timeline\.weeks\.map/);
  assert.match(css, /\.schedule-scroll\s*{[\s\S]*?overflow:\s*auto/);
  assert.match(css, /\.schedule-row-meta\s*{[\s\S]*?position:\s*sticky/);
});

test("project schedule rows support direct date editing and persistent drag ordering", () => {
  assert.match(timeline, /className="schedule-drag-handle" draggable="true"/);
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
  assert.match(components, /className="workstream-drag-handle icon-only" draggable="true"/);
  assert.match(workbench, /reorderWorkstreams\(project\.workstreams, sourceId, targetId, position\)/);
  assert.match(css, /\.workstream-card\s*{[^}]*overflow:\s*hidden/);
  assert.match(css, /\.workstream-card-top strong, \.workstream-card-top small\s*{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.workstream-card-meta\s*{[^}]*flex-wrap:\s*wrap/);
});

test("workstreams and stages disclose one level at a time while stages and criteria remain draggable", () => {
  assert.match(workbench, /current === workstream\.id \? null : workstream\.id/);
  assert.match(components, /setSelectedId\(\(current\) => current === node\.id \? null : node\.id\)/);
  assert.match(components, /draggable={!readOnly} onDragStart={\(event\) => beginNodeDrag/);
  assert.match(components, /className="condition-drag-handle icon-only" draggable="true"/);
  assert.match(workbench, /reorderCondition:[\s\S]*?reorderWorkstreams\(node\.conditions/);
  assert.match(css, /\.condition-row\[data-drop-position="before"\]/);
});

test("completion progress uses one compact green ring instead of horizontal bars", () => {
  assert.match(components, /--progress-angle/);
  assert.match(css, /\.progress-track\s*{[^}]*border-radius:\s*50%;[^}]*conic-gradient/);
  assert.match(css, /\.progress-track\[data-compact\]\s*{[^}]*width:\s*32px/);
  assert.doesNotMatch(css, /\.progress-track > span\s*{[^}]*width:/);
});

test("annual engagement forms omit internal names and project notes", () => {
  assert.doesNotMatch(v11Components, /<span>{t\("内部项目名称（可选）"\)}<\/span>/);
  assert.doesNotMatch(v11Components, /<span>{t\("项目备注"\)}<\/span>/);
});

test("annual engagements expose a customisable type throughout navigation and reporting", () => {
  assert.match(v11Components, /list="v11-engagement-type-options"/);
  assert.match(v11Components, /value={values\.engagementType}/);
  assert.match(groupComponents, /engagementTypeLabel\(engagement\.engagementType, language\)/);
  assert.match(managementReport, /className="management-company-cell" rowSpan={group\.rows\.length}/);
  assert.match(managementReport, /className="management-period-cell"/);
  assert.match(managementReport, /engagementTypeLabel\(row\.engagementType, language\)/);
});

test("owner quick edit can apply the same person to every workstream", () => {
  assert.match(v11Components, /className="check-option apply-owner-option"/);
  assert.match(v11Components, /applyOwnerToWorkstreams:\s*quickField === "owner"/);
  assert.match(workbench, /engagement\.workstreams\.map\(\(workstream\) => \(\{ \.\.\.workstream,[\s\S]*?owner:\s*values\.owner/);
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
  assert.match(workbench, /activeRawWorkstream \? \{ type: "workstream-edit"/);
  assert.match(v11Components, /data-quick-field="schedule"/);
  assert.match(v11Components, /data-quick-field={quickField}/);
  assert.match(v11Components, /<input autoFocus type="date"/);
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

test("the tax deadline fact matches the other editable summary cells and opens direct editing", () => {
  assert.match(workbench, /<DetailFactAction className="tax-deadline-fact"/);
  assert.match(workbench, /editDeadlineId: taxSummary\.next\?\.id \?\? null/);
  assert.match(workbench, /initialEditDeadlineId={modal\.editDeadlineId}/);
  assert.match(taxDeadlines, /initialEditDeadlineId !== undefined/);
  assert.doesNotMatch(workbench, /<div className="tax-deadline-fact">/);
  assert.doesNotMatch(css, /\.tax-deadline-fact dd\s*{\s*overflow:\s*visible/);
});

test("management reports keep sortable detail and real paged-media numbering", () => {
  assert.match(workbench, /<ManagementReport store={store}/);
  assert.match(managementReport, /function SortableHeading/);
  assert.match(managementReport, /<PrintScope filters={filters}/);
  assert.match(css, /@page apw-report-en\s*{[\s\S]*?@bottom-right\s*{[\s\S]*?counter\(page\)[\s\S]*?counter\(pages\)/);
  assert.match(css, /html\[lang="zh-Hans"\] \.management-report\s*{\s*page:\s*apw-report-zh-hans/);
  assert.doesNotMatch(css, /\.print-report-footer\s*{[\s\S]*?position:\s*fixed/);
});
