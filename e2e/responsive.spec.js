import { expect, test } from "@playwright/test";
import { openWorkbench, workspaceFixture } from "./helpers.js";

for (const width of [1280, 1440, 1920]) {
  test(`keeps the desktop workspace operable without page overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWorkbench(page, workspaceFixture());
    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    await expect(page.locator(".app-rail")).toBeVisible();
    await expect(page.locator(".project-panel")).toBeVisible();
    await expect(page.locator(".project-detail")).toBeVisible();

    if (width < 1400) {
      const openOutstanding = page.getByRole("button", { name: "Expand outstanding centre" });
      await expect(openOutstanding).toBeVisible();
      await openOutstanding.click();
      await expect(page.getByRole("complementary", { name: "Outstanding centre" }).getByText("Outstanding centre", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Collapse outstanding centre" }).click();
      await expect(openOutstanding).toBeVisible();
    }

    await page.getByRole("button", { name: "Management reports" }).click();
    await expect(page.getByRole("heading", { name: "Portfolio report" })).toBeVisible();
    const reportMetrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(reportMetrics.scrollWidth).toBeLessThanOrEqual(reportMetrics.clientWidth + 1);
  });
}
