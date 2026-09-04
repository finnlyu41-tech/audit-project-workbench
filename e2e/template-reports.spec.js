import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { canonicalStorePayload, emptyStore, makeEngagement, makeEntity } from "../src/dashboard/model.js";
import { openWorkbench, readStoredWorkspace, workspaceFixture } from "./helpers.js";

test("a built-in template can be deleted without changing existing engagement work", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  const projectNodes = structuredClone(before.engagements[0].workstreams[0].nodes);

  await page.getByRole("button", { name: "Template library" }).click();
  const library = page.getByRole("dialog", { name: "Template library" });
  const auditTemplate = library.locator(".sample-library-card").filter({ hasText: "Core Audit Workflow" });
  page.once("dialog", (dialog) => dialog.accept());
  await auditTemplate.getByRole("button", { name: "Delete template" }).click();
  await expect(auditTemplate).toHaveCount(0);

  const after = await readStoredWorkspace(page);
  expect(after.samples.some((sample) => sample.categoryId === "audit")).toBe(false);
  expect(after.engagements[0].workstreams[0].nodes).toEqual(projectNodes);
});

test("exports a portable template package and imports an explicit replacement without changing an existing project", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const before = await readStoredWorkspace(page);
  const originalTemplate = before.samples.find((template) => template.categoryId === "audit");
  const projectStageBefore = before.engagements[0].workstreams[0].nodes[0].title;

  await page.getByRole("button", { name: "Template library" }).click();
  const library = page.getByRole("dialog", { name: "Template library" });
  await library.getByRole("button", { name: "Export package" }).click();
  const exportDialog = page.getByRole("dialog", { name: "Export package" });
  await expect(exportDialog.getByText("Template packages contain workflow content only")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await exportDialog.getByRole("button", { name: "Export selected templates" }).click();
  const download = await downloadPromise;
  const pkg = JSON.parse(await fs.readFile(await download.path(), "utf8"));
  expect(pkg.kind).toBe("audit-project-workbench-template-package");
  expect(pkg.templates).toHaveLength(1);
  expect(JSON.stringify(pkg)).not.toContain("projects");
  expect(JSON.stringify(pkg)).not.toContain("entities");
  expect(JSON.stringify(pkg)).not.toContain("engagements");
  expect(JSON.stringify(pkg)).not.toContain("Example Services Limited");

  pkg.templates[0].name = "Browser-tested audit workflow";
  pkg.templates[0].nodes[0].title = "Browser-tested engagement setup";
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("dialog", { name: "Template library" }).getByRole("button", { name: "Import package" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "roundtrip.apw-template.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(pkg)) });

  const importDialog = page.getByRole("dialog", { name: "Import package" });
  await expect(importDialog.getByText("Template package validated")).toBeVisible();
  const row = importDialog.locator(".template-import-row").filter({ hasText: "Browser-tested audit workflow" });
  await row.getByLabel("Import action").selectOption("replace");
  await expect(row.getByLabel("Template to replace")).toHaveValue(originalTemplate.id);
  await importDialog.getByRole("button", { name: "Import templates" }).click();

  const after = await readStoredWorkspace(page);
  expect(after.samples).toHaveLength(before.samples.length);
  expect(after.samples.find((template) => template.id === originalTemplate.id).name).toBe("Browser-tested audit workflow");
  expect(after.engagements[0].workstreams[0].nodes[0].title).toBe(projectStageBefore);
});

test("management reports filter the portfolio, show a current record and invoke the print flow", async ({ page }) => {
  const store = workspaceFixture();
  const secondProject = structuredClone(store.projects[0]);
  secondProject.id = "report-alpha-company";
  secondProject.name = "Alpha Engagement";
  secondProject.entity = "Alpha Services Limited";
  secondProject.owner = "Casey Wong";
  secondProject.dueDate = "2026-12-15";
  store.projects.push(secondProject);
  store.projects[0].outstandingItems.push({ id: "report-item", title: "Signed approval pending", status: "awaiting_signature",
    note: "DO NOT PRINT THIS NOTE", workstreamId: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" });
  await page.addInitScript(() => { window.print = () => { document.documentElement.dataset.printInvoked = "true"; }; });
  await openWorkbench(page, store);

  await page.getByRole("button", { name: "Management reports" }).click();
  await expect(page.getByRole("heading", { name: "Portfolio report" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Report summary" })).toContainText("Active companies");
  await page.getByLabel("Record status").selectOption("all");
  await expect(page.locator(".management-report-table tbody tr")).toHaveCount(2);
  const companySort = page.locator(".management-report-table thead").getByRole("button", { name: "Company / holding company" });
  await companySort.click();
  await expect(page.locator(".management-report-table tbody tr").first()).toContainText("Alpha Services Limited");
  await companySort.click();
  await expect(page.locator(".management-report-table tbody tr").first()).toContainText("Example Services Limited");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-report-scope")).toContainText("All non-archived");
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("tab", { name: "Current record" }).click();
  await expect(page.getByRole("heading", { name: "Example Services Limited" })).toBeVisible();
  await expect(page.locator(".management-report").getByText("Signed approval pending")).toBeVisible();
  await expect(page.locator(".management-report").getByText("DO NOT PRINT THIS NOTE")).toHaveCount(0);
  await page.getByRole("button", { name: "Print report" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.printInvoked)).toBe("true");
});

test("portfolio detail groups multiple annual engagements under one company", async ({ page }) => {
  const store = emptyStore();
  const entity = makeEntity({ legalName: "Grouped Years Limited" });
  store.entities.push(entity);
  for (const year of [2023, 2024, 2025]) {
    const engagement = makeEngagement({ entityId: entity.id, engagementType: year === 2025 ? "Bookkeeping" : "Audit",
      periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`, periodPreset: "calendar" }, {
      entity, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
      outstandingStatuses: store.outstandingStatuses,
    });
    store.engagements.push(engagement);
  }
  await openWorkbench(page, canonicalStorePayload(store));
  await page.getByRole("button", { name: "Management reports" }).click();
  await expect(page.locator(".management-company-cell")).toHaveCount(1);
  await expect(page.locator(".management-company-cell")).toContainText("3 annual engagements");
  await expect(page.locator(".management-report-table tbody tr")).toHaveCount(3);
  await expect(page.locator(".management-period-cell strong")).toHaveText([
    "YE December 31, 2023", "YE December 31, 2024", "YE December 31, 2025",
  ]);
  await expect(page.locator(".management-period-cell").last()).toContainText("Bookkeeping");
});
