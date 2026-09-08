import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { calculateWorkingSchedule as calculate, initialScheduleDraft, resolveScheduleDraft, validSchedulePlan } from "../src/dashboard/working-days.js";
import { HK_PUBLIC_HOLIDAYS } from "../src/dashboard/hk-public-holidays.js";
import { canonicalStorePayload, normalizeStore, reconcileWorkbenchStore, makeEngagement } from "../src/dashboard/model.js";
import { validWorkspaceRecords } from "../src/dashboard/workspace-validation.js";
import { scheduleWorkspace } from "./fixtures/schedule-workspace.js";

for (const [start, days, actualStart, end, skipped] of [
  ["2026-09-30", 3, "2026-09-30", "2026-10-05", 3],
  ["2026-09-08", 1, "2026-09-08", "2026-09-08", 0],
  ["2026-04-02", 2, "2026-04-02", "2026-04-08", 5],
  ["2026-04-03", 1, "2026-04-08", "2026-04-08", 5],
  ["2026-09-26", 1, "2026-09-28", "2026-09-28", 2],
  ["2026-12-31", 2, "2026-12-31", "2027-01-04", 3],
  ["2027-02-05", 2, "2027-02-05", "2027-02-10", 4],
  ["2027-12-24", 2, "2027-12-24", "2027-12-28", 3],
]) test(`working days ${start} + ${days} => ${end}`, () => {
  const result = calculate(start, days);
  assert.equal(result.startDate, actualStart); assert.equal(result.dueDate, end);
  assert.equal(result.skippedDays, skipped); assert.equal(validSchedulePlan(result.schedulePlan), true);
});
test("reject invalid or unbounded estimates instead of rounding", () => {
  for (const days of ["", " ", 0, -1, 1.5, "1.5", "1e2", 1001, Infinity, NaN, null, true, [], {}])
    assert.equal(calculate("2026-09-08", days).error, "duration");
  assert.equal(calculate("2026-09-08", "3").schedulePlan.workdays, 3);
});
test("validate dates and fail closed across missing holiday years", () => {
  for (const date of ["", "2026-02-30", "2026-2-03", "0000-01-01", null]) assert.equal(calculate(date, 1).error, "start");
  for (const date of ["0001-01-01", "2024-12-31", "2028-01-01", "9999-12-31"]) assert.equal(calculate(date, 1).error, "coverage");
  assert.equal(calculate("2027-12-31", 1).dueDate, "2027-12-31");
  assert.deepEqual(calculate("2027-12-31", 2), { error: "coverage" });
  assert.deepEqual(calculate("2025-01-01", 1000), { error: "coverage" });
});
test("the official snapshot has 17 unique holidays in each covered year", () => {
  assert.equal(new Set(HK_PUBLIC_HOLIDAYS).size, 51);
  assert.deepEqual([...HK_PUBLIC_HOLIDAYS].sort(), HK_PUBLIC_HOLIDAYS);
  for (const year of ["2025", "2026", "2027"]) assert.equal(HK_PUBLIC_HOLIDAYS.filter(d => d.startsWith(year)).length, 17);
});
test("working-day arithmetic is timezone and daylight-saving independent", () => {
  for (const TZ of ["Asia/Hong_Kong", "Europe/Berlin", "America/Los_Angeles"]) {
    const run = spawnSync(process.execPath, ["--input-type=module", "-e",
      'import {calculateWorkingSchedule as c} from "./src/dashboard/working-days.js"; console.log(c("2026-03-27",4).dueDate)'],
    { env: { ...process.env, TZ }, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr); assert.equal(run.stdout.trim(), "2026-04-01");
  }
});
function plannedWorkspace() {
  const input = scheduleWorkspace(); const result = calculate("2026-09-30", 3);
  input.engagements[0] = { ...input.engagements[0], startDate: result.startDate, dueDate: result.dueDate, schedulePlan: result.schedulePlan };
  return canonicalStorePayload(normalizeStore(input));
}
test("normalization and JSON backup round-trip preserve the estimate and calendar provenance", () => {
  const before = plannedWorkspace(); assert.equal(validWorkspaceRecords(before), true);
  assert.deepEqual(canonicalStorePayload(normalizeStore(JSON.parse(JSON.stringify(before)))), before);
});
test("runtime edits preserve schedule intent and manual mode removes only the optional plan", () => {
  const before = normalizeStore(plannedWorkspace());
  const after = reconcileWorkbenchStore(before, { ...before, projects: before.projects.map((p, i) => i ? p : { ...p, owner: "Changed" }) });
  assert.deepEqual(after.engagements[0].schedulePlan, before.engagements[0].schedulePlan);
  const manual = resolveScheduleDraft({ mode: "manual" }, after.engagements[0]);
  const cleared = canonicalStorePayload({ ...after, engagements: after.engagements.map((e, i) => i ? e : { ...e, ...manual }) });
  assert.equal("schedulePlan" in cleared.engagements[0], false);
  assert.equal(cleared.engagements[0].dueDate, "2026-10-05");
  assert.deepEqual(cleared.entities, before.entities);
});
test("restore rejects malformed plan data without rewriting historical snapshots", () => {
  for (const patch of [{ workdays: 0 }, { workdays: "3" }, { calendar: "XX" }, { requestedStartDate: "2026-02-30" }, { calendarVersion: "" }]) {
    const input = plannedWorkspace(); Object.assign(input.engagements[0].schedulePlan, patch);
    assert.equal(validWorkspaceRecords(input), false);
  }
  const record = plannedWorkspace().engagements[0];
  record.schedulePlan.calendarVersion = "historical-calendar";
  record.schedulePlan.requestedStartDate = "2024-12-30"; record.startDate = "2024-12-30"; record.dueDate = "2025-01-02";
  const draft = initialScheduleDraft(record);
  assert.equal(resolveScheduleDraft(draft, record).dueDate, "2025-01-02");
  assert.equal(resolveScheduleDraft({ ...draft, snapshot: null }, record).error, "coverage");
});
test("a new annual engagement does not inherit last year's working dates or estimate", () => {
  const before = plannedWorkspace(); const source = before.engagements[0];
  const next = makeEngagement({ entityId: source.entityId, periodStart: "2040-01-01", periodEnd: "2040-12-31" },
    { entity: before.entities[0], sourceMode: "previous", sourceEngagement: source });
  assert.equal(next.startDate, ""); assert.equal(next.dueDate, ""); assert.equal("schedulePlan" in next, false);
});
