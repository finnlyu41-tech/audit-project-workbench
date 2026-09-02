import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/dashboard/dashboard.css", import.meta.url), "utf8");

test("compact outstanding centre remains recoverable at narrow viewport widths", () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.workbench-layout\[data-compact-layout\] > \.outstanding-center-shell\s*{[\s\S]*?position:\s*fixed/);
  assert.match(css, /\.workbench-layout\[data-compact-layout\]\[data-outstanding-collapsed\] > \.outstanding-center-shell\s*{[\s\S]*?inset:\s*auto 12px 12px auto/);
  assert.match(css, /\.workbench-layout\[data-compact-layout\]\[data-outstanding-collapsed\] \.outstanding-rail-toggle\s*{[\s\S]*?width:\s*46px;\s*height:\s*46px/);
});

test("compact outstanding drawer spans the full grid instead of the 48px rail", () => {
  assert.match(css, /:not\(\[data-outstanding-collapsed\]\) > \.outstanding-center-shell\s*{[\s\S]*?grid-column:\s*1 \/ -1;[\s\S]*?width:\s*min\(360px, calc\(100% - 64px\)\)/);
});
