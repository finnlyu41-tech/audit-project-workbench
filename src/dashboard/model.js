import { toTraditional } from "./traditional.js";

export const STORAGE_KEY = "audit-progress-workbench:v1";
export const STORE_VERSION = 8;
export const CORE_SAMPLE_KEY = "core-audit";
export const CORE_GROUP_SAMPLE_KEY = "core-group";

export const WORKSTREAM_TYPES = ["quote_collection", "audit", "tax_computation_filing", "cdd", "custom"];
export const BUILTIN_WORKSTREAM_TYPES = WORKSTREAM_TYPES.filter((type) => type !== "custom");
export const WORKSTREAM_TYPE_KEYS = {
  quote_collection: "报价与收款",
  audit: "审计",
  tax_computation_filing: "税务计算及报税",
  cdd: "客户尽职调查",
  custom: "自定义模块",
};
export const WORKSTREAM_SAMPLE_KEYS = {
  quote_collection: "core-quote-collection",
  audit: CORE_SAMPLE_KEY,
  tax_computation_filing: "core-tax-computation-filing",
  cdd: "core-cdd",
};

export const GROUP_AUDIT_TYPES = ["internal_team", "component_auditor", "management_accounts"];
export const GROUP_AUDIT_TYPE_KEYS = {
  internal_team: "本团队审计",
  component_auditor: "其他审计师负责",
  management_accounts: "无需法定审计／管理账",
};

export const groupStarterNodes = [
  ["集团范围与架构", "确认集团边界、组成部分及合并责任。", ["集团架构已确认", "合并范围已确认", "组成部分重要性已确定"]],
  ["组成部分审计指示", "发出并追踪各组成部分的审计或报送要求。", ["组成部分指示已发出", "负责人及截止日已确认"]],
  ["公司试算表及报告包", "确认纳入合并的公司资料已经齐备。", ["所有必需公司已具备合并条件", "报告包及最终试算表已收齐"]],
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
  internal_team: ["最终试算表已确认", "审计调整已处理", "公司报告包已完成", "重大未决事项已向集团汇报"],
  component_auditor: ["组成部分审计师已确认指示", "组成部分报告包已收到", "审计师结论及交付文件已收到", "重大事项已沟通"],
  management_accounts: ["管理账或最终试算表已收到", "科目映射及余额核对已完成", "所需管理层支持文件已收到"],
};

export const groupReadinessTemplatesEnglish = {
  internal_team: ["Final TB confirmed", "Audit adjustments processed", "Company reporting pack completed", "Significant open matters reported to the group"],
  component_auditor: ["Component auditor acknowledged instructions", "Component reporting pack received", "Auditor conclusions and deliverables received", "Significant matters communicated"],
  management_accounts: ["Management accounts or final TB received", "Account mapping and balance reconciliation completed", "Required management support received"],
};

export const defaultOutstandingStatusDefinitions = [
  { id: "missing_document", label: "缺少文件", labelEn: "Missing document", closed: false, tone: "danger", color: "#b84747" },
  { id: "awaiting_signature", label: "等客户签字", labelEn: "Awaiting client signature", closed: false, tone: "warning", color: "#b37718" },
  { id: "awaiting_client", label: "等客户回复", labelEn: "Awaiting client response", closed: false, tone: "warning", color: "#d08b27" },
  { id: "internal_follow_up", label: "内部跟进", labelEn: "Internal follow-up", closed: false, tone: "info", color: "#397ca0" },
  { id: "resolved", label: "已解决", labelEn: "Resolved", closed: true, tone: "success", color: "#3b7d55" },
];
export const outstandingStatusOptions = defaultOutstandingStatusDefinitions.map(({ id, label }) => [id, label]);

export const starterNodes = [
  ["项目设置", "先锁定项目范围和权威资料。", ["法律实体已确认", "报告期间已确认", "报告框架已确认", "试算表及总账权威版本已确认"]],
  ["客户提供资料", "追踪客户资料的发出、接收和未完成事项。", ["资料清单已发出", "关键资料已收到", "未清资料清单已复核"]],
  ["试算表及总账衔接", "确认审计基础数据完整、平衡并与总账衔接。", ["试算表已收到", "总账已收到", "试算表与总账衔接检查已完成"]],
  ["审计执行", "完成主要工作底稿并处理审计调整。", ["主要工作底稿已完成", "调整事项已处理"]],
  ["财务报表", "完成报表数字和披露复核。", ["财务报表初稿已准备", "报表数字已核对", "报表复核点已清理"]],
  ["签署与归档", "完成签署文件和最终文件整理。", ["签署文件已准备", "已签文件已收回", "最终文件已归档"]],
];

export const starterNodesEnglish = [
  ["Engagement setup", "Confirm the engagement scope and authoritative sources.",
    ["Legal entity confirmed", "Reporting period confirmed", "Reporting framework confirmed", "Authoritative trial balance and general ledger versions confirmed"]],
  ["PBC documents", "Track client requests, receipts and unresolved document gaps.",
    ["PBC request list issued", "Key documents received", "Outstanding request list reviewed"]],
  ["Trial balance and general ledger", "Confirm that the audit data is complete, balanced and reconciled to the general ledger.",
    ["Trial balance received", "General ledger received", "Trial balance-to-ledger reconciliation completed"]],
  ["Audit execution", "Complete the main workpapers and process audit adjustments.",
    ["Main workpapers completed", "Audit adjustments processed"]],
  ["Financial statements", "Complete the financial statement figures and disclosure review.",
    ["Draft financial statements prepared", "Financial statement figures agreed", "Financial statement review points cleared"]],
  ["Signing and archive", "Complete signing documents and final file assembly.",
    ["Signing documents prepared", "Signed documents received", "Final file archived"]],
];

export const quoteCollectionStarterNodes = [
  ["报价", "确认服务范围、收费及报价版本。", ["服务范围及收费已确认", "报价已发送客户"]],
  ["接受委聘", "记录客户接受报价及委聘安排。", ["客户已接受报价", "委聘文件已签署或接受方式已记录"]],
  ["开票", "完成账单资料及发票发出。", ["开票资料已确认", "发票已发出"]],
  ["收款", "追踪款项直至收款或经批准结案。", ["收款状态已更新", "款项已收妥或未收款结案已获批准"]],
];

export const quoteCollectionStarterNodesEnglish = [
  ["Quotation", "Confirm the service scope, fee and quotation version.", ["Service scope and fee confirmed", "Quotation sent to the client"]],
  ["Engagement acceptance", "Record the client's acceptance and engagement arrangements.", ["Client accepted the quotation", "Engagement document signed or acceptance method recorded"]],
  ["Billing", "Complete billing details and issue the invoice.", ["Billing details confirmed", "Invoice issued"]],
  ["Collection", "Track payment until received or an approved close-out.", ["Collection status updated", "Payment received or non-collection close-out approved"]],
];

