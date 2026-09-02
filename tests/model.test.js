import test from "node:test";
import assert from "node:assert/strict";
import {
  CORE_SAMPLE_KEY,
  CORE_GROUP_SAMPLE_KEY,
  STORE_VERSION,
  activeOutstandingItems,
  canNestGroup,
  collectGroupOutstandingEntries,
  createDefaultGroupSample,
  createDefaultSample,
  createDefaultOutstandingStatuses,
  duplicateSample,
  groupProgress,
  localizeGroupSample,
  localizeOutstandingStatuses,
  localizeSample,
  localizeWorkflowNodes,
  makeGroup,
  makeGroupMember,
  makeOutstandingItem,
  makeProject,
  makeWorkstream,
  memberProgressPercentage,
  nodeIsComplete,
  normalizeStore,
  outstandingIsOpen,
  projectIsComplete,
  projectStats,
  redactSampleCompanies,
  workstreamStats,
} from "../src/dashboard/model.js";

const projectValues = {
  name: "[Company Name] FY2025 Audit",
  entity: "[Company Name] Limited",
  period: "Year ended 31 March 2025",
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
  assert.equal(migrated.selectedSampleIdsByType.audit,
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
  assert.equal(migrated.samples.length, 4);
  const auditSample = migrated.samples.find((sample) => sample.workstreamType === "audit");
  assert.equal(auditSample.builtinKey, CORE_SAMPLE_KEY);
  assert.equal(migrated.selectedSampleIdsByType.audit, auditSample.id);
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
  assert.equal(englishNodes[0].conditions.length, 3);
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

test("the built-in Group Sample localises all workflow and readiness text", () => {
  const english = localizeGroupSample(createDefaultGroupSample(), "en");
  assert.equal(english.name, "Group Consolidation Workflow");
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
