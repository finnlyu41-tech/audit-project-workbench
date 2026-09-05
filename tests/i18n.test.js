import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toTraditional } from "../src/dashboard/traditional.js";

const dashboardDirectory = fileURLToPath(new URL("../src/dashboard/", import.meta.url));

test("every Chinese system-text literal has an English entry", () => {
  const i18n = readFileSync(`${dashboardDirectory}/i18n.jsx`, "utf8");
  const dictionaryKeys = new Set([...i18n.matchAll(/^\s+"([^"]+)":/gm)].map((match) => match[1]));
  const source = ["Workbench.jsx", "components.jsx", "group-components.jsx", "deadline-alerts.jsx", "tax-deadlines.jsx", "timeline.jsx",
    "persistence-ui.jsx", "management-report.jsx", "report-ui.jsx", "template-transfer.jsx", "v11-components.jsx", "home-overview.jsx", "ux-components.jsx", "quick-open.jsx", "modal.jsx", "required-text-input.jsx"]
    .map((file) => readFileSync(`${dashboardDirectory}/${file}`, "utf8"))
    .join("\n");
  const referencedKeys = [...source.matchAll(/"([^"\n]*[\u3400-\u9fff][^"\n]*)"/gu)].map((match) => match[1]);
  const languageSpecificContent = new Set(["[公司名称]"]);
  const missing = [...new Set(referencedKeys.filter((key) =>
    !languageSpecificContent.has(key) && !dictionaryKeys.has(key)))];

  assert.deepEqual(missing, [], `Missing English translations: ${missing.join(", ")}`);
});

test("tax deadline terminology is fully converted to Traditional Chinese", () => {
  assert.equal(toTraditional("添加税务期限"), "新增稅務期限");
  assert.equal(toTraditional("课税年度"), "課稅年度");
  assert.equal(toTraditional("税务局参考编号／来源"), "稅務局參考編號／來源");
  assert.equal(toTraditional("雇主报税表"), "僱主報稅表");
});

test("local-file settings use complete Traditional Chinese browser terminology", () => {
  assert.equal(toTraditional("浏览器自动保存"), "瀏覽器自動儲存");
  assert.equal(toTraditional("资料未同步时，离开页面前提醒"), "資料未同步時，離開頁面前提醒");
  assert.equal(toTraditional("处理版本冲突"), "處理版本衝突");
  assert.equal(toTraditional("数据版本"), "資料版本");
  assert.equal(toTraditional("浏览器原生提示的文字和按钮"), "瀏覽器原生提示的文字和按鈕");
});
