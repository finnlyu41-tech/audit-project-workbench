import { engagementReportingPeriods, engagementTypesLabel, yearEndOrPeriodLabel } from "./model.js";
import { toTraditional } from "./traditional.js";
import { sanitizeRecentRecords } from "./ux-model.js";

export const QUICK_OPEN_LIMIT = 30;
const fold = (value) => toTraditional(String(value || "").normalize("NFKC")).toLocaleLowerCase().replace(/\s+/gu, " ").trim();
const recordKey = (kind, id) => `${kind === "entity" ? "entity" : "engagement"}:${id}`;

// Index only record identity fields. Notes, tax references and audit content are not searched.
export function quickOpenIndex(store, language = "en") {
  const entities = new Map((store.entities || []).map((entity) => [entity.id, entity]));
  const rows = [...entities.values()].map((entity) => ({ kind: "entity", id: entity.id,
    name: entity.legalName, owner: "", period: "", types: "", archived: Boolean(entity.archived),
    holding: entity.kind === "holding_company", key: recordKey("entity", entity.id),
    search: fold(entity.legalName), nameSearch: fold(entity.legalName) }));
  for (const engagement of store.engagements || []) {
    const entity = entities.get(engagement.entityId);
    if (!entity) continue;
    const types = engagementTypesLabel(engagement, language);
    const dates = engagementReportingPeriods(engagement).map((period) => `${period.periodStart} ${period.periodEnd}`).join(" ");
    rows.push({ kind: entity.kind === "holding_company" ? "group" : "project", id: engagement.id,
      name: entity.legalName, owner: engagement.owner || "", period: yearEndOrPeriodLabel(engagement, language), types,
      archived: Boolean(entity.archived || engagement.archived), holding: entity.kind === "holding_company",
      key: recordKey("project", engagement.id), nameSearch: fold(entity.legalName),
      search: fold([entity.legalName, engagement.owner, dates, types, engagementTypesLabel(engagement, "en"),
        engagementTypesLabel(engagement, "zh-Hans")].join(" ")) });
  }
  return rows;
}

export function findQuickOpenRecords(index, query = "", includeArchived = false, recent = []) {
  const text = fold(query); const terms = text.split(" ").filter(Boolean);
  const ranks = new Map(sanitizeRecentRecords(recent).map((entry, i) => [recordKey(entry.kind, entry.id), i]));
  const matches = index.filter((row) => (includeArchived || !row.archived) && terms.every((term) => row.search.includes(term)));
  const score = (row) => text && row.nameSearch === text ? 0 : text && row.nameSearch.startsWith(text) ? 1 : 2;
  matches.sort((a, b) => score(a) - score(b) || (ranks.get(a.key) ?? 99) - (ranks.get(b.key) ?? 99)
    || a.name.localeCompare(b.name) || b.period.localeCompare(a.period) || a.key.localeCompare(b.key));
  return { total: matches.length, records: matches.slice(0, QUICK_OPEN_LIMIT) };
}
