export const STORAGE_KEY = "audit-progress-workbench:v1";
export const STORE_VERSION = 4;
export const CORE_SAMPLE_KEY = "core-audit";
export const CORE_GROUP_SAMPLE_KEY = "core-group";

export const GROUP_AUDIT_TYPES = ["internal_team", "component_auditor", "management_accounts"];

export const groupStarterNodes = [
  ["集团范围与架构", "确认集团边界、组成部分及合并责任。", ["集团架构已确认", "合并范围已确认", "组成部分重要性已确定"]],
  ["组成部分审计指示", "发出并追踪各组成部分的审计或报送要求。", ["组成部分指示已发出", "负责人及截止日已确认"]],
  ["公司TB及报告包", "确认纳入合并的公司资料已经齐备。", ["所有必需公司已具备合并条件", "报告包及最终TB已收齐"]],
  ["集团往来核对", "清理集团内往来、交易及未对账差异。", ["集团往来余额已匹配", "重大差异已解释或处理"]],
  ["抵销及合并调整", "追踪抵销分录和其他合并层调整。", ["抵销事项已识别", "合并调整已复核", "调整状态已更新"]],
  ["合并财务报表", "完成合并数字、披露及列报复核。", ["合并报表初稿已准备", "合并数字已核对", "披露及列报已复核"]],
  ["集团签署与归档", "完成集团层复核、签署和最终归档。", ["集团复核点已清理", "集团签署文件已完成", "最终集团文件已归档"]],
];

export const groupStarterNodesEnglish = [
  ["Group scope and structure", "Confirm the group boundary, components and consolidation responsibilities.",
    ["Group structure confirmed", "Consolidation scope confirmed", "Component significance determined"]],
  ["Component instructions", "Issue and track audit or reporting requirements for each component.",
    ["Component instructions issued", "Owners and deadlines confirmed"]],
  ["Company TBs and reporting packs", "Confirm that company information required for consolidation is ready.",
    ["All required companies are consolidation-ready", "Reporting packs and final TBs received"]],
  ["Intercompany reconciliation", "Clear intercompany balances, transactions and unreconciled differences.",
    ["Intercompany balances matched", "Material differences explained or resolved"]],
  ["Eliminations and consolidation adjustments", "Track eliminations and other group-level adjustments.",
    ["Elimination items identified", "Consolidation adjustments reviewed", "Adjustment statuses updated"]],
  ["Consolidated financial statements", "Complete the review of consolidated figures, disclosures and presentation.",
    ["Draft consolidated financial statements prepared", "Consolidated figures agreed", "Disclosures and presentation reviewed"]],
  ["Group signing and archive", "Complete group review, signing and final archiving.",
    ["Group review points cleared", "Group signing documents completed", "Final group file archived"]],
];

export const groupReadinessTemplates = {
  internal_team: ["最终TB已确认", "审计调整已处理", "公司报告包已完成", "重大未决事项已向集团汇报"],
  component_auditor: ["组成部分审计师已确认指示", "组成部分报告包已收到", "审计师结论及交付文件已收到", "重大事项已沟通"],
  management_accounts: ["管理账或最终TB已收到", "科目映射及余额核对已完成", "所需管理层支持文件已收到"],
};

export const groupReadinessTemplatesEnglish = {
  internal_team: ["Final TB confirmed", "Audit adjustments processed", "Company reporting pack completed", "Significant open matters reported to the group"],
  component_auditor: ["Component auditor acknowledged instructions", "Component reporting pack received", "Auditor conclusions and deliverables received", "Significant matters communicated"],
  management_accounts: ["Management accounts or final TB received", "Account mapping and balance reconciliation completed", "Required management support received"],
};

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
const groupWorkflowTextPairs = groupStarterNodes.flatMap((node, index) => {
  const englishNode = groupStarterNodesEnglish[index];
  return [[node[0], englishNode[0]], [node[1], englishNode[1]],
    ...node[2].map((condition, conditionIndex) => [condition, englishNode[2][conditionIndex]])];
});
const groupReadinessTextPairs = GROUP_AUDIT_TYPES.flatMap((auditType) =>
  groupReadinessTemplates[auditType].map((label, index) => [label, groupReadinessTemplatesEnglish[auditType][index]]));
