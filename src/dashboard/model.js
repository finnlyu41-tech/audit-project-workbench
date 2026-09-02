export const STORAGE_KEY = "audit-progress-workbench:v1";
export const STORE_VERSION = 3;
export const CORE_SAMPLE_KEY = "core-audit";

export const defaultOutstandingStatusDefinitions = [
  { id: "missing_document", label: "缺少文件", labelEn: "Missing document", closed: false, tone: "danger" },
  { id: "awaiting_signature", label: "等客户签字", labelEn: "Awaiting client signature", closed: false, tone: "warning" },
  { id: "awaiting_client", label: "等客户回复", labelEn: "Awaiting client response", closed: false, tone: "warning" },
  { id: "internal_follow_up", label: "内部跟进", labelEn: "Internal follow-up", closed: false, tone: "info" },
  { id: "resolved", label: "已解决", labelEn: "Resolved", closed: true, tone: "success" },
];
export const outstandingStatusOptions = defaultOutstandingStatusDefinitions.map(({ id, label }) => [id, label]);

export const starterNodes = [
  ["项目设置", "先锁定项目范围和权威资料。", ["法律实体已确认", "报告期间已确认", "报告框架已确认", "TB／A4权威来源已确认"]],
  ["PBC资料", "追踪客户资料的发出、接收和未完成事项。", ["资料清单已发出", "关键资料已收到", "Outstanding已复核"]],
  ["TB／A4", "确认审计数字基础已准备好。", ["TB已收到", "A4已建立或更新", "TB与A4平衡检查已完成"]],
  ["审计执行", "完成主要工作底稿并处理审计调整。", ["主要工作底稿已完成", "调整事项已处理"]],
  ["财务报表", "完成报表数字和披露复核。", ["财务报表初稿已准备", "报表数字已核对", "报表复核点已清理"]],
  ["签署与归档", "完成签署文件和最终文件整理。", ["签署文件已准备", "已签文件已收回", "最终文件已归档"]],
];

export const starterNodesEnglish = [
  ["Engagement setup", "Confirm the engagement scope and authoritative sources.",
    ["Legal entity confirmed", "Reporting period confirmed", "Reporting framework confirmed", "Authoritative TB / A4 source confirmed"]],
  ["PBC documents", "Track client requests, receipts and unresolved document gaps.",
    ["PBC request list issued", "Key documents received", "Outstanding request list reviewed"]],
  ["TB / A4", "Confirm that the audit number base is ready.",
    ["Trial balance received", "A4 prepared or updated", "TB-to-A4 balance check completed"]],
  ["Audit execution", "Complete the main workpapers and process audit adjustments.",
    ["Main workpapers completed", "Audit adjustments processed"]],
  ["Financial statements", "Complete the financial statement figures and disclosure review.",
    ["Draft financial statements prepared", "Financial statement figures agreed", "Financial statement review points cleared"]],
  ["Signing and archive", "Complete signing documents and final file assembly.",
    ["Signing documents prepared", "Signed documents received", "Final file archived"]],
];

const workflowTextPairs = starterNodes.flatMap((node, index) => {
  const englishNode = starterNodesEnglish[index];
  return [[node[0], englishNode[0]], [node[1], englishNode[1]],
    ...node[2].map((condition, conditionIndex) => [condition, englishNode[2][conditionIndex]])];
});
const sampleMetadataTextPairs = [
  ["基础审计流程", "Core Audit Workflow"],
  ["内置流程范本", "Built-in workflow template"],
  ["固定流程范本", "Built-in workflow template"],
];

function localizeKnownText(value, language, pairs = workflowTextPairs) {
  const pair = pairs.find(([chinese, english]) => value === chinese || value === english);
  return pair ? pair[language === "en" ? 1 : 0] : value;
}

