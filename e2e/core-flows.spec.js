import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { emptyStore } from "../src/dashboard/model.js";
import { openWorkbench, readStoredWorkspace, workspaceFixture } from "./helpers.js";

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
  await dialog.getByLabel("Default financial year").selectOption("apr_mar");
  await dialog.getByRole("button", { name: "Create company" }).click();

  await expect(page.getByRole("heading", { name: "Fictional Assurance Limited" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fictional Assurance Limited" })).toBeVisible();
  const stored = await readStoredWorkspace(page);
  expect(stored.version).toBe(11);
  expect(stored.entities).toHaveLength(1);
  expect(stored.entities[0]).toMatchObject({ legalName: "Fictional Assurance Limited", fiscalYearPreset: "apr_mar" });
  expect(stored.engagements).toHaveLength(0);
  await expect(page.locator(".tree-entity-row .tree-copy strong")).toHaveText("Fictional Assurance Limited");
  await expect(page.getByText("This company has no annual engagements yet")).toBeVisible();
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
  await expect(page.locator(".annual-period > strong")).toHaveText(["FY2025", "FY2024", "FY2023"]);

  await page.getByRole("button", { name: "New annual engagement", exact: true }).click();
  const duplicateDialog = page.getByRole("dialog", { name: /New annual engagement/ });
  await duplicateDialog.getByLabel("Year", { exact: true }).fill("2025");
  await duplicateDialog.getByRole("button", { name: "Create annual engagement" }).click();
  await expect(duplicateDialog.getByRole("alert")).toContainText("already has an engagement");
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
  await expect(auditCard.locator(".workstream-card-progress strong")).toHaveText("0%");
  await expect(taxCard.locator(".workstream-card-progress strong")).toHaveText("0%");

  await page.getByRole("checkbox", { name: "Scope confirmed" }).check();
  await expect(auditCard.locator(".workstream-card-progress strong")).not.toHaveText("0%");
  await expect(taxCard.locator(".workstream-card-progress strong")).toHaveText("0%");
  const auditProgress = await auditCard.locator(".workstream-card-progress strong").textContent();

  await page.getByRole("button", { name: "Add outstanding item" }).click();
  const outstandingDialog = page.getByRole("dialog", { name: "Add outstanding item" });
  await outstandingDialog.getByLabel("Outstanding item *").fill("Signed representation letter missing");
  await outstandingDialog.getByRole("button", { name: "Save outstanding item" }).click();
  await expect(page.getByText("Signed representation letter missing")).toBeVisible();
  await expect(auditCard.locator(".workstream-card-progress strong")).toHaveText(auditProgress);

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
  await editor.getByLabel("Company type").selectOption("holding_company");
  await editor.getByRole("button", { name: "Save company master" }).click();
  expect((await readStoredWorkspace(page)).entities[0].kind).toBe("holding_company");

  await page.getByRole("button", { name: "Edit company master" }).click();
  editor = page.getByRole("dialog", { name: "Edit company master" });
  await editor.getByLabel("Company type").selectOption("company");
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