export const taxStarterNodes = [
  ["税务资料准备", "收集并确认税务计算及报税所需资料。", ["税务资料已收齐", "账目与税务期间已确认"]],
  ["税务计算", "完成税务调整、计算及内部复核。", ["税务计算初稿已完成", "主要税务调整已复核"]],
  ["客户批准及签署", "向客户发出文件并取得所需批准或签署。", ["客户意见已处理", "所需批准或签署已取得"]],
  ["提交及回执", "完成报税提交并保存提交证明。", ["报税表及附件已提交", "提交回执或记录已保存"]],
];

export const taxStarterNodesEnglish = [
  ["Tax information", "Collect and confirm information required for the tax computation and filing.", ["Tax information received", "Accounts and tax period confirmed"]],
  ["Tax computation", "Complete tax adjustments, the computation and internal review.", ["Draft tax computation completed", "Key tax adjustments reviewed"]],
  ["Client approval and signing", "Send documents to the client and obtain required approval or signatures.", ["Client comments resolved", "Required approval or signatures obtained"]],
  ["Filing and acknowledgement", "Submit the filing and retain submission evidence.", ["Return and attachments submitted", "Submission acknowledgement or record saved"]],
];

export const cddStarterNodes = [
  ["身份资料", "确认客户及相关人士的身份资料。", ["客户身份资料已取得", "授权代表资料已确认"]],
  ["所有权与控制人", "记录最终实益拥有人及控制结构。", ["所有权结构已记录", "最终实益拥有人及控制人已确认"]],
  ["风险评估", "完成客户风险评估及所需跟进。", ["风险评级已完成", "高风险事项及额外程序已记录"]],
  ["批准及复核日期", "完成内部批准并设定下次复核。", ["客户尽职调查已获内部批准", "下次复核日期已记录"]],
];

export const cddStarterNodesEnglish = [
  ["Identity information", "Confirm identity information for the client and relevant persons.", ["Client identity information obtained", "Authorised representative information confirmed"]],
  ["Ownership and control", "Record ultimate beneficial owners and the control structure.", ["Ownership structure recorded", "Ultimate beneficial owners and controllers confirmed"]],
  ["Risk assessment", "Complete the client risk assessment and required follow-up.", ["Risk rating completed", "High-risk matters and additional procedures recorded"]],
  ["Approval and review date", "Complete internal approval and set the next review date.", ["Customer due diligence internally approved", "Next review date recorded"]],
];

const workflowDefinitions = {
  quote_collection: { zh: quoteCollectionStarterNodes, en: quoteCollectionStarterNodesEnglish,
    names: ["报价与收款流程", "Quotation and Collection Workflow"], descriptions: ["内置报价与收款范本", "Built-in quotation and collection template"] },
  audit: { zh: starterNodes, en: starterNodesEnglish,
    names: ["基础审计流程", "Core Audit Workflow"], descriptions: ["内置审计流程范本", "Built-in audit workflow template"] },
  tax_computation_filing: { zh: taxStarterNodes, en: taxStarterNodesEnglish,
    names: ["税务计算及报税流程", "Tax Computation and Filing Workflow"], descriptions: ["内置税务计算及报税范本", "Built-in tax computation and filing template"] },
  cdd: { zh: cddStarterNodes, en: cddStarterNodesEnglish,
    names: ["客户尽职调查基础流程", "Customer Due Diligence Workflow"], descriptions: ["内置客户尽职调查范本", "Built-in customer due diligence template"] },
};

const workflowTextPairs = Object.values(workflowDefinitions).flatMap((definition) => definition.zh.flatMap((node, index) => {
  const englishNode = definition.en[index];
  return [[node[0], englishNode[0]], [node[1], englishNode[1]],
    ...node[2].map((condition, conditionIndex) => [condition, englishNode[2][conditionIndex]])];
}));
const groupWorkflowTextPairs = groupStarterNodes.flatMap((node, index) => {
  const englishNode = groupStarterNodesEnglish[index];
  return [[node[0], englishNode[0]], [node[1], englishNode[1]],
    ...node[2].map((condition, conditionIndex) => [condition, englishNode[2][conditionIndex]])];
});
const groupReadinessTextPairs = GROUP_AUDIT_TYPES.flatMap((auditType) =>
  groupReadinessTemplates[auditType].map((label, index) => [label, groupReadinessTemplatesEnglish[auditType][index]]));
const sampleMetadataTextPairs = [
  ["基础审计流程", "Core Audit Workflow"],
  ["内置审计流程范本", "Built-in audit workflow template"],
  ["内置流程范本", "Built-in audit workflow template"],
  ["固定流程范本", "Built-in workflow template"],
  ["CDD 基础流程", "Core CDD Workflow"],
  ...Object.values(workflowDefinitions).flatMap((definition) => [definition.names, definition.descriptions]),
];
const groupSampleMetadataTextPairs = [
  ["集团合并流程", "Group Consolidation Workflow"],
  ["内置集团流程范本", "Built-in group workflow template"],
];

const legacyProfessionalText = new Map([
  ["CDD 基础流程", "客户尽职调查基础流程"],
  ["Core CDD Workflow", "Customer Due Diligence Workflow"],
  ["CDD 已获内部批准", "客户尽职调查已获内部批准"],
  ["CDD internally approved", "Customer due diligence internally approved"],
  ["TB／A4权威来源已确认", "试算表及总账权威版本已确认"],
  ["Authoritative TB / A4 source confirmed", "试算表及总账权威版本已确认"],
  ["TB／A4", "试算表及总账衔接"],
  ["TB / A4", "试算表及总账衔接"],
  ["确认审计数字基础已准备好。", "确认审计基础数据完整、平衡并与总账衔接。"],
  ["Confirm that the audit number base is ready.", "确认审计基础数据完整、平衡并与总账衔接。"],
  ["TB已收到", "试算表已收到"],
  ["A4已建立或更新", "总账已收到"],
  ["A4 prepared or updated", "总账已收到"],
  ["TB与A4平衡检查已完成", "试算表与总账衔接检查已完成"],
  ["TB-to-A4 balance check completed", "试算表与总账衔接检查已完成"],
]);

function professionalizeLegacyText(value) {
  return legacyProfessionalText.get(value) || value;
}

