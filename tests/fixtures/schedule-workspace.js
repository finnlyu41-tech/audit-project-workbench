import { canonicalStorePayload, emptyStore, makeEngagement, makeEntity, makeTaxDeadline, normalizeStore } from "../../src/dashboard/model.js";

// Fictional schedule records only. Identical delivery dates across different reporting years.
export function scheduleWorkspace(extra = 0) {
  const base = canonicalStorePayload(emptyStore());
  const company = makeEntity({ id: "schedule-company", legalName: "Schedule Example International Advisory and Assurance Limited" });
  const other = makeEntity({ id: "schedule-other", legalName: "Second Example Limited" });
  const job = (id, year, owner = "Alex Schedule", dates = {}) => makeEngagement({ id, entityId: company.id,
    periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`, owner,
    startDate: "2026-09-01", dueDate: "2026-11-30", ...dates },
  { entity: company, store: base, sourceMode: "blank", workstreamCategories: base.workstreamCategories });
  const previous = job("schedule-previous", 2025);
  const current = job("schedule-current", 2026);
  current.engagementTypes = ["Audit", "Bookkeeping"];
  const partial = job("schedule-partial", 2027, "Blair Partial", { startDate: "", dueDate: "2026-12-31" });
  const archived = job("schedule-archived", 2024); archived.archived = true;
  const missing = job("schedule-missing", 2028, "Casey Empty", { startDate: "", dueDate: "" });
  missing.entityId = other.id; missing.notes = "PRIVATE-SCHEDULE-NOTE";
  company.taxDeadlines = [previous, current].map((engagement) => makeTaxDeadline({
    id: `tax-${engagement.id}`, category: "profits_tax_filing", dueDate: "2026-10-10", taxYear: "2026/27",
    linkedEngagementId: engagement.id, owner: "Taylor Tax", reminderDays: 30,
  }));
  const engagements = [previous, current, partial, archived, missing,
    ...Array.from({ length: extra }, (_, i) => job(`schedule-extra-${i}`, 2030 + i))];
  return canonicalStorePayload(normalizeStore({ ...base, entities: [company, other], engagements,
    entityOrder: [company.id, other.id], scheduleOrder: engagements.map((item) => `project:${item.id}`) }));
}
