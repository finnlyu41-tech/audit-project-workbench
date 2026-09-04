import test from "node:test";
import assert from "node:assert/strict";
import {
  CORE_SAMPLE_KEY,
  CORE_GROUP_SAMPLE_KEY,
  STORE_VERSION,
  activeOutstandingItems,
  assignProjectToGroup,
  canMoveWorkspaceItem,
  canNestGroup,
  collectGroupOutstandingEntries,
  collectGroupTaxDeadlineEntries,
  componentsForCurrentStructure,
  convertGroupToProject,
  convertProjectToGroup,
  createDefaultGroupSample,
  createDefaultWorkstreamCategories,
  createDefaultSample,
  createDefaultOutstandingStatuses,
  deadlineAlerts,
  duplicateSample,
  emptyStore,
  engagementTypeLabel,
  engagementPeriodExists,
  engagementsForEntity,
  fiscalPeriodForYear,
  fiscalPeriodFromIncorporation,
  fiscalPeriodShortLabel,
  findParentMembership,
  formalReportingPeriodLabel,
  groupProgress,
  localizeGroupSample,
  localizeOutstandingStatuses,
  localizeSample,
  localizeWorkflowNodes,
  makeGroup,
  makeGroupMember,
  makeEngagement,
  makeEntity,
  makeOutstandingItem,
  makeProject,
  makeTaxDeadline,
  makeWorkstream,
  memberProgressPercentage,
  mergeEntities,
  moveEntity,
  moveWorkspaceItem,
  navigationStatusCounts,
  nodeIsComplete,
  normalizeStore,
  inferPeriodPreset,
  suggestNextFiscalYear,
  syncEngagementToCurrentStructure,
  outstandingIsOpen,
  projectIsComplete,
  projectStats,
  reconcileWorkbenchStore,
  redactSampleCompanies,
  reorderWorkspaceSchedule,
  reorderWorkstreams,
  reportingPeriodLabel,
  reviseTaxDeadline,
  taxDeadlineCategoryLabel,
  taxDeadlineSummary,
  taxDeadlineUrgency,
  workstreamStats,
  workstreamCategoryLabel,
  workspaceScheduleOrder,
  workstreamTypeLabel,
  yearEndOrPeriodLabel,
} from "../src/dashboard/model.js";

const projectValues = {
  name: "[Company Name] FY2025 Audit",
  entity: "[Company Name] Limited",
  reportingFramework: "HKFRS Accounting Standards",
  period: "Year ended 31 March 2025",
  startDate: "2025-04-01",
  dueDate: "2025-06-30",
  notes: "",
};

test("a project receives an independent copy of the Sample workflow", () => {
  const sample = createDefaultSample();
  const project = makeProject(projectValues, true, sample.nodes);
  const audit = project.workstreams[0];

  assert.equal(audit.nodes.length, sample.nodes.length);
  assert.notEqual(audit.nodes[0].id, sample.nodes[0].id);
  assert.notEqual(audit.nodes[0].conditions[0].id, sample.nodes[0].conditions[0].id);
  assert.equal(projectStats(project).percentage, 0);

  audit.nodes[0].conditions.forEach((condition) => { condition.done = true; });
  assert.equal(nodeIsComplete(audit.nodes[0]), true);
  assert.equal(sample.nodes[0].conditions.some((condition) => condition.done), false);
});

test("outstanding items do not affect workflow progress", () => {
  const project = makeProject(projectValues, true, createDefaultSample().nodes);
  project.workstreams[0].nodes[0].conditions[0].done = true;
  const before = projectStats(project);

  project.outstandingItems.push(makeOutstandingItem({
    title: "Bank statement not yet received",
    status: "missing_document",
    note: "March 2025",
  }));

  assert.deepEqual(projectStats(project), before);
});

test("Sample company de-identification replaces supplied names and preserves structure", () => {
  const sample = {
    id: "sample-main",
    name: "Acme Shipping Limited audit",
    description: "Workflow for ACME SHIPPING LIMITED",
    updatedAt: "2025-01-01T00:00:00.000Z",
    nodes: [{
      id: "node-1",
      title: "Acme Shipping Limited setup",
      description: "Confirm Acme Shipping Limited records",
      conditions: [{ id: "condition-1", label: "Acme Shipping Limited confirmed", done: false }],
    }],
  };

  const result = redactSampleCompanies(sample, ["Acme Shipping Limited"], "[Company Name]");

  assert.equal(result.replacements, 5);
  assert.equal(result.sample.name, "[Company Name] audit");
  assert.equal(result.sample.description, "Workflow for [Company Name]");
  assert.equal(result.sample.nodes[0].id, "node-1");
  assert.equal(result.sample.nodes[0].conditions[0].id, "condition-1");
  assert.match(JSON.stringify(result.sample), /\[Company Name\]/);
  assert.doesNotMatch(JSON.stringify(result.sample), /Acme Shipping Limited/i);
  assert.match(JSON.stringify(sample), /Acme Shipping Limited/);
});

test("version 1 data migrates outstanding items separately and removes the retired criterion", () => {
  const legacyProject = makeProject(projectValues, false);
  delete legacyProject.workstreams;
  const migrated = normalizeStore({
    version: 1,
    projects: [{
      ...legacyProject,
      nodes: [{
        id: "node-legacy",
        title: "Legacy stage",
        description: "完成主要工作底稿并处理待清事项。",
        conditions: [
          { id: "keep", label: "Main workpapers complete", done: false },
          { id: "remove", label: "待清事项已复核", done: true },
        ],
      }],
    }],
  });

  assert.equal(migrated.version, STORE_VERSION);
  assert.deepEqual(migrated.projects[0].outstandingItems, []);
  assert.equal(migrated.projects[0].workstreams[0].nodes[0].description, "完成主要工作底稿并处理审计调整。");
  assert.deepEqual(migrated.projects[0].workstreams[0].nodes[0].conditions.map((condition) => condition.id), ["keep"]);
  assert.ok(migrated.samples[0].nodes.length > 0);
  assert.equal(migrated.selectedSampleIdsByCategory.audit,
    migrated.samples.find((sample) => sample.workstreamType === "audit").id);
  assert.equal(migrated.outstandingStatuses.length, 5);
  assert.equal(migrated.groups.length, 0);
  assert.equal(migrated.groupSamples[0].builtinKey, CORE_GROUP_SAMPLE_KEY);
});

test("version 2 single-Sample data migrates into the Sample library", () => {
  const legacySample = createDefaultSample();
  delete legacySample.builtinKey;
  legacySample.description = "固定流程范本";

  const migrated = normalizeStore({ version: 2, projects: [], sample: legacySample });

  assert.equal(migrated.version, STORE_VERSION);
  assert.equal(migrated.samples.length, 5);
  const auditSample = migrated.samples.find((sample) => sample.workstreamType === "audit");
  assert.equal(auditSample.builtinKey, CORE_SAMPLE_KEY);
  assert.equal(migrated.selectedSampleIdsByCategory.audit, auditSample.id);
  assert.equal("sample" in migrated, false);
});

test("version 3 project data migrates to the group-capable schema without changing progress", () => {
  const project = makeProject(projectValues, true, createDefaultSample().nodes);
  const legacyNodes = project.workstreams[0].nodes;
  legacyNodes[0].conditions[0].done = true;
  delete project.workstreams;
  project.nodes = legacyNodes;
  delete project.owner;
  const before = projectStats(project);

  const migrated = normalizeStore({ version: 3, projects: [project], samples: [createDefaultSample()],
    selectedSampleId: "sample-core-audit", outstandingStatuses: createDefaultOutstandingStatuses() });

  assert.equal(migrated.version, STORE_VERSION);
  const after = projectStats(migrated.projects[0]);
  assert.equal(after.percentage, before.percentage);
  assert.equal(after.completedConditions, before.completedConditions);
  assert.equal(migrated.projects[0].owner, "");
  assert.deepEqual(migrated.groups, []);
  assert.equal(migrated.groupSamples.length, 1);
});

test("the built-in Sample has a complete English content variant", () => {
  const englishSample = localizeSample(createDefaultSample(), "en");

  assert.equal(englishSample.name, "Core Audit Workflow");
  assert.equal(englishSample.nodes.length, 6);
  assert.doesNotMatch(JSON.stringify(englishSample), /[\u3400-\u9fff]/u);
});

test("language switching leaves custom Sample content unchanged", () => {
  const custom = {
    id: "sample-custom",
    name: "客户自定义流程",
    description: "保留使用者原文",
    updatedAt: "2026-09-02T00:00:00.000Z",
    nodes: [],
  };

  assert.deepEqual(localizeSample(custom, "en"), custom);
});

