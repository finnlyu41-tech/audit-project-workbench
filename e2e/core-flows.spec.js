import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { emptyStore } from "../src/dashboard/model.js";
import { hierarchyFixture, openWorkbench, readStoredWorkspace, workspaceFixture } from "./helpers.js";

test("creates a company, saves it in the browser and restores focus when a dialog closes", async ({ page }) => {
  await openWorkbench(page, emptyStore());
  const newCompany = page.getByRole("button", { name: "New company" });
  await newCompany.focus();
  await newCompany.click();

  const dialog = page.getByRole("dialog", { name: "New company" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Legal entity *")).toBeFocused();
  await dialog.getByRole("button", { name: "Close" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Create company" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(newCompany).toBeFocused();

  await newCompany.click();
  await dialog.getByLabel("Legal entity *").fill("Fictional Assurance Limited");
  await expect(dialog.getByLabel("Holding-company relationship role")).toHaveCount(0);
  await dialog.getByLabel("Entity type (optional)").fill("Sole proprietorship");
  await dialog.getByLabel(/Incorporation \/ commencement date/).fill("2025-02-10");
  await dialog.getByLabel("Default financial year").selectOption("apr_mar");
  await dialog.getByRole("button", { name: "Create company" }).click();

  await expect(page.getByRole("heading", { name: "Fictional Assurance Limited" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fictional Assurance Limited" })).toBeVisible();
  const stored = await readStoredWorkspace(page);
  expect(stored.version).toBe(11);
  expect(stored.entities).toHaveLength(1);
  expect(stored.entities[0]).toMatchObject({ legalName: "Fictional Assurance Limited", entityType: "Sole proprietorship",
    incorporationDate: "2025-02-10", fiscalYearPreset: "apr_mar", relationshipRole: "" });
  expect(stored.engagements).toHaveLength(0);
  await expect(page.locator(".tree-entity-row .tree-copy strong")).toHaveText("Fictional Assurance Limited");
  await expect(page.getByText("This company has no annual engagements yet")).toBeVisible();
});

test("a first DOI engagement uses the company's next year end and shows the formal period", async ({ page }) => {
  await openWorkbench(page, emptyStore());
  await page.getByRole("button", { name: "New company" }).click();
  const companyDialog = page.getByRole("dialog", { name: "New company" });
  await companyDialog.getByLabel("Legal entity *").fill("DOI Example Limited");
  await companyDialog.getByLabel(/Incorporation \/ commencement date/).fill("2025-02-10");
  await companyDialog.getByLabel("Default financial year").selectOption("apr_mar");
  await companyDialog.getByRole("button", { name: "Create company" }).click();

  await page.getByRole("button", { name: "New annual engagement", exact: true }).click();
  const engagementDialog = page.getByRole("dialog", { name: /New annual engagement/ });
  await engagementDialog.getByLabel("Period method").selectOption("doi_year_end");
  await expect(engagementDialog.getByLabel("Reporting start date *")).toHaveValue("2025-02-10");
  await expect(engagementDialog.getByLabel("Reporting end date *")).toHaveValue("2025-03-31");
  await engagementDialog.getByRole("button", { name: "Blank engagement" }).click();
  await engagementDialog.getByRole("button", { name: "Create annual engagement" }).click();
  await page.locator(".tree-entity-row").filter({ hasText: "DOI Example Limited" }).click();

  const formalPeriod = "For the period from February 10, 2025 (DOI) to March 31, 2025";
  await expect(page.locator(".entity-facts > button").first().getByText(formalPeriod, { exact: true })).toBeVisible();
  await expect(page.locator(".entity-facts > button").first()).toHaveAttribute("title", formalPeriod);
  expect((await readStoredWorkspace(page)).engagements[0]).toMatchObject({ periodPreset: "doi_year_end",
    periodStart: "2025-02-10", periodEnd: "2025-03-31" });
});

test("one company creates three independent annual engagements with generated financial years", async ({ page }) => {
  await openWorkbench(page, emptyStore());
  await page.getByRole("button", { name: "New company" }).click();
  const companyDialog = page.getByRole("dialog", { name: "New company" });
  await companyDialog.getByLabel("Legal entity *").fill("Three Years Limited");
  await companyDialog.getByRole("button", { name: "Create company" }).click();

  for (const year of [2023, 2024, 2025]) {
    await page.getByRole("button", { name: "New annual engagement", exact: true }).click();
    const engagementDialog = page.getByRole("dialog", { name: /New annual engagement/ });
    await engagementDialog.getByLabel("Year", { exact: true }).fill(String(year));
    await engagementDialog.getByRole("button", { name: "Blank engagement" }).click();
    await engagementDialog.getByRole("button", { name: "Create annual engagement" }).click();
    await expect(engagementDialog).toBeHidden();
    await page.locator(".tree-entity-row").filter({ hasText: "Three Years Limited" }).click();
  }

  const stored = await readStoredWorkspace(page);
  expect(stored.entities).toHaveLength(1);
  expect(stored.engagements.map((engagement) => [engagement.periodStart, engagement.periodEnd])).toEqual([
    ["2025-01-01", "2025-12-31"], ["2024-01-01", "2024-12-31"], ["2023-01-01", "2023-12-31"],
  ]);
  await expect(page.locator(".annual-period > strong")).toHaveText([
    "YE December 31, 2025", "YE December 31, 2024", "YE December 31, 2023",
  ]);

  await page.getByRole("button", { name: "New annual engagement", exact: true }).click();
  const duplicateDialog = page.getByRole("dialog", { name: /New annual engagement/ });
  await duplicateDialog.getByLabel("Year", { exact: true }).fill("2025");
  await duplicateDialog.getByRole("button", { name: "Create annual engagement" }).click();
  await expect(duplicateDialog.getByRole("alert")).toContainText("already has an engagement");
});

test("editing an engagement can start the next annual engagement directly", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Edit annual engagement" }).click();
  let dialog = page.getByRole("dialog", { name: /Edit annual engagement/ });
  await dialog.getByRole("button", { name: "Create another year" }).click();
  dialog = page.getByRole("dialog", { name: /New annual engagement/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Year", { exact: true })).toHaveValue("2027");
  await expect(dialog.getByRole("button", { name: "Copy previous year" })).toHaveAttribute("data-active", "true");
  await dialog.getByRole("button", { name: "Create annual engagement" }).click();
  const engagements = (await readStoredWorkspace(page)).engagements;
  expect(engagements).toHaveLength(2);
  expect(engagements[0]).toMatchObject({ periodStart: "2027-01-01", periodEnd: "2027-12-31" });
});

test("workspace back and forward buttons revisit app views without changing data", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const back = page.getByRole("button", { name: "Go back" });
  const forward = page.getByRole("button", { name: "Go forward" });
  await expect(back).toBeDisabled();
  await page.locator(".app-rail-button[aria-label='Project schedule']").click();
  await expect(page.locator(".schedule-view")).toBeVisible();
  await expect(back).toBeEnabled();
  await back.click();
  await expect(page.locator(".workstream-card").filter({ hasText: "Audit" })).toBeVisible();
  await expect(forward).toBeEnabled();
  await forward.click();
  await expect(page.locator(".schedule-view")).toBeVisible();
  expect((await readStoredWorkspace(page)).engagements).toHaveLength(1);
});

test("workstreams can be dragged into a new saved order", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const auditCard = page.locator(".workstream-card").filter({ hasText: "Audit" });
  const taxCard = page.locator(".workstream-card").filter({ hasText: "Tax computation & filing" });
  await taxCard.locator(".workstream-drag-handle").dragTo(auditCard, { targetPosition: { x: 4, y: 20 } });
  await expect(page.locator(".workstream-card").first()).toContainText("Tax computation & filing");
  let stored = await readStoredWorkspace(page);
  expect(stored.engagements[0].workstreams.map((workstream) => workstream.type)).toEqual(["tax_computation_filing", "audit"]);
  await page.reload();
  await expect(page.locator(".workstream-card").first()).toContainText("Tax computation & filing");
});

test("workstream stages and completion criteria can be expanded, collapsed and dragged into a saved order", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const auditCard = page.locator(".workstream-card").filter({ hasText: "Audit" });
  await expect(page.locator(".workflow-panel")).toHaveCount(0);
  await auditCard.locator(".workstream-card-select").click();
  await expect(page.locator(".workflow-panel")).toBeVisible();
  await auditCard.locator(".workstream-card-select").click();
  await expect(page.locator(".workflow-panel")).toHaveCount(0);
  await auditCard.locator(".workstream-card-select").click();

  const setupStage = page.locator(".node-track-card").filter({ hasText: "Engagement setup" });
  const executionStage = page.locator(".node-track-card").filter({ hasText: "Audit execution" });
  await executionStage.dragTo(setupStage, { targetPosition: { x: 4, y: 20 } });
  await expect(page.locator(".node-track-card").first()).toContainText("Audit execution");
  await setupStage.click();
  await expect(page.locator(".node-detail-panel")).toBeVisible();
  await setupStage.click();
  await expect(page.locator(".node-detail-panel")).toHaveCount(0);
  await setupStage.click();

  const scope = page.locator(".condition-row").filter({ hasText: "Scope confirmed" });
  const independence = page.locator(".condition-row").filter({ hasText: "Independence confirmed" });
  await independence.locator(".condition-drag-handle").dragTo(scope, { targetPosition: { x: 20, y: 2 } });
  await expect(page.locator(".condition-row").first()).toContainText("Independence confirmed");
  let stored = await readStoredWorkspace(page);
  let audit = stored.engagements[0].workstreams.find((workstream) => workstream.type === "audit");
  expect(audit.nodes.map((node) => node.title)).toEqual(["Audit execution", "Engagement setup"]);
  expect(audit.nodes[1].conditions.map((condition) => condition.label)).toEqual(["Independence confirmed", "Scope confirmed"]);

  await page.reload();
  await page.locator(".workstream-card").filter({ hasText: "Audit" }).locator(".workstream-card-select").click();
  await expect(page.locator(".node-track-card").first()).toContainText("Audit execution");
  await page.locator(".node-track-card").filter({ hasText: "Engagement setup" }).click();
  await expect(page.locator(".condition-row").first()).toContainText("Independence confirmed");
});

test("owner quick edit can apply one owner to every workstream", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.locator(".detail-facts > .detail-fact").first().getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: /Owner/ });
  await dialog.getByLabel("Owner", { exact: true }).fill("Morgan Lee");
  await dialog.getByRole("checkbox", { name: /Apply to all workstreams/ }).check();
  await dialog.getByRole("button", { name: "Save" }).click();
  const stored = await readStoredWorkspace(page);
  expect(stored.engagements[0].owner).toBe("Morgan Lee");
  expect(stored.engagements[0].workstreams.every((workstream) => workstream.owner === "Morgan Lee")).toBe(true);
});

test("a custom engagement type is saved and visible below the year in navigation", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Edit annual engagement" }).click();
  const dialog = page.getByRole("dialog", { name: /Edit annual engagement/ });
  await expect(dialog.getByLabel("Internal engagement name (optional)")).toHaveCount(0);
  await expect(dialog.getByLabel("Project notes")).toHaveCount(0);
  await dialog.getByLabel("Engagement type").fill("Marine bookkeeping");
  await dialog.getByRole("button", { name: "Save engagement" }).click();
  await expect(page.locator(".tree-engagement-row")).toContainText("Marine bookkeeping");
  expect((await readStoredWorkspace(page)).engagements[0].engagementType).toBe("Marine bookkeeping");
});

test("switches between company hierarchy and a flat searchable project list", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const viewTabs = page.locator(".navigation-view-tabs");
  await viewTabs.getByRole("tab", { name: "Projects" }).click();
  await expect(viewTabs.getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "true");
  const projectRow = page.locator(".flat-engagement-row");
  await expect(projectRow).toHaveCount(1);
  await expect(projectRow).toContainText("Example Services Limited");
  await expect(projectRow).toContainText("YE December 31, 2026");
  await expect(projectRow).toContainText("Audit");
  await page.getByRole("textbox", { name: "Search projects, companies or owners" }).fill("Alex Chan");
  await expect(projectRow).toHaveCount(1);
  await projectRow.click();
  await expect(page.getByRole("heading", { name: "Example Services Limited" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("audit-progress-workbench:navigation-view"))).toBe("projects");
});

test("holding relationship fields appear only after a parent holding company is chosen", async ({ page }) => {
  await openWorkbench(page, hierarchyFixture());
  await page.locator(".tree-entity-row").filter({ hasText: "Standalone Company Limited" }).click();
  await page.getByRole("button", { name: "Edit company master" }).click();
  const editor = page.getByRole("dialog", { name: "Edit company master" });
  await expect(editor.getByLabel("Holding-company relationship role")).toHaveCount(0);
  await editor.getByLabel("Parent holding company").selectOption({ label: "Global Holdings" });
  await editor.getByLabel("Holding-company relationship role").fill("Sole shareholder");
  await editor.getByRole("button", { name: "Save company master" }).click();
  const saved = (await readStoredWorkspace(page)).entities.find((entity) => entity.legalName === "Standalone Company Limited");
  expect(saved.relationshipRole).toBe("Sole shareholder");
});

test("stores the leave-protection preference from the settings dialog", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.locator(".app-rail-button[aria-label='Settings']").click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  const warning = settings.getByRole("checkbox", { name: "Warn before leaving when data is unsynced" });
  await expect(warning).toBeChecked();
  await warning.uncheck();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("audit-progress-workbench:persistence-settings")));
  expect(stored).toMatchObject({ version: 1, mode: "browser", warnBeforeUnsyncedLeave: false });
});