const sampleMetadataTextPairs = [
  ["基础审计流程", "Core Audit Workflow"],
  ["内置流程范本", "Built-in workflow template"],
  ["固定流程范本", "Built-in workflow template"],
];
const groupSampleMetadataTextPairs = [
  ["集团合并流程", "Group Consolidation Workflow"],
  ["内置集团流程范本", "Built-in group workflow template"],
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

export function localizeGroupWorkflowNodes(nodes, language = "zh") {
  return nodes.map((node) => ({ ...node,
    title: localizeKnownText(node.title, language, groupWorkflowTextPairs),
    description: localizeKnownText(node.description, language, groupWorkflowTextPairs),
    conditions: node.conditions.map((condition) => ({ ...condition,
      label: localizeKnownText(condition.label, language, groupWorkflowTextPairs),
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

function copyReadinessTemplates(templates = {}) {
  return Object.fromEntries(GROUP_AUDIT_TYPES.map((auditType) => [auditType,
    (templates[auditType] || []).map((condition) => ({
      id: condition?.id || uid("readiness-condition"),
      label: typeof condition === "string" ? condition : condition.label,
      done: false,
    }))]));
}

export function createDefaultGroupSample(language = "zh") {
  const english = language === "en";
  const readiness = english ? groupReadinessTemplatesEnglish : groupReadinessTemplates;
  return {
    id: "group-sample-core",
    builtinKey: CORE_GROUP_SAMPLE_KEY,
    name: english ? "Group Consolidation Workflow" : "集团合并流程",
    description: english ? "Built-in group workflow template" : "内置集团流程范本",
    updatedAt: new Date().toISOString(),
    nodes: (english ? groupStarterNodesEnglish : groupStarterNodes)
      .map(([title, description, conditions]) => makeNode({ title, description, conditions })),
    readinessTemplates: copyReadinessTemplates(readiness),
  };
}

export function normalizeGroupSample(value) {
  if (!value || !Array.isArray(value.nodes)) return createDefaultGroupSample();
  return {
    id: value.id || uid("group-sample"),
    builtinKey: value.builtinKey === CORE_GROUP_SAMPLE_KEY ? CORE_GROUP_SAMPLE_KEY : undefined,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名集团 Sample",
    description: typeof value.description === "string" ? value.description : "",
    updatedAt: value.updatedAt || new Date().toISOString(),
    nodes: value.nodes.map((node) => ({
      id: node.id || uid("group-sample-node"),
      title: typeof node.title === "string" && node.title.trim() ? node.title.trim() : "未命名节点",
      description: typeof node.description === "string" ? node.description : "",
      conditions: Array.isArray(node.conditions) ? node.conditions.map((condition) => ({
        id: condition?.id || uid("group-sample-condition"),
        label: typeof condition === "string" ? condition : (typeof condition?.label === "string" ? condition.label : ""),
        done: false,
      })).filter((condition) => condition.label.trim()) : [],
    })),
    readinessTemplates: copyReadinessTemplates(value.readinessTemplates || groupReadinessTemplates),
  };
}

export function localizeGroupSample(sample, language = "zh") {
  if (sample?.builtinKey === CORE_GROUP_SAMPLE_KEY) {
    return { ...createDefaultGroupSample(language), id: sample.id, updatedAt: sample.updatedAt };
  }
  return { ...sample,
    name: localizeKnownText(sample.name, language, groupSampleMetadataTextPairs),
    description: localizeKnownText(sample.description, language, groupSampleMetadataTextPairs),
    nodes: localizeGroupWorkflowNodes(sample.nodes, language),
    readinessTemplates: Object.fromEntries(GROUP_AUDIT_TYPES.map((auditType) => [auditType,
      (sample.readinessTemplates?.[auditType] || []).map((condition) => ({ ...condition,
        label: localizeKnownText(condition.label, language, groupReadinessTextPairs),
      }))])),
  };
}

export function makeBlankGroupSample(language = "zh") {
  return {
    id: uid("group-sample"),
    name: language === "en" ? "New Group Sample" : "新集团 Sample",
    description: "",
    updatedAt: new Date().toISOString(),
    nodes: [],
    readinessTemplates: copyReadinessTemplates(language === "en"
      ? groupReadinessTemplatesEnglish : groupReadinessTemplates),
  };
}

export function duplicateGroupSample(sample, suffix = " Copy") {
  return {
    ...sample,
    id: uid("group-sample"),
    builtinKey: undefined,
    name: `${sample.name}${suffix}`,
    updatedAt: new Date().toISOString(),
    nodes: sample.nodes.map((node) => makeNode({
      title: node.title,
      description: node.description,
      conditions: node.conditions.map((condition) => condition.label),
    })),
    readinessTemplates: copyReadinessTemplates(sample.readinessTemplates),
  };
}

export function makeGroupMember(values, groupSample = createDefaultGroupSample()) {
  const kind = values.kind === "group" ? "group" : "project";
  const auditType = GROUP_AUDIT_TYPES.includes(values.auditType) ? values.auditType : "internal_team";
  return {
    id: values.id || uid("group-member"),
    kind,
    refId: values.refId,
    role: typeof values.role === "string" ? values.role.trim() : "",
    auditType: kind === "project" ? auditType : "subgroup",
    readinessConditions: kind === "project"
      ? (values.readinessConditions || groupSample.readinessTemplates?.[auditType] || []).map((condition) => ({
        id: condition?.id || uid("readiness-condition"),
        label: typeof condition === "string" ? condition : condition.label,
        done: Boolean(condition?.done),
      })) : [],
  };
}

export function makeGroup(values, useStarter = true, groupSample = createDefaultGroupSample()) {
  const now = new Date().toISOString();
  const consolidationEnabled = values.consolidationEnabled !== false;
  return {
    id: uid("group"),
    name: values.name.trim(),
    period: values.period.trim(),
    dueDate: values.dueDate || "",
    owner: values.owner?.trim() || "",
    notes: values.notes?.trim() || "",
    consolidationEnabled,
    archived: false,
    createdAt: now,
    updatedAt: now,
    members: [],
    outstandingItems: [],
    nodes: consolidationEnabled && useStarter ? (groupSample?.nodes || []).map((node) => makeNode({
      title: node.title,
      description: node.description,
      conditions: node.conditions.map((condition) => condition.label),
    })) : [],
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

function normalizeNodeList(nodes, removeLegacyOutstanding = false) {
  return Array.isArray(nodes) ? nodes.map((node) => ({
    id: node?.id || uid("node"),
    title: typeof node?.title === "string" ? node.title : "",
    description: removeLegacyOutstanding && node?.description === "完成主要工作底稿并处理待清事项。"
      ? "完成主要工作底稿并处理审计调整。" : (typeof node?.description === "string" ? node.description : ""),
    conditions: Array.isArray(node?.conditions) ? node.conditions.filter((condition) =>
      !removeLegacyOutstanding || condition?.label !== "待清事项已复核").map((condition) => ({
      id: condition?.id || uid("condition"),
      label: typeof condition?.label === "string" ? condition.label : "",
      done: Boolean(condition?.done),
    })) : [],
  })) : [];
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
  const rawGroupSamples = Array.isArray(value.groupSamples) ? value.groupSamples : [];
  const seenGroupSampleIds = new Set();
  const groupSamples = rawGroupSamples.filter(Boolean).map((sample) => {
    const normalized = normalizeGroupSample(sample);
    if (seenGroupSampleIds.has(normalized.id)) normalized.id = uid("group-sample");
    seenGroupSampleIds.add(normalized.id);
    return normalized;
  });
  if (!groupSamples.length) groupSamples.push(createDefaultGroupSample());
  const selectedGroupSampleId = groupSamples.some((sample) => sample.id === value.selectedGroupSampleId)
    ? value.selectedGroupSampleId : groupSamples[0].id;
  const defaultGroupSample = groupSamples.find((sample) => sample.id === selectedGroupSampleId) || groupSamples[0];
  const projects = value.projects.map((project) => ({
    ...project,
    owner: typeof project.owner === "string" ? project.owner : "",
    nodes: normalizeNodeList(project.nodes, true),
    outstandingItems: Array.isArray(project.outstandingItems)
      ? project.outstandingItems.map((item) => makeOutstandingItem(item, outstandingStatuses)) : [],
  }));
  const groups = Array.isArray(value.groups) ? value.groups.map((group) => ({
    id: group?.id || uid("group"),
    name: typeof group?.name === "string" && group.name.trim() ? group.name.trim() : "未命名集团",
    period: typeof group?.period === "string" ? group.period : "",
    dueDate: typeof group?.dueDate === "string" ? group.dueDate : "",
    owner: typeof group?.owner === "string" ? group.owner : "",
    notes: typeof group?.notes === "string" ? group.notes : "",
    consolidationEnabled: group?.consolidationEnabled !== false,
    archived: Boolean(group?.archived),
    createdAt: group?.createdAt || new Date().toISOString(),
    updatedAt: group?.updatedAt || new Date().toISOString(),
    members: Array.isArray(group?.members) ? group.members.filter((member) => member?.refId)
      .map((member) => makeGroupMember(member, defaultGroupSample)) : [],
    outstandingItems: Array.isArray(group?.outstandingItems)
      ? group.outstandingItems.map((item) => makeOutstandingItem(item, outstandingStatuses)) : [],
    nodes: normalizeNodeList(group?.nodes),
  })) : [];
  return {
    version: STORE_VERSION,
    projects,
    groups,
    samples,
    selectedSampleId,
    groupSamples,
    selectedGroupSampleId,
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
    owner: values.owner?.trim() || "",
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
  const groupSample = createDefaultGroupSample();
  return { version: STORE_VERSION, projects: [], groups: [], samples: [sample], selectedSampleId: sample.id,
    groupSamples: [groupSample], selectedGroupSampleId: groupSample.id,
    outstandingStatuses: createDefaultOutstandingStatuses() };
}

export function isValidStore(value) {
  return value && [1, 2, 3, STORE_VERSION].includes(value.version) && Array.isArray(value.projects);
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
    ...(sample.readinessTemplates ? { readinessTemplates: Object.fromEntries(
      Object.entries(sample.readinessTemplates).map(([auditType, conditions]) => [auditType,
        conditions.map((condition) => ({ ...condition, label: replaceText(condition.label) }))]),
    ) } : {}),
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

export function findParentMembership(store, kind, refId) {
  for (const group of store.groups || []) {
    const member = group.members.find((entry) => entry.kind === kind && entry.refId === refId);
    if (member) return { group, member };
  }
  return null;
}

export function groupContainsGroup(store, rootGroupId, targetGroupId, visited = new Set()) {
  if (rootGroupId === targetGroupId) return true;
  if (visited.has(rootGroupId)) return false;
  visited.add(rootGroupId);
  const group = (store.groups || []).find((item) => item.id === rootGroupId);
  return Boolean(group?.members.filter((member) => member.kind === "group")
    .some((member) => groupContainsGroup(store, member.refId, targetGroupId, visited)));
}

export function canNestGroup(store, parentGroupId, childGroupId) {
  return parentGroupId !== childGroupId
    && !findParentMembership(store, "group", childGroupId)
    && !groupContainsGroup(store, childGroupId, parentGroupId);
}

export function memberIsReady(store, member, visited = new Set()) {
  if (member.kind === "project") {
    return member.readinessConditions.length > 0
      && member.readinessConditions.every((condition) => condition.done);
  }
  return groupProgress(store, member.refId, visited).ready;
}

function leafReadiness(store, groupId, visited = new Set()) {
  if (visited.has(groupId)) return { ready: 0, total: 0 };
  const nextVisited = new Set(visited).add(groupId);
  const group = (store.groups || []).find((item) => item.id === groupId);
  if (!group) return { ready: 0, total: 0 };
  return group.members.reduce((summary, member) => {
    if (member.kind === "project") {
      const exists = store.projects.some((project) => project.id === member.refId);
      return exists ? { ready: summary.ready + (memberIsReady(store, member) ? 1 : 0), total: summary.total + 1 } : summary;
    }
    const child = leafReadiness(store, member.refId, nextVisited);
    return { ready: summary.ready + child.ready, total: summary.total + child.total };
  }, { ready: 0, total: 0 });
}

export function groupProgress(store, groupId, visited = new Set()) {
  if (visited.has(groupId)) return { componentPercentage: 0, consolidationPercentage: 0,
    percentage: 0, ready: false, readyMembers: 0, totalMembers: 0, readyCompanies: 0, totalCompanies: 0 };
  const group = (store.groups || []).find((item) => item.id === groupId);
  if (!group) return { componentPercentage: 0, consolidationPercentage: 0,
    percentage: 0, ready: false, readyMembers: 0, totalMembers: 0, readyCompanies: 0, totalCompanies: 0 };
  const nextVisited = new Set(visited).add(groupId);
  const members = group.members.filter((member) => member.kind === "project"
    ? store.projects.some((project) => project.id === member.refId)
    : store.groups.some((item) => item.id === member.refId));
  const componentPercentages = members.map((member) => {
    if (member.kind === "project") {
      return projectStats(store.projects.find((project) => project.id === member.refId)).percentage;
    }
    return groupProgress(store, member.refId, nextVisited).percentage;
  });
  const componentPercentage = componentPercentages.length
    ? Math.round(componentPercentages.reduce((sum, value) => sum + value, 0) / componentPercentages.length) : 0;
  const consolidationPercentage = projectStats(group).percentage;
  const percentage = group.consolidationEnabled
    ? Math.round(componentPercentage * 0.7 + consolidationPercentage * 0.3)
    : componentPercentage;
  const readyMembers = members.filter((member) => memberIsReady(store, member, nextVisited)).length;
  const consolidationReady = !group.consolidationEnabled
    || (group.nodes.length > 0 && group.nodes.every(nodeIsComplete));
  const leaves = leafReadiness(store, groupId);
  return {
    componentPercentage,
    consolidationPercentage,
    percentage,
    ready: members.length > 0 && readyMembers === members.length && consolidationReady,
    readyMembers,
    totalMembers: members.length,
    readyCompanies: leaves.ready,
    totalCompanies: leaves.total,
  };
}

export function collectGroupOutstandingEntries(store, groupId, visited = new Set(), depth = 0) {
  if (visited.has(groupId)) return [];
  const group = (store.groups || []).find((item) => item.id === groupId);
  if (!group) return [];
  const nextVisited = new Set(visited).add(groupId);
  const own = (group.outstandingItems || []).map((item) => ({
    item, sourceType: "group", sourceId: group.id, sourceName: group.name, depth,
  }));
  const children = group.members.flatMap((member) => {
    if (member.kind === "project") {
      const project = store.projects.find((item) => item.id === member.refId);
      return (project?.outstandingItems || []).map((item) => ({
        item, sourceType: "project", sourceId: project.id, sourceName: project.name, depth: depth + 1,
      }));
    }
    return collectGroupOutstandingEntries(store, member.refId, nextVisited, depth + 1);
  });
  return [...own, ...children];
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