function localizeKnownText(value, language, pairs = workflowTextPairs) {
  const professional = professionalizeLegacyText(value);
  const pair = pairs.find(([chinese, english]) => professional === chinese || professional === english);
  if (!pair) return value;
  const localized = pair[language === "en" ? 1 : 0];
  return language === "zh-Hant" ? toTraditional(localized) : localized;
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
    title: holdingCompanyTerminology(localizeKnownText(node.title, language, groupWorkflowTextPairs), language),
    description: holdingCompanyTerminology(localizeKnownText(node.description, language, groupWorkflowTextPairs), language),
    conditions: node.conditions.map((condition) => ({ ...condition,
      label: holdingCompanyTerminology(localizeKnownText(condition.label, language, groupWorkflowTextPairs), language),
    })),
  }));
}

export function localizeReadinessConditions(conditions, language = "zh") {
  return (conditions || []).map((condition) => ({ ...condition,
    label: holdingCompanyTerminology(localizeKnownText(condition.label, language, groupReadinessTextPairs), language),
  }));
}

function holdingCompanyTerminology(text, language = "zh") {
  if (language === "en") return text.replace(/\bSubgroups\b/gu, "Intermediate holding companies")
    .replace(/\bsubgroups\b/gu, "intermediate holding companies")
    .replace(/\bSubgroup\b/gu, "Intermediate holding company")
    .replace(/\bsubgroup\b/gu, "intermediate holding company")
    .replace(/\bGroups\b/gu, "Holding companies")
    .replace(/\bgroups\b/gu, "holding companies")
    .replace(/\bGroup\b/gu, "Holding company")
    .replace(/\bgroup\b/gu, "holding company");
  const simplified = text.replaceAll("子集团", "中间控股公司").replaceAll("集团", "控股公司");
  return language === "zh-Hant" ? toTraditional(simplified) : simplified;
}

