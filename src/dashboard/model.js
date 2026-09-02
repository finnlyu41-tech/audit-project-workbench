export const STORAGE_KEY = "audit-progress-workbench:v1";
export const STORE_VERSION = 2;

export const outstandingStatusOptions = [
  ["missing_document", "缺少文件"],
  ["awaiting_signature", "等客户签字"],
  ["awaiting_client", "等客户回复"],
  ["internal_follow_up", "内部跟进"],
  ["resolved", "已解决"],
];

export const starterNodes = [
  ["项目设置", "先锁定项目范围和权威资料。", ["法律实体已确认", "报告期间已确认", "报告框架已确认", "TB／A4权威来源已确认"]],
  ["PBC资料", "追踪客户资料的发出、接收和未完成事项。", ["资料清单已发出", "关键资料已收到", "Outstanding已复核"]],
  ["TB／A4", "确认审计数字基础已准备好。", ["TB已收到", "A4已建立或更新", "TB与A4平衡检查已完成"]],
  ["审计执行", "完成主要工作底稿并处理审计调整。", ["主要工作底稿已完成", "调整事项已处理"]],
  ["财务报表", "完成报表数字和披露复核。", ["财务报表初稿已准备", "报表数字已核对", "报表复核点已清理"]],
  ["签署与归档", "完成签署文件和最终文件整理。", ["签署文件已准备", "已签文件已收回", "最终文件已归档"]],
];

export function uid(prefix) {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
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

export function createDefaultSample() {
  return {
    id: "sample-main",
    name: "基础审计流程",
    description: "固定流程范本",
    updatedAt: new Date().toISOString(),
    nodes: starterNodes.map(([title, description, conditions]) => makeNode({ title, description, conditions })),
  };
}

export function normalizeSample(value) {
  if (!value || !Array.isArray(value.nodes)) return createDefaultSample();
  return {
    id: value.id || "sample-main",
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
}

export function makeOutstandingItem(values = {}) {
  const now = new Date().toISOString();
  const allowedStatuses = outstandingStatusOptions.map(([value]) => value);
  return {
    id: values.id || uid("outstanding"),
    title: typeof values.title === "string" ? values.title.trim() : "",
    status: allowedStatuses.includes(values.status) ? values.status : "missing_document",
    note: typeof values.note === "string" ? values.note.trim() : "",
    createdAt: values.createdAt || now,
    updatedAt: values.updatedAt || now,
  };
}

export function normalizeStore(value) {
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
        ? project.outstandingItems.map(makeOutstandingItem) : [],
    })),
    sample: normalizeSample(value.sample),
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
  return { version: STORE_VERSION, projects: [], sample: createDefaultSample() };
}

export function isValidStore(value) {
  return value && [1, STORE_VERSION].includes(value.version) && Array.isArray(value.projects);
}

export function outstandingStatusLabel(value) {
  return outstandingStatusOptions.find(([status]) => status === value)?.[1] || "未分类";
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

export function outstandingIsOpen(item) {
  return item.status !== "resolved";
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
