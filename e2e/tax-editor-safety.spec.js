import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { canonicalStorePayload, makeEntity, makeTaxDeadline, normalizeStore } from "../src/dashboard/model.js";
import { openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

function taxFixture() {
  const store = workspaceFixture();
  store.projects[0].taxDeadlines = [makeTaxDeadline({ category: "custom", customName: "Fictional tax notice",
    taxYear: "2025/26", owner: "Alex Chan", dueDate: "2026-10-31", reminderDays: 30 })];
  return store;
}
async function openTax(page, { edit = true } = {}) {
  await openWorkbench(page, taxFixture());
  await page.locator(".tax-deadline-fact button").click();
  const dialog = page.getByRole("dialog", { name: /Tax deadlines/ });
  await expect(dialog.locator(".tax-deadline-form")).toBeVisible();
  if (!edit) await dialog.locator(".tax-deadline-form > footer").getByRole("button", { name: "Cancel" }).click();
  return dialog;
}

test("tax draft cannot be lost by closing its outer window", async ({ page }) => {
  const dialog = await openTax(page); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Owner", { exact: true }).fill("Unsaved owner");
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await page.keyboard.press("Escape");
  await expect(dialog.getByLabel("Owner", { exact: true })).toHaveValue("Unsaved owner");
  expect(prompts).toBe(1); expect(await readStoredWorkspace(page)).toEqual(before);
});
test("cancel restores tax-list focus without changing data", async ({ page }) => {
  const dialog = await openTax(page); const before = await readStoredWorkspace(page);
  await dialog.locator(".tax-deadline-form > footer").getByRole("button", { name: "Cancel" }).click();
  await expect(dialog.getByRole("button", { name: "Edit tax deadline", exact: true })).toBeFocused();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("space-only revision reason has a visible linked error and preserves history", async ({ page }) => {
  const dialog = await openTax(page); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Current due date *", { exact: true }).fill("2026-11-30");
  const reason = dialog.getByLabel("Reason for date change *", { exact: true });
  await reason.fill("   "); await dialog.getByRole("button", { name: "Save deadline", exact: true }).click();
  await expect(reason).toHaveAttribute("aria-invalid", "true");
  await expect(reason).toBeFocused(); await expect(dialog.locator(".field-validation")).toBeVisible();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("tax editor uses one scroll container and keeps its save action visible", async ({ page }) => {
  const dialog = await openTax(page);
  await page.setViewportSize({ width: 480, height: 560 });
  const overflow = await dialog.locator(".tax-deadline-form").evaluate((form) => getComputedStyle(form).overflowY);
  expect(overflow).toBe("visible");
  await expect(dialog.getByRole("button", { name: "Save deadline", exact: true })).toBeInViewport();
});

for (const exit of ["header", "footer", "backdrop"]) {
  test(`tax ${exit} exit asks before discarding and leaves records unchanged`, async ({ page }) => {
    const dialog = await openTax(page); const before = await readStoredWorkspace(page);
    await dialog.getByLabel("Owner", { exact: true }).fill("Unsubmitted owner");
    let prompts = 0; const reject = async (prompt) => { prompts++; await prompt.dismiss(); };
    page.on("dialog", reject);
    if (exit === "backdrop") await page.locator(".workbench-modal-backdrop").click({ position: { x: 2, y: 2 } });
    else await dialog.locator(`.tax-deadline-form > ${exit}`).getByRole("button", { name: "Cancel" }).click();
    expect(prompts).toBe(1); await expect(dialog.getByLabel("Owner", { exact: true })).toHaveValue("Unsubmitted owner");
    page.off("dialog", reject); page.once("dialog", (prompt) => prompt.accept());
    await dialog.locator(".tax-deadline-form > footer").getByRole("button", { name: "Cancel" }).click();
    await expect(dialog.locator(".tax-deadline-manager")).toBeVisible();
    await expect(dialog.locator(".modal-unsaved")).toHaveCount(0);
    expect(await readStoredWorkspace(page)).toEqual(before);
  });
}
test("numeric lead time changed back to its initial value does not produce a false dirty state", async ({ page }) => {
  const dialog = await openTax(page); const before = await readStoredWorkspace(page);
  const lead = dialog.getByLabel("Reminder lead time (days)");
  await lead.fill("60"); await expect(dialog.locator(".modal-unsaved")).toHaveText("Unsaved changes");
  await lead.fill("30"); await expect(dialog.locator(".modal-unsaved")).toHaveCount(0);
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog.locator(".tax-deadline-form > footer").getByRole("button", { name: "Cancel" }).click();
  await expect(dialog.locator(".tax-deadline-manager")).toBeVisible(); expect(prompts).toBe(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("reasoned tax reschedule is saved once and unrelated engagement data stays unchanged", async ({ page }) => {
  const dialog = await openTax(page); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Current due date *", { exact: true }).fill("2026-11-30");
  await dialog.getByLabel("Reason for date change *", { exact: true }).fill("Fictional extension notice");
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog.getByRole("button", { name: "Save deadline", exact: true }).click();
  await expect(dialog.locator(".tax-deadline-row[data-focused]")).toBeFocused(); expect(prompts).toBe(0);
  let after = await readStoredWorkspace(page); let notice = after.entities[0].taxDeadlines[0];
  expect(notice.originalDueDate).toBe("2026-10-31"); expect(notice.dueDate).toBe("2026-11-30");
  expect(notice.revisions).toHaveLength(1); expect(notice.revisions[0].reason).toBe("Fictional extension notice");
  expect(after.engagements).toEqual(before.engagements);
  await dialog.getByRole("button", { name: "Edit tax deadline", exact: true }).click();
  await expect(dialog.locator(".tax-deadline-history")).toContainText("Fictional extension notice");
  await dialog.getByLabel("Owner", { exact: true }).fill("Jamie Lee");
  await dialog.getByRole("button", { name: "Save deadline", exact: true }).click();
  after = await readStoredWorkspace(page); expect(after.entities[0].taxDeadlines[0].revisions).toEqual(notice.revisions);
  expect(after.engagements).toEqual(before.engagements);
});
test("new custom deadline validates its name and remains visible despite the previous list filter", async ({ page }) => {
  const dialog = await openTax(page, { edit: false }); const before = await readStoredWorkspace(page);
  await dialog.getByRole("combobox", { name: "Filter by urgency" }).selectOption("completed");
  await dialog.getByRole("button", { name: "Add deadline", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "Deadline type *", exact: true })).toBeFocused();
  await dialog.getByRole("combobox", { name: "Deadline type *", exact: true }).selectOption("custom");
  const name = dialog.getByLabel("Custom deadline name *", { exact: true });
  await name.fill("  "); await dialog.getByLabel("Current due date *", { exact: true }).fill("2026-12-15");
  await dialog.getByRole("button", { name: "Add deadline", exact: true }).click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill("Another fictional notice");
  await dialog.getByRole("button", { name: "Add deadline", exact: true }).click();
  const row = dialog.locator(".tax-deadline-row").filter({ hasText: "Another fictional notice" });
  await expect(row).toBeFocused(); await expect(row).toBeInViewport();
  await expect(dialog.getByRole("combobox", { name: "Filter by urgency" })).toHaveValue("all");
  const after = await readStoredWorkspace(page);
  expect(after.entities[0].taxDeadlines).toHaveLength(2); expect(after.engagements).toEqual(before.engagements);
});
test("tax list filters are not drafts and can be cleared without a discard dialog", async ({ page }) => {
  const dialog = await openTax(page, { edit: false }); const before = await readStoredWorkspace(page);
  await dialog.getByRole("combobox", { name: "Filter by urgency" }).selectOption("completed");
  await expect(dialog.locator(".modal-unsaved")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(dialog.locator(".tax-deadline-row")).toHaveCount(1);
  let prompts = 0; page.on("dialog", async (prompt) => { prompts++; await prompt.dismiss(); });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden(); expect(prompts).toBe(0); expect(await readStoredWorkspace(page)).toEqual(before);
});
test("discard confirmation and deletion confirmation each protect the saved tax record", async ({ page }) => {
  const dialog = await openTax(page); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Owner", { exact: true }).fill("Unsaved owner");
  let prompts = 0;
  const handler = async (prompt) => { prompts++; if (prompts === 1) await prompt.accept(); else await prompt.dismiss(); };
  page.on("dialog", handler);
  await dialog.getByRole("button", { name: "Delete deadline", exact: true }).click();
  expect(prompts).toBe(2); await expect(dialog.locator(".modal-unsaved")).toHaveText("Unsaved changes");
  expect(await readStoredWorkspace(page)).toEqual(before);
  page.off("dialog", handler); page.on("dialog", (prompt) => prompt.accept());
  await dialog.getByRole("button", { name: "Delete deadline", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Add deadline", exact: true })).toBeFocused();
  const after = await readStoredWorkspace(page);
  expect(after.entities[0].taxDeadlines).toHaveLength(0); expect(after.engagements).toEqual(before.engagements);
});
for (const width of [480, 800, 1440]) {
  test(`tax editor fields and its footer stay aligned and accessible at ${width}px`, async ({ page }, testInfo) => {
    const dialog = await openTax(page); await page.setViewportSize({ width, height: 640 });
    const controls = await dialog.locator('input:not([type="checkbox"]),select').evaluateAll((items) => items.map((element) => ({
      height: element.getBoundingClientRect().height, label: element.closest("label")?.textContent,
    })));
    for (const control of controls) { expect(control.height).toBe(42); expect(control.label).toBeTruthy(); }
    const body = await dialog.locator(".workbench-modal-body").evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    expect(body.scroll).toBeLessThanOrEqual(body.width + 1);
    await expect(dialog.getByRole("button", { name: "Save deadline", exact: true })).toBeInViewport();
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
    const notes = dialog.getByLabel("Notes", { exact: true }); await notes.focus();
    const field = await notes.boundingBox(); const footer = await dialog.locator(".tax-deadline-form > footer").boundingBox();
    expect(field.y + field.height).toBeLessThanOrEqual(footer.y + 1);
    await page.screenshot({ path: testInfo.outputPath(`tax-editor-${width}.png`) });
  });
}
test("archived company tax entries remain read-only", async ({ page }) => {
  const store = canonicalStorePayload(normalizeStore(taxFixture()));
  store.entities[0].archived = true; store.engagements.forEach((entry) => { entry.archived = true; });
  await openWorkbench(page, store); const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Quick open", exact: true }).click();
  const quick = page.getByRole("dialog", { name: "Quick open", exact: true });
  await quick.getByRole("checkbox", { name: "Include archived records" }).check();
  await quick.getByRole("option").filter({ hasText: "Company master" }).click();
  await page.locator(".entity-facts button").filter({ hasText: "Tax deadlines" }).click();
  const dialog = page.getByRole("dialog", { name: /Tax deadlines/ });
  await expect(dialog.locator(".tax-deadline-row")).toHaveCount(1);
  for (const name of ["Edit tax deadline", "Add deadline", "Mark completed"]) {
    await expect(dialog.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("editing a subsidiary deadline from the holding-company list writes only to its source", async ({ page }) => {
  const store = canonicalStorePayload(normalizeStore(taxFixture()));
  const parent = makeEntity({ legalName: "Fictional Holdings Limited", kind: "holding_company" });
  store.entities[0].parentEntityId = parent.id; store.entities.push(parent);
  await openWorkbench(page, store); const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Quick open", exact: true }).click();
  const quick = page.getByRole("dialog", { name: "Quick open", exact: true });
  await quick.getByRole("combobox").fill("Fictional Holdings"); await quick.getByRole("combobox").press("Enter");
  await page.locator(".entity-facts button").filter({ hasText: "Tax deadlines" }).click();
  const dialog = page.getByRole("dialog", { name: /Tax deadlines/ });
  await dialog.getByRole("button", { name: "Edit tax deadline", exact: true }).click();
  await dialog.getByLabel("Owner", { exact: true }).fill("Subsidiary deadline owner");
  await dialog.getByRole("button", { name: "Save deadline", exact: true }).click();
  await expect(dialog.locator(".tax-deadline-row[data-focused]")).toBeFocused();
  const after = await readStoredWorkspace(page);
  expect(after.entities.find((item) => item.id === parent.id)).toEqual(before.entities.find((item) => item.id === parent.id));
  expect(after.entities.find((item) => item.id !== parent.id).taxDeadlines[0].owner).toBe("Subsidiary deadline owner");
  expect(after.engagements).toEqual(before.engagements);
});
test("instant tax completion stays immediate and does not change workflow conditions", async ({ page }) => {
  const dialog = await openTax(page, { edit: false }); const before = await readStoredWorkspace(page);
  await dialog.getByRole("button", { name: "Mark completed", exact: true }).click();
  const after = await readStoredWorkspace(page);
  expect(after.entities[0].taxDeadlines[0].state).toBe("completed");
  expect(after.entities[0].taxDeadlines[0].revisions).toEqual(before.entities[0].taxDeadlines[0].revisions);
  expect(after.engagements).toEqual(before.engagements); await expect(dialog.locator(".modal-unsaved")).toHaveCount(0);
});
test("reverting a changed date removes the irrelevant revision reason from the dirty state", async ({ page }) => {
  const dialog = await openTax(page); const before = await readStoredWorkspace(page);
  await dialog.getByLabel("Current due date *", { exact: true }).fill("2026-11-30");
  await dialog.getByLabel("Reason for date change *", { exact: true }).fill("Unused reason");
  await dialog.getByLabel("Current due date *", { exact: true }).fill("2026-10-31");
  await expect(dialog.locator(".modal-unsaved")).toHaveCount(0);
  expect(await page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(false);
  await dialog.locator(".tax-deadline-form > footer").getByRole("button", { name: "Cancel" }).click();
  expect(await readStoredWorkspace(page)).toEqual(before);
});
