import { makeBlankSample, makeBlankGroupSample, makeNode } from "../../src/dashboard/model.js";
import { companyOverviewFixture } from "./company-overview.js";

// Synthetic public workflow descriptions only. No user workspace snapshots.
export function templateLibraryFixture() {
  const store = companyOverviewFixture();
  const sample = (id, name, categoryId = "audit", extra = {}) => ({
    ...makeBlankSample("en", categoryId, categoryId), id, name,
    description: "Review and document the engagement workflow " + "LONGDESCRIPTION".repeat(8),
    tags: ["review", "InternationalReportingReviewRegion2026"], versionNote: "Release 2026 " + "VERSIONNOTE".repeat(6),
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
    nodes: [makeNode({ title: "NOTINDEXEDSTAGETEXT", conditions: ["NOTINDEXEDCRITERION"] })], ...extra,
  });
  store.samples = [sample("library-alpha", "Alpha Annual Assurance " + "LONGNAME".repeat(6)),
    sample("library-beta", "Beta Compact Workflow", "audit", { tags: ["beta"], versionNote: "Release 2025", updatedAt: "2026-07-01T00:00:00Z" }),
    sample("library-tax", "Tax Calculation Example", "tax_computation_filing")];
  store.groupSamples = [{ ...makeBlankGroupSample("en"), id: "library-group", name: "Holding Consolidation " + "LONGNAME".repeat(5),
    description: "Review consolidation " + "LONGDESCRIPTION".repeat(8), tags: ["review"], versionNote: "Release 2026 " + "VERSIONNOTE".repeat(6),
    updatedAt: "2026-08-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" }];
  store.selectedSampleIdsByCategory = { audit: "library-alpha", tax_computation_filing: "library-tax" };
  store.selectedGroupSampleId = "library-group";
  return store;
}