export function localizeWorkflowNodes(nodes, language = "zh") {
  return nodes.map((node) => ({ ...node,
    title: localizeKnownText(node.title, language),
    description: localizeKnownText(node.description, language),
    conditions: node.conditions.map((condition) => ({ ...condition,
      label: localizeKnownText(condition.label, language),
    })),
  }));
}

export function uid(prefix) {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function createDefaultOutstandingStatuses() {
  return defaultOutstandingStatusDefinitions.map(({ id, label, closed, tone }) => ({
    id,
    builtinKey: id,
    label,
    closed,
    tone,
  }));
}

export function normalizeOutstandingStatuses(value) {
  if (!Array.isArray(value) || !value.length) return createDefaultOutstandingStatuses();
  const builtinKeys = new Set(defaultOutstandingStatusDefinitions.map((status) => status.id));
  const allowedTones = new Set(["neutral", "danger", "warning", "info", "success"]);
  const seenIds = new Set();
  const statuses = value.map((status) => {
    let id = typeof status?.id === "string" && status.id ? status.id : uid("outstanding-status");
    if (seenIds.has(id)) id = uid("outstanding-status");
    seenIds.add(id);
    const builtinKey = builtinKeys.has(status?.builtinKey) ? status.builtinKey : undefined;
    const builtin = defaultOutstandingStatusDefinitions.find((item) => item.id === builtinKey);
    return {
      id,
      builtinKey,
      label: typeof status?.label === "string" && status.label.trim()
        ? status.label.trim() : (builtin?.label || "未命名状态"),
      closed: Boolean(status?.closed),
      tone: allowedTones.has(status?.tone) ? status.tone : (builtin?.tone || "neutral"),
    };
  });
  return statuses.length ? statuses : createDefaultOutstandingStatuses();
}

export function localizeOutstandingStatuses(statuses, language = "zh") {
  return statuses.map((status) => {
    const builtin = defaultOutstandingStatusDefinitions.find((item) => item.id === status.builtinKey);
    return builtin ? { ...status, label: language === "en" ? builtin.labelEn : builtin.label } : status;
  });
}

export function makeNode(source = {}) {
  return {
    id: uid("node"),
    title: source.title || "新节点",
    description: source.description || "",
    conditions: (source.conditions || []).map((condition) => ({
      id: uid("condition"),
      label: typeof condition === "string" ? condition : condition.label,
      done: false,
    })),
  };
}

export function createDefaultSample(language = "zh") {
  const english = language === "en";
  return {
    id: "sample-core-audit",
    builtinKey: CORE_SAMPLE_KEY,
    name: english ? "Core Audit Workflow" : "基础审计流程",
    description: english ? "Built-in workflow template" : "内置流程范本",
    updatedAt: new Date().toISOString(),
    nodes: (english ? starterNodesEnglish : starterNodes)
      .map(([title, description, conditions]) => makeNode({ title, description, conditions })),
  };
}

function sampleContentMatches(sample, name, description, nodes) {
  if (sample.name !== name || ![description, "固定流程范本"].includes(sample.description)) return false;
  return JSON.stringify(sample.nodes.map((node) => [node.title, node.description,
    node.conditions.map((condition) => condition.label)])) === JSON.stringify(nodes);
}

function isCoreSampleContent(sample) {
  return sampleContentMatches(sample, "基础审计流程", "内置流程范本", starterNodes)
    || sampleContentMatches(sample, "Core Audit Workflow", "Built-in workflow template", starterNodesEnglish);
}

export function normalizeSample(value) {
  if (!value || !Array.isArray(value.nodes)) return createDefaultSample();
  const normalized = {
    id: value.id || "sample-main",
    builtinKey: value.builtinKey === CORE_SAMPLE_KEY ? CORE_SAMPLE_KEY : undefined,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名 Sample",
    description: typeof value.description === "string" ? value.description : "",
    updatedAt: value.updatedAt || new Date().toISOString(),
    nodes: value.nodes.map((node) => ({
      id: node.id || uid("sample-node"),
      title: typeof node.title === "string" && node.title.trim() ? node.title.trim() : "未命名节点",
      description: node.description === "完成主要工作底稿并处理待清事项。"
        ? "完成主要工作底稿并处理审计调整。" : (typeof node.description === "string" ? node.description : ""),
      conditions: Array.isArray(node.conditions) ? node.conditions.map((condition) => ({
        id: condition?.id || uid("sample-condition"),
        label: typeof condition === "string" ? condition : (typeof condition?.label === "string" ? condition.label : ""),
        done: false,
      })).filter((condition) => condition.label.trim() && condition.label.trim() !== "待清事项已复核") : [],
    })),
  };
  if (!normalized.builtinKey && isCoreSampleContent(normalized)) normalized.builtinKey = CORE_SAMPLE_KEY;
  return normalized;
}

export function localizeSample(sample, language = "zh") {
  if (sample?.builtinKey === CORE_SAMPLE_KEY) {
    return { ...createDefaultSample(language), id: sample.id, updatedAt: sample.updatedAt };
  }
  return { ...sample,
    name: localizeKnownText(sample.name, language, sampleMetadataTextPairs),
    description: localizeKnownText(sample.description, language, sampleMetadataTextPairs),
    nodes: localizeWorkflowNodes(sample.nodes, language),
  };
}

export function makeBlankSample(language = "zh") {
  return {
    id: uid("sample"),
    name: language === "en" ? "New Sample" : "新 Sample",
    description: "",
    updatedAt: new Date().toISOString(),
    nodes: [],
  };
}

export function duplicateSample(sample, suffix = " Copy") {
  return {
    ...sample,
    id: uid("sample"),
    builtinKey: undefined,
    name: `${sample.name}${suffix}`,
    updatedAt: new Date().toISOString(),
    nodes: sample.nodes.map((node) => makeNode({
      title: node.title,
      description: node.description,
      conditions: node.conditions.map((condition) => condition.label),
    })),
  };
}

export function makeOutstandingItem(values = {}, statuses = createDefaultOutstandingStatuses()) {
  const now = new Date().toISOString();
  const allowedStatuses = statuses.map((status) => status.id);
  const defaultStatus = statuses.find((status) => !status.closed)?.id || statuses[0]?.id || "missing_document";
  return {
    id: values.id || uid("outstanding"),
    title: typeof values.title === "string" ? values.title.trim() : "",
    status: allowedStatuses.includes(values.status) ? values.status : defaultStatus,
    note: typeof values.note === "string" ? values.note.trim() : "",
    createdAt: values.createdAt || now,
    updatedAt: values.updatedAt || now,
  };
}

export function normalizeStore(value) {
  const outstandingStatuses = normalizeOutstandingStatuses(value.outstandingStatuses);
  const rawSamples = Array.isArray(value.samples) ? value.samples : [value.sample];
  const seenSampleIds = new Set();
  const samples = rawSamples.filter(Boolean).map((sample) => {
    const normalized = normalizeSample(sample);
    if (seenSampleIds.has(normalized.id)) normalized.id = uid("sample");
    seenSampleIds.add(normalized.id);
    return normalized;
  });
  if (!samples.length) samples.push(createDefaultSample());
  const selectedSampleId = samples.some((sample) => sample.id === value.selectedSampleId)
    ? value.selectedSampleId : samples[0].id;
  return {
    version: STORE_VERSION,
    projects: value.projects.map((project) => ({
      ...project,
      nodes: Array.isArray(project.nodes) ? project.nodes.map((node) => ({ ...node,
        description: node.description === "完成主要工作底稿并处理待清事项。"
          ? "完成主要工作底稿并处理审计调整。" : node.description,
        conditions: Array.isArray(node.conditions)
          ? node.conditions.filter((condition) => condition?.label !== "待清事项已复核") : [] })) : [],
      outstandingItems: Array.isArray(project.outstandingItems)
        ? project.outstandingItems.map((item) => makeOutstandingItem(item, outstandingStatuses)) : [],
    })),
    samples,
    selectedSampleId,
    outstandingStatuses,
  };
}

export function makeProject(values, useStarter = true, sampleNodes = null) {
  const now = new Date().toISOString();
  return {
    id: uid("project"),
    name: values.name.trim(),
    entity: values.entity.trim(),
    period: values.period.trim(),
    dueDate: values.dueDate || "",
    notes: values.notes.trim(),
    archived: false,
    createdAt: now,
    updatedAt: now,
    outstandingItems: [],
    nodes: useStarter ? (sampleNodes || createDefaultSample().nodes).map((node) => makeNode({
      title: node.title,
      description: node.description,
      conditions: node.conditions.map((condition) => condition.label),
    })) : [],
  };
}

export function emptyStore() {
  const sample = createDefaultSample();
  return { version: STORE_VERSION, projects: [], samples: [sample], selectedSampleId: sample.id,
    outstandingStatuses: createDefaultOutstandingStatuses() };
}

export function isValidStore(value) {
  return value && [1, 2, STORE_VERSION].includes(value.version) && Array.isArray(value.projects);
}

export function outstandingStatusLabel(value, statuses = createDefaultOutstandingStatuses(), language = "zh") {
  return localizeOutstandingStatuses(statuses, language).find((status) => status.id === value)?.label
    || (language === "en" ? "Uncategorised" : "未分类");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactSampleCompanies(sample, names, replacement = "[公司名称]") {
  const exactNames = [...new Set((names || []).map((name) => String(name).trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
  let replacements = 0;
  const replaceText = (value) => exactNames.reduce((text, name) => text.replace(
    new RegExp(escapeRegExp(name), "giu"),
    () => { replacements += 1; return replacement; },
  ), typeof value === "string" ? value : "");

  const redactedSample = {
    ...sample,
    builtinKey: undefined,
    name: replaceText(sample.name),
    description: replaceText(sample.description),
    updatedAt: new Date().toISOString(),
    nodes: sample.nodes.map((node) => ({
      ...node,
      title: replaceText(node.title),
      description: replaceText(node.description),
      conditions: node.conditions.map((condition) => ({ ...condition, label: replaceText(condition.label) })),
    })),
  };
  return { replacements, sample: redactedSample };
}

export function outstandingIsOpen(item, statuses = createDefaultOutstandingStatuses()) {
  return !statuses.find((status) => status.id === item.status)?.closed;
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return isValidStore(parsed) ? normalizeStore(parsed) : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function nodeIsComplete(node) {
  return node.conditions.length > 0 && node.conditions.every((condition) => condition.done);
}

export function nodeStatus(node) {
  if (!node.conditions.length) return "待设置条件";
  if (nodeIsComplete(node)) return "已完成";
  if (node.conditions.some((condition) => condition.done)) return "进行中";
  return "未开始";
}

export function projectStats(project) {
  const conditions = project.nodes.flatMap((node) => node.conditions);
  const completedConditions = conditions.filter((condition) => condition.done).length;
  const completedNodes = project.nodes.filter(nodeIsComplete).length;
  return {
    conditions: conditions.length,
    completedConditions,
    nodes: project.nodes.length,
    completedNodes,
    percentage: conditions.length ? Math.round((completedConditions / conditions.length) * 100) : 0,
  };
}

export function formatDate(value, language = "zh") {
  if (!value) return language === "en" ? "No due date" : "未设置日期";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "zh-HK",
    { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function dueTone(project) {
  if (!project.dueDate || projectStats(project).percentage === 100) return "neutral";
  const due = new Date(`${project.dueDate}T23:59:59`).getTime();
  const days = Math.ceil((due - Date.now()) / 86400000);
  if (days < 0) return "danger";
  if (days <= 7) return "warning";
  return "neutral";
}
