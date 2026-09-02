import test from "node:test";
import assert from "node:assert/strict";
import {
  CORE_SAMPLE_KEY,
  STORE_VERSION,
  createDefaultSample,
  createDefaultOutstandingStatuses,
  duplicateSample,
  localizeOutstandingStatuses,
  localizeSample,
  localizeWorkflowNodes,
  makeOutstandingItem,
  makeProject,
  nodeIsComplete,
  normalizeStore,
  outstandingIsOpen,
  projectStats,
  redactSampleCompanies,
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

  assert.equal(project.nodes.length, sample.nodes.length);
  assert.notEqual(project.nodes[0].id, sample.nodes[0].id);
  assert.notEqual(project.nodes[0].conditions[0].id, sample.nodes[0].conditions[0].id);
  assert.equal(projectStats(project).percentage, 0);

  project.nodes[0].conditions.forEach((condition) => { condition.done = true; });
  assert.equal(nodeIsComplete(project.nodes[0]), true);
  assert.equal(sample.nodes[0].conditions.some((condition) => condition.done), false);
});

test("outstanding items do not affect workflow progress", () => {
  const project = makeProject(projectValues, true, createDefaultSample().nodes);
  project.nodes[0].conditions[0].done = true;
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
  const migrated = normalizeStore({
    version: 1,
    projects: [{
      ...makeProject(projectValues, false),
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
  assert.equal(migrated.projects[0].nodes[0].description, "完成主要工作底稿并处理审计调整。");
  assert.deepEqual(migrated.projects[0].nodes[0].conditions.map((condition) => condition.id), ["keep"]);
  assert.ok(migrated.samples[0].nodes.length > 0);
  assert.equal(migrated.selectedSampleId, migrated.samples[0].id);
  assert.equal(migrated.outstandingStatuses.length, 5);
});

test("version 2 single-Sample data migrates into the Sample library", () => {
  const legacySample = createDefaultSample();
  delete legacySample.builtinKey;
  legacySample.description = "固定流程范本";

  const migrated = normalizeStore({ version: 2, projects: [], sample: legacySample });

  assert.equal(migrated.version, STORE_VERSION);
  assert.equal(migrated.samples.length, 1);
  assert.equal(migrated.samples[0].builtinKey, CORE_SAMPLE_KEY);
  assert.equal(migrated.selectedSampleId, migrated.samples[0].id);
  assert.equal("sample" in migrated, false);
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
