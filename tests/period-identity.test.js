import test from "node:test";
import assert from "node:assert/strict";
import { canonicalStorePayload, emptyStore, makeEngagement, makeEntity, normalizeStore } from "../src/dashboard/model.js";

test("reporting-period IDs remain stable through normalization and unrelated engagement edits", () => {
  const entity = makeEntity({ legalName: "Example Identity Limited" });
  const engagement = makeEngagement({ entityId: entity.id, periodStart: "2026-01-01", periodEnd: "2026-12-31" });
  const first = normalizeStore({ ...canonicalStorePayload(emptyStore()), entities: [entity], engagements: [engagement] });
  const expected = first.engagements[0].reportingPeriods;
  assert.ok(expected[0].id.startsWith("reporting-period-"));
  const reloaded = normalizeStore(JSON.parse(JSON.stringify(canonicalStorePayload(first))));
  assert.deepEqual(reloaded.engagements[0].reportingPeriods, expected);
  const edited = normalizeStore({ ...canonicalStorePayload(reloaded), engagements: reloaded.engagements.map((item) => ({ ...item, owner: "Jamie" })) });
  assert.deepEqual(edited.engagements[0].reportingPeriods, expected);
});

test("missing period IDs are assigned once while supplied IDs are retained", () => {
  const engagement = makeEngagement({ entityId: "company", reportingPeriods: [
    { periodStart: "2025-01-01", periodEnd: "2025-12-31" },
    { id: "reporting-period-existing", periodStart: "2026-01-01", periodEnd: "2026-12-31" },
  ] });
  assert.ok(engagement.reportingPeriods[0].id);
  assert.equal(engagement.reportingPeriods[1].id, "reporting-period-existing");
  const copy = makeEngagement({ ...engagement, owner: "Alex" });
  assert.deepEqual(copy.reportingPeriods, engagement.reportingPeriods);
});

test("separate new engagements receive separate period IDs without weakening duplicate-period validation", () => {
  const values = { entityId: "company", periodStart: "2026-01-01", periodEnd: "2026-12-31" };
  const first = makeEngagement(values);
  const second = makeEngagement(values);
  assert.notEqual(first.reportingPeriods[0].id, second.reportingPeriods[0].id);
  assert.throws(() => makeEngagement({ entityId: "company", reportingPeriods: [values, values] }), /Duplicate reporting periods/);
});
