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
  assert.match(workbench, /outstandingItems:\s*\[\],\s*taxDeadlines:\s*\[\]/);
  assert.match(workbench, /taxDeadlines:\s*\(current\.taxDeadlines \|\| \[\]\)\.map/);
  assert.match(workbench, /linkedWorkstreamId:\s*null/);
});

test("project summary facts open focused settings without exposing the full edit form", () => {
  for (const quickField of ["owner", "schedule", "framework", "group"]) {
    assert.match(workbench, new RegExp(`quickField: "${quickField}"`));
  }
  assert.match(workbench, /className="detail-fact-link"/);
  assert.match(workbench, /activeRawWorkstream \? \{ type: "workstream-edit"/);
  assert.match(components, /data-quick-field={quickField \|\| undefined}/);
  assert.match(components, /autoFocus={quickField === "owner"}/);
  assert.match(components, /autoFocus={quickField === "schedule"}/);
  assert.match(components, /autoFocus={quickField === "framework"}/);
  assert.match(components, /autoFocus={quickField === "group"}/);
  assert.match(css, /\.detail-fact-link::before\s*{[^}]*inset:\s*0/);
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