test("progress, outstanding items and tax deadlines remain independent", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const auditCard = page.locator(".workstream-card").filter({ hasText: "Audit" });
  const taxCard = page.locator(".workstream-card").filter({ hasText: "Tax computation & filing" });
  await expect(auditCard.locator(".workstream-card-top [role='progressbar']")).toHaveAttribute("aria-valuenow", "0");
  await expect(taxCard.locator(".workstream-card-top [role='progressbar']")).toHaveAttribute("aria-valuenow", "0");

  await auditCard.locator(".workstream-card-select").click();
  await page.locator(".node-track-card").filter({ hasText: "Engagement setup" }).click();
  await page.getByRole("checkbox", { name: "Scope confirmed" }).check();
  await expect(auditCard.locator(".workstream-card-top [role='progressbar']")).not.toHaveAttribute("aria-valuenow", "0");
  await expect(taxCard.locator(".workstream-card-top [role='progressbar']")).toHaveAttribute("aria-valuenow", "0");
  const auditProgress = await auditCard.locator(".workstream-card-top [role='progressbar']").getAttribute("aria-valuenow");

  await page.getByRole("button", { name: "Add outstanding item" }).click();
  const outstandingDialog = page.getByRole("dialog", { name: "Add outstanding item" });
  await outstandingDialog.getByLabel("Outstanding item *").fill("Signed representation letter missing");
  await outstandingDialog.getByRole("button", { name: "Save outstanding item" }).click();
  await expect(page.getByText("Signed representation letter missing")).toBeVisible();
  await expect(auditCard.locator(".workstream-card-top [role='progressbar']")).toHaveAttribute("aria-valuenow", auditProgress);

  await page.locator(".tax-deadline-fact").getByRole("button", { name: "Add tax deadline" }).click();
  const deadlineDialog = page.getByRole("dialog", { name: "Tax deadlines" });
  await deadlineDialog.getByRole("button", { name: "Add deadline" }).click();
  await deadlineDialog.getByLabel("Deadline type *").selectOption("tax_payment");
  await deadlineDialog.getByLabel("Year of assessment").fill("2025/26");
  await deadlineDialog.getByLabel("Current due date *").fill("2026-11-30");
  await deadlineDialog.getByLabel("Owner").fill("Jamie Lee");
  await deadlineDialog.getByRole("button", { name: "Add deadline" }).click();
  await expect(deadlineDialog.locator(".tax-deadline-row-copy strong").filter({ hasText: "Tax payment" })).toBeVisible();
  await deadlineDialog.getByRole("button", { name: "Edit tax deadline" }).click();
  await deadlineDialog.getByLabel("Current due date *").fill("2026-12-15");
  await deadlineDialog.getByLabel("Reason for date change *").fill("Extension approved by the tax authority");
  await deadlineDialog.getByRole("button", { name: "Save deadline" }).click();
  await expect(deadlineDialog.getByText("15 Dec 2026", { exact: true })).toBeVisible();

  const stored = await readStoredWorkspace(page);
  expect(stored.engagements[0].outstandingItems).toHaveLength(1);
  expect(stored.entities[0].taxDeadlines[0].revisions).toHaveLength(1);
  expect(stored.entities[0].taxDeadlines[0].dueDate).toBe("2026-12-15");
});

