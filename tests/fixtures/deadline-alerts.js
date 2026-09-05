import { canonicalStorePayload, makeTaxDeadline, normalizeStore } from "../../src/dashboard/model.js";
import { companyOverviewFixture } from "./company-overview.js";

export const ALERT_TEST_NOW = "2026-09-05T04:00:00.000Z";
export function deadlineAlertFixture() {
  const store = companyOverviewFixture();
  const company = store.entities.find((entry) => entry.id === "overview-company");
  company.legalName = "Atlas Example International Accounting and Advisory Services Limited";
  const holding = store.entities.find((entry) => entry.id === "overview-holding");
  holding.legalName = "Birch Example Holdings Limited";
  store.engagements.find((entry) => entry.id === "overview-next").dueDate = "2026-09-01";
  store.engagements.find((entry) => entry.id === "overview-group").dueDate = "2026-09-02";
  const tax = (id, dueDate, extra = {}) => makeTaxDeadline({ id, category: "tax_payment", taxYear: "2025/26",
    owner: "Alex Example", dueDate, reminderDays: 14, note: "PRIVATE_NOTE_NOT_SEARCHABLE",
    reference: "PRIVATE_REFERENCE_NOT_SEARCHABLE", ...extra });
  company.taxDeadlines = [tax("atlas-today", "2026-09-05"), tax("atlas-soon", "2026-09-10"),
    tax("atlas-overdue", "2026-09-03", { category: "custom", customName: "Document review " + "LongReference".repeat(10) }),
    tax("atlas-future", "2026-12-15"), tax("atlas-completed", "2026-09-01", { state: "completed" })];
  holding.taxDeadlines = [tax("birch-today", "2026-09-05")];
  const archived = store.entities.find((entry) => entry.id === "overview-empty");
  archived.archived = true; archived.taxDeadlines = [tax("hidden-archived", "2026-09-01")];
  return canonicalStorePayload(normalizeStore(store));
}
