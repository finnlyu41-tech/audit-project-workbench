import { expect } from "@playwright/test";
import {
  STORAGE_KEY,
  emptyStore,
  makeGroup,
  makeGroupMember,
  makeNode,
  makeProject,
  makeTaxDeadline,
  makeWorkstream,
} from "../src/dashboard/model.js";

const LANGUAGE_KEY = "audit-progress-workbench:language";

export function makeCompany(store, overrides = {}) {
  const project = makeProject({
    name: overrides.name || "Example Engagement 2026",
    entity: overrides.entity || "Example Services Limited",
    reportingFramework: "HKFRS Accounting Standards",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    startDate: "2026-09-01",
    dueDate: "2026-10-31",
    owner: "Alex Chan",
    notes: "Fictional browser-test record",
  }, false, store.samples, store.workstreamCategories);
  project.workstreams = [
    makeWorkstream({ type: "audit", categoryId: "audit", owner: "Alex Chan", dueDate: "2026-10-15" }, [
      makeNode({ title: "Engagement setup", description: "Confirm scope", conditions: ["Scope confirmed", "Independence confirmed"] }),
      makeNode({ title: "Audit execution", description: "Perform testing", conditions: ["Testing completed"] }),
    ]),
    makeWorkstream({ type: "tax_computation_filing", categoryId: "tax_computation_filing", owner: "Jamie Lee", dueDate: "2026-11-15" }, [
      makeNode({ title: "Tax computation", description: "Prepare computation", conditions: ["Computation prepared"] }),
    ]),
  ];
  project.taxDeadlines = overrides.taxDeadlines || [];
  return project;
}

export function workspaceFixture() {
  const store = emptyStore();
  store.projects.push(makeCompany(store));
  return store;
}

export function hierarchyFixture() {
  const store = emptyStore();
  const existing = makeCompany(store, { name: "Existing subsidiary", entity: "Existing Subsidiary Limited" });
  const standalone = makeCompany(store, { name: "Standalone company", entity: "Standalone Company Limited" });
  const parent = makeGroup({ name: "Global Holdings", owner: "Group Partner", consolidationEnabled: true }, false);
  const middle = makeGroup({ name: "Regional Holdings", owner: "Group Manager", consolidationEnabled: true }, false);
  middle.members.push(makeGroupMember({ kind: "project", refId: existing.id, role: "Subsidiary" }));
  parent.members.push(makeGroupMember({ kind: "group", refId: middle.id, role: "Intermediate holding company" }));
  store.projects.push(existing, standalone);
  store.groups.push(parent, middle);
  return store;
}

export function accessibilityFixture() {
  const store = workspaceFixture();
  const dueDate = localDateOffset(7);
  store.projects[0].taxDeadlines.push(makeTaxDeadline({ category: "profits_tax_filing", taxYear: "2025/26",
    owner: "Jamie Lee", dueDate, reminderDays: 30 }));
  const group = makeGroup({ name: "Example Holdings Limited", owner: "Group Partner", consolidationEnabled: true }, true);
  group.members.push(makeGroupMember({ kind: "project", refId: store.projects[0].id, role: "Subsidiary" }));
  store.groups.push(group);
  return store;
}

export function localDateOffset(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function openWorkbench(page, store = emptyStore(), { home = false } = {}) {
  await page.addInitScript(({ storageKey, languageKey, initialStore }) => {
    if (sessionStorage.getItem("apw-e2e-seeded")) return;
    localStorage.clear();
    localStorage.setItem(storageKey, JSON.stringify(initialStore));
    localStorage.setItem(languageKey, "en");
    sessionStorage.setItem("apw-e2e-seeded", "true");
  }, { storageKey: STORAGE_KEY, languageKey: LANGUAGE_KEY, initialStore: store });
  await page.goto(home ? "./" : "./?view=detail");
  await expect(page.locator(".audit-workbench")).toBeVisible();
  await expect.poll(() => page.evaluate((storageKey) => {
    const value = JSON.parse(localStorage.getItem(storageKey) || "null");
    return Boolean(value?.version === 11 && Array.isArray(value.entities) && Array.isArray(value.engagements)
      && !("projects" in value) && !("groups" in value));
  }, STORAGE_KEY)).toBe(true);
}

export async function readStoredWorkspace(page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);
}

export function seriousViolations(results) {
  return results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
}