test("tax deadline types can be entered directly as custom categories", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.locator(".tax-deadline-fact").getByRole("button", { name: "Add tax deadline" }).click();
  const manager = page.getByRole("dialog", { name: "Tax deadlines" });
  await manager.getByRole("button", { name: "Add deadline" }).click();
  await manager.getByRole("button", { name: "Use custom type" }).click();
  await manager.getByLabel("Custom deadline name *").fill("Country-by-country return");
  await manager.getByLabel("Current due date *").fill("2027-03-31");
  await manager.getByRole("button", { name: "Add deadline" }).click();
  await expect(manager.locator(".tax-deadline-row-copy strong")).toHaveText("Country-by-country return");
});

test("company structure conversion is editable in the company master and supports a round trip", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.locator(".tree-entity-row").filter({ hasText: "Example Services Limited" }).click();
  await page.getByRole("button", { name: "Edit company master" }).click();
  let editor = page.getByRole("dialog", { name: "Edit company master" });
  await editor.getByRole("switch", { name: /Enable holding-company structure/ }).check();
  await editor.getByRole("button", { name: "Save company master" }).click();
  expect((await readStoredWorkspace(page)).entities[0].kind).toBe("holding_company");

  await page.getByRole("button", { name: "Edit company master" }).click();
  editor = page.getByRole("dialog", { name: "Edit company master" });
  await editor.getByRole("switch", { name: /Enable holding-company structure/ }).uncheck();
  await editor.getByRole("button", { name: "Save company master" }).click();
  const restored = await readStoredWorkspace(page);
  expect(restored.entities[0].kind).toBe("company");
  expect(restored.engagements).toHaveLength(1);
  expect(restored.engagements[0].workstreams).toHaveLength(2);
});

