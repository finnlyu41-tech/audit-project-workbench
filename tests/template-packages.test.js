import assert from "node:assert/strict";
import test from "node:test";
import {
  STORE_VERSION,
  emptyStore,
  makeGroup,
  makeGroupMember,
  makeOutstandingItem,
  makeProject,
  makeTaxDeadline,
  normalizeStore,
} from "../src/dashboard/model.js";
import {
  TEMPLATE_PACKAGE_KIND,
  TemplatePackageError,
  applyTemplatePackage,
  createTemplatePackage,
  parseTemplatePackage,
  templatePackagePreview,
} from "../src/dashboard/template-packages.js";

const projectValues = {
  name: "Internal 2026",
  entity: "Example Entity Limited",
  periodStart: "2026-01-01",
  periodEnd: "2026-12-31",
  startDate: "2026-02-01",
  dueDate: "2026-06-30",
  owner: "Engagement owner",
};

test("version 9 migrates template metadata to V10 without changing project progress or holding relationships", () => {
  const base = emptyStore();
  const project = makeProject(projectValues, true, base.samples, base.workstreamCategories);
  project.workstreams[0].nodes[0].conditions[0].done = true;
  const group = makeGroup({ name: "Example Holdings", consolidationEnabled: false });
  group.members = [makeGroupMember({ kind: "project", refId: project.id })];
  const legacy = JSON.parse(JSON.stringify({ ...base, version: 9, projects: [project], groups: [group] }));
  for (const template of [...legacy.samples, ...legacy.groupSamples]) {
    delete template.templateKey;
    delete template.sourceTemplateKey;
    delete template.tags;
    delete template.versionNote;
    delete template.createdAt;
    delete template.updatedAt;
  }

  const migrated = normalizeStore(legacy);
  assert.equal(migrated.version, STORE_VERSION);
  assert.equal(migrated.projects[0].workstreams[0].nodes[0].conditions[0].done, true);
  assert.equal(migrated.groups[0].members[0].refId, project.id);
  assert.ok(migrated.samples.every((template) => template.templateKey && template.createdAt && template.updatedAt));
  assert.ok(migrated.groupSamples.every((template) => template.templateKey && Array.isArray(template.tags)));
});

test("template exports contain portable workflow content and exclude workspace records", () => {
  const store = emptyStore();
  const project = makeProject({ ...projectValues, owner: "SECRET OWNER" }, true, store.samples, store.workstreamCategories);
  project.outstandingItems = [makeOutstandingItem({ title: "SECRET OUTSTANDING", note: "SECRET NOTE" }, store.outstandingStatuses)];
  project.taxDeadlines = [makeTaxDeadline({ category: "tax_payment", dueDate: "2026-09-30", reference: "SECRET REF" })];
  store.projects.push(project);

  const pkg = createTemplatePackage(store, { sampleIds: [store.samples[0].id], groupSampleIds: [store.groupSamples[0].id] },
    "2026-09-03T00:00:00.000Z");
  const text = JSON.stringify(pkg);
  assert.equal(pkg.kind, TEMPLATE_PACKAGE_KIND);
  assert.equal(pkg.templates.length, 2);
  for (const forbidden of ["entities", "engagements", "entityOrder", "scheduleOrder", "projects", "groups",
    "outstandingStatuses", "taxDeadlines", "workstreams", "SECRET"]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(parseTemplatePackage(text), pkg);
});

test("package validation rejects workspace data, duplicate identities and partial writes", () => {
  const store = emptyStore();
  const pkg = createTemplatePackage(store, { sampleIds: [store.samples[0].id] });
  assert.throws(() => parseTemplatePackage({ ...pkg, projects: [] }), (error) =>
    error instanceof TemplatePackageError && error.code === "contains_workspace_data");
  assert.throws(() => parseTemplatePackage({ ...pkg, entities: [] }), (error) =>
    error instanceof TemplatePackageError && error.code === "contains_workspace_data");
  assert.throws(() => parseTemplatePackage({ ...pkg, templates: [...pkg.templates, pkg.templates[0]] }), (error) =>
    error instanceof TemplatePackageError && error.code === "duplicate_template");

  const before = JSON.stringify(store);
  assert.throws(() => applyTemplatePackage(store, pkg, {
    [pkg.templates[0].templateKey]: { action: "replace", targetId: "missing-template" },
  }), (error) => error instanceof TemplatePackageError && error.code === "invalid_replace_target");
  assert.equal(JSON.stringify(store), before);
});

test("custom categories match by name or are created during import", () => {
  const source = emptyStore();
  const sample = { ...source.samples[0], id: "specialist-template", templateKey: "firm:specialist-audit", categoryId: "specialist",
    workstreamType: "custom", builtinKey: undefined, name: "Specialist audit", tags: ["specialist", "annual"], versionNote: "2026 refresh" };
  source.workstreamCategories.push({ id: "specialist", name: "Specialist" });
  source.samples.push(sample);
  const pkg = createTemplatePackage(source, { sampleIds: [sample.id] });

  const exactTarget = emptyStore();
  exactTarget.workstreamCategories.push({ id: "existing-specialist", name: "specialist" });
  const exactPreview = templatePackagePreview(exactTarget, pkg);
  assert.equal(exactPreview.items[0].suggestedCategoryId, "existing-specialist");

  const freshTarget = emptyStore();
  const preview = templatePackagePreview(freshTarget, pkg);
  assert.match(preview.items[0].suggestedCategoryId, /^__new__:/u);
  const imported = applyTemplatePackage(freshTarget, pkg);
  const category = imported.workstreamCategories.find((item) => item.name === "Specialist");
  const importedTemplate = imported.samples.find((item) => item.sourceTemplateKey === "firm:specialist-audit");
  assert.ok(category);
  assert.equal(importedTemplate.categoryId, category.id);
  assert.deepEqual(importedTemplate.tags, ["specialist", "annual"]);
  assert.equal(importedTemplate.versionNote, "2026 refresh");
});

test("matching source templates default to a copy and require an explicit target for replacement", () => {
  const source = emptyStore();
  const sourceTemplate = source.samples.find((template) => template.categoryId === "audit");
  const pkg = createTemplatePackage(source, { sampleIds: [sourceTemplate.id] });
  pkg.templates[0].name = "Refreshed audit workflow";
  pkg.templates[0].nodes[0].title = "Refreshed engagement setup";

  const target = emptyStore();
  const original = target.samples.find((template) => template.categoryId === "audit");
  const project = makeProject(projectValues, true, target.samples, target.workstreamCategories);
  target.projects.push(project);
  const projectStageBefore = project.workstreams[0].nodes[0].title;
  const preview = templatePackagePreview(target, pkg);
  assert.equal(preview.items[0].matches[0].id, original.id);

  const copied = applyTemplatePackage(target, pkg);
  assert.equal(copied.samples.length, target.samples.length + 1);
  assert.equal(copied.samples.find((template) => template.id === original.id).name, original.name);

  const replaced = applyTemplatePackage(target, pkg, {
    [pkg.templates[0].templateKey]: { action: "replace", targetId: original.id, categoryId: "audit" },
  });
  assert.equal(replaced.samples.length, target.samples.length);
  assert.equal(replaced.samples.find((template) => template.id === original.id).name, "Refreshed audit workflow");
  assert.equal(replaced.projects[0].workstreams[0].nodes[0].title, projectStageBefore);
});
