import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/dashboard/dashboard.css", import.meta.url), "utf8");
const workbench = readFileSync(new URL("../src/dashboard/Workbench.jsx", import.meta.url), "utf8");
const components = readFileSync(new URL("../src/dashboard/components.jsx", import.meta.url), "utf8");
const groupComponents = readFileSync(new URL("../src/dashboard/group-components.jsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../src/dashboard/timeline.jsx", import.meta.url), "utf8");
const deadlineAlerts = readFileSync(new URL("../src/dashboard/deadline-alerts.jsx", import.meta.url), "utf8");

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

test("overdue deadlines use a compact global badge and open a navigable alert list", () => {
  assert.match(workbench, /className="app-rail-button deadline-alert-trigger"/);
  assert.match(workbench, /<strong className="app-rail-badge">/);
  assert.match(workbench, /<DeadlineAlertCentre alerts={deadlineAlertItems} onOpen={openDeadlineAlert}/);
  assert.match(deadlineAlerts, /alerts\.map\(\(alert\) => <button/);
  assert.match(deadlineAlerts, /onClick=\{\(\) => onOpen\(alert\)\}/);
  assert.match(css, /\.app-rail-badge\s*{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.deadline-alert-list\s*{[\s\S]*?overflow-y:\s*auto/);
});
