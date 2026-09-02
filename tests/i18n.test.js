import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dashboardDirectory = fileURLToPath(new URL("../src/dashboard/", import.meta.url));

test("every directly referenced UI translation has an English entry", () => {
  const i18n = readFileSync(`${dashboardDirectory}/i18n.jsx`, "utf8");
  const dictionaryKeys = new Set([...i18n.matchAll(/^\s+"([^"]+)":/gm)].map((match) => match[1]));
  const source = ["DashboardContent.jsx", "components.jsx"]
    .map((file) => readFileSync(`${dashboardDirectory}/${file}`, "utf8"))
    .join("\n");
  const referencedKeys = [...source.matchAll(/\bt\("([^"]+)"/g)].map((match) => match[1]);
  const missing = [...new Set(referencedKeys.filter((key) => !dictionaryKeys.has(key)))];

  assert.deepEqual(missing, [], `Missing English translations: ${missing.join(", ")}`);
});
