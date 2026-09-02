import test from "node:test";
import assert from "node:assert/strict";
import {
  STORE_VERSION,
  createDefaultSample,
  makeOutstandingItem,
  makeProject,
  nodeIsComplete,
  normalizeStore,
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
  assert.ok(migrated.sample.nodes.length > 0);
});