test("known built-in workflow text localises inside older or partially customised data", () => {
  const legacyNodes = createDefaultSample().nodes;
  legacyNodes[0].conditions.pop();
  const englishNodes = localizeWorkflowNodes(legacyNodes, "en");

  assert.equal(englishNodes[0].title, "Engagement setup");
  assert.equal(englishNodes[0].conditions.length, 1);
  assert.doesNotMatch(JSON.stringify(englishNodes), /[\u3400-\u9fff]/u);
  assert.equal(legacyNodes[0].title, "项目设置");
});

test("duplicating a Sample creates independent stage and criterion identities", () => {
  const source = createDefaultSample("en");
  source.nodes[0].conditions[0].done = true;
  const copy = duplicateSample(source, " (Copy)");

  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.nodes[0].id, source.nodes[0].id);
  assert.notEqual(copy.nodes[0].conditions[0].id, source.nodes[0].conditions[0].id);
  assert.equal(copy.nodes[0].conditions[0].done, false);
  assert.equal(copy.builtinKey, undefined);
});

test("built-in outstanding statuses localise while custom statuses keep their original label", () => {
  const statuses = [...createDefaultOutstandingStatuses(), {
    id: "client_reminder",
    label: "客户再跟进",
    closed: false,
    tone: "neutral",
  }];
  const englishStatuses = localizeOutstandingStatuses(statuses, "en");

  assert.equal(englishStatuses[0].label, "Missing document");
  assert.equal(englishStatuses.at(-1).label, "客户再跟进");
  assert.doesNotMatch(JSON.stringify(englishStatuses.slice(0, -1)), /[\u3400-\u9fff]/u);
});

test("custom outstanding status semantics control whether an item is open", () => {
  const statuses = [{ id: "waiting", label: "Waiting", closed: false, tone: "neutral" },
    { id: "cleared", label: "Cleared", closed: true, tone: "success" }];
  const item = makeOutstandingItem({ title: "Signed letter", status: "waiting" }, statuses);

  assert.equal(outstandingIsOpen(item, statuses), true);
  item.status = "cleared";
  assert.equal(outstandingIsOpen(item, statuses), false);
});

test("group progress keeps component and consolidation progress separate with a 70/30 overall score", () => {
  const groupSample = createDefaultGroupSample();
  const project = makeProject(projectValues, true, createDefaultSample().nodes);
  project.workstreams[0].nodes.flatMap((node) => node.conditions).forEach((condition) => { condition.done = true; });
  const group = makeGroup({ name: "Example Group", period: "FY2025", dueDate: "", owner: "", notes: "",
    consolidationEnabled: true }, true, groupSample);
  const member = makeGroupMember({ kind: "project", refId: project.id, auditType: "internal_team" }, groupSample);
  member.readinessConditions.forEach((condition) => { condition.done = true; });
  group.members.push(member);
  group.nodes[0].conditions.forEach((condition) => { condition.done = true; });

  const store = { projects: [project], groups: [group] };
  const stats = groupProgress(store, group.id);

  assert.equal(stats.componentPercentage, 100);
  assert.ok(stats.consolidationPercentage > 0 && stats.consolidationPercentage < 100);
  assert.equal(stats.percentage, Math.round(100 * 0.7 + stats.consolidationPercentage * 0.3));
  assert.equal(stats.readyCompanies, 1);
  assert.equal(stats.ready, false);
});

test("classification-only subgroups roll up recursively and cannot form cycles", () => {
  const groupSample = createDefaultGroupSample();
  const project = makeProject(projectValues, true, createDefaultSample().nodes);
  const child = makeGroup({ name: "Child Group", period: "FY2025", dueDate: "", owner: "", notes: "",
    consolidationEnabled: false }, false, groupSample);
  const childMember = makeGroupMember({ kind: "project", refId: project.id, auditType: "management_accounts" }, groupSample);
  childMember.readinessConditions.forEach((condition) => { condition.done = true; });
  child.members.push(childMember);
  const parent = makeGroup({ name: "Parent Group", period: "FY2025", dueDate: "", owner: "", notes: "",
    consolidationEnabled: false }, false, groupSample);
  parent.members.push(makeGroupMember({ kind: "group", refId: child.id }, groupSample));
  const store = { projects: [project], groups: [parent, child] };

  assert.equal(groupProgress(store, child.id).ready, true);
  assert.equal(groupProgress(store, parent.id).ready, true);
  assert.equal(canNestGroup(store, child.id, parent.id), false);
});

test("group outstanding roll-up preserves each source", () => {
  const statuses = createDefaultOutstandingStatuses();
  const project = makeProject(projectValues, false);
  project.outstandingItems.push(makeOutstandingItem({ title: "Company item" }, statuses));
  const group = makeGroup({ name: "Example Group", period: "FY2025", dueDate: "", owner: "", notes: "",
    consolidationEnabled: false }, false);
  group.outstandingItems.push(makeOutstandingItem({ title: "Group item" }, statuses));
  group.members.push(makeGroupMember({ kind: "project", refId: project.id, auditType: "internal_team" }));

  const entries = collectGroupOutstandingEntries({ projects: [project], groups: [group] }, group.id);
  assert.deepEqual(entries.map((entry) => [entry.item.title, entry.sourceName]), [
    ["Group item", "Example Group"], ["Company item", project.name],
  ]);
});

test("the built-in holding-company template localises all workflow and readiness text", () => {
  const english = localizeGroupSample(createDefaultGroupSample(), "en");
  assert.equal(english.name, "Holding Company Consolidation Workflow");
  assert.equal(english.nodes.length, 7);
  assert.doesNotMatch(JSON.stringify(english), /[\u3400-\u9fff]/u);
});

