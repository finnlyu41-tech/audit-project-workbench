const normalized = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase();

// Only library-card metadata is searchable. Workflow instructions are not indexed.
export function filterTemplateLibrary(samples, { query = "", tag = "all", sort = "updated" } = {}) {
  const tokens = normalized(query).trim().split(/\s+/u).filter(Boolean);
  return samples.filter((sample) => {
    if (tag !== "all" && !sample.tags?.includes(tag)) return false;
    const text = normalized([sample.name, sample.description, sample.versionNote, ...(sample.tags || [])].join(" "));
    return tokens.every((token) => text.includes(token));
  }).sort((left, right) => sort === "name" ? left.name.localeCompare(right.name)
    : sort === "created" ? (right.createdAt || "").localeCompare(left.createdAt || "")
      : (right.updatedAt || "").localeCompare(left.updatedAt || ""));
}
