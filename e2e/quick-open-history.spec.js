import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { canonicalStorePayload, normalizeStore } from "../src/dashboard/model.js";
import { makeCompany, openWorkbench, readStoredWorkspace, seriousViolations, workspaceFixture } from "./helpers.js";

const home = (page) => page.locator('.app-rail-button[aria-label="Home"]');
const quickOpen = (page) => page.getByRole("button", { name: "Quick open", exact: true });
const picker = (page) => page.getByRole("dialog", { name: "Quick open" });
const query = (page) => picker(page).getByRole("combobox", { name: "Find company or engagement" });
const twoCompanies = () => {
  const store = workspaceFixture();
  const other = makeCompany(store, { entity: "Other Example Limited" }); other.owner = "Blair";
  store.projects.push(other); return store;
};

test("quick open finds a company and reporting year without navigating the sidebar", async ({ page }) => {
  await openWorkbench(page, twoCompanies());
  const before = await readStoredWorkspace(page);
  await quickOpen(page).click();
  await expect(query(page)).toBeFocused();
  await query(page).fill("other 2026 blair");
  await expect(picker(page).getByRole("option")).toHaveCount(1);
  await query(page).press("Enter");
  await expect(picker(page)).toBeHidden();
  await expect(page.locator(".detail-title > p")).toContainText("Other Example Limited");
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("back restores navigation filters, search, module and workspace scroll", async ({ page }) => {
  const store = twoCompanies(); store.projects[0].notes = "Fictional follow-up note.\n".repeat(60);
  // Scroll through permanent working content, not a note now intentionally folded by default.
  store.projects[0].workstreams.push(...Array.from({length:60}, (_,index) => ({
    ...store.projects[0].workstreams[0], id:`scroll-module-${index}`, type:"custom", categoryId:"custom",
    customName:`Fictional scroll module ${index}`, nodes:[],
  })));
  await openWorkbench(page, store);
  const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Open navigation filters" }).click();
  await page.getByRole("combobox", { name: "Owner filter" }).selectOption("Alex Chan");
  await page.getByRole("textbox", { name: "Search companies, holding companies or owners" }).fill("Example Services");
  await page.locator(".workstream-card-top").first().click();
  await page.locator(".project-detail").evaluate((element) => { element.scrollTop = 220; });
  await expect.poll(() => page.locator(".project-detail").evaluate((element) => element.scrollTop)).toBe(220);
  await home(page).click();
  await page.locator(".home-project-row").filter({ hasText: "Other Example Limited" }).click();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(page.locator(".detail-title > p")).toContainText("Example Services Limited");
  await expect(page.getByRole("combobox", { name: "Owner filter" })).toHaveValue("Alex Chan");
  await expect(page.getByRole("textbox", { name: "Search companies, holding companies or owners" })).toHaveValue("Example Services");
  await expect(page.locator(".node-board")).toBeVisible();
  await expect.poll(() => page.locator(".project-detail").evaluate((element) => element.scrollTop)).toBe(220);
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("keyboard quick open cancels without replacing an active editor or saving its draft", async ({ page }) => {
  await openWorkbench(page, twoCompanies());
  const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Quick edit", exact: true }).click();
  const owner = page.locator(".quick-update-form").getByLabel("Owner", { exact: true });
  await owner.fill("Unsaved draft");
  await page.keyboard.press("Control+k"); await expect(query(page)).toBeFocused();
  await query(page).fill("missing-record-query");
  await expect(picker(page).getByRole("option")).toHaveCount(0);
  await query(page).press("Enter"); await expect(picker(page)).toBeVisible();
  await page.keyboard.press("Escape"); await expect(owner).toBeFocused();
  await expect(owner).toHaveValue("Unsaved draft");
  expect(await readStoredWorkspace(page)).toEqual(before);
  await page.locator(".quick-update-form").getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "New company", exact: true }).click();
  await page.getByLabel("Legal entity *").fill("Unsubmitted Company Limited");
  await page.keyboard.press("Meta+k");
  await expect(picker(page)).toBeHidden();
  await expect(page.getByLabel("Legal entity *")).toHaveValue("Unsubmitted Company Limited");
});

test("quick open does not interpret IME Enter as a navigation request", async ({ page }) => {
  await openWorkbench(page, workspaceFixture()); await quickOpen(page).click();
  await query(page).dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
  await expect(picker(page)).toBeVisible();
  await query(page).press("ArrowDown");
  await expect(picker(page).getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await query(page).press("ArrowUp");
  await expect(picker(page).getByRole("option").first()).toHaveAttribute("aria-selected", "true");
});

test("archived engagements are opt-in and open read-only without restoring data", async ({ page }) => {
  const store = twoCompanies(); store.projects[1].archived = true;
  await openWorkbench(page, store); const before = await readStoredWorkspace(page);
  await quickOpen(page).click(); await query(page).fill("other 2026");
  await expect(picker(page).getByRole("option")).toHaveCount(0);
  await picker(page).getByRole("checkbox", { name: "Include archived records" }).check();
  await expect(picker(page).getByRole("option")).toHaveCount(1);
  await query(page).press("Enter");
  await expect(page.locator(".archive-banner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick edit", exact: true })).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("quick open keeps drafts when moving to another company and back", async ({ page }) => {
  await openWorkbench(page, twoCompanies()); const before = await readStoredWorkspace(page);
  await page.getByRole("button", { name: "Quick edit", exact: true }).click();
  await page.locator(".quick-update-form").getByLabel("Owner", { exact: true }).fill("Pending owner");
  await page.keyboard.press("Meta+k"); await query(page).fill("other 2026"); await query(page).press("Enter");
  await expect(page.locator(".detail-title > p")).toContainText("Other Example Limited");
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(page.locator(".quick-update-form").getByLabel("Owner", { exact: true })).toHaveValue("Pending owner");
  expect(await readStoredWorkspace(page)).toEqual(before);
  await page.locator(".quick-update-form").getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Go forward", exact: true }).click();
  await expect(page.locator(".detail-title > p")).toContainText("Other Example Limited");
});

for (const width of [480, 1024, 1440]) {
  test(`quick-open results and keyboard selection fit at ${width}px`, async ({ page }, testInfo) => {
    const store = twoCompanies(); store.projects[0].entity = "Long Example Name ".repeat(12) + "Limited";
    await page.setViewportSize({ width: 1440, height: 800 }); await openWorkbench(page, store);
    await quickOpen(page).click(); await page.setViewportSize({ width, height: 700 });
    const box = await picker(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    const sizes = await picker(page).locator(".workbench-modal-body").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
    await query(page).fill("other 2026"); await query(page).press("ArrowDown");
    await expect(picker(page).getByRole("option", { selected: true })).toBeInViewport();
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`quick-open-${width}.png`) });
  });
}

test("archived company quick-open retains only read-only and restore actions", async ({ page }) => {
  const store = canonicalStorePayload(normalizeStore(twoCompanies()));
  const entity = store.entities.find((item) => item.legalName === "Other Example Limited");
  entity.archived = true;
  store.engagements.filter((item) => item.entityId === entity.id).forEach((item) => { item.archived = true; });
  await openWorkbench(page, store); const before = await readStoredWorkspace(page);
  await quickOpen(page).click(); await query(page).fill("other");
  await picker(page).getByRole("checkbox", { name: "Include archived records" }).check();
  await picker(page).getByRole("option").filter({ hasText: "Company master" }).click();
  await expect(page.locator(".entity-overview .archive-banner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit company master", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Merge duplicate companies", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore company", exact: true })).toBeVisible();
  await page.locator(".annual-project-open").click();
  await expect(page.locator(".archive-banner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick edit", exact: true })).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
