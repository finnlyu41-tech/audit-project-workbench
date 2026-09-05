import { expect, test } from "@playwright/test";
import { openWorkbench, workspaceFixture } from "./helpers.js";

const SINGLE_LINE_FIELDS = 'input:not([type="checkbox"], [type="radio"], [type="file"], '
  + '[type="hidden"], [type="range"], [type="color"], [type="button"], [type="submit"], '
  + '[type="reset"], [type="image"]), select:not([multiple])';

async function expectConsistentFields(dialog, minimum = 1) {
  const fields = await dialog.locator(SINGLE_LINE_FIELDS).evaluateAll((elements) => elements
    .filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden")
    .map((element) => ({
      name: element.getAttribute("aria-label") || element.closest("label")?.textContent.trim() || element.type,
      height: element.getBoundingClientRect().height,
      width: element.getBoundingClientRect().width,
      boxSizing: getComputedStyle(element).boxSizing,
    })));
  expect(fields.length).toBeGreaterThanOrEqual(minimum);
  for (const field of fields) {
    expect(field.height, `${field.name}: consistent field height`).toBeCloseTo(42, 0);
    expect(field.width, `${field.name}: usable width`).toBeGreaterThan(40);
    expect(field.boxSizing).toBe("border-box");
  }
}

async function expectDialogContained(dialog, page) {
  const viewport = page.viewportSize();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  const body = await dialog.locator(".workbench-modal-body").evaluate((element) => ({
    client: element.clientWidth, scroll: element.scrollWidth,
  }));
  expect(body.scroll, "dialog body must not scroll horizontally").toBeLessThanOrEqual(body.client + 1);
}

async function expectAlignedGridRows(dialog) {
  const rows = await dialog.locator(".form-grid").evaluateAll((grids) => grids.flatMap((grid) => {
    const children = [...grid.children];
    // Full-width fields and composite controls deliberately use different spans.
    if (children.some((child) => child.tagName !== "LABEL" || child.classList.contains("span-two"))) return [];
    const fields = children.map((child) => child.querySelector("input, select, textarea"));
    if (fields.some((field) => !field || !field.getClientRects().length)) return [];
    const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const result = [];
    for (let index = 0; index < fields.length; index += columns) {
      result.push(fields.slice(index, index + columns).map((field) => {
        const box = field.getBoundingClientRect();
        return { bottom: box.bottom, width: box.width };
      }));
    }
    return result;
  }));
  expect(rows.length, "exercise at least one real form grid").toBeGreaterThan(0);
  for (const row of rows) {
    const bottoms = row.map((field) => field.bottom);
    const widths = row.map((field) => field.width);
    expect(Math.max(...bottoms) - Math.min(...bottoms), "row controls share a baseline").toBeLessThanOrEqual(1);
    expect(Math.max(...widths) - Math.min(...widths), "equal columns keep equal control widths").toBeLessThanOrEqual(1);
  }
}

async function expectIconAndTextCentered(button) {
  const metrics = await button.evaluate((element) => {
    const icon = element.querySelector(":scope > svg.lucide");
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textRects = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement.closest("svg")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      textRects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0));
    }
    if (!icon || !textRects.length) return null;
    const style = getComputedStyle(element);
    const rect = icon.getBoundingClientRect();
    const top = Math.min(...textRects.map((item) => item.top));
    const bottom = Math.max(...textRects.map((item) => item.bottom));
    return { display: style.display, align: style.alignItems,
      delta: Math.abs(rect.y + rect.height / 2 - (top + bottom) / 2),
      iconWidth: rect.width, iconHeight: rect.height, shrink: getComputedStyle(icon).flexShrink };
  });
  expect(metrics, "test a real icon-and-text action").not.toBeNull();
  expect(["flex", "inline-flex"]).toContain(metrics.display);
  expect(metrics.align).toBe("center");
  // Text glyph boxes can differ slightly from their CSS line box between fonts.
  expect(metrics.delta).toBeLessThanOrEqual(3);
  expect(metrics.iconWidth).toBeCloseTo(metrics.iconHeight, 1);
  expect(metrics.shrink).toBe("0");
}

