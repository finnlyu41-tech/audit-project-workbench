import test from "node:test";
import assert from "node:assert/strict";
import { deadlineAlerts, normalizeStore } from "../src/dashboard/model.js";
import { deadlineAlertActionName, deadlineAlertUrgency, filterDeadlineAlerts } from "../src/dashboard/deadline-alert-view.js";
import { ALERT_TEST_NOW, deadlineAlertFixture } from "./fixtures/deadline-alerts.js";
const alertsFor = () => deadlineAlerts(normalizeStore(deadlineAlertFixture()), new Date(ALERT_TEST_NOW));

test("urgency filtering uses existing alerts without including completed, future or archived deadlines", () => {
  const alerts = alertsFor();
  assert.equal(alerts.length, 6);
  assert.equal(filterDeadlineAlerts(alerts, "en", { urgency: "overdue" }).length, 3);
  assert.equal(filterDeadlineAlerts(alerts, "en", { urgency: "due_today" }).length, 2);
  assert.equal(filterDeadlineAlerts(alerts, "en", { urgency: "due_soon" }).length, 1);
  assert.ok(alerts.every((alert) => !/future|completed|hidden-archived/.test(alert.id)));
});
test("legacy project alerts without urgency remain overdue and never become tax due-today alerts", () => {
  const alerts = alertsFor().filter((alert) => alert.scope !== "tax");
  assert.equal(alerts.length, 2); assert.ok(alerts.every((alert) => !alert.urgency));
  assert.ok(alerts.every((alert) => deadlineAlertUrgency(alert) === "overdue"));
  assert.deepEqual(filterDeadlineAlerts(alerts, "en", { urgency: "due_today" }), []);
});
test("full-width tokens combine company, owner and year filters", () => {
  const result = filterDeadlineAlerts(alertsFor(), "en", { query: "ＡＴＬＡＳ　ａｌｅｘ ２０２５/２６", urgency: "due_today" });
  assert.deepEqual(result.map((alert) => alert.id), ["tax:entity:overview-company:atlas-today"]);
});
test("localized builtin tax labels are searchable while custom names remain untouched", () => {
  for (const query of ["tax payment", "税款缴付", "稅款繳付"]) {
    assert.equal(filterDeadlineAlerts(alertsFor(), "en", { query, scope: "tax" }).length, 3);
  }
  assert.equal(filterDeadlineAlerts(alertsFor(), "zh-Hant", { query: "LongReference" }).length, 1);
});
test("notes, reference numbers and revision reasons are excluded from search", () => {
  const alerts = alertsFor(); alerts[0].taxDeadline = { note: "SECRETNOTE", reference: "SECRETREF", revisions: [{ reason: "SECRETREASON" }] };
  for (const query of ["PRIVATE_NOTE_NOT_SEARCHABLE", "PRIVATE_REFERENCE_NOT_SEARCHABLE", "SECRETNOTE", "SECRETREF", "SECRETREASON"]) {
    assert.deepEqual(filterDeadlineAlerts(alerts, "en", { query }), []);
  }
});
test("view filtering preserves record identity, urgency order and all source data", () => {
  const alerts = alertsFor(); const before = JSON.stringify(alerts);
  const taxes = filterDeadlineAlerts(alerts, "en", { scope: "tax" });
  assert.deepEqual(taxes, alerts.filter((alert) => alert.scope === "tax"));
  assert.equal(taxes[0], alerts.find((alert) => alert.scope === "tax"));
  assert.deepEqual(filterDeadlineAlerts(alerts, "en", { scope: "delivery" }), alerts.filter((alert) => alert.scope !== "tax"));
  assert.equal(JSON.stringify(alerts), before); assert.deepEqual(filterDeadlineAlerts([]), []);
});
test("same-title tax actions include their original source names", () => {
  const today = alertsFor().filter((alert) => alert.urgency === "due_today");
  const names = today.map((alert) => deadlineAlertActionName(alert, "zh-Hant"));
  assert.equal(new Set(names).size, 2);
  today.forEach((alert, index) => assert.ok(names[index].includes(alert.recordName)));
});
