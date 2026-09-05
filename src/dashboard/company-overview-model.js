import { engagementReportingYears, engagementsForEntity, engagementTypesLabel,
  groupProgress, projectStats, yearEndOrPeriodLabel } from "./model.js";

const normalize = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase();

// View-only rows. Progress comes from the same functions as the project workspace.
export function companyAnnualRows(store, entity, language = "en") {
  if (!entity) return [];
  const projectViews = new Map((store.projects || []).map((project) => [project.id, project]));
  return engagementsForEntity(store, entity.id).map((engagement) => ({
    engagement,
    archived: Boolean(entity.archived || engagement.archived),
    percentage: entity.kind === "holding_company" ? groupProgress(store, engagement.id).percentage
      : projectStats(projectViews.get(engagement.id) || engagement).percentage,
    searchText: normalize([engagementReportingYears(engagement).join(" "),
      yearEndOrPeriodLabel(engagement, language), yearEndOrPeriodLabel(engagement, "en"),
      engagementTypesLabel(engagement, language), engagementTypesLabel(engagement, "en"), engagement.owner].join(" ")),
  }));
}

export function filterAnnualProjects(rows, query = "", scope = "all") {
  const tokens = normalize(query).trim().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => (scope === "archived" ? row.archived : scope === "unarchived" ? !row.archived : true)
    && tokens.every((token) => row.searchText.includes(token)));
}