test("archives, restores and permanently deletes only from the archive view", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Archive project" }).click();
  await expect(page.getByText("Archived · Read only")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit annual engagement" })).toHaveCount(0);

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("button", { name: "Edit annual engagement" })).toBeVisible();
  await page.getByRole("button", { name: "Archive project" }).click();
  await page.getByRole("button", { name: "Permanently delete" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Permanently delete" });
  await expect(deleteDialog.getByText("This action cannot be undone")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Permanently delete" }).click();
  await page.getByRole("tab", { name: /Active/ }).click();
  await page.locator(".tree-entity-row").filter({ hasText: "Example Services Limited" }).click();
  await expect(page.getByText("This company has no annual engagements yet")).toBeVisible();
  const stored = await readStoredWorkspace(page);
  expect(stored.entities).toHaveLength(1);
  expect(stored.engagements).toHaveLength(0);
});

test("exports, initialises and restores a V11 backup without losing records", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.locator("summary[aria-label^='Backup']").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  const exported = JSON.parse(await fs.readFile(backupPath, "utf8"));
  expect(exported.version).toBe(11);
  expect(exported.entities[0].legalName).toBe("Example Services Limited");
  expect(exported.engagements).toHaveLength(1);

  await page.locator("summary[aria-label^='Backup']").click();
  await page.getByRole("button", { name: "Initialise workbench" }).click();
  const initialiseDialog = page.getByRole("dialog", { name: "Initialise workbench" });
  await initialiseDialog.getByRole("checkbox", { name: "I understand that the data listed above will be cleared." }).check();
  await initialiseDialog.getByRole("button", { name: "Confirm initialisation" }).click();
  await expect(page.getByText("No companies yet")).toBeVisible();

  await page.locator("summary[aria-label^='Backup']").click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Restore backup" }).click();
  const chooser = await chooserPromise;
  page.once("dialog", (dialog) => dialog.accept());
  await chooser.setFiles(backupPath);
  await expect(page.getByRole("heading", { name: "Example Services Limited" })).toBeVisible();
  const restored = await readStoredWorkspace(page);
  expect(restored.version).toBe(11);
  expect(restored.entities).toHaveLength(1);
  expect(restored.engagements).toHaveLength(1);
  expect(restored.engagements[0].workstreams).toHaveLength(2);
});