test("version 4 project nodes migrate into one audit workstream without changing identities or completion", () => {
  const nodes = createDefaultSample().nodes;
  nodes[0].conditions[0].done = true;
  const nodeId = nodes[0].id;
  const conditionId = nodes[0].conditions[0].id;
  const migrated = normalizeStore({ version: 4, projects: [{ ...projectValues, id: "legacy-project", archived: false,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", nodes, outstandingItems: [] }],
    groups: [], samples: [createDefaultSample()], outstandingStatuses: createDefaultOutstandingStatuses() });
  const audit = migrated.projects[0].workstreams[0];

  assert.equal(audit.type, "audit");
  assert.equal(audit.nodes[0].id, nodeId);
  assert.equal(audit.nodes[0].conditions[0].id, conditionId);
  assert.equal(audit.nodes[0].conditions[0].done, true);
});

test("version 5 data migrates to template categories without changing the selected audit template", () => {
  const auditSample = createDefaultSample();
  const project = makeProject(projectValues, true, auditSample.nodes);
  const migrated = normalizeStore({ version: 5, projects: [project], groups: [], samples: [auditSample],
    selectedSampleIdsByType: { audit: auditSample.id }, groupSamples: [createDefaultGroupSample()],
    outstandingStatuses: createDefaultOutstandingStatuses() });

  assert.equal(migrated.version, STORE_VERSION);
  assert.deepEqual(migrated.workstreamCategories.map((category) => category.id),
    ["quote_collection", "bookkeeping", "audit", "tax_computation_filing", "cdd", "custom"]);
  assert.equal(migrated.selectedSampleIdsByCategory.audit, auditSample.id);
  assert.equal(migrated.projects[0].workstreams[0].categoryId, "audit");
});

test("initialising creates a clean version 11 workspace with built-in categories and templates", () => {
  const initialised = emptyStore();

  assert.equal(initialised.version, STORE_VERSION);
  assert.deepEqual(initialised.projects, []);
  assert.deepEqual(initialised.groups, []);
  assert.equal(initialised.workstreamCategories.length, 6);
  assert.equal(initialised.samples.length, 5);
  assert.equal(initialised.groupSamples.length, 1);
  assert.equal(initialised.selectedSampleIdsByCategory.audit, "sample-core-audit");
  assert.equal(initialised.selectedSampleIdsByCategory.bookkeeping, "sample-core-bookkeeping");
});

test("bookkeeping is added during V9 migration with a complete built-in workflow", () => {
  const previous = emptyStore();
  previous.version = 9;
  previous.workstreamCategories = previous.workstreamCategories.filter((category) => category.id !== "bookkeeping");
  previous.samples = previous.samples.filter((sample) => sample.workstreamType !== "bookkeeping");
  delete previous.selectedSampleIdsByCategory.bookkeeping;

  const migrated = normalizeStore(previous);
  const bookkeeping = migrated.samples.find((sample) => sample.workstreamType === "bookkeeping");

  assert.ok(migrated.workstreamCategories.some((category) => category.id === "bookkeeping"));
  assert.ok(bookkeeping?.nodes.length >= 5);
  assert.equal(migrated.selectedSampleIdsByCategory.bookkeeping, bookkeeping.id);
});

test("a legacy-style company may intentionally start without workstreams and add them later", () => {
  const store = emptyStore();
  const project = makeProject({ ...projectValues, workstreamSelections: [] }, true,
    store.samples, store.workstreamCategories);
  const restored = normalizeStore({ ...store, projects: [project] });

  assert.deepEqual(project.workstreams, []);
  assert.deepEqual(restored.projects[0].workstreams, []);
  assert.equal(projectStats(restored.projects[0]).workstreams, 0);
  assert.equal(projectIsComplete(restored.projects[0]), false);
});

test("choosing a blank starting workflow does not silently apply the category default", () => {
  const store = emptyStore();
  const project = makeProject({ ...projectValues, workstreamSelections: [{ type: "audit", categoryId: "audit", sampleId: "" }] },
    true, store.samples, store.workstreamCategories);

  assert.equal(project.workstreams.length, 1);
  assert.deepEqual(project.workstreams[0].nodes, []);
});

test("version 8 data migrates to version 11 with empty tax registers and intact relationships", () => {
  const base = emptyStore();
  const project = makeProject(projectValues, true, base.samples, base.workstreamCategories);
  const group = makeGroup({ name: "Parent Holding", consolidationEnabled: false }, false, base.groupSamples[0]);
  group.members.push(makeGroupMember({ kind: "project", refId: project.id, role: "Subsidiary" }, base.groupSamples[0]));
  const workstreamId = project.workstreams[0].id;
  delete project.taxDeadlines;
  delete group.taxDeadlines;

  const migrated = normalizeStore({ ...base, version: 8, projects: [project], groups: [group] });

  assert.equal(migrated.version, STORE_VERSION);
  assert.deepEqual(migrated.projects[0].taxDeadlines, []);
  assert.deepEqual(migrated.groups[0].taxDeadlines, []);
  assert.equal(migrated.projects[0].workstreams[0].id, workstreamId);
  assert.equal(migrated.groups[0].members[0].refId, project.id);
});

test("version 8 migration keeps intentional template and category deletions", () => {
  const saved = emptyStore();
  saved.version = 8;
  saved.workstreamCategories = saved.workstreamCategories.filter((category) => category.id !== "cdd");
  saved.samples = saved.samples.filter((sample) => sample.categoryId !== "cdd");
  delete saved.selectedSampleIdsByCategory.cdd;

  const migrated = normalizeStore(saved);

  assert.equal(migrated.workstreamCategories.some((category) => category.id === "cdd"), false);
  assert.equal(migrated.samples.some((sample) => sample.categoryId === "cdd"), false);
});

test("tax deadline normalization preserves valid workstream links and applies safe defaults", () => {
  const base = emptyStore();
  const project = makeProject({ ...projectValues, workstreamSelections: [{ type: "tax_computation_filing" }] },
    true, base.samples, base.workstreamCategories);
  const taxWorkstream = project.workstreams[0];
  project.taxDeadlines = [makeTaxDeadline({ category: "custom", customName: "Property tax filing",
    taxYear: "2025/26", dueDate: "2026-11-02", linkedWorkstreamId: taxWorkstream.id }),
  makeTaxDeadline({ category: "tax_payment", dueDate: "2026-12-01", reminderDays: 17,
    linkedWorkstreamId: "missing-workstream" })];

  const migrated = normalizeStore({ ...base, version: 9, projects: [project] });
  const [custom, payment] = migrated.projects[0].taxDeadlines;

  assert.equal(custom.originalDueDate, "2026-11-02");
  assert.equal(custom.reminderDays, 30);
  assert.equal(custom.linkedWorkstreamId, taxWorkstream.id);
  assert.equal(taxDeadlineCategoryLabel(custom, "en"), "Property tax filing");
  assert.equal(payment.reminderDays, 17);
  assert.equal(payment.linkedWorkstreamId, null);
  assert.equal(taxDeadlineCategoryLabel("profits_tax_filing", "en"), "Profits tax filing");
  assert.equal(taxDeadlineCategoryLabel("employers_return", "zh-Hant"), "僱主報稅表");
});

test("tax deadline urgency honours calendar-day and per-item reminder boundaries", () => {
  const now = new Date(2026, 8, 3, 15, 30);
  const urgency = (dueDate, reminderDays = 30, state = "open") => taxDeadlineUrgency(
    makeTaxDeadline({ dueDate, reminderDays, state }), now).level;

  assert.equal(urgency("2026-09-02"), "overdue");
  assert.equal(urgency("2026-09-03"), "due_today");
  assert.equal(urgency("2026-10-03"), "due_soon");
  assert.equal(urgency("2026-10-04"), "upcoming");
  assert.equal(urgency("2026-09-10", 6), "upcoming");
  assert.equal(urgency("2026-09-10", 7), "due_soon");
  assert.equal(urgency("2026-09-02", 30, "completed"), "inactive");
  assert.equal(urgency("2026-09-02", 30, "not_applicable"), "inactive");

  const summary = taxDeadlineSummary([
    makeTaxDeadline({ dueDate: "2026-09-20", reminderDays: 30 }),
    makeTaxDeadline({ dueDate: "2026-09-01" }),
    makeTaxDeadline({ dueDate: "2026-09-03", state: "completed" }),
  ], now);
  assert.equal(summary.openCount, 2);
  assert.equal(summary.attentionCount, 2);
  assert.equal(summary.next.dueDate, "2026-09-01");
  assert.equal(summary.urgency, "overdue");
});

test("rescheduling requires a reason and retains the original date and full revision history", () => {
  const deadline = makeTaxDeadline({ category: "profits_tax_filing", dueDate: "2026-09-30" });
  assert.throws(() => reviseTaxDeadline(deadline, { dueDate: "2026-10-31" }), /reason is required/iu);

  const revised = reviseTaxDeadline(deadline, { dueDate: "2026-10-31" }, "Extension approved",
    "2026-09-10T08:30:00.000Z");
  assert.equal(revised.originalDueDate, "2026-09-30");
  assert.deepEqual(revised.revisions, [{ fromDueDate: "2026-09-30", toDueDate: "2026-10-31",
    reason: "Extension approved", changedAt: "2026-09-10T08:30:00.000Z" }]);

  const completed = reviseTaxDeadline(revised, { state: "completed" }, "", "2026-10-20T09:00:00.000Z");
  assert.equal(completed.completedAt, "2026-10-20T09:00:00.000Z");
  assert.equal(completed.revisions.length, 1);
  assert.equal(taxDeadlineUrgency(completed, new Date(2026, 10, 1)).level, "inactive");
});

test("version 9 JSON backup migrates to V11 while preserving every tax-deadline field and revision", () => {
  const base = emptyStore();
  const project = makeProject({ ...projectValues, workstreamSelections: [{ type: "tax_computation_filing" }] },
    true, base.samples, base.workstreamCategories);
  const workstreamId = project.workstreams[0].id;
  const original = makeTaxDeadline({ id: "tax-fixed", category: "custom", customName: "Country-by-country return",
    taxYear: "2025/26", owner: "Taylor", originalDueDate: "2026-09-30", dueDate: "2026-10-31", reminderDays: 45,
    state: "open", linkedWorkstreamId: workstreamId, reference: "IRD reference 123", note: "Manual source checked",
    revisions: [{ fromDueDate: "2026-09-30", toDueDate: "2026-10-31", reason: "Written extension",
      changedAt: "2026-09-12T09:30:00.000Z" }], createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-12T09:30:00.000Z" });
  project.taxDeadlines = [original];

  const restored = normalizeStore(JSON.parse(JSON.stringify({ ...base, projects: [project] })));
  assert.deepEqual(restored.projects[0].taxDeadlines[0], { ...original, linkedEngagementId: project.id });
});

test("unused built-in template categories can be renamed or removed without returning after reload", () => {
  const saved = emptyStore();
  saved.workstreamCategories = saved.workstreamCategories
    .filter((category) => category.id !== "quote_collection")
    .map((category) => category.id === "audit" ? { ...category, name: "Assurance" } : category);
  saved.samples = saved.samples.filter((sample) => sample.categoryId !== "quote_collection");
  delete saved.selectedSampleIdsByCategory.quote_collection;

  const reloaded = normalizeStore(saved);
  const auditCategory = reloaded.workstreamCategories.find((category) => category.id === "audit");

  assert.equal(reloaded.workstreamCategories.some((category) => category.id === "quote_collection"), false);
  assert.equal(auditCategory.builtinType, "audit");
  assert.equal(workstreamCategoryLabel(auditCategory, "zh"), "Assurance");
  assert.equal(workstreamTypeLabel("audit", "en", "Assurance"), "Assurance");
  assert.equal(normalizeStore(reloaded).workstreamCategories.some((category) => category.id === "quote_collection"), false);
});

test("deleting the final workstream template persists and new workstreams start blank", () => {
  const saved = emptyStore();
  saved.samples = saved.samples.filter((sample) => sample.categoryId !== "audit");
  saved.selectedSampleIdsByCategory.audit = null;

  const reloaded = normalizeStore(saved);
  const project = makeProject(projectValues, true, reloaded.samples, reloaded.workstreamCategories);

  assert.equal(reloaded.samples.some((sample) => sample.categoryId === "audit"), false);
  assert.equal(reloaded.selectedSampleIdsByCategory.audit, null);
  assert.deepEqual(project.workstreams[0].nodes, []);
});

test("a custom template category can create an independent named workstream", () => {
  const customCategory = { id: "company_secretarial", name: "公司秘书服务" };
  const customSample = { id: "sample-company-secretarial", workstreamType: "custom",
    categoryId: customCategory.id, name: "公司秘书年度流程", description: "", nodes: [{ id: "sample-stage",
      title: "周年申报", description: "准备并提交周年申报表。",
      conditions: [{ id: "sample-condition", label: "周年申报表已提交", done: false }] }] };
  const migrated = normalizeStore({ version: STORE_VERSION, projects: [], groups: [], samples: [customSample],
    workstreamCategories: [...createDefaultWorkstreamCategories(), customCategory],
    selectedSampleIdsByCategory: { [customCategory.id]: customSample.id },
    groupSamples: [createDefaultGroupSample()], outstandingStatuses: createDefaultOutstandingStatuses() });
  const project = makeProject({ ...projectValues, workstreamSelections: [{ type: "custom", categoryId: customCategory.id,
    customName: customCategory.name, sampleId: customSample.id }] }, true, migrated.samples, migrated.workstreamCategories);
  const workstream = project.workstreams[0];

  assert.equal(migrated.workstreamCategories.at(-1).name, customCategory.name);
  assert.equal(migrated.selectedSampleIdsByCategory[customCategory.id], customSample.id);
  assert.equal(workstream.categoryId, customCategory.id);
  assert.equal(workstream.customName, customCategory.name);
  assert.equal(workstream.nodes[0].title, "周年申报");
  assert.notEqual(workstream.nodes[0].id, customSample.nodes[0].id);
});

test("customer due diligence labels use the full professional name without the abbreviation", () => {
  const simplified = createDefaultSample("zh", "cdd");
  const english = localizeSample(simplified, "en");

  assert.equal(workstreamTypeLabel("cdd", "zh"), "客户尽职调查");
  assert.equal(workstreamTypeLabel("cdd", "en"), "Customer due diligence");
  assert.doesNotMatch(JSON.stringify(simplified), /CDD/u);
  assert.doesNotMatch(JSON.stringify(english), /CDD/u);
});

test("parallel workstreams progress independently and a project completes only when every workstream completes", () => {
  const project = makeProject({ ...projectValues, workstreamSelections: [{ type: "audit" },
    { type: "tax_computation_filing" }] }, true);
  const audit = project.workstreams.find((workstream) => workstream.type === "audit");
  const tax = project.workstreams.find((workstream) => workstream.type === "tax_computation_filing");
  audit.nodes.flatMap((node) => node.conditions).forEach((condition) => { condition.done = true; });

  assert.equal(workstreamStats(audit).complete, true);
  assert.equal(workstreamStats(tax).percentage, 0);
  assert.equal(projectStats(project).completedWorkstreams, 1);
  assert.equal(projectIsComplete(project), false);

  tax.nodes.flatMap((node) => node.conditions).forEach((condition) => { condition.done = true; });
  assert.equal(projectIsComplete(project), true);
});

test("outstanding items can belong to a workstream without advancing that workstream", () => {
  const project = makeProject(projectValues, true);
  const audit = project.workstreams[0];
  const before = workstreamStats(audit);
  const item = makeOutstandingItem({ title: "Signed confirmation pending", workstreamId: audit.id });
  project.outstandingItems.push(item);

  assert.equal(item.workstreamId, audit.id);
  assert.deepEqual(workstreamStats(audit), before);
});

test("group member progress uses the audit workstream and falls back to readiness when no audit workstream exists", () => {
  const project = makeProject({ ...projectValues, workstreamSelections: [{ type: "audit" },
    { type: "tax_computation_filing" }] }, true);
  const audit = project.workstreams.find((workstream) => workstream.type === "audit");
  const tax = project.workstreams.find((workstream) => workstream.type === "tax_computation_filing");
  audit.nodes[0].conditions[0].done = true;
  tax.nodes.flatMap((node) => node.conditions).forEach((condition) => { condition.done = true; });
  const member = makeGroupMember({ kind: "project", refId: project.id, auditType: "internal_team" });
  assert.equal(memberProgressPercentage({ projects: [project], groups: [] }, member), workstreamStats(audit).percentage);

  project.workstreams = [makeWorkstream({ type: "custom", customName: "Advisory" }, [])];
  member.readinessConditions = [{ id: "one", label: "One", done: true }, { id: "two", label: "Two", done: false }];
  assert.equal(memberProgressPercentage({ projects: [project], groups: [] }, member), 50);
});

test("archived records are excluded from active group progress and outstanding roll-ups", () => {
  const project = makeProject(projectValues, false);
  project.archived = true;
  project.outstandingItems.push(makeOutstandingItem({ title: "Historical item" }));
  const group = makeGroup({ name: "Example Group", period: "", dueDate: "", owner: "", notes: "",
    consolidationEnabled: false }, false);
  group.members.push(makeGroupMember({ kind: "project", refId: project.id, auditType: "internal_team" }));
  const store = { projects: [project], groups: [group] };

  assert.equal(groupProgress(store, group.id).totalMembers, 0);
  assert.equal(collectGroupOutstandingEntries(store, group.id).length, 0);
  assert.equal(activeOutstandingItems(store).length, 0);
  assert.equal(collectGroupOutstandingEntries(store, group.id, new Set(), 0, true).length, 1);
});

test("outstanding status colours survive normalization and missing colours receive a safe default", () => {
  const migrated = normalizeStore({ version: 4, projects: [], groups: [], samples: [], outstandingStatuses: [
    { id: "waiting", label: "Waiting", closed: false, color: "#123abc" },
    { id: "closed", label: "Closed", closed: true, color: "invalid" },
  ] });
  assert.equal(migrated.outstandingStatuses[0].color, "#123abc");
  assert.equal(migrated.outstandingStatuses[1].color, "#778078");
});

test("built-in content supports Traditional Chinese while custom content remains unchanged", () => {
  const traditional = localizeSample(createDefaultSample(), "zh-Hant");
  const statuses = localizeOutstandingStatuses(createDefaultOutstandingStatuses(), "zh-Hant");
  const custom = { id: "custom", workstreamType: "custom", name: "客户自订流程", description: "保留原文", nodes: [] };

  assert.equal(traditional.name, "基礎審計流程");
  assert.equal(traditional.nodes[0].title, "項目設定");
  assert.equal(statuses.find((status) => status.id === "awaiting_signature").label, "等客戶簽署");
  assert.deepEqual(localizeSample(custom, "zh-Hant"), custom);
});

test("legacy internal shorthand migrates to professional terminology without breaking group references", () => {
  const project = { ...projectValues, id: "legacy-a4", archived: false, outstandingItems: [],
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", nodes: [{
      id: "legacy-node", title: "TB / A4", description: "Confirm that the audit number base is ready.",
      conditions: [{ id: "legacy-condition", label: "TB-to-A4 balance check completed", done: true }],
    }] };
  const group = makeGroup({ name: "Legacy Group", period: "", dueDate: "", owner: "", notes: "",
    consolidationEnabled: false }, false);
  group.members.push(makeGroupMember({ kind: "project", refId: project.id, auditType: "internal_team" }));
  const migrated = normalizeStore({ version: 4, projects: [project], groups: [group], samples: [],
    groupSamples: [createDefaultGroupSample()], outstandingStatuses: createDefaultOutstandingStatuses() });
  const serializedNodes = JSON.stringify(migrated.projects[0].workstreams[0].nodes);

  assert.doesNotMatch(serializedNodes, /A4/u);
  assert.match(serializedNodes, /试算表及总账衔接/u);
  assert.equal(migrated.groups[0].members[0].refId, project.id);
});

test("company details can preserve, move and remove a project group assignment", () => {
  const groupSample = createDefaultGroupSample();
  const project = makeProject(projectValues, true, createDefaultSample().nodes);
  const firstGroup = makeGroup({ name: "First Group", period: "FY2025", consolidationEnabled: true }, true, groupSample);
  const secondGroup = makeGroup({ name: "Second Group", period: "FY2025", consolidationEnabled: true }, true, groupSample);
  const member = makeGroupMember({ kind: "project", refId: project.id, role: "Component", auditType: "internal_team" }, groupSample);
  member.readinessConditions[0].done = true;
  firstGroup.members.push(member);
  const store = normalizeStore({ version: STORE_VERSION, projects: [project], groups: [firstGroup, secondGroup],
    samples: [createDefaultSample()], groupSamples: [groupSample], outstandingStatuses: createDefaultOutstandingStatuses() });

  const updated = assignProjectToGroup(store, project.id,
    { groupId: firstGroup.id, role: "Subsidiary", auditType: "internal_team" }, groupSample);
  const updatedMember = updated.groups.find((group) => group.id === firstGroup.id).members[0];
  assert.equal(updatedMember.role, "Subsidiary");
  assert.equal(updatedMember.readinessConditions[0].done, true);

  const moved = assignProjectToGroup(updated, project.id,
    { groupId: secondGroup.id, role: "Associate", auditType: "component_auditor" }, groupSample);
  assert.equal(moved.groups.find((group) => group.id === firstGroup.id).members.length, 0);
  assert.equal(moved.groups.find((group) => group.id === secondGroup.id).members[0].role, "Associate");
  assert.equal(moved.groups.find((group) => group.id === secondGroup.id).members[0].auditType, "component_auditor");

  const detached = assignProjectToGroup(moved, project.id, { groupId: "" }, groupSample);
  assert.equal(detached.groups.some((group) => group.members.some((item) => item.refId === project.id)), false);
});

test("navigation moves a project between groups while preserving its member settings", () => {
  const groupSample = createDefaultGroupSample();
  const project = makeProject(projectValues, true);
  const firstGroup = makeGroup({ name: "First Group", period: "FY2025", consolidationEnabled: false }, false, groupSample);
  const secondGroup = makeGroup({ name: "Second Group", period: "FY2025", consolidationEnabled: false }, false, groupSample);
  const member = makeGroupMember({ kind: "project", refId: project.id, role: "Subsidiary",
    auditType: "component_auditor" }, groupSample);
  member.readinessConditions[0].done = true;
  firstGroup.members.push(member);
  const store = { projects: [project], groups: [firstGroup, secondGroup] };

  const moved = moveWorkspaceItem(store, "project", project.id, secondGroup.id, groupSample);
  const movedMember = moved.groups.find((group) => group.id === secondGroup.id).members[0];
  assert.equal(moved.groups.find((group) => group.id === firstGroup.id).members.length, 0);
  assert.equal(movedMember.id, member.id);
  assert.equal(movedMember.role, "Subsidiary");
  assert.equal(movedMember.auditType, "component_auditor");
  assert.equal(movedMember.readinessConditions[0].done, true);

  const detached = moveWorkspaceItem(moved, "project", project.id, "", groupSample);
  assert.equal(detached.groups.some((group) => group.members.some((item) => item.refId === project.id)), false);
});

test("project schedule order is stable, reorderable and preserved across company structure conversion", () => {
  const base = emptyStore();
  const first = makeProject({ ...projectValues, name: "First", entity: "First Limited" }, false);
  const second = makeProject({ ...projectValues, name: "Second", entity: "Second Limited" }, false);
  const holding = makeGroup({ name: "Holding", consolidationEnabled: false }, false);
  const store = normalizeStore({ ...base, projects: [first, second], groups: [holding],
    scheduleOrder: [`project:${second.id}`, "missing:item", `project:${second.id}`] });

  assert.deepEqual(workspaceScheduleOrder(store), [
    `project:${second.id}`, `project:${first.id}`, `group:${holding.id}`,
  ]);
  const reordered = reorderWorkspaceSchedule(store, `group:${holding.id}`, `project:${second.id}`, "before");
  assert.deepEqual(reordered.scheduleOrder, [
    `group:${holding.id}`, `project:${second.id}`, `project:${first.id}`,
  ]);
  const converted = convertProjectToGroup(reordered, second.id, createDefaultGroupSample());
  assert.deepEqual(converted.scheduleOrder, [
    `group:${holding.id}`, `group:${second.id}`, `project:${first.id}`,
  ]);
});

test("project schedule migration preserves the previous owner and start-date ordering", () => {
  const base = emptyStore();
  const later = makeProject({ ...projectValues, name: "Later", entity: "Later Limited",
    owner: "Alex", startDate: "2026-11-01" }, false);
  const earlier = makeProject({ ...projectValues, name: "Earlier", entity: "Earlier Limited",
    owner: "Alex", startDate: "2026-10-01" }, false);
  const unassigned = makeProject({ ...projectValues, name: "Unassigned", entity: "Unassigned Limited",
    owner: "", startDate: "2026-09-01" }, false);
  const holding = makeGroup({ name: "Beta Holding", owner: "Beta", startDate: "2026-08-01",
    consolidationEnabled: false }, false);
  const legacy = { ...base, version: 10, projects: [later, unassigned, earlier], groups: [holding] };
  delete legacy.scheduleOrder;

  const migrated = normalizeStore(legacy);
  assert.deepEqual(migrated.scheduleOrder, [
    `project:${earlier.id}`, `project:${later.id}`, `group:${holding.id}`, `project:${unassigned.id}`,
  ]);
});

test("updating a company within the same holding company preserves member order", () => {
  const base = emptyStore();
  const first = makeProject({ ...projectValues, entity: "First Limited" }, false);
  const second = makeProject({ ...projectValues, entity: "Second Limited" }, false);
  const holding = makeGroup({ name: "Holding", consolidationEnabled: false }, false, base.groupSamples[0]);
  holding.members.push(
    makeGroupMember({ kind: "project", refId: first.id, role: "First" }, base.groupSamples[0]),
    makeGroupMember({ kind: "project", refId: second.id, role: "Second" }, base.groupSamples[0]),
  );
  const store = { ...base, projects: [first, second], groups: [holding] };
  const beforeIds = holding.members.map((member) => member.id);

  const unchanged = assignProjectToGroup(store, first.id,
    { groupId: holding.id, role: "First", auditType: "internal_team" }, base.groupSamples[0]);
  assert.equal(unchanged.groups[0], holding);
  const updated = assignProjectToGroup(store, first.id,
    { groupId: holding.id, role: "Parent", auditType: "internal_team" }, base.groupSamples[0]);
  assert.deepEqual(updated.groups[0].members.map((member) => member.id), beforeIds);
  assert.equal(updated.groups[0].members[0].role, "Parent");
});

test("a standalone company can move directly to an expanded middle holding-company level", () => {
  const groupSample = createDefaultGroupSample();
  const project = makeProject(projectValues, true);
  const root = makeGroup({ name: "Root Holding", consolidationEnabled: false }, false, groupSample);
  const middle = makeGroup({ name: "Middle Holding", consolidationEnabled: false }, false, groupSample);
  const leaf = makeGroup({ name: "Leaf Holding", consolidationEnabled: false }, false, groupSample);
  root.members.push(makeGroupMember({ kind: "group", refId: middle.id }, groupSample));
  middle.members.push(makeGroupMember({ kind: "group", refId: leaf.id }, groupSample));
  const store = { projects: [project], groups: [root, middle, leaf] };

  const moved = moveWorkspaceItem(store, "project", project.id, middle.id, groupSample);
  const middleAfterMove = moved.groups.find((group) => group.id === middle.id);
  assert.equal(findParentMembership(moved, "project", project.id).group.id, middle.id);
  assert.equal(middleAfterMove.members.some((member) => member.kind === "group" && member.refId === leaf.id), true);
  assert.equal(middleAfterMove.members.some((member) => member.kind === "project" && member.refId === project.id), true);
});

test("navigation rejects archived records and group hierarchy cycles", () => {
  const groupSample = createDefaultGroupSample();
  const child = makeGroup({ name: "Child", consolidationEnabled: false }, false, groupSample);
  const parent = makeGroup({ name: "Parent", consolidationEnabled: false }, false, groupSample);
  parent.members.push(makeGroupMember({ kind: "group", refId: child.id }, groupSample));
  const project = makeProject(projectValues, false);
  project.archived = true;
  const store = { projects: [project], groups: [parent, child] };

  assert.equal(canMoveWorkspaceItem(store, "group", parent.id, child.id), false);
  assert.equal(moveWorkspaceItem(store, "group", parent.id, child.id, groupSample), store);
  assert.equal(canMoveWorkspaceItem(store, "project", project.id, parent.id), false);
});

test("reporting periods use start and end dates while custom frameworks and legacy period text are preserved", () => {
  const project = makeProject({ ...projectValues, period: "", periodStart: "2025-01-15", periodEnd: "2025-03-31" }, false);
  assert.equal(project.periodStart, "2025-01-15");
  assert.equal(project.periodEnd, "2025-03-31");
  assert.match(reportingPeriodLabel(project, "en"), /15 Jan 2025.*31 Mar 2025/u);

  const legacy = makeProject({ ...projectValues, periodStart: "", periodEnd: "" }, false);
  const migrated = normalizeStore({ version: 6, projects: [legacy], groups: [] });
  assert.equal(migrated.version, STORE_VERSION);
  assert.equal(migrated.projects[0].period, projectValues.period);
  assert.equal(migrated.projects[0].periodStart, "");
  assert.equal(migrated.projects[0].periodEnd, "");
  assert.equal(migrated.projects[0].startDate, projectValues.startDate);
  assert.equal(reportingPeriodLabel(migrated.projects[0], "en"), projectValues.period);
  assert.equal(migrated.projects[0].reportingFramework, "HKFRS Accounting Standards");

  const versionSevenProject = { ...legacy };
  delete versionSevenProject.startDate;
  const scheduleMigrated = normalizeStore({ version: 7, projects: [versionSevenProject], groups: [] });
  assert.equal(scheduleMigrated.projects[0].startDate, "");

  const customFramework = makeProject({ ...projectValues, reportingFramework: "  Contractual reporting basis  " }, false);
  assert.equal(customFramework.reportingFramework, "Contractual reporting basis");
});

test("company records can convert to holding companies and back without losing workflow progress", () => {
  const base = emptyStore();
  const groupSample = createDefaultGroupSample();
  const project = makeProject(projectValues, true, base.samples, base.workstreamCategories);
  project.workstreams[0].nodes[0].conditions[0].done = true;
  project.outstandingItems.push(makeOutstandingItem({ title: "Waiting for signature", workstreamId: project.workstreams[0].id },
    base.outstandingStatuses));
  project.taxDeadlines.push(makeTaxDeadline({ category: "profits_tax_filing", taxYear: "2025/26",
    dueDate: "2026-11-16", linkedWorkstreamId: project.workstreams[0].id,
    revisions: [{ fromDueDate: "2026-10-16", toDueDate: "2026-11-16", reason: "Extension approved",
      changedAt: "2026-09-01T00:00:00.000Z" }] }));
  const parent = makeGroup({ name: "Parent Holding", consolidationEnabled: false }, false, groupSample);
  parent.members.push(makeGroupMember({ kind: "project", refId: project.id, role: "Subsidiary" }, groupSample));
  const store = { ...base, projects: [project], groups: [parent] };

  const asGroup = convertProjectToGroup(store, project.id, groupSample);
  const convertedGroup = asGroup.groups.find((item) => item.id === project.id);
  assert.equal(asGroup.projects.some((item) => item.id === project.id), false);
  assert.equal(convertedGroup.name, project.entity);
  assert.equal(convertedGroup.outstandingItems[0].workstreamId, null);
  assert.equal(convertedGroup.taxDeadlines[0].dueDate, "2026-11-16");
  assert.equal(convertedGroup.taxDeadlines[0].linkedWorkstreamId, null);
  assert.equal(convertedGroup.taxDeadlines[0].revisions.length, 1);
  assert.equal(convertedGroup.startDate, project.startDate);
  assert.equal(convertedGroup.conversionState.project.workstreams[0].nodes[0].conditions[0].done, true);
  assert.equal(findParentMembership(asGroup, "group", project.id).member.role, "Subsidiary");

  const child = makeProject({ ...projectValues, name: "Detached Child" }, false);
  convertedGroup.members.push(makeGroupMember({ kind: "project", refId: child.id }, groupSample));
  const roundTrip = convertGroupToProject({ ...asGroup, projects: [child] }, project.id, groupSample);
  const restored = roundTrip.projects.find((item) => item.id === project.id);
  assert.equal(roundTrip.groups.some((item) => item.id === project.id), false);
  assert.equal(restored.entity, project.entity);
  assert.equal(restored.startDate, project.startDate);
  assert.equal(restored.workstreams[0].nodes[0].conditions[0].done, true);
  assert.equal(restored.taxDeadlines[0].dueDate, "2026-11-16");
  assert.equal(restored.taxDeadlines[0].revisions[0].reason, "Extension approved");
  assert.equal(findParentMembership(roundTrip, "project", project.id).member.role, "Subsidiary");
  assert.equal(findParentMembership(roundTrip, "project", child.id), null);

  const reloaded = normalizeStore(roundTrip);
  assert.equal(reloaded.projects.find((item) => item.id === project.id).conversionState.group.consolidationEnabled, true);
});

test("holding-company tax roll-up traverses multiple levels, excludes archives and de-duplicates references", () => {
  const base = emptyStore();
  const project = makeProject({ ...projectValues, entity: "Leaf Limited" }, false);
  project.taxDeadlines.push(makeTaxDeadline({ category: "tax_payment", dueDate: "2026-09-30" }));
  const archived = makeProject({ ...projectValues, entity: "Archived Limited" }, false);
  archived.archived = true;
  archived.taxDeadlines.push(makeTaxDeadline({ category: "employers_return", dueDate: "2026-10-02" }));
  const child = makeGroup({ name: "Intermediate Holding", consolidationEnabled: false }, false, base.groupSamples[0]);
  child.taxDeadlines.push(makeTaxDeadline({ category: "profits_tax_filing", dueDate: "2026-11-01" }));
  child.members.push(makeGroupMember({ kind: "project", refId: project.id }, base.groupSamples[0]));
  child.members.push(makeGroupMember({ kind: "project", refId: archived.id }, base.groupSamples[0]));
  const root = makeGroup({ name: "Root Holding", consolidationEnabled: false }, false, base.groupSamples[0]);
  root.members.push(makeGroupMember({ kind: "group", refId: child.id }, base.groupSamples[0]));
  root.members.push(makeGroupMember({ kind: "project", refId: project.id }, base.groupSamples[0]));
  const store = { ...base, projects: [project, archived], groups: [root, child] };

  const active = collectGroupTaxDeadlineEntries(store, root.id);
  assert.deepEqual(active.map((entry) => entry.sourceName), ["Intermediate Holding", "Leaf Limited"]);
  assert.equal(active.filter((entry) => entry.sourceId === project.id).length, 1);
  const historical = collectGroupTaxDeadlineEntries(store, root.id, new Set(), 0, true);
  assert.equal(historical.some((entry) => entry.sourceId === archived.id), true);
});

test("navigation status counts include companies and holding companies", () => {
  const activeProject = makeProject(projectValues, false);
  const completedProject = makeProject({ ...projectValues, name: "Completed" }, true);
  completedProject.workstreams.flatMap((workstream) => workstream.nodes)
    .flatMap((node) => node.conditions).forEach((condition) => { condition.done = true; });
  const archivedGroup = makeGroup({ name: "Archived Holding", consolidationEnabled: false }, false);
  archivedGroup.archived = true;
  const activeGroup = makeGroup({ name: "Active Holding", consolidationEnabled: true }, false);
  const counts = navigationStatusCounts({ projects: [activeProject, completedProject], groups: [activeGroup, archivedGroup] });

  assert.deepEqual(counts, { active: 2, completed: 1, all: 3, archived: 1 });
});

test("deadline alerts include active overdue records and distinct workstream deadlines only", () => {
  const overdueProject = makeProject({ ...projectValues, name: "Overdue", entity: "Overdue Limited",
    owner: "Alex", dueDate: "2026-08-20" }, true);
  overdueProject.workstreams[0].dueDate = "2026-08-25";
  const futureProject = makeProject({ ...projectValues, name: "Future", dueDate: "2026-09-20" }, true);
  const completedProject = makeProject({ ...projectValues, name: "Completed", dueDate: "2026-08-15" }, true);
  completedProject.workstreams.flatMap((workstream) => workstream.nodes)
    .flatMap((node) => node.conditions).forEach((condition) => { condition.done = true; });
  const archivedProject = makeProject({ ...projectValues, name: "Archived", dueDate: "2026-08-10" }, true);
  archivedProject.archived = true;
  const group = makeGroup({ name: "Overdue Holding", owner: "Morgan", dueDate: "2026-08-01",
    consolidationEnabled: true }, false);
  const alerts = deadlineAlerts({ projects: [overdueProject, futureProject, completedProject, archivedProject], groups: [group] },
    new Date("2026-09-03T09:00:00"));

  assert.deepEqual(alerts.map((alert) => alert.id), [
    `group:${group.id}`,
    `project:${overdueProject.id}`,
    `workstream:${overdueProject.id}:${overdueProject.workstreams[0].id}`,
  ]);
  assert.deepEqual(alerts.map((alert) => alert.daysOverdue), [33, 14, 9]);
  assert.equal(alerts[1].recordName, "Overdue Limited");
  assert.equal(alerts[2].owner, "Alex");
});

test("tax alerts survive project completion, use the reminder window and never duplicate holding roll-ups", () => {
  const base = emptyStore();
  const completed = makeProject({ ...projectValues, name: "Completed", entity: "Completed Limited" }, true);
  completed.workstreams.flatMap((workstream) => workstream.nodes)
    .flatMap((node) => node.conditions).forEach((condition) => { condition.done = true; });
  const deadline = makeTaxDeadline({ category: "profits_tax_filing", dueDate: "2026-09-20", reminderDays: 30 });
  completed.taxDeadlines.push(deadline);
  const archived = makeProject({ ...projectValues, name: "Archived" }, false);
  archived.archived = true;
  archived.taxDeadlines.push(makeTaxDeadline({ dueDate: "2026-09-01" }));
  const holding = makeGroup({ name: "Parent Holding", consolidationEnabled: false }, false, base.groupSamples[0]);
  holding.members.push(makeGroupMember({ kind: "project", refId: completed.id }, base.groupSamples[0]));
  holding.taxDeadlines.push(makeTaxDeadline({ category: "tax_payment", dueDate: "2026-09-03" }));
  holding.taxDeadlines.push(makeTaxDeadline({ category: "employers_return", dueDate: "2026-09-02", state: "completed" }));

  const alerts = deadlineAlerts({ projects: [completed, archived], groups: [holding] }, new Date(2026, 8, 3, 9));
  const taxAlerts = alerts.filter((alert) => alert.scope === "tax");

  assert.equal(projectStats(completed).complete, true);
  assert.deepEqual(taxAlerts.map((alert) => alert.id), [
    `tax:group:${holding.id}:${holding.taxDeadlines[0].id}`,
    `tax:project:${completed.id}:${deadline.id}`,
  ]);
  assert.deepEqual(taxAlerts.map((alert) => alert.urgency), ["due_today", "due_soon"]);
  assert.equal(taxAlerts.filter((alert) => alert.targetId === completed.id).length, 1);
});

test("V11 fiscal-year helpers generate exact calendar and April-to-March periods", () => {
  assert.deepEqual(fiscalPeriodForYear("calendar", 2024), {
    periodPreset: "calendar", periodStart: "2024-01-01", periodEnd: "2024-12-31",
  });
  assert.deepEqual(fiscalPeriodForYear("apr_mar", 2024), {
    periodPreset: "apr_mar", periodStart: "2024-04-01", periodEnd: "2025-03-31",
  });
  assert.equal(inferPeriodPreset("2024-01-01", "2024-12-31"), "calendar");
  assert.equal(inferPeriodPreset("2024-04-01", "2025-03-31"), "apr_mar");
  assert.equal(inferPeriodPreset("2024-02-29", "2024-09-30"), "custom");
  assert.equal(fiscalPeriodShortLabel({ periodPreset: "calendar", periodStart: "2024-01-01", periodEnd: "2024-12-31" }), "FY2024");
  assert.equal(fiscalPeriodShortLabel({ periodPreset: "apr_mar", periodStart: "2024-04-01", periodEnd: "2025-03-31" }), "FY2024/25");
});

test("DOI reporting periods end at the first applicable company year end", () => {
  assert.deepEqual(fiscalPeriodFromIncorporation({ incorporationDate: "2025-07-10", fiscalYearPreset: "calendar" }), {
    periodPreset: "doi_year_end", periodStart: "2025-07-10", periodEnd: "2025-12-31",
  });
  assert.deepEqual(fiscalPeriodFromIncorporation({ incorporationDate: "2025-02-10", fiscalYearPreset: "apr_mar" }), {
    periodPreset: "doi_year_end", periodStart: "2025-02-10", periodEnd: "2025-03-31",
  });
  assert.deepEqual(fiscalPeriodFromIncorporation({ incorporationDate: "2025-04-01", fiscalYearPreset: "apr_mar" }), {
    periodPreset: "doi_year_end", periodStart: "2025-04-01", periodEnd: "2026-03-31",
  });
  assert.deepEqual(fiscalPeriodFromIncorporation({ incorporationDate: "2025-04-01", fiscalYearPreset: "custom" }), {
    periodPreset: "doi_year_end", periodStart: "2025-04-01", periodEnd: "",
  });
  assert.equal(suggestNextFiscalYear({ id: "calendar-entity", fiscalYearPreset: "calendar" }, [{
    entityId: "calendar-entity", periodPreset: "doi_year_end", periodStart: "2026-04-18", periodEnd: "2026-12-31",
  }]), 2027);
  assert.equal(suggestNextFiscalYear({ id: "march-entity", fiscalYearPreset: "apr_mar" }, [{
    entityId: "march-entity", periodPreset: "doi_year_end", periodStart: "2025-02-10", periodEnd: "2025-03-31",
  }]), 2025);
});

test("formal period labels show a year-end date for full years and DOI wording for first periods", () => {
  assert.equal(formalReportingPeriodLabel({ periodPreset: "calendar", periodStart: "2025-01-01", periodEnd: "2025-12-31" }, "en"),
    "December 31, 2025");
  assert.equal(formalReportingPeriodLabel({ periodPreset: "doi_year_end", periodStart: "2025-04-01", periodEnd: "2025-12-31" }, "en"),
    "For the period from April 1, 2025 (DOI) to December 31, 2025");
  assert.equal(formalReportingPeriodLabel({ periodPreset: "doi_year_end", periodStart: "2025-04-01", periodEnd: "2025-12-31" }, "zh-Hant"),
    "期間：2025年4月1日（DOI）至2025年12月31日");
  assert.equal(formalReportingPeriodLabel({ periodPreset: "custom", periodStart: "2025-07-01", periodEnd: "2025-12-31" }, "en"),
    "For the period from July 1, 2025 to December 31, 2025");
  assert.equal(yearEndOrPeriodLabel({ periodPreset: "calendar", periodStart: "2025-01-01", periodEnd: "2025-12-31" }, "en"),
    "YE December 31, 2025");
  assert.equal(yearEndOrPeriodLabel({ periodPreset: "doi_year_end", periodStart: "2025-04-01", periodEnd: "2025-12-31" }, "en"),
    "For the period from April 1, 2025 (DOI) to December 31, 2025");
});

test("engagement types are preserved, inferred for legacy records and localised without changing custom text", () => {
  const store = emptyStore();
  const entity = makeEntity({ legalName: "Type Limited" });
  const bookkeeping = makeEngagement({ entityId: entity.id, engagementType: "Bookkeeping",
    periodStart: "2025-01-01", periodEnd: "2025-12-31" }, {
    entity, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
    outstandingStatuses: store.outstandingStatuses,
  });
  assert.equal(bookkeeping.engagementType, "Bookkeeping");
  assert.equal(engagementTypeLabel(bookkeeping.engagementType, "zh-Hant"), "賬務處理");
  assert.equal(engagementTypeLabel("Marine compliance", "zh-Hant"), "Marine compliance");
  const legacy = normalizeStore({ ...store, projects: undefined, groups: undefined, entities: [entity], engagements: [{ ...bookkeeping,
    engagementType: undefined, workstreams: [makeWorkstream({ type: "audit" }, [])] }] });
  assert.equal(legacy.engagements[0].engagementType, "Audit");
});

test("workstream reordering supports before and after positions without mutating the source", () => {
  const workstreams = ["audit", "tax", "bookkeeping"].map((id) => ({ id }));
  const reordered = reorderWorkstreams(workstreams, "bookkeeping", "audit", "before");
  assert.deepEqual(reordered.map((item) => item.id), ["bookkeeping", "audit", "tax"]);
  assert.deepEqual(workstreams.map((item) => item.id), ["audit", "tax", "bookkeeping"]);
  assert.deepEqual(reorderWorkstreams(workstreams, "audit", "tax", "after").map((item) => item.id),
    ["tax", "audit", "bookkeeping"]);
  assert.equal(reorderWorkstreams(workstreams, "missing", "tax"), workstreams);
});

test("built-in workflows use a small number of milestone completion gates", () => {
  const audit = createDefaultSample("en");
  const group = createDefaultGroupSample("en");
  for (const node of [...audit.nodes, ...group.nodes]) {
    assert.ok(node.conditions.length >= 1 && node.conditions.length <= 2, `${node.title} should have one or two milestone gates`);
  }
  for (const conditions of Object.values(group.readinessTemplates)) {
    assert.ok(conditions.length >= 1 && conditions.length <= 2);
  }
});

test("V10 records migrate losslessly into separate V11 entities and engagements without name merging", () => {
  const base = emptyStore();
  const first = makeProject({ ...projectValues, name: "FY2023", entity: "Repeat Limited",
    periodStart: "2023-01-01", periodEnd: "2023-12-31" }, true, base.samples, base.workstreamCategories);
  const second = makeProject({ ...projectValues, name: "FY2024", entity: "Repeat Limited",
    periodStart: "2024-04-01", periodEnd: "2025-03-31" }, false, base.samples, base.workstreamCategories);
  const holding = makeGroup({ name: "Parent Limited", periodStart: "2024-04-01", periodEnd: "2025-03-31",
    consolidationEnabled: false }, false, base.groupSamples[0]);
  holding.members.push(makeGroupMember({ kind: "project", refId: second.id, role: "Subsidiary" }, base.groupSamples[0]));
  const migrated = normalizeStore({ ...base, version: 10, entities: undefined, engagements: undefined,
    projects: [first, second], groups: [holding] });

  assert.equal(migrated.version, 11);
  assert.equal(migrated.entities.length, 3);
  assert.equal(migrated.entities.filter((entity) => entity.legalName === "Repeat Limited").length, 2);
  assert.equal(migrated.engagements.length, 3);
  assert.equal(migrated.engagements.find((item) => item.id === first.id).periodPreset, "calendar");
  assert.equal(migrated.engagements.find((item) => item.id === second.id).periodPreset, "apr_mar");
  const childEntity = migrated.entities.find((entity) => entity.id === migrated.engagements.find((item) => item.id === second.id).entityId);
  const parentEntity = migrated.entities.find((entity) => entity.id === migrated.engagements.find((item) => item.id === holding.id).entityId);
  assert.equal(childEntity.parentEntityId, parentEntity.id);
  assert.equal(childEntity.relationshipRole, "Subsidiary");
  assert.equal(migrated.engagements.find((item) => item.id === holding.id).consolidation.components[0].engagementId, second.id);
});

test("one company supports three annual engagements and rejects an identical period including archived records", () => {
  const store = emptyStore();
  const entity = makeEntity({ legalName: "Three Years Limited", fiscalYearPreset: "calendar" });
  store.entities.push(entity);
  const first = makeEngagement({ entityId: entity.id, periodStart: "2023-01-01", periodEnd: "2023-12-31",
    periodPreset: "calendar" }, { entity, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
    outstandingStatuses: store.outstandingStatuses });
  store.engagements.push(first);
  const second = makeEngagement({ entityId: entity.id, periodStart: "2024-01-01", periodEnd: "2024-12-31",
    periodPreset: "calendar" }, { entity, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
    outstandingStatuses: store.outstandingStatuses });
  store.engagements.push(second);
  const third = makeEngagement({ entityId: entity.id, periodStart: "2025-01-01", periodEnd: "2025-12-31",
    periodPreset: "calendar" }, { entity, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
    outstandingStatuses: store.outstandingStatuses });
  store.engagements.push({ ...third, archived: true });

  assert.equal(engagementsForEntity(store, entity.id).length, 3);
  assert.equal(suggestNextFiscalYear(entity, store.engagements), 2026);
  assert.equal(engagementPeriodExists(store, entity.id, "2025-01-01", "2025-12-31"), true);
  assert.throws(() => makeEngagement({ entityId: entity.id, periodStart: "2025-01-01", periodEnd: "2025-12-31" },
    { entity, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
      outstandingStatuses: store.outstandingStatuses }), /already exists/u);
});

test("new-year copy keeps structure and framework while clearing owners dates status and outstanding items", () => {
  const store = emptyStore();
  const entity = makeEntity({ legalName: "Carry Forward Limited" });
  const source = makeEngagement({ entityId: entity.id, periodStart: "2024-01-01", periodEnd: "2024-12-31",
    engagementType: "Bookkeeping", reportingFramework: "HKFRS Accounting Standards",
    workstreamSelections: [{ type: "audit", categoryId: "audit" }] },
  { entity, store, sourceMode: "template", samples: store.samples, workstreamCategories: store.workstreamCategories,
    outstandingStatuses: store.outstandingStatuses });
  source.owner = "Old owner";
  source.startDate = "2025-01-10";
  source.dueDate = "2025-03-31";
  source.workstreams[0].owner = "Old in-charge";
  source.workstreams[0].dueDate = "2025-03-01";
  source.workstreams[0].nodes[0].conditions[0].done = true;
  source.outstandingItems.push(makeOutstandingItem({ title: "Old request" }, store.outstandingStatuses));
  const copied = makeEngagement({ entityId: entity.id, periodStart: "2025-01-01", periodEnd: "2025-12-31" }, {
    entity, store, sourceMode: "previous", sourceEngagement: source,
    workstreamCategories: store.workstreamCategories, outstandingStatuses: store.outstandingStatuses,
  });

  assert.equal(copied.reportingFramework, "HKFRS Accounting Standards");
  assert.equal(copied.engagementType, "Bookkeeping");
  assert.equal(copied.owner, "");
  assert.equal(copied.startDate, "");
  assert.equal(copied.dueDate, "");
  assert.equal(copied.outstandingItems.length, 0);
  assert.equal(copied.workstreams[0].owner, "");
  assert.equal(copied.workstreams[0].dueDate, "");
  assert.equal(copied.workstreams[0].nodes[0].conditions[0].done, false);
});

test("holding-company annual components freeze history, match exact periods and update only after explicit sync", () => {
  let store = emptyStore();
  const root = makeEntity({ legalName: "Root Holdings", kind: "holding_company", fiscalYearPreset: "calendar" });
  const middle = makeEntity({ legalName: "Middle Holdings", kind: "holding_company", parentEntityId: root.id,
    relationshipRole: "Intermediate holding company" });
  const leaf = makeEntity({ legalName: "Leaf Limited", parentEntityId: middle.id, relationshipRole: "Subsidiary" });
  store = reconcileWorkbenchStore(store, { ...store, entities: [root, middle, leaf],
    entityOrder: [root.id, middle.id, leaf.id] });
  const leaf2025 = makeEngagement({ entityId: leaf.id, periodStart: "2025-01-01", periodEnd: "2025-12-31" },
    { entity: leaf, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
      outstandingStatuses: store.outstandingStatuses });
  const middle2025 = makeEngagement({ entityId: middle.id, periodStart: "2025-01-01", periodEnd: "2025-12-31" },
    { entity: middle, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
      outstandingStatuses: store.outstandingStatuses });
  store = reconcileWorkbenchStore(store, { ...store, engagements: [leaf2025, { ...middle2025, consolidation: {
    ...middle2025.consolidation,
    components: componentsForCurrentStructure({ ...store, engagements: [leaf2025] }, middle.id,
      "2025-01-01", "2025-12-31", store.groupSamples[0]),
  } }] });
  assert.equal(store.engagements.find((item) => item.id === middle2025.id).consolidation.components[0].engagementId, leaf2025.id);

  const beforeMove = structuredClone(store.engagements.find((item) => item.id === middle2025.id).consolidation.components);
  store = moveEntity(store, leaf.id, root.id);
  assert.deepEqual(store.engagements.find((item) => item.id === middle2025.id).consolidation.components, beforeMove);
  store = syncEngagementToCurrentStructure(store, middle2025.id, store.groupSamples[0]);
  assert.equal(store.engagements.find((item) => item.id === middle2025.id).consolidation.components.length, 0);

  const root2025 = makeEngagement({ entityId: root.id, periodStart: "2025-01-01", periodEnd: "2025-12-31" },
    { entity: root, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
      outstandingStatuses: store.outstandingStatuses });
  const rootComponents = componentsForCurrentStructure(store, root.id, "2025-01-01", "2025-12-31", store.groupSamples[0]);
  assert.equal(rootComponents.find((component) => component.entityId === leaf.id).engagementId, leaf2025.id);
  assert.equal(rootComponents.find((component) => component.entityId === middle.id).engagementId, middle2025.id);
});

test("unmatched holding components remain explicit and duplicate-company merge is preview-safe", () => {
  let store = emptyStore();
  const holding = makeEntity({ legalName: "Holding", kind: "holding_company" });
  const source = makeEntity({ legalName: "Duplicate Limited", parentEntityId: holding.id,
    taxDeadlines: [makeTaxDeadline({ dueDate: "2026-11-01" })] });
  const target = makeEntity({ legalName: "Duplicate Limited" });
  store = reconcileWorkbenchStore(store, { ...store, entities: [holding, source, target] });
  const sourceYear = makeEngagement({ entityId: source.id, periodStart: "2024-01-01", periodEnd: "2024-12-31" },
    { entity: source, store, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
      outstandingStatuses: store.outstandingStatuses });
  store = reconcileWorkbenchStore(store, { ...store, engagements: [sourceYear] });
  const unmatched = componentsForCurrentStructure(store, holding.id, "2025-01-01", "2025-12-31", store.groupSamples[0]);
  assert.equal(unmatched[0].engagementId, null);
  assert.equal(unmatched[0].entitySnapshot.legalName, "Duplicate Limited");

  const merged = mergeEntities(store, source.id, target.id);
  assert.equal(merged.entities.some((entity) => entity.id === source.id), false);
  assert.equal(merged.engagements.find((engagement) => engagement.id === sourceYear.id).entityId, target.id);
  assert.equal(merged.entities.find((entity) => entity.id === target.id).taxDeadlines.length, 1);

  const conflict = makeEngagement({ entityId: source.id, periodStart: "2024-01-01", periodEnd: "2024-12-31" },
    { entity: source, store: { ...store, engagements: [] }, sourceMode: "blank", workstreamCategories: store.workstreamCategories,
      outstandingStatuses: store.outstandingStatuses });
  const targetConflict = { ...conflict, id: "target-conflict", entityId: target.id };
  assert.throws(() => mergeEntities(reconcileWorkbenchStore(store, { ...store,
    engagements: [conflict, targetConflict] }), source.id, target.id),
    /duplicate reporting periods/u);
});

test("company masters without annual engagements count as active navigation records", () => {
  const base = emptyStore();
  const store = reconcileWorkbenchStore(base, { ...base, entities: [makeEntity({ legalName: "Empty Limited" })], engagements: [] });
  assert.deepEqual(navigationStatusCounts(store), { active: 1, completed: 0, all: 1, archived: 0 });
});