for (const width of [480, 1024, 1440]) {
  test(`company fields stay aligned and inside the dialog at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 760 });
    await openWorkbench(page, workspaceFixture());
    await page.getByRole("button", { name: "New company" }).click();
    const dialog = page.getByRole("dialog", { name: "New company" });
    await expect(dialog).toBeVisible();
    await page.setViewportSize({ width, height: 760 });
    await expectConsistentFields(dialog, 4);
    await expectAlignedGridRows(dialog);
    await expectDialogContained(dialog, page);
    const field = dialog.getByLabel("Legal entity *");
    await field.focus();
    expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    const notes = dialog.locator("textarea");
    for (const note of await notes.all()) {
      expect((await note.boundingBox()).height).toBeGreaterThanOrEqual(96);
    }
  });
}

test("batch actions center their icons and long labels reflow without clipping fields", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 760 });
  await openWorkbench(page, workspaceFixture());
  const newCompany = page.getByRole("button", { name: "New company" });
  await expectIconAndTextCentered(newCompany);
  await newCompany.click();
  const dialog = page.getByRole("dialog", { name: "New company" });
  await dialog.getByRole("button", { name: "Holding company batch" }).click();
  await expectIconAndTextCentered(dialog.getByRole("button", { name: "Add company" }));
  await page.setViewportSize({ width: 560, height: 760 });
  // Stress the layout, not the translation dictionary or the React form state.
  await dialog.locator(".form-grid > label > span:first-child").first().evaluate((element) => {
    element.textContent = "Financial reporting framework / 財務報告準則與較長的配置欄位標籤";
  });
  await expectConsistentFields(dialog, 4);
  await expectAlignedGridRows(dialog);
  await expectDialogContained(dialog, page);
});

test("annual engagement fields keep equal heights in a short, scrollable dialog", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 560 });
  await openWorkbench(page, workspaceFixture());
  await page.getByRole("button", { name: "Edit annual engagement" }).click();
  const dialog = page.getByRole("dialog", { name: /Edit annual engagement/ });
  await expectConsistentFields(dialog, 3);
  await expectDialogContained(dialog, page);
  const header = await dialog.locator(":scope > header").boundingBox();
  await dialog.locator(".workbench-modal-body").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(dialog.getByRole("button", { name: "Save engagement" })).toBeVisible();
  expect((await dialog.locator(":scope > header").boundingBox()).y).toBeCloseTo(header.y, 0);
});

test("tax deadline selects, text and date fields use the same control height", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  await page.locator(".tax-deadline-fact").getByRole("button", { name: "Add tax deadline" }).click();
  const dialog = page.getByRole("dialog", { name: "Tax deadlines" });
  await dialog.getByRole("button", { name: "Add deadline" }).click();
  await expectConsistentFields(dialog, 3);
  await expectDialogContained(dialog, page);
});

test("settings checkboxes retain their native geometry and keyboard focus returns", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const settingsButton = page.locator(".app-rail-button[aria-label='Settings']");
  await settingsButton.click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const warning = dialog.getByRole("checkbox", { name: "Warn before leaving when data is unsynced" });
  await expect(warning).toBeChecked();
  const box = await warning.boundingBox();
  expect(box.width).toBeLessThanOrEqual(24);
  expect(box.height).toBeLessThanOrEqual(24);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(settingsButton).toBeFocused();
});

test("progress charts are centered with their copy and are not resized as button icons", async ({ page }) => {
  await openWorkbench(page, workspaceFixture());
  const cards = page.locator(".workstream-card-top");
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    const metrics = await card.evaluate((element) => {
      const progress = element.querySelector('[role="progressbar"]');
      const copy = [...element.children].find((child) => child.querySelector("strong"));
      if (!progress || !copy) return null;
      const ring = progress.getBoundingClientRect();
      const text = copy.getBoundingClientRect();
      return { height: ring.height, width: ring.width,
        delta: Math.abs(ring.y + ring.height / 2 - text.y - text.height / 2),
        gap: text.x - ring.right };
    });
    expect(metrics).not.toBeNull();
    expect(metrics.width).toBeGreaterThanOrEqual(24);
    expect(metrics.height).toBeGreaterThanOrEqual(24);
    expect(metrics.delta).toBeLessThanOrEqual(2);
    expect(metrics.gap).toBeGreaterThanOrEqual(4);
  }
});
