import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { groupProgress, normalizeStore } from "../src/dashboard/model.js";
import { companyOverviewFixture } from "../tests/fixtures/company-overview.js";
import { openWorkbench, readStoredWorkspace, seriousViolations } from "./helpers.js";

const overview = (page) => page.locator(".entity-overview");
async function openCompany(page, name = "Overview Example", store = companyOverviewFixture()) {
  await openWorkbench(page, store);
  await page.getByRole("button", { name: "Quick open", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Quick open" });
  await picker.getByRole("combobox").fill(name);
  await picker.getByRole("option").filter({ hasText: "Company master" }).click();
  await expect(overview(page)).toBeVisible();
}

test("holding annual cards use the same nonzero progress as their workspace", async ({ page }) => {
  const store = companyOverviewFixture(); const expected = groupProgress(normalizeStore(store), "overview-group").percentage;
  expect(expected).toBeGreaterThan(0);
  await openCompany(page, "Overview Holding", store); const before = await readStoredWorkspace(page);
  await expect(overview(page).locator(".annual-project-open").getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(expected));
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("company outstanding shortcuts reveal the exact item without changing records", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 760 });
  await openCompany(page); const before = await readStoredWorkspace(page);
  await overview(page).locator(".entity-outstanding-summary button").filter({ hasText: "Current fictional query" }).click();
  const card = page.locator(".outstanding-item").filter({ hasText: "Current fictional query" });
  await expect(card).toBeFocused(); await expect(card).toBeInViewport();
  expect(await readStoredWorkspace(page)).toEqual(before);
});

test("annual cards keep owner and partial dates readable inside a narrow panel", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 800, height: 900 }); await openCompany(page);
  const list = overview(page).locator(".annual-project-list");
  await list.scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath("annual-before.png") });
  const bounds = await list.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
  await expect(list.locator(".annual-owner").first()).toBeVisible();
  await expect(list.locator(".annual-schedule").first()).toContainText("31 Oct 2027");
});

test("combined-year search and archive filters only change the annual list view", async ({ page }) => {
  await openCompany(page); const before = await readStoredWorkspace(page);
  const root = overview(page); const facts = await root.locator(".entity-facts").innerText();
  const outstanding = await root.locator(".entity-outstanding-summary").innerText();
  const search = root.getByRole("searchbox", { name: "Search annual engagements" });
  await search.fill("２０２５ ＡＬＥＸ");
  await expect(root.locator(".annual-project-rows > article")).toHaveCount(1);
  await expect(root.locator('[data-engagement-id="overview-combined"]')).toBeVisible();
  await root.getByRole("group", { name: "Annual engagement filters" }).getByRole("button", { name: /^Archived/ }).click();
  await expect(root.getByText("No annual engagements match these filters.")).toBeVisible();
  await root.locator(".annual-filter-empty").getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toBeFocused(); await expect(search).toHaveValue("");
  await expect(root.locator(".annual-project-rows > article")).toHaveCount(3);
  expect(await root.locator(".entity-facts").innerText()).toBe(facts);
  expect(await root.locator(".entity-outstanding-summary").innerText()).toBe(outstanding);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("archived annual rows are marked and open read-only without a restore", async ({ page }) => {
  await openCompany(page); const before = await readStoredWorkspace(page);
  const row = overview(page).locator('[data-engagement-id="overview-old"]');
  await expect(row.locator(".annual-archive-label")).toHaveText("Archived · read only");
  await expect(row.getByRole("button", { name: "Edit annual engagement", exact: true })).toHaveCount(0);
  await row.locator(".annual-project-open").click();
  await expect(page.locator(".archive-banner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick edit", exact: true })).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("archived outstanding source remains read-only while opening the exact card", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 760 }); await openCompany(page);
  const before = await readStoredWorkspace(page);
  await overview(page).locator(".entity-outstanding-summary button").filter({ hasText: "Archived fictional query" }).click();
  const card = page.locator(".outstanding-item").filter({ hasText: "Archived fictional query" });
  await expect(page.locator(".archive-banner")).toBeVisible(); await expect(card).toBeFocused();
  await expect(card.getByRole("combobox")).toHaveCount(0);
  await expect(card.locator(".outstanding-status-chip.readonly")).toBeVisible();
  await expect(card.getByRole("button", { name: /^(Edit|Delete)$/ })).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("company without annual projects retains its original creation empty state", async ({ page }) => {
  await openCompany(page, "Overview Empty"); const before = await readStoredWorkspace(page);
  await expect(overview(page).locator(".entity-empty-projects")).toBeVisible();
  await expect(overview(page).locator(".annual-filters")).toHaveCount(0);
  await expect(overview(page).locator(".annual-project-rows > article")).toHaveCount(0);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
test("moving to another company starts with that company's complete list", async ({ page }) => {
  await openCompany(page); const before = await readStoredWorkspace(page);
  await overview(page).getByRole("searchbox").fill("no-match");
  await page.getByRole("button", { name: "Quick open", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Quick open" });
  await picker.getByRole("combobox").fill("Overview Holding");
  await picker.getByRole("option").filter({ hasText: "Company master" }).click();
  await expect(overview(page).getByRole("searchbox")).toHaveValue("");
  await expect(overview(page).locator(".annual-project-rows > article")).toHaveCount(1);
  expect(await readStoredWorkspace(page)).toEqual(before);
});
for (const width of [800, 1024, 1440, 1920]) {
  test(`annual card fields and icons stay readable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await openCompany(page);
    const list = overview(page).locator(".annual-project-list");
    await list.scrollIntoViewIfNeeded();
    expect(await list.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const search = await list.getByRole("searchbox").boundingBox(); expect(search.height).toBe(42);
    for (const row of await list.locator(".annual-project-rows > article").all()) {
      const bounds = await row.boundingBox();
      for (const field of await row.locator(".annual-period, .annual-owner, .annual-schedule").all()) {
        await expect(field).toBeVisible();
        const box = await field.boundingBox();
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        expect(await field.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      }
      const ring = await row.getByRole("progressbar").boundingBox();
      expect(ring.width).toBeGreaterThanOrEqual(24); expect(ring.height).toBe(ring.width);
      const arrow = await row.locator(".annual-project-open > svg").boundingBox();
      expect(Math.abs(ring.y + ring.height / 2 - arrow.y - arrow.height / 2)).toBeLessThanOrEqual(2);
    }
    expect(seriousViolations(await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`annual-${width}.png`) });
  });
}