export function uid(prefix) {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function createDefaultOutstandingStatuses() {
  return defaultOutstandingStatusDefinitions.map(({ id, label, closed, tone, color }) => ({
    id,
    builtinKey: id,
    label,
    closed,
    tone,
    color,
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
      color: /^#[0-9a-f]{6}$/iu.test(status?.color || "") ? status.color : (builtin?.color || "#778078"),
    };
  });
  return statuses.length ? statuses : createDefaultOutstandingStatuses();
}

export function localizeOutstandingStatuses(statuses, language = "zh") {
  return statuses.map((status) => {
    const builtin = defaultOutstandingStatusDefinitions.find((item) => item.id === status.builtinKey);
    return builtin ? { ...status, label: language === "en" ? builtin.labelEn
      : language === "zh-Hant" ? toTraditional(builtin.label) : builtin.label } : status;
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

export function workstreamTypeLabel(type, language = "zh", customName = "") {
  if (customName) return customName;
  if (type === "custom") return customName || (language === "en" ? "Custom workstream"
    : language === "zh-Hant" ? "自訂模組" : "自定义模块");
  const labels = {
    quote_collection: ["报价与收款", "Quotation & collection"],
    audit: ["审计", "Audit"],
    tax_computation_filing: ["税务计算及报税", "Tax computation & filing"],
    cdd: ["客户尽职调查", "Customer due diligence"],
  };
  const label = labels[type]?.[language === "en" ? 1 : 0] || type;
  return language === "zh-Hant" ? toTraditional(label) : label;
}

export function createDefaultWorkstreamCategories() {
  return WORKSTREAM_TYPES.map((type) => ({ id: type, builtinType: type, name: "" }));
}

export function normalizeWorkstreamCategories(value) {
  if (!Array.isArray(value)) return createDefaultWorkstreamCategories();
  const builtinTypes = new Set(WORKSTREAM_TYPES);
  const categories = [];
  const seen = new Set();
  (Array.isArray(value) ? value : []).forEach((category) => {
    const id = typeof category?.id === "string" ? category.id.trim() : "";
    const name = typeof category?.name === "string" ? category.name.trim() : "";
    if (!id || seen.has(id) || id === "group" || (!builtinTypes.has(id) && !name)) return;
    seen.add(id);
    categories.push(builtinTypes.has(id) ? { id, builtinType: id, name } : { id, name });
  });
  return categories.length ? categories : createDefaultWorkstreamCategories();
}

export function workstreamCategoryLabel(category, language = "zh") {
  return category?.name || (category?.builtinType ? workstreamTypeLabel(category.builtinType, language) : "");
}

export function createDefaultSample(language = "zh", workstreamType = "audit") {
  const type = BUILTIN_WORKSTREAM_TYPES.includes(workstreamType) ? workstreamType : "audit";
  const english = language === "en";
  const definition = workflowDefinitions[type];
  return {
    id: `sample-${WORKSTREAM_SAMPLE_KEYS[type]}`,
    builtinKey: WORKSTREAM_SAMPLE_KEYS[type],
    workstreamType: type,
    categoryId: type,
    name: language === "zh-Hant" ? toTraditional(definition.names[0]) : definition.names[english ? 1 : 0],
    description: language === "zh-Hant" ? toTraditional(definition.descriptions[0]) : definition.descriptions[english ? 1 : 0],
    updatedAt: new Date().toISOString(),
    nodes: (english ? definition.en : definition.zh).map(([title, description, conditions]) => makeNode({
      title: language === "zh-Hant" ? toTraditional(title) : title,
      description: language === "zh-Hant" ? toTraditional(description) : description,
      conditions: language === "zh-Hant" ? conditions.map(toTraditional) : conditions,
    })),
  };
}

export function createDefaultSamples(language = "zh") {
  return BUILTIN_WORKSTREAM_TYPES.map((type) => createDefaultSample(language, type));
}

function sampleContentMatches(sample, name, description, nodes) {
  if (sample.name !== name || ![description, "固定流程范本"].includes(sample.description)) return false;
  return JSON.stringify(sample.nodes.map((node) => [node.title, node.description,
    node.conditions.map((condition) => condition.label)])) === JSON.stringify(nodes);
}

function builtinSampleType(sample) {
  return BUILTIN_WORKSTREAM_TYPES.find((type) => {
    const definition = workflowDefinitions[type];
    return sampleContentMatches(sample, definition.names[0], definition.descriptions[0], definition.zh)
      || sampleContentMatches(sample, definition.names[1], definition.descriptions[1], definition.en)
      || (type === "audit" && (sampleContentMatches(sample, "基础审计流程", "内置流程范本", starterNodes)
        || sampleContentMatches(sample, "Core Audit Workflow", "Built-in workflow template", starterNodesEnglish)));
  });
}

export function normalizeSample(value) {
  if (!value || !Array.isArray(value.nodes)) return createDefaultSample();
  const knownBuiltinType = Object.entries(WORKSTREAM_SAMPLE_KEYS).find(([, key]) => value.builtinKey === key)?.[0];
  const type = WORKSTREAM_TYPES.includes(value.workstreamType) ? value.workstreamType : (knownBuiltinType || "audit");
  const normalized = {
    id: value.id || "sample-main",
    builtinKey: knownBuiltinType ? value.builtinKey : undefined,
    workstreamType: type,
    categoryId: typeof value.categoryId === "string" && value.categoryId.trim() ? value.categoryId.trim() : type,
    name: typeof value.name === "string" && value.name.trim() ? professionalizeLegacyText(value.name.trim()) : "未命名范本",
    description: typeof value.description === "string" ? value.description : "",
    updatedAt: value.updatedAt || new Date().toISOString(),
    nodes: value.nodes.map((node) => ({
      id: node.id || uid("sample-node"),
      title: typeof node.title === "string" && node.title.trim() ? professionalizeLegacyText(node.title.trim()) : "未命名节点",
      description: node.description === "完成主要工作底稿并处理待清事项。"
        ? "完成主要工作底稿并处理审计调整。" : (typeof node.description === "string" ? professionalizeLegacyText(node.description) : ""),
      conditions: Array.isArray(node.conditions) ? node.conditions.map((condition) => ({
        id: condition?.id || uid("sample-condition"),
        label: professionalizeLegacyText(typeof condition === "string" ? condition : (typeof condition?.label === "string" ? condition.label : "")),
        done: false,
      })).filter((condition) => condition.label.trim() && condition.label.trim() !== "待清事项已复核") : [],
    })),
  };
  const matchedType = !normalized.builtinKey && builtinSampleType(normalized);
  if (matchedType) {
    normalized.builtinKey = WORKSTREAM_SAMPLE_KEYS[matchedType];
    normalized.workstreamType = matchedType;
  }
  return normalized;
}

export function localizeSample(sample, language = "zh") {
  const builtinType = Object.entries(WORKSTREAM_SAMPLE_KEYS).find(([, key]) => sample?.builtinKey === key)?.[0];
  if (builtinType) {
    return { ...createDefaultSample(language, builtinType), id: sample.id, updatedAt: sample.updatedAt };
  }
  return { ...sample,
    name: localizeKnownText(sample.name, language, sampleMetadataTextPairs),
    description: localizeKnownText(sample.description, language, sampleMetadataTextPairs),
    nodes: localizeWorkflowNodes(sample.nodes, language),
  };
}

export function makeBlankSample(language = "zh", workstreamType = "audit", categoryId = workstreamType) {
  return {
    id: uid("sample"),
    workstreamType: WORKSTREAM_TYPES.includes(workstreamType) ? workstreamType : "audit",
    categoryId: typeof categoryId === "string" && categoryId.trim() ? categoryId.trim() : workstreamType,
    name: language === "en" ? "New Template" : language === "zh-Hant" ? "新範本" : "新范本",
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

export function makeWorkstream(values = {}, sample = null) {
  const now = new Date().toISOString();
  const type = WORKSTREAM_TYPES.includes(values.type) ? values.type : "audit";
  const sourceNodes = Array.isArray(sample) ? sample : sample?.nodes;
  return {
    id: values.id || uid("workstream"),
    type,
    categoryId: typeof values.categoryId === "string" && values.categoryId.trim() ? values.categoryId.trim() : type,
    customName: values.customName?.trim() || (type === "custom" ? "自定义模块" : ""),
    owner: values.owner?.trim() || "",
    dueDate: values.dueDate || "",
    createdAt: values.createdAt || now,
    updatedAt: values.updatedAt || now,
    nodes: (sourceNodes || []).map((node) => makeNode({
      title: node.title,
      description: node.description,
      conditions: node.conditions.map((condition) => condition.label),
    })),
  };
}

export function normalizeWorkstream(value, projectDefaults = {}) {
  const now = new Date().toISOString();
  const type = WORKSTREAM_TYPES.includes(value?.type) ? value.type : "audit";
  return {
    id: value?.id || uid("workstream"),
    type,
    categoryId: typeof value?.categoryId === "string" && value.categoryId.trim() ? value.categoryId.trim() : type,
    customName: typeof value?.customName === "string" && value.customName.trim()
      ? value.customName.trim() : (type === "custom" ? "自定义模块" : ""),
    owner: typeof value?.owner === "string" ? value.owner : (projectDefaults.owner || ""),
    dueDate: typeof value?.dueDate === "string" ? value.dueDate : (projectDefaults.dueDate || ""),
    createdAt: value?.createdAt || now,
    updatedAt: value?.updatedAt || now,
    nodes: normalizeNodeList(value?.nodes),
  };
}

export function localizeWorkstream(workstream, language = "zh") {
  return { ...workstream, displayName: workstreamTypeLabel(workstream.type, language, workstream.customName),
    nodes: localizeWorkflowNodes(workstream.nodes, language) };
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
    name: english ? "Holding Company Consolidation Workflow" : language === "zh-Hant" ? "控股公司合併流程" : "控股公司合并流程",
    description: english ? "Built-in holding-company workflow template" : language === "zh-Hant" ? "內置控股公司流程範本" : "内置控股公司流程范本",
    updatedAt: new Date().toISOString(),
    nodes: (english ? groupStarterNodesEnglish : groupStarterNodes).map(([title, description, conditions]) => makeNode({
      title: holdingCompanyTerminology(title, language),
      description: holdingCompanyTerminology(description, language),
      conditions: conditions.map((condition) => holdingCompanyTerminology(condition, language)),
    })),
    readinessTemplates: copyReadinessTemplates(language === "zh-Hant"
      ? Object.fromEntries(Object.entries(readiness).map(([key, conditions]) => [key, conditions.map((condition) => toTraditional(
        typeof condition === "string" ? condition : condition.label))])) : readiness),
  };
}

export function normalizeGroupSample(value) {
  if (!value || !Array.isArray(value.nodes)) return createDefaultGroupSample();
  return {
    id: value.id || uid("group-sample"),
    builtinKey: value.builtinKey === CORE_GROUP_SAMPLE_KEY ? CORE_GROUP_SAMPLE_KEY : undefined,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名控股公司范本",
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
    name: holdingCompanyTerminology(localizeKnownText(sample.name, language, groupSampleMetadataTextPairs), language),
    description: holdingCompanyTerminology(localizeKnownText(sample.description, language, groupSampleMetadataTextPairs), language),
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
    name: language === "en" ? "New Holding Company Template" : language === "zh-Hant" ? "新控股公司範本" : "新控股公司范本",
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
    period: values.period?.trim() || "",
    periodStart: values.periodStart || "",
    periodEnd: values.periodEnd || "",
    startDate: values.startDate || "",
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
    workstreamId: typeof values.workstreamId === "string" && values.workstreamId ? values.workstreamId : null,
    createdAt: values.createdAt || now,
    updatedAt: values.updatedAt || now,
  };
}

function normalizeNodeList(nodes, removeLegacyOutstanding = false) {
  return Array.isArray(nodes) ? nodes.map((node) => ({
    id: node?.id || uid("node"),
    title: typeof node?.title === "string" ? professionalizeLegacyText(node.title) : "",
    description: removeLegacyOutstanding && node?.description === "完成主要工作底稿并处理待清事项。"
      ? "完成主要工作底稿并处理审计调整。" : (typeof node?.description === "string" ? professionalizeLegacyText(node.description) : ""),
    conditions: Array.isArray(node?.conditions) ? node.conditions.filter((condition) =>
      !removeLegacyOutstanding || condition?.label !== "待清事项已复核").map((condition) => ({
      id: condition?.id || uid("condition"),
      label: typeof condition?.label === "string" ? professionalizeLegacyText(condition.label) : "",
      done: Boolean(condition?.done),
    })) : [],
  })) : [];
}

export function normalizeStore(value) {
  const outstandingStatuses = normalizeOutstandingStatuses(value.outstandingStatuses);
  const workstreamCategories = normalizeWorkstreamCategories(value.workstreamCategories);
  const categoryById = new Map(workstreamCategories.map((category) => [category.id, category]));
  const rawSamples = Array.isArray(value.samples) ? value.samples : [value.sample];
  const restoreMissingBuiltinSamples = value.version !== STORE_VERSION || !Array.isArray(value.samples);
  const seenSampleIds = new Set();
  const samples = rawSamples.filter(Boolean).map((sample) => {
    const normalized = normalizeSample(sample);
    const category = categoryById.get(normalized.categoryId);
    if (!category || (category.builtinType || "custom") !== normalized.workstreamType) {
      normalized.categoryId = normalized.workstreamType;
    }
    if (seenSampleIds.has(normalized.id)) normalized.id = uid("sample");
    seenSampleIds.add(normalized.id);
    return normalized;
  });
  if (restoreMissingBuiltinSamples) BUILTIN_WORKSTREAM_TYPES.forEach((type) => {
    if (!samples.some((sample) => sample.workstreamType === type)) {
      const fallback = createDefaultSample("zh", type);
      if (seenSampleIds.has(fallback.id)) fallback.id = uid("sample");
      seenSampleIds.add(fallback.id);
      samples.push(fallback);
    }
  });
  const legacySelectedSampleId = samples.some((sample) => sample.id === value.selectedSampleId)
    ? value.selectedSampleId : undefined;
  const selectedSampleIdsByCategory = Object.fromEntries(workstreamCategories.map((category) => {
    const requested = value.selectedSampleIdsByCategory?.[category.id] || value.selectedSampleIdsByType?.[category.id]
      || (category.id === "audit" ? legacySelectedSampleId : undefined);
    const selected = samples.find((sample) => sample.id === requested && sample.categoryId === category.id)
      || samples.find((sample) => sample.categoryId === category.id);
    return [category.id, selected?.id || null];
  }));
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
  const normalizeConversionState = (state) => {
    if (!state || typeof state !== "object") return undefined;
    const normalized = {};
    if (state.project && typeof state.project === "object") normalized.project = {
      entity: typeof state.project.entity === "string" ? state.project.entity : "",
      reportingFramework: typeof state.project.reportingFramework === "string" ? state.project.reportingFramework : "",
      workstreams: Array.isArray(state.project.workstreams)
        ? state.project.workstreams.map((workstream) => normalizeWorkstream(workstream)) : [],
    };
    if (state.group && typeof state.group === "object") normalized.group = {
      consolidationEnabled: state.group.consolidationEnabled !== false,
      nodes: normalizeNodeList(state.group.nodes),
    };
    return Object.keys(normalized).length ? normalized : undefined;
  };
  const projects = value.projects.map((project) => {
    const owner = typeof project.owner === "string" ? project.owner : "";
    const dueDate = typeof project.dueDate === "string" ? project.dueDate : "";
    const rawWorkstreams = Array.isArray(project.workstreams) && project.workstreams.length
      ? project.workstreams : [{ id: `${project.id || uid("project")}-audit`, type: "audit", owner, dueDate,
        createdAt: project.createdAt, updatedAt: project.updatedAt, nodes: normalizeNodeList(project.nodes, true) }];
    const seenBuiltinTypes = new Set();
    const workstreams = rawWorkstreams.map((workstream) => {
      const normalized = normalizeWorkstream(workstream, { owner, dueDate });
      const category = categoryById.get(normalized.categoryId);
      return !category || (category.builtinType || "custom") !== normalized.type
        ? { ...normalized, categoryId: normalized.type } : normalized;
    })
      .filter((workstream) => {
        if (workstream.type === "custom") return true;
        if (seenBuiltinTypes.has(workstream.type)) return false;
        seenBuiltinTypes.add(workstream.type);
        return true;
      });
    if (!workstreams.length) workstreams.push(makeWorkstream({ type: "audit", owner, dueDate }, []));
    const workstreamIds = new Set(workstreams.map((workstream) => workstream.id));
    const outstandingItems = Array.isArray(project.outstandingItems)
      ? project.outstandingItems.map((item) => {
        const normalized = makeOutstandingItem(item, outstandingStatuses);
        return { ...normalized, workstreamId: workstreamIds.has(normalized.workstreamId) ? normalized.workstreamId : null };
      }) : [];
    return {
      id: project?.id || uid("project"),
      name: typeof project?.name === "string" && project.name.trim() ? project.name.trim() : "未命名项目",
      entity: typeof project?.entity === "string" ? project.entity : "",
      reportingFramework: typeof project?.reportingFramework === "string" ? project.reportingFramework : "",
      period: typeof project?.period === "string" ? project.period : "",
      periodStart: typeof project?.periodStart === "string" ? project.periodStart : "",
      periodEnd: typeof project?.periodEnd === "string" ? project.periodEnd : "",
      startDate: typeof project?.startDate === "string" ? project.startDate : "",
      dueDate,
      owner,
      notes: typeof project?.notes === "string" ? project.notes : "",
      archived: Boolean(project?.archived),
      createdAt: project?.createdAt || new Date().toISOString(),
      updatedAt: project?.updatedAt || new Date().toISOString(),
      outstandingItems,
      workstreams,
      conversionState: normalizeConversionState(project?.conversionState),
    };
  });
  const groups = Array.isArray(value.groups) ? value.groups.map((group) => ({
    id: group?.id || uid("group"),
    name: typeof group?.name === "string" && group.name.trim() ? group.name.trim() : "未命名控股公司",
    period: typeof group?.period === "string" ? group.period : "",
    periodStart: typeof group?.periodStart === "string" ? group.periodStart : "",
    periodEnd: typeof group?.periodEnd === "string" ? group.periodEnd : "",
    startDate: typeof group?.startDate === "string" ? group.startDate : "",
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
    conversionState: normalizeConversionState(group?.conversionState),
  })) : [];
  return {
    version: STORE_VERSION,
    projects,
    groups,
    samples,
    workstreamCategories,
    selectedSampleIdsByCategory,
    groupSamples,
    selectedGroupSampleId,
    outstandingStatuses,
  };
}

export function makeProject(values, useStarter = true, sampleSource = null, categorySource = null) {
  const now = new Date().toISOString();
  const legacyNodes = Array.isArray(sampleSource) && sampleSource.length && "title" in sampleSource[0] ? sampleSource : null;
  const suppliedSampleLibrary = Array.isArray(sampleSource) && !legacyNodes;
  const availableSamples = Array.isArray(sampleSource) && !legacyNodes ? sampleSource : createDefaultSamples();
  const availableCategories = normalizeWorkstreamCategories(categorySource);
  const categoryById = new Map(availableCategories.map((category) => [category.id, category]));
  const selections = Array.isArray(values.workstreamSelections) && values.workstreamSelections.length
    ? values.workstreamSelections : [{ type: "audit" }];
  const seenBuiltinTypes = new Set();
  const cleanedSelections = selections.filter((selection) => {
    const type = WORKSTREAM_TYPES.includes(selection.type) ? selection.type : "audit";
    if (type === "custom") return Boolean(selection.customName?.trim());
    if (seenBuiltinTypes.has(type)) return false;
    seenBuiltinTypes.add(type);
    return true;
  });
  if (!cleanedSelections.length) cleanedSelections.push({ type: "audit" });
  const workstreams = cleanedSelections.map((selection) => {
    const type = WORKSTREAM_TYPES.includes(selection.type) ? selection.type : "audit";
    const requestedCategory = categoryById.get(selection.categoryId || type);
    const categoryId = requestedCategory && (requestedCategory.builtinType || "custom") === type
      ? requestedCategory.id : type;
    const sample = legacyNodes && type === "audit" ? legacyNodes
      : availableSamples.find((item) => item.id === selection.sampleId && item.categoryId === categoryId)
        || availableSamples.find((item) => item.categoryId === categoryId)
        || (!suppliedSampleLibrary && type !== "custom" ? createDefaultSample("zh", type) : null);
    return makeWorkstream({ type, categoryId, customName: selection.customName, owner: selection.owner || values.owner,
      dueDate: selection.dueDate || values.dueDate }, useStarter ? sample : []);
  });
  return {
    id: uid("project"),
    name: values.name?.trim() || "未命名项目",
    entity: values.entity?.trim() || "",
    reportingFramework: values.reportingFramework?.trim() || "",
    period: values.period?.trim() || "",
    periodStart: values.periodStart || "",
    periodEnd: values.periodEnd || "",
    startDate: values.startDate || "",
    dueDate: values.dueDate || "",
    owner: values.owner?.trim() || "",
    notes: values.notes?.trim() || "",
    archived: false,
    createdAt: now,
    updatedAt: now,
    outstandingItems: [],
    workstreams,
  };
}

function mergeConversionState(current, patch) {
  const state = current && typeof current === "object" ? current : {};
  return { ...state, ...patch };
}

export function convertProjectToGroup(store, projectId, groupSample = createDefaultGroupSample()) {
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) return store;
  const previousGroup = project.conversionState?.group;
  const consolidationEnabled = previousGroup?.consolidationEnabled !== false;
  const starterNodes = previousGroup?.nodes || groupSample?.nodes || [];
  const now = new Date().toISOString();
  const group = {
    id: project.id,
    name: project.entity || project.name || "未命名控股公司",
    period: project.period || "",
    periodStart: project.periodStart || "",
    periodEnd: project.periodEnd || "",
    startDate: project.startDate || "",
    dueDate: project.dueDate || "",
    owner: project.owner || "",
    notes: project.notes || "",
    consolidationEnabled,
    archived: Boolean(project.archived),
    createdAt: project.createdAt || now,
    updatedAt: now,
    members: [],
    outstandingItems: (project.outstandingItems || []).map((item) => ({ ...item, workstreamId: null, updatedAt: now })),
    nodes: consolidationEnabled ? normalizeNodeList(starterNodes) : [],
    conversionState: mergeConversionState(project.conversionState, { project: {
      entity: project.entity || "",
      reportingFramework: project.reportingFramework || "",
      workstreams: (project.workstreams || []).map((workstream) => normalizeWorkstream(workstream,
        { owner: project.owner, dueDate: project.dueDate })),
    } }),
  };
  return { ...store,
    projects: store.projects.filter((item) => item.id !== projectId),
    groups: [...store.groups.map((parent) => ({ ...parent, members: parent.members.map((member) =>
      member.kind === "project" && member.refId === projectId
        ? makeGroupMember({ id: member.id, kind: "group", refId: projectId, role: member.role }, groupSample) : member) })), group],
  };
}

export function convertGroupToProject(store, groupId, groupSample = createDefaultGroupSample()) {
  const group = store.groups.find((item) => item.id === groupId);
  if (!group) return store;
  const savedProject = group.conversionState?.project;
  const baseProject = makeProject({ name: group.name, entity: savedProject?.entity || group.name,
    reportingFramework: savedProject?.reportingFramework || "", period: group.period, periodStart: group.periodStart,
    periodEnd: group.periodEnd, startDate: group.startDate, dueDate: group.dueDate, owner: group.owner, notes: group.notes,
    workstreamSelections: [{ type: "audit", categoryId: "audit", sampleId: store.selectedSampleIdsByCategory?.audit }] },
  true, store.samples, store.workstreamCategories);
  const now = new Date().toISOString();
  const workstreams = savedProject?.workstreams?.length
    ? savedProject.workstreams.map((workstream) => normalizeWorkstream(workstream, { owner: group.owner, dueDate: group.dueDate }))
    : baseProject.workstreams;
  const workstreamIds = new Set(workstreams.map((workstream) => workstream.id));
  const project = { ...baseProject,
    id: group.id,
    name: group.name,
    entity: savedProject?.entity || group.name,
    reportingFramework: savedProject?.reportingFramework || "",
    period: group.period || "",
    periodStart: group.periodStart || "",
    periodEnd: group.periodEnd || "",
    startDate: group.startDate || "",
    dueDate: group.dueDate || "",
    owner: group.owner || "",
    notes: group.notes || "",
    archived: Boolean(group.archived),
    createdAt: group.createdAt || now,
    updatedAt: now,
    outstandingItems: (group.outstandingItems || []).map((item) => ({ ...item,
      workstreamId: workstreamIds.has(item.workstreamId) ? item.workstreamId : null, updatedAt: now })),
    workstreams,
    conversionState: mergeConversionState(group.conversionState, { group: {
      consolidationEnabled: group.consolidationEnabled !== false,
      nodes: normalizeNodeList(group.nodes),
    } }),
  };
  return { ...store,
    projects: [...store.projects, project],
    groups: store.groups.filter((item) => item.id !== groupId).map((parent) => ({ ...parent,
      members: parent.members.map((member) => member.kind === "group" && member.refId === groupId
        ? makeGroupMember({ id: member.id, kind: "project", refId: groupId, role: member.role,
          auditType: "internal_team" }, groupSample) : member) })),
  };
}

export function emptyStore() {
  const samples = createDefaultSamples();
  const groupSample = createDefaultGroupSample();
  const workstreamCategories = createDefaultWorkstreamCategories();
  return { version: STORE_VERSION, projects: [], groups: [], samples, workstreamCategories,
    selectedSampleIdsByCategory: Object.fromEntries(workstreamCategories.map((category) => [category.id,
      samples.find((sample) => sample.categoryId === category.id)?.id || null])),
    groupSamples: [groupSample], selectedGroupSampleId: groupSample.id,
    outstandingStatuses: createDefaultOutstandingStatuses() };
}

export function isValidStore(value) {
  return value && [1, 2, 3, 4, 5, 6, 7, STORE_VERSION].includes(value.version) && Array.isArray(value.projects);
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

export function workflowStats(target) {
  const nodes = Array.isArray(target) ? target : (target?.nodes || []);
  const conditions = nodes.flatMap((node) => node.conditions);
  const completedConditions = conditions.filter((condition) => condition.done).length;
  const completedNodes = nodes.filter(nodeIsComplete).length;
  return {
    conditions: conditions.length,
    completedConditions,
    nodes: nodes.length,
    completedNodes,
    percentage: conditions.length ? Math.round((completedConditions / conditions.length) * 100) : 0,
    complete: nodes.length > 0 && nodes.every(nodeIsComplete),
    started: completedConditions > 0,
  };
}

export function workstreamStats(workstream) {
  return workflowStats(workstream?.nodes || []);
}

export function projectStats(project) {
  if (!Array.isArray(project?.workstreams)) return workflowStats(project);
  const workstreamResults = project.workstreams.map((workstream) => ({ id: workstream.id, ...workstreamStats(workstream) }));
  const conditions = workstreamResults.reduce((sum, stats) => sum + stats.conditions, 0);
  const completedConditions = workstreamResults.reduce((sum, stats) => sum + stats.completedConditions, 0);
  const nodes = workstreamResults.reduce((sum, stats) => sum + stats.nodes, 0);
  const completedNodes = workstreamResults.reduce((sum, stats) => sum + stats.completedNodes, 0);
  const completedWorkstreams = workstreamResults.filter((stats) => stats.complete).length;
  return {
    workstreams: workstreamResults.length,
    completedWorkstreams,
    inProgressWorkstreams: workstreamResults.filter((stats) => !stats.complete).length,
    conditions,
    completedConditions,
    nodes,
    completedNodes,
    percentage: conditions ? Math.round((completedConditions / conditions) * 100) : 0,
    complete: workstreamResults.length > 0 && completedWorkstreams === workstreamResults.length,
    started: completedConditions > 0,
  };
}

export function projectIsComplete(project) {
  return projectStats(project).complete;
}

export function navigationStatusCounts(store) {
  const counts = { active: 0, completed: 0, all: 0, archived: 0 };
  const records = [
    ...(store.projects || []).map((item) => ({ item, complete: projectStats(item).complete })),
    ...(store.groups || []).map((item) => ({ item, complete: groupProgress(store, item.id).ready })),
  ];
  records.forEach(({ item, complete }) => {
    if (item.archived) counts.archived += 1;
    else {
      counts.all += 1;
      counts[complete ? "completed" : "active"] += 1;
    }
  });
  return counts;
}

export function deadlineAlerts(store, now = new Date()) {
  const current = now instanceof Date ? new Date(now) : new Date(now);
  if (Number.isNaN(current.getTime())) return [];
  const today = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
  const makeAlert = ({ id, targetKind, targetId, scope, recordName, owner, dueDate, workstream = null }) => {
    if (!dueDate) return null;
    const due = Date.parse(`${dueDate}T00:00:00Z`);
    if (Number.isNaN(due) || due >= today) return null;
    return { id, targetKind, targetId, scope, recordName, owner: owner || "", dueDate,
      daysOverdue: Math.floor((today - due) / 86400000), workstream };
  };
  const alerts = [];

  (store.projects || []).filter((project) => !project.archived).forEach((project) => {
    const recordName = project.entity || project.name;
    if (!projectStats(project).complete) {
      const alert = makeAlert({ id: `project:${project.id}`, targetKind: "project", targetId: project.id,
        scope: "project", recordName, owner: project.owner, dueDate: project.dueDate });
      if (alert) alerts.push(alert);
    }
    (project.workstreams || []).filter((workstream) => !workstreamStats(workstream).complete
      && workstream.dueDate !== project.dueDate).forEach((workstream) => {
      const alert = makeAlert({ id: `workstream:${project.id}:${workstream.id}`, targetKind: "project", targetId: project.id,
        scope: "workstream", recordName, owner: workstream.owner || project.owner, dueDate: workstream.dueDate,
        workstream: { id: workstream.id, type: workstream.type, categoryId: workstream.categoryId,
          customName: workstream.customName || "" } });
      if (alert) alerts.push(alert);
    });
  });

  (store.groups || []).filter((group) => !group.archived && !groupProgress(store, group.id).ready).forEach((group) => {
    const alert = makeAlert({ id: `group:${group.id}`, targetKind: "group", targetId: group.id,
      scope: "group", recordName: group.name, owner: group.owner, dueDate: group.dueDate });
    if (alert) alerts.push(alert);
  });

  return alerts.sort((left, right) => right.daysOverdue - left.daysOverdue
    || left.dueDate.localeCompare(right.dueDate) || left.recordName.localeCompare(right.recordName));
}

export function findParentMembership(store, kind, refId) {
  for (const group of store.groups || []) {
    const member = group.members.find((entry) => entry.kind === kind && entry.refId === refId);
    if (member) return { group, member };
  }
  return null;
}

export function canMoveWorkspaceItem(store, kind, refId, parentGroupId = "") {
  if (!["project", "group"].includes(kind)) return false;
  const source = kind === "project" ? store.projects?.find((item) => item.id === refId)
    : store.groups?.find((item) => item.id === refId);
  if (!source || source.archived) return false;
  if (!parentGroupId) return true;
  const parent = store.groups?.find((group) => group.id === parentGroupId);
  if (!parent || parent.archived) return false;
  return kind !== "group" || (refId !== parentGroupId && !groupContainsGroup(store, refId, parentGroupId));
}

export function moveWorkspaceItem(store, kind, refId, parentGroupId = "", groupSample = createDefaultGroupSample()) {
  if (!canMoveWorkspaceItem(store, kind, refId, parentGroupId)) return store;
  const current = findParentMembership(store, kind, refId);
  if ((current?.group.id || "") === parentGroupId) return store;
  const target = parentGroupId ? store.groups.find((group) => group.id === parentGroupId) : null;
  const member = target ? (current?.member || makeGroupMember({ kind, refId,
    ...(kind === "project" ? { auditType: "internal_team" } : {}) }, groupSample)) : null;
  const now = new Date().toISOString();
  return { ...store, groups: store.groups.map((group) => {
    const withoutSource = group.members.filter((entry) => !(entry.kind === kind && entry.refId === refId));
    const members = group.id === target?.id && member ? [...withoutSource, member] : withoutSource;
    return members.length === group.members.length && members.every((entry, index) => entry === group.members[index])
      ? group : { ...group, members, updatedAt: now };
  }) };
}

export function assignProjectToGroup(store, projectId, assignment, groupSample = createDefaultGroupSample()) {
  const groupId = assignment?.groupId || "";
  const current = findParentMembership(store, "project", projectId);
  const requestedGroup = groupId ? store.groups.find((group) => group.id === groupId) : null;
  const targetGroup = requestedGroup && (!requestedGroup.archived || current?.group.id === requestedGroup.id) ? requestedGroup : null;
  const auditType = GROUP_AUDIT_TYPES.includes(assignment?.auditType) ? assignment.auditType : "internal_team";
  let nextMember = null;
  if (targetGroup) {
    nextMember = current?.group.id === targetGroup.id && current.member.auditType === auditType
      ? { ...current.member, role: assignment?.role?.trim() || "", auditType }
      : makeGroupMember({ kind: "project", refId: projectId, role: assignment?.role?.trim() || "", auditType }, groupSample);
  }
  const now = new Date().toISOString();
  return { ...store, groups: store.groups.map((group) => {
    const members = group.members.filter((member) => !(member.kind === "project" && member.refId === projectId));
    if (group.id === targetGroup?.id && nextMember) members.push(nextMember);
    if (members.length === group.members.length && group.id !== targetGroup?.id) return group;
    return { ...group, members, updatedAt: now };
  }) };
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
    const project = store.projects.find((item) => item.id === member.refId);
    if (!project || project.archived) return false;
    return member.readinessConditions.length > 0
      && member.readinessConditions.every((condition) => condition.done);
  }
  const group = store.groups.find((item) => item.id === member.refId);
  return Boolean(group && !group.archived && groupProgress(store, member.refId, visited).ready);
}

export function memberProgressPercentage(store, member, visited = new Set()) {
  if (member.kind === "group") return groupProgress(store, member.refId, visited).percentage;
  const project = store.projects.find((item) => item.id === member.refId);
  if (!project || project.archived) return 0;
  const auditWorkstream = project.workstreams.find((workstream) => workstream.type === "audit");
  if (auditWorkstream) return workstreamStats(auditWorkstream).percentage;
  const conditions = member.readinessConditions || [];
  const done = conditions.filter((condition) => condition.done).length;
  return conditions.length ? Math.round((done / conditions.length) * 100) : 0;
}

function leafReadiness(store, groupId, visited = new Set()) {
  if (visited.has(groupId)) return { ready: 0, total: 0 };
  const nextVisited = new Set(visited).add(groupId);
  const group = (store.groups || []).find((item) => item.id === groupId);
  if (!group) return { ready: 0, total: 0 };
  return group.members.reduce((summary, member) => {
    if (member.kind === "project") {
      const project = store.projects.find((item) => item.id === member.refId);
      return project && !project.archived
        ? { ready: summary.ready + (memberIsReady(store, member) ? 1 : 0), total: summary.total + 1 } : summary;
    }
    const childGroup = store.groups.find((item) => item.id === member.refId);
    if (!childGroup || childGroup.archived) return summary;
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
    ? store.projects.some((project) => project.id === member.refId && !project.archived)
    : store.groups.some((item) => item.id === member.refId && !item.archived));
  const componentPercentages = members.map((member) => memberProgressPercentage(store, member, nextVisited));
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

export function collectGroupOutstandingEntries(store, groupId, visited = new Set(), depth = 0, includeArchived = false) {
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
      if (!project || (!includeArchived && project.archived)) return [];
      return (project?.outstandingItems || []).map((item) => ({
        item, sourceType: "project", sourceId: project.id, sourceName: project.name, depth: depth + 1,
      }));
    }
    const child = store.groups.find((item) => item.id === member.refId);
    if (!child || (!includeArchived && child.archived)) return [];
    return collectGroupOutstandingEntries(store, member.refId, nextVisited, depth + 1, includeArchived);
  });
  return [...own, ...children];
}

export function activeOutstandingItems(store) {
  return [...store.projects.filter((item) => !item.archived), ...store.groups.filter((item) => !item.archived)]
    .flatMap((item) => item.outstandingItems || []);
}

export function formatDate(value, language = "zh") {
  if (!value) return language === "en" ? "No due date" : language === "zh-Hant" ? "未設定日期" : "未设置日期";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "zh-HK",
    { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function reportingPeriodLabel(item, language = "zh") {
  const start = item?.periodStart;
  const end = item?.periodEnd;
  if (start && end) return `${formatDate(start, language)} – ${formatDate(end, language)}`;
  if (start) return language === "en" ? `From ${formatDate(start, language)}`
    : language === "zh-Hant" ? `自 ${formatDate(start, language)} 起` : `自 ${formatDate(start, language)} 起`;
  if (end) return language === "en" ? `To ${formatDate(end, language)}`
    : language === "zh-Hant" ? `截至 ${formatDate(end, language)}` : `截至 ${formatDate(end, language)}`;
  return typeof item?.period === "string" ? item.period : "";
}

export function dueTone(project) {
  if (!project.dueDate || projectStats(project).complete) return "neutral";
  const due = new Date(`${project.dueDate}T23:59:59`).getTime();
  const days = Math.ceil((due - Date.now()) / 86400000);
  if (days < 0) return "danger";
  if (days <= 7) return "warning";
  return "neutral";
}
