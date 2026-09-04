import {
  GROUP_AUDIT_TYPES,
  WORKSTREAM_TYPES,
  makeNode,
  normalizeStore,
  normalizeTemplateTags,
  uid,
} from "./model.js";

export const TEMPLATE_PACKAGE_KIND = "audit-project-workbench-template-package";
export const TEMPLATE_PACKAGE_VERSION = 1;
export const TEMPLATE_PACKAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TEMPLATE_PACKAGE_MAX_TEMPLATES = 200;
export const TEMPLATE_PACKAGE_MAX_NODES = 100;
export const TEMPLATE_PACKAGE_MAX_CONDITIONS = 200;

const TOP_LEVEL_KEYS = new Set(["kind", "version", "exportedAt", "categories", "templates"]);
const TEMPLATE_KEYS = new Set(["kind", "templateKey", "categoryKey", "workstreamType", "name", "description",
  "tags", "versionNote", "nodes", "readinessTemplates"]);
const CATEGORY_KEYS = new Set(["key", "builtinType", "name"]);
const NODE_KEYS = new Set(["title", "description", "conditions"]);
const FORBIDDEN_TOP_LEVEL_KEYS = ["entities", "engagements", "entityOrder", "scheduleOrder", "projects", "groups",
  "outstandingStatuses", "taxDeadlines", "workstreams"];

export class TemplatePackageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TemplatePackageError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new TemplatePackageError(code, message);
}

function assertOnlyKeys(value, allowed, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, "Expected an object.");
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected) fail(code, `Unexpected field: ${unexpected}`);
}

function cleanText(value, { required = false, max = 240, code = "invalid_text" } = {}) {
  if (typeof value !== "string") {
    if (required) fail(code, "A required text field is missing.");
    return "";
  }
  const cleaned = value.trim();
  if (required && !cleaned) fail(code, "A required text field is empty.");
  if (cleaned.length > max) fail(code, "A text field is too long.");
  return cleaned;
}

function cleanConditions(value, code) {
  if (!Array.isArray(value) || value.length > TEMPLATE_PACKAGE_MAX_CONDITIONS) {
    fail(code, "The condition list is invalid or too large.");
  }
  return value.map((condition) => cleanText(condition, { required: true, max: 500, code }));
}

function cleanTags(value, code) {
  if (!Array.isArray(value) || value.length > 12 || value.some((tag) => typeof tag !== "string"
    || !tag.trim() || tag.trim().length > 40)) fail(code, "The template tags are invalid or too large.");
  const normalized = normalizeTemplateTags(value);
  if (normalized.length !== value.length) fail(code, "Template tags must be unique.");
  return normalized;
}

function cleanNodes(value, code) {
  if (!Array.isArray(value) || value.length > TEMPLATE_PACKAGE_MAX_NODES) {
    fail(code, "The stage list is invalid or too large.");
  }
  return value.map((node) => {
    assertOnlyKeys(node, NODE_KEYS, code);
    return {
      title: cleanText(node.title, { required: true, max: 160, code }),
      description: cleanText(node.description, { max: 1000, code }),
      conditions: cleanConditions(node.conditions, code),
    };
  });
}

function portableNodes(nodes = []) {
  return nodes.map((node) => ({
    title: node.title || "",
    description: node.description || "",
    conditions: (node.conditions || []).map((condition) => condition.label || "").filter(Boolean),
  }));
}

function portableTemplate(sample, kind) {
  const shared = {
    kind,
    templateKey: sample.templateKey,
    name: sample.name,
    description: sample.description || "",
    tags: normalizeTemplateTags(sample.tags),
    versionNote: sample.versionNote || "",
    nodes: portableNodes(sample.nodes),
  };
  if (kind === "holding_company") {
    return {
      ...shared,
      readinessTemplates: Object.fromEntries(GROUP_AUDIT_TYPES.map((auditType) => [auditType,
        (sample.readinessTemplates?.[auditType] || []).map((condition) => condition.label || "").filter(Boolean)])),
    };
  }
  return { ...shared, categoryKey: sample.categoryId, workstreamType: sample.workstreamType };
}

