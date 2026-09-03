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
  await dialog.getByLabel("Project name (internal label)").fill("Fictional Assurance 2026");
  await dialog.getByLabel("Project start", { exact: true }).fill("2026-09-03");
  await dialog.getByLabel("Deadline", { exact: true }).fill("2026-10-31");
  await dialog.getByRole("button", { name: "Create company" }).click();

  await expect(page.getByRole("heading", { name: "Fictional Assurance Limited" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fictional Assurance Limited" })).toBeVisible();
  const stored = await readStoredWorkspace(page);
  expect(stored.version).toBe(9);
  expect(stored.projects).toHaveLength(1);
  expect(stored.projects[0]).toMatchObject({ entity: "Fictional Assurance Limited", name: "Fictional Assurance 2026",
    startDate: "2026-09-03", dueDate: "2026-10-31" });
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
  expect(stored.projects[0].outstandingItems).toHaveLength(1);
  expect(stored.projects[0].taxDeadlines[0].revisions).toHaveLength(1);
  expect(stored.projects[0].taxDeadlines[0].dueDate).toBe("2026-12-15");
});

test("archives, restores and permanently deletes only from the archive view", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Archive project" }).click();
  await expect(page.getByText("Archived · Read only")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit company and holding company assignment" })).toHaveCount(0);

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("button", { name: "Edit company and holding company assignment" })).toBeVisible();
  await page.getByRole("button", { name: "Archive project" }).click();
  await page.getByRole("button", { name: "Permanently delete" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Permanently delete" });
  await expect(deleteDialog.getByText("This action cannot be undone")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Permanently delete" }).click();
  await expect(page.getByText("No audit projects yet")).toBeVisible();
  expect((await readStoredWorkspace(page)).projects).toHaveLength(0);
});

test("exports, initialises and restores a V9 backup without losing records", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.locator("summary[aria-label^='Backup']").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  const exported = JSON.parse(await fs.readFile(backupPath, "utf8"));
  expect(exported.version).toBe(9);
  expect(exported.projects[0].entity).toBe("Example Services Limited");

  await page.locator("summary[aria-label^='Backup']").click();
  await page.getByRole("button", { name: "Initialise workbench" }).click();
  const initialiseDialog = page.getByRole("dialog", { name: "Initialise workbench" });
  await initialiseDialog.getByRole("checkbox", { name: "I understand that the data listed above will be cleared." }).check();
  await initialiseDialog.getByRole("button", { name: "Confirm initialisation" }).click();
  await expect(page.getByText("No audit projects yet")).toBeVisible();

  await page.locator("summary[aria-label^='Backup']").click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Restore backup" }).click();
  const chooser = await chooserPromise;
  page.once("dialog", (dialog) => dialog.accept());
  await chooser.setFiles(backupPath);
  await expect(page.getByRole("heading", { name: "Example Services Limited" })).toBeVisible();
  const restored = await readStoredWorkspace(page);
  expect(restored.version).toBe(9);
  expect(restored.projects).toHaveLength(1);
  expect(restored.projects[0].workstreams).toHaveLength(2);
});
