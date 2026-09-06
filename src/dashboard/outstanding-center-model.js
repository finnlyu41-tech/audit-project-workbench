import { outstandingIsOpen } from "./model.js";

export function outstandingEntryKey(entry) {
  return JSON.stringify([entry.sourceType, entry.sourceId, entry.item.id]);
}
const normalized = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase();

// Search only displayed identifying fields. Notes remain visible but are not indexed.
export function filterOutstandingEntries(entries, statuses, { query = "", visibility = "open", status = "all", module = "all" } = {}) {
  const tokens = normalized(query).trim().split(/\s+/u).filter(Boolean);
  return entries.filter((entry) => {
    if (module !== "all" && entry.moduleKey !== module) return false;
    const open = outstandingIsOpen(entry.item, statuses);
    if (visibility === "open" && !open || visibility === "closed" && open) return false;
    if (status !== "all" && entry.item.status !== status) return false;
    const searchable = normalized([entry.item.title, entry.sourceName, entry.companyName,
      entry.sourceOwner, entry.moduleLabel].join(" "));
    return tokens.every((token) => searchable.includes(token));
  });
}

export function outstandingVisibilityCounts(entries, statuses) {
  return entries.reduce((counts, entry) => {
    const open = outstandingIsOpen(entry.item, statuses);
    return { all: counts.all + 1, open: counts.open + Number(open), closed: counts.closed + Number(!open) };
  }, { all: 0, open: 0, closed: 0 });
}

// Group a view, never mutate records or conflate same-name companies/annual projects.
export function groupOutstandingEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = JSON.stringify([entry.sourceType, entry.sourceId]);
    if (!groups.has(key)) groups.set(key, { key, sourceId: entry.sourceId, sourceType: entry.sourceType,
      companyName: entry.companyName, periodLabel: entry.periodLabel, readOnly: entry.readOnly, entries: [] });
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()];
}
