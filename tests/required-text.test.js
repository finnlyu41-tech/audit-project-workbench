import test from "node:test";
import assert from "node:assert/strict";
import { hasRequiredText, REQUIRED_TEXT_PATTERN } from "../src/dashboard/required-text.js";

test("required text rejects empty, whitespace-only and non-text values", () => {
  for (const value of ["", "   ", "\t", "\u3000", "\u00a0", " \u3000 ", null, undefined, 0]) {
    assert.equal(hasRequiredText(value), false);
  }
});
test("valid user text is recognized without trimming or rewriting it", () => {
  for (const value of ["Audit", "审计", "審計", "2026", "  客户确认  ", "Scope & review"]) {
    const original = value;
    assert.equal(hasRequiredText(value), true);
    assert.equal(value, original);
  }
});
test("the browser single-line pattern matches the non-blank text rule", () => {
  const pattern = new RegExp(`^(?:${REQUIRED_TEXT_PATTERN})$`, "u");
  for (const value of ["", " ", "\t", "\u3000", "\u00a0", "Audit", " 审计 ", "0", "A\tB"]) {
    assert.equal(pattern.test(value), hasRequiredText(value), JSON.stringify(value));
  }
});