export function createTemplatePackage(store, selection = {}, exportedAt = new Date().toISOString()) {
  const sampleIds = new Set(selection.sampleIds || []);
  const groupSampleIds = new Set(selection.groupSampleIds || []);
  const samples = (store.samples || []).filter((sample) => sampleIds.has(sample.id));
  const groupSamples = (store.groupSamples || []).filter((sample) => groupSampleIds.has(sample.id));
  if (!samples.length && !groupSamples.length) fail("empty_selection", "Select at least one template.");

  const categoryIds = new Set(samples.map((sample) => sample.categoryId));
  const categories = (store.workstreamCategories || []).filter((category) => categoryIds.has(category.id)).map((category) => ({
    key: category.id,
    builtinType: category.builtinType || "",
    name: category.name || "",
  }));
  return {
    kind: TEMPLATE_PACKAGE_KIND,
    version: TEMPLATE_PACKAGE_VERSION,
    exportedAt,
    categories,
    templates: [
      ...samples.map((sample) => portableTemplate(sample, "workstream")),
      ...groupSamples.map((sample) => portableTemplate(sample, "holding_company")),
    ],
  };
}

export function parseTemplatePackage(input) {
  let value;
  try { value = typeof input === "string" ? JSON.parse(input) : input; }
  catch { fail("invalid_json", "The file is not valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("invalid_package", "Expected a template package object.");
  }
  if (FORBIDDEN_TOP_LEVEL_KEYS.some((key) => Object.hasOwn(value, key))) {
    fail("contains_workspace_data", "A template package cannot contain workspace records.");
  }
  assertOnlyKeys(value, TOP_LEVEL_KEYS, "invalid_package");
  if (value.kind !== TEMPLATE_PACKAGE_KIND || value.version !== TEMPLATE_PACKAGE_VERSION) {
    fail("unsupported_package", "The template package type or version is unsupported.");
  }
  if (!Array.isArray(value.categories) || !Array.isArray(value.templates) || !value.templates.length
    || value.templates.length > TEMPLATE_PACKAGE_MAX_TEMPLATES) {
    fail("invalid_package", "The template list is empty or too large.");
  }

  const seenCategories = new Set();
  const categories = value.categories.map((category) => {
    assertOnlyKeys(category, CATEGORY_KEYS, "invalid_category");
    const key = cleanText(category.key, { required: true, max: 160, code: "invalid_category" });
    if (seenCategories.has(key)) fail("duplicate_category", "A category key is duplicated.");
    seenCategories.add(key);
    const builtinType = cleanText(category.builtinType, { max: 80, code: "invalid_category" });
    if (builtinType && !WORKSTREAM_TYPES.includes(builtinType)) fail("invalid_category", "A built-in category type is invalid.");
    const name = cleanText(category.name, { max: 160, code: "invalid_category" });
    if (!builtinType && !name) fail("invalid_category", "A custom category needs a name.");
    return { key, builtinType, name };
  });
  const categoryByKey = new Map(categories.map((category) => [category.key, category]));
  const seenTemplates = new Set();
  const templates = value.templates.map((template) => {
    assertOnlyKeys(template, TEMPLATE_KEYS, "invalid_template");
    const kind = template.kind === "holding_company" ? "holding_company"
      : template.kind === "workstream" ? "workstream" : fail("invalid_template", "A template kind is invalid.");
    const templateKey = cleanText(template.templateKey, { required: true, max: 200, code: "invalid_template" });
    if (seenTemplates.has(templateKey)) fail("duplicate_template", "A template key is duplicated.");
    seenTemplates.add(templateKey);
    const shared = {
      kind,
      templateKey,
      name: cleanText(template.name, { required: true, max: 160, code: "invalid_template" }),
      description: cleanText(template.description, { max: 1000, code: "invalid_template" }),
      tags: cleanTags(template.tags, "invalid_template"),
      versionNote: cleanText(template.versionNote, { max: 240, code: "invalid_template" }),
      nodes: cleanNodes(template.nodes, "invalid_template"),
    };
    if (kind === "holding_company") {
      if (!template.readinessTemplates || typeof template.readinessTemplates !== "object"
        || Array.isArray(template.readinessTemplates)) fail("invalid_template", "Holding-company readiness rules are missing.");
      const invalidReadinessKey = Object.keys(template.readinessTemplates)
        .find((key) => !GROUP_AUDIT_TYPES.includes(key));
      if (invalidReadinessKey) fail("invalid_template", "A readiness category is invalid.");
      return { ...shared, readinessTemplates: Object.fromEntries(GROUP_AUDIT_TYPES.map((auditType) => [auditType,
        cleanConditions(template.readinessTemplates[auditType] || [], "invalid_template")])) };
    }
    const categoryKey = cleanText(template.categoryKey, { required: true, max: 160, code: "invalid_template" });
    const category = categoryByKey.get(categoryKey);
    if (!category) fail("missing_category", "A workstream template references a missing category.");
    const workstreamType = WORKSTREAM_TYPES.includes(template.workstreamType) ? template.workstreamType : "custom";
    if (category.builtinType && category.builtinType !== workstreamType) {
      fail("category_mismatch", "A template and its category use different built-in types.");
    }
    return { ...shared, categoryKey, workstreamType };
  });

  return {
    kind: TEMPLATE_PACKAGE_KIND,
    version: TEMPLATE_PACKAGE_VERSION,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    categories,
    templates,
  };
}

function templateMatches(store, template) {
  const list = template.kind === "holding_company" ? store.groupSamples || [] : store.samples || [];
  return list.filter((sample) => sample.templateKey === template.templateKey
    || sample.sourceTemplateKey === template.templateKey);
}

function suggestCategoryId(store, pkg, template) {
  const source = pkg.categories.find((category) => category.key === template.categoryKey);
  if (source?.builtinType) {
    return store.workstreamCategories.find((category) => category.builtinType === source.builtinType)?.id
      || `__builtin__:${source.builtinType}`;
  }
  const exact = store.workstreamCategories.find((category) => !category.builtinType
    && category.name.trim().toLocaleLowerCase() === source?.name.trim().toLocaleLowerCase());
  return exact?.id || `__new__:${source?.key || template.categoryKey}`;
}

export function templatePackagePreview(store, input) {
  const pkg = parseTemplatePackage(input);
  return {
    package: pkg,
    summary: {
      templates: pkg.templates.length,
      workstreamTemplates: pkg.templates.filter((template) => template.kind === "workstream").length,
      holdingCompanyTemplates: pkg.templates.filter((template) => template.kind === "holding_company").length,
      nodes: pkg.templates.reduce((sum, template) => sum + template.nodes.length, 0),
      conditions: pkg.templates.reduce((sum, template) => sum + template.nodes.reduce((nodeSum, node) => nodeSum + node.conditions.length, 0)
        + (template.kind === "holding_company" ? Object.values(template.readinessTemplates)
          .reduce((readySum, conditions) => readySum + conditions.length, 0) : 0), 0),
    },
    items: pkg.templates.map((template) => ({
      templateKey: template.templateKey,
      kind: template.kind,
      name: template.name,
      matches: templateMatches(store, template).map((sample) => ({ id: sample.id, name: sample.name })),
      sameName: (template.kind === "holding_company" ? store.groupSamples : store.samples)
        .filter((sample) => sample.name.trim().toLocaleLowerCase() === template.name.trim().toLocaleLowerCase())
        .map((sample) => ({ id: sample.id, name: sample.name })),
      suggestedCategoryId: template.kind === "workstream" ? suggestCategoryId(store, pkg, template) : "",
    })),
  };
}

function importedNodes(nodes, prefix) {
  return nodes.map((node) => makeNode({
    id: uid(`${prefix}-node`),
    title: node.title,
    description: node.description,
    conditions: node.conditions,
  }));
}

function importedReadiness(readinessTemplates) {
  return Object.fromEntries(GROUP_AUDIT_TYPES.map((auditType) => [auditType,
    readinessTemplates[auditType].map((label) => ({ id: uid("readiness-condition"), label, done: false }))]));
}

export function applyTemplatePackage(store, input, decisions = {}) {
  const pkg = parseTemplatePackage(input);
  const next = {
    ...store,
    workstreamCategories: [...store.workstreamCategories],
    samples: [...store.samples],
    groupSamples: [...store.groupSamples],
    selectedSampleIdsByCategory: { ...store.selectedSampleIdsByCategory },
  };
  const newCategoryIds = new Map();
  const resolveCategory = (template, decision) => {
    const source = pkg.categories.find((category) => category.key === template.categoryKey);
    let requested = decision.categoryId || suggestCategoryId(next, pkg, template);
    if (requested.startsWith("__builtin__:")) {
      const builtinType = requested.slice("__builtin__:".length);
      const existing = next.workstreamCategories.find((category) => category.builtinType === builtinType);
      if (existing) return existing;
      const category = { id: builtinType, builtinType, name: "" };
      next.workstreamCategories.push(category);
      return category;
    }
    if (requested.startsWith("__new__:")) {
      if (newCategoryIds.has(template.categoryKey)) {
        return next.workstreamCategories.find((category) => category.id === newCategoryIds.get(template.categoryKey));
      }
      const category = { id: uid("category"), name: source?.name || template.name };
      next.workstreamCategories.push(category);
      newCategoryIds.set(template.categoryKey, category.id);
      return category;
    }
    const category = next.workstreamCategories.find((item) => item.id === requested);
    if (!category) fail("invalid_category_choice", "The selected import category no longer exists.");
    return category;
  };

  pkg.templates.forEach((template) => {
    const decision = decisions[template.templateKey] || {};
    const action = ["copy", "replace", "skip"].includes(decision.action) ? decision.action : "copy";
    if (action === "skip") return;
    const listKey = template.kind === "holding_company" ? "groupSamples" : "samples";
    const targetIndex = action === "replace"
      ? next[listKey].findIndex((sample) => sample.id === decision.targetId) : -1;
    if (action === "replace" && targetIndex < 0) fail("invalid_replace_target", "The replacement target no longer exists.");
    const target = targetIndex >= 0 ? next[listKey][targetIndex] : null;
    const now = new Date().toISOString();
    const shared = {
      id: target?.id || uid(template.kind === "holding_company" ? "group-sample" : "sample"),
      templateKey: target?.templateKey || uid(template.kind === "holding_company" ? "holding-template" : "workstream-template"),
      sourceTemplateKey: template.templateKey,
      builtinKey: undefined,
      name: template.name,
      description: template.description,
      tags: template.tags,
      versionNote: template.versionNote,
      createdAt: target?.createdAt || now,
      updatedAt: now,
      nodes: importedNodes(template.nodes, template.kind === "holding_company" ? "group-sample" : "sample"),
    };
    let imported;
    if (template.kind === "holding_company") {
      imported = { ...shared, readinessTemplates: importedReadiness(template.readinessTemplates) };
    } else {
      const category = resolveCategory(template, decision);
      imported = { ...shared, categoryId: category.id, workstreamType: category.builtinType || "custom" };
    }
    if (targetIndex >= 0) next[listKey][targetIndex] = imported;
    else next[listKey].push(imported);

    if (template.kind === "holding_company") {
      if (!next.selectedGroupSampleId) next.selectedGroupSampleId = imported.id;
    } else if (!next.selectedSampleIdsByCategory[imported.categoryId]) {
      next.selectedSampleIdsByCategory[imported.categoryId] = imported.id;
    }
  });
  return normalizeStore(next);
}
