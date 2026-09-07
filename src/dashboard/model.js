import { consolidationIsSimple, simpleModeField } from "./consolidation-mode.js";
import { toTraditional } from "./traditional.js";
import { validWorkspaceRecords, calendarDate } from "./workspace-validation.js";

export const STORAGE_KEY = "audit-progress-workbench:v1";
export const V10_RECOVERY_KEY = "audit-progress-workbench:v10-recovery";
export const STORE_VERSION = 11;
export const LEGACY_STORE_VERSION = 10;
export const FISCAL_YEAR_PRESETS = ["calendar", "apr_mar", "custom"];
export const ENGAGEMENT_PERIOD_PRESETS = [...FISCAL_YEAR_PRESETS, "doi_year_end"];
export const CORE_SAMPLE_KEY = "core-audit";
export const CORE_GROUP_SAMPLE_KEY = "core-group";

export const WORKSTREAM_TYPES = ["quote_collection", "bookkeeping", "audit", "tax_computation_filing", "cdd", "custom"];
export const BUILTIN_WORKSTREAM_TYPES = WORKSTREAM_TYPES.filter((type) => type !== "custom");
export const WORKSTREAM_TYPE_KEYS = {
  quote_collection: "报价与收款",
  bookkeeping: "账务处理",
  audit: "审计",
  tax_computation_filing: "税务计算及报税",
  cdd: "客户尽职调查",
  custom: "自定义模块",
};
export const WORKSTREAM_SAMPLE_KEYS = {
  quote_collection: "core-quote-collection",
  bookkeeping: "core-bookkeeping",
  audit: CORE_SAMPLE_KEY,
  tax_computation_filing: "core-tax-computation-filing",
  cdd: "core-cdd",
};

export const TAX_DEADLINE_CATEGORIES = ["profits_tax_filing", "tax_payment", "employers_return", "custom"];
export const TAX_DEADLINE_CATEGORY_KEYS = {
  profits_tax_filing: "利得税报税",
  tax_payment: "税款缴付",
  employers_return: "雇主报税表",
  custom: "其他税务期限",
};
export const TAX_DEADLINE_STATES = ["open", "completed", "not_applicable"];
export const TAX_DEADLINE_STATE_KEYS = {
  open: "未完成",
  completed: "已完成",
  not_applicable: "不适用",
};

export const GROUP_AUDIT_TYPES = ["internal_team", "component_auditor", "management_accounts"];
export const GROUP_AUDIT_TYPE_KEYS = {
  internal_team: "本团队审计",
  component_auditor: "其他审计师负责",
  management_accounts: "无需法定审计／管理账",
};

export const groupStarterNodes = [
  ["集团范围与架构", "确认集团边界、组成部分、重要性及合并责任。", ["集团架构及合并范围已批准"]],
  ["组成部分审计指示", "发出并追踪各组成部分的审计或报送要求。", ["组成部分指示及交付责任已确认"]],
  ["公司试算表及报告包", "确认纳入合并的公司资料已经齐备。", ["所有重大组成部分的最终报告包已收齐"]],
  ["集团往来核对", "清理集团内往来、交易及未对账差异。", ["重大集团往来差异已处理"]],
  ["抵销及合并调整", "追踪抵销分录和其他合并层调整。", ["重大抵销及合并调整已批准"]],
  ["合并财务报表", "完成合并数字、披露及列报复核。", ["合并财务报表已完成复核"]],
  ["集团签署与归档", "完成集团层复核、签署和最终归档。", ["集团签署及最终归档已完成"]],
];

export const groupStarterNodesEnglish = [
  ["Group scope and structure", "Confirm the group boundary, components and consolidation responsibilities.",
    ["Group structure and consolidation scope approved"]],
  ["Component instructions", "Issue and track audit or reporting requirements for each component.",
    ["Component instructions and delivery responsibilities confirmed"]],
  ["Company TBs and reporting packs", "Confirm that company information required for consolidation is ready.",
    ["Final reporting packs received for all significant components"]],
  ["Intercompany reconciliation", "Clear intercompany balances, transactions and unreconciled differences.",
    ["Material intercompany differences resolved"]],
  ["Eliminations and consolidation adjustments", "Track eliminations and other group-level adjustments.",
    ["Material eliminations and consolidation adjustments approved"]],
  ["Consolidated financial statements", "Complete the review of consolidated figures, disclosures and presentation.",
    ["Consolidated financial statements review completed"]],
  ["Group signing and archive", "Complete group review, signing and final archiving.",
    ["Group signing and final archive completed"]],
];

export const groupReadinessTemplates = {
  internal_team: ["最终试算表及调整已确认", "公司报告包已完成且重大未决事项已汇报"],
  component_auditor: ["组成部分审计师交付要求已确认", "组成部分报告包及重大事项沟通已完成"],
  management_accounts: ["管理账或最终试算表已确认", "科目映射、余额及重大支持已完成核对"],
};

export const groupReadinessTemplatesEnglish = {
  internal_team: ["Final trial balance and adjustments confirmed", "Company reporting pack completed and significant open matters reported"],
  component_auditor: ["Component-auditor deliverables confirmed", "Component reporting pack and significant-matter communication completed"],
  management_accounts: ["Management accounts or final trial balance confirmed", "Account mapping, balances and significant support reconciled"],
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
  ["项目设置", "锁定项目范围、报告期间、适用框架及权威资料。", ["项目范围及报告基础已批准", "权威试算表及总账版本已锁定"]],
  ["客户提供资料", "追踪关键资料的发出、接收和重大缺口。", ["关键审计资料已收到", "重大资料缺口已列入待清事项"]],
  ["试算表及总账衔接", "确认审计基础数据完整、平衡并与总账衔接。", ["审计基础数据已完成衔接并确认"]],
  ["审计执行", "完成主要工作底稿并处理重大调整及未决事项。", ["主要审计工作已完成", "重大调整及未决事项已处理"]],
  ["财务报表", "完成报表数字、披露及列报复核。", ["财务报表已完成复核"]],
  ["签署与归档", "完成签署及最终文件整理。", ["签署已完成", "最终审计档案已归档"]],
];

export const starterNodesEnglish = [
  ["Engagement setup", "Lock the engagement scope, reporting period, applicable framework and authoritative sources.",
    ["Engagement scope and reporting basis approved", "Authoritative trial balance and general ledger versions locked"]],
  ["PBC documents", "Track key client requests, receipts and material document gaps.",
    ["Key audit information received", "Material information gaps logged as outstanding items"]],
  ["Trial balance and general ledger", "Confirm that the audit data is complete, balanced and reconciled to the general ledger.",
    ["Audit source data reconciled and confirmed"]],
  ["Audit execution", "Complete the main workpapers and resolve material adjustments and open matters.",
    ["Main audit work completed", "Material adjustments and open matters resolved"]],
  ["Financial statements", "Complete the financial statement figures, disclosures and presentation review.",
    ["Financial statements review completed"]],
  ["Signing and archive", "Complete signing and final file assembly.",
    ["Signing completed", "Final audit file archived"]],
];

export const quoteCollectionStarterNodes = [
  ["报价", "确认服务范围、收费及报价版本。", ["报价已批准并发送客户"]],
  ["接受委聘", "记录客户接受报价及委聘安排。", ["委聘已获接受并留有记录"]],
  ["开票", "完成账单资料及发票发出。", ["发票已发出"]],
  ["收款", "追踪款项直至收款或经批准结案。", ["款项已收妥或结案已获批准"]],
];

export const quoteCollectionStarterNodesEnglish = [
  ["Quotation", "Confirm the service scope, fee and quotation version.", ["Quotation approved and sent to the client"]],
  ["Engagement acceptance", "Record the client's acceptance and engagement arrangements.", ["Engagement accepted and documented"]],
  ["Billing", "Complete billing details and issue the invoice.", ["Invoice issued"]],
  ["Collection", "Track payment until received or an approved close-out.", ["Payment received or close-out approved"]],
];

export const bookkeepingStarterNodes = [
  ["账套与期初设置", "确认服务范围、会计期间、科目表及期初余额。", ["账套及期初余额已确认"]],
  ["原始凭证收集", "收集并整理记账所需的发票、收据、银行及薪酬资料。", ["关键原始资料已收齐", "重大缺失资料已列入待清事项"]],
  ["交易记录与分类", "按适用准则和公司政策记录并分类本期交易。", ["本期交易已完成入账及复核"]],
  ["对账与复核", "完成银行及主要控制账户对账，并处理异常项目。", ["主要账户已完成对账", "重大异常已处理或列入待清事项"]],
  ["期间结账与交付", "完成结账分录、试算表及约定的管理报告。", ["期间结账及试算表复核已完成", "约定账务成果已交付"]],
];

export const bookkeepingStarterNodesEnglish = [
  ["Ledger and opening setup", "Confirm the service scope, accounting period, chart of accounts and opening balances.",
    ["Ledger setup and opening balances confirmed"]],
  ["Source document collection", "Collect and organise invoices, receipts, bank records and payroll information needed for bookkeeping.",
    ["Key source documents received", "Material information gaps logged as outstanding items"]],
  ["Transaction recording and coding", "Record and classify current-period transactions under the applicable framework and company policies.",
    ["Current-period transactions recorded and reviewed"]],
  ["Reconciliation and review", "Reconcile bank and key control accounts and resolve exceptions.",
    ["Key accounts reconciled", "Material exceptions resolved or logged as outstanding items"]],
  ["Period close and delivery", "Complete closing entries, the trial balance and agreed management reports.",
    ["Period close and trial balance review completed", "Agreed accounting deliverables issued"]],
];

export const taxStarterNodes = [
  ["税务资料准备", "收集并确认税务计算及报税所需资料。", ["税务计算基础资料已确认齐备"]],
  ["税务计算", "完成税务调整、计算及内部复核。", ["税务计算及重大调整已完成复核"]],
  ["客户批准及签署", "向客户发出文件并取得所需批准或签署。", ["客户批准及所需签署已取得"]],
  ["提交及回执", "完成报税提交并保存提交证明。", ["报税已提交且回执已保存"]],
];

export const taxStarterNodesEnglish = [
  ["Tax information", "Collect and confirm information required for the tax computation and filing.", ["Tax computation source information confirmed complete"]],
  ["Tax computation", "Complete tax adjustments, the computation and internal review.", ["Tax computation and material adjustments reviewed"]],
  ["Client approval and signing", "Send documents to the client and obtain required approval or signatures.", ["Client approval and required signatures obtained"]],
  ["Filing and acknowledgement", "Submit the filing and retain submission evidence.", ["Filing submitted and acknowledgement retained"]],
];

export const cddStarterNodes = [
  ["身份资料", "确认客户及相关人士的身份资料。", ["客户及授权代表身份已核实"]],
  ["所有权与控制人", "记录最终实益拥有人及控制结构。", ["最终实益拥有人及控制结构已确认"]],
  ["风险评估", "完成客户风险评估及所需跟进。", ["风险评估及所需加强措施已完成"]],
  ["批准及复核日期", "完成内部批准并设定下次复核。", ["客户尽职调查已批准且复核日期已设定"]],
];

export const cddStarterNodesEnglish = [
  ["Identity information", "Confirm identity information for the client and relevant persons.", ["Client and authorised-representative identities verified"]],
  ["Ownership and control", "Record ultimate beneficial owners and the control structure.", ["Ultimate beneficial owners and control structure confirmed"]],
  ["Risk assessment", "Complete the client risk assessment and required follow-up.", ["Risk assessment and required enhanced measures completed"]],
  ["Approval and review date", "Complete internal approval and set the next review date.", ["Customer due diligence approved and next review date set"]],
];

const workflowDefinitions = {
  quote_collection: { zh: quoteCollectionStarterNodes, en: quoteCollectionStarterNodesEnglish,
    names: ["报价与收款流程", "Quotation and Collection Workflow"], descriptions: ["内置报价与收款范本", "Built-in quotation and collection template"] },
  bookkeeping: { zh: bookkeepingStarterNodes, en: bookkeepingStarterNodesEnglish,
    names: ["基础账务处理流程", "Core Bookkeeping Workflow"], descriptions: ["内置账务处理范本", "Built-in bookkeeping template"] },
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

export function normalizeTemplateTags(value) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set();
  return source.map((tag) => String(tag).trim()).filter((tag) => {
    const key = tag.toLocaleLowerCase();
    if (!tag || tag.length > 40 || seen.has(key) || seen.size >= 12) return false;
    seen.add(key);
    return true;
  });
}

function templateMetadata(value, fallbackKey, now = new Date().toISOString()) {
  return {
    templateKey: typeof value?.templateKey === "string" && value.templateKey.trim()
      ? value.templateKey.trim() : fallbackKey,
    sourceTemplateKey: typeof value?.sourceTemplateKey === "string" && value.sourceTemplateKey.trim()
      ? value.sourceTemplateKey.trim() : "",
    tags: normalizeTemplateTags(value?.tags),
    versionNote: typeof value?.versionNote === "string" ? value.versionNote.trim().slice(0, 240) : "",
    createdAt: value?.createdAt || value?.updatedAt || now,
    updatedAt: value?.updatedAt || now,
  };
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
    bookkeeping: ["账务处理", "Bookkeeping"],
    audit: ["审计", "Audit"],
    tax_computation_filing: ["税务计算及报税", "Tax computation & filing"],
    cdd: ["客户尽职调查", "Customer due diligence"],
  };
  const label = labels[type]?.[language === "en" ? 1 : 0] || type;
  return language === "zh-Hant" ? toTraditional(label) : label;
}

export function engagementTypeLabel(value, language = "en") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw.toLocaleLowerCase().replace(/[＆&]/gu, "and").replace(/[\s_-]+/gu, " ");
  const labels = {
    audit: ["审计", "Audit"],
    bookkeeping: ["账务处理", "Bookkeeping"],
    tax: ["税务", "Tax"],
    "tax computation and filing": ["税务计算及报税", "Tax computation & filing"],
    "customer due diligence": ["客户尽职调查", "Customer due diligence"],
    "quotation and collection": ["报价与收款", "Quotation & collection"],
    "group consolidation": ["集团合并", "Group consolidation"],
  };
  const label = labels[key]?.[language === "en" ? 1 : 0];
  if (!label) return raw;
  return language === "zh-Hant" ? toTraditional(label) : label;
}

export function engagementTypeValues(value = {}) {
  const source = Array.isArray(value) ? value
    : value && typeof value === "object"
      ? (Array.isArray(value.engagementTypes) && value.engagementTypes.length
        ? value.engagementTypes : [value.engagementType ?? value.projectType])
      : [value];
  const seen = new Set();
  return source.flatMap((item) => typeof item === "string" && item.trim() ? [item.trim()] : [])
    .filter((item) => {
      const key = item.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function engagementTypesLabel(value, language = "en") {
  return engagementTypeValues(value).map((type) => engagementTypeLabel(type, language)).filter(Boolean).join(" · ");
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
  const now = new Date().toISOString();
  return {
    id: `sample-${WORKSTREAM_SAMPLE_KEYS[type]}`,
    builtinKey: WORKSTREAM_SAMPLE_KEYS[type],
    ...templateMetadata({}, `apw:workstream:${WORKSTREAM_SAMPLE_KEYS[type]}`, now),
    workstreamType: type,
    categoryId: type,
    name: language === "zh-Hant" ? toTraditional(definition.names[0]) : definition.names[english ? 1 : 0],
    description: language === "zh-Hant" ? toTraditional(definition.descriptions[0]) : definition.descriptions[english ? 1 : 0],
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
  const id = value.id || "sample-main";
  const normalized = {
    id,
    ...templateMetadata(value, knownBuiltinType
      ? `apw:workstream:${value.builtinKey}` : `apw:workstream-template:${id}`),
    builtinKey: knownBuiltinType ? value.builtinKey : undefined,
    workstreamType: type,
    categoryId: typeof value.categoryId === "string" && value.categoryId.trim() ? value.categoryId.trim() : type,
    name: typeof value.name === "string" && value.name.trim() ? professionalizeLegacyText(value.name.trim()) : "未命名范本",
    description: typeof value.description === "string" ? value.description : "",
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
    const localized = createDefaultSample(language, builtinType);
    return { ...localized, id: sample.id, templateKey: sample.templateKey, sourceTemplateKey: sample.sourceTemplateKey,
      tags: sample.tags, versionNote: sample.versionNote, createdAt: sample.createdAt, updatedAt: sample.updatedAt };
  }
  return { ...sample,
    name: localizeKnownText(sample.name, language, sampleMetadataTextPairs),
    description: localizeKnownText(sample.description, language, sampleMetadataTextPairs),
    nodes: localizeWorkflowNodes(sample.nodes, language),
  };
}

export function makeBlankSample(language = "zh", workstreamType = "audit", categoryId = workstreamType) {
  const id = uid("sample");
  const now = new Date().toISOString();
  return {
    id,
    ...templateMetadata({}, `apw:workstream-template:${id}`, now),
    workstreamType: WORKSTREAM_TYPES.includes(workstreamType) ? workstreamType : "audit",
    categoryId: typeof categoryId === "string" && categoryId.trim() ? categoryId.trim() : workstreamType,
    name: language === "en" ? "New Template" : language === "zh-Hant" ? "新範本" : "新范本",
    description: "",
    nodes: [],
  };
}

export function duplicateSample(sample, suffix = " Copy") {
  const id = uid("sample");
  const now = new Date().toISOString();
  return {
    ...sample,
    id,
    builtinKey: undefined,
    ...templateMetadata({ sourceTemplateKey: sample.templateKey, tags: sample.tags, versionNote: sample.versionNote },
      `apw:workstream-template:${id}`, now),
    name: `${sample.name}${suffix}`,
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
  const now = new Date().toISOString();
  return {
    id: "group-sample-core",
    builtinKey: CORE_GROUP_SAMPLE_KEY,
    ...templateMetadata({}, `apw:holding-template:${CORE_GROUP_SAMPLE_KEY}`, now),
    name: english ? "Holding Company Consolidation Workflow" : language === "zh-Hant" ? "控股公司合併流程" : "控股公司合并流程",
    description: english ? "Built-in holding-company workflow template" : language === "zh-Hant" ? "內置控股公司流程範本" : "内置控股公司流程范本",
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
  const id = value.id || uid("group-sample");
  return {
    id,
    ...templateMetadata(value, value.builtinKey === CORE_GROUP_SAMPLE_KEY
      ? `apw:holding-template:${CORE_GROUP_SAMPLE_KEY}` : `apw:holding-template:${id}`),
    builtinKey: value.builtinKey === CORE_GROUP_SAMPLE_KEY ? CORE_GROUP_SAMPLE_KEY : undefined,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名控股公司范本",
    description: typeof value.description === "string" ? value.description : "",
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
    const localized = createDefaultGroupSample(language);
    return { ...localized, id: sample.id, templateKey: sample.templateKey, sourceTemplateKey: sample.sourceTemplateKey,
      tags: sample.tags, versionNote: sample.versionNote, createdAt: sample.createdAt, updatedAt: sample.updatedAt };
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
  const id = uid("group-sample");
  const now = new Date().toISOString();
  return {
    id,
    ...templateMetadata({}, `apw:holding-template:${id}`, now),
    name: language === "en" ? "New Holding Company Template" : language === "zh-Hant" ? "新控股公司範本" : "新控股公司范本",
    description: "",
    nodes: [],
    readinessTemplates: copyReadinessTemplates(language === "en"
      ? groupReadinessTemplatesEnglish : groupReadinessTemplates),
  };
}

export function duplicateGroupSample(sample, suffix = " Copy") {
  const id = uid("group-sample");
  const now = new Date().toISOString();
  return {
    ...sample,
    id,
    builtinKey: undefined,
    ...templateMetadata({ sourceTemplateKey: sample.templateKey, tags: sample.tags, versionNote: sample.versionNote },
      `apw:holding-template:${id}`, now),
    name: `${sample.name}${suffix}`,
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
  const engagementTypes = engagementTypeValues(values).length ? engagementTypeValues(values) : ["Group consolidation"];
  return {
    id: uid("group"),
    name: values.name.trim(),
    engagementTypes,
    engagementType: engagementTypes[0],
    period: values.period?.trim() || "",
    periodStart: values.periodStart || "",
    periodEnd: values.periodEnd || "",
    startDate: values.startDate || "",
    dueDate: values.dueDate || "",
    owner: values.owner?.trim() || "",
    notes: values.notes?.trim() || "",
    consolidationEnabled,
    ...(consolidationIsSimple(values) ? { consolidationMode: "simple" } : {}),
    archived: false,
    createdAt: now,
    updatedAt: now,
    members: [],
    outstandingItems: [],
    taxDeadlines: Array.isArray(values.taxDeadlines) ? values.taxDeadlines.map(makeTaxDeadline) : [],
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

function normalizedReminderDays(value) {
  if (value === "" || value === null || value === undefined) return 30;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(365, Math.round(parsed))) : 30;
}

function normalizeTaxDeadlineRevision(value) {
  if (!value || typeof value !== "object") return null;
  const fromDueDate = typeof value.fromDueDate === "string" ? value.fromDueDate : "";
  const toDueDate = typeof value.toDueDate === "string" ? value.toDueDate : "";
  if (!fromDueDate || !toDueDate || fromDueDate === toDueDate) return null;
  return {
    fromDueDate,
    toDueDate,
    reason: typeof value.reason === "string" ? value.reason.trim() : "",
    changedAt: value.changedAt || new Date().toISOString(),
  };
}

export function makeTaxDeadline(values = {}) {
  const now = new Date().toISOString();
  const category = TAX_DEADLINE_CATEGORIES.includes(values.category) ? values.category : "profits_tax_filing";
  const state = TAX_DEADLINE_STATES.includes(values.state) ? values.state : "open";
  const dueDate = typeof values.dueDate === "string" ? values.dueDate : "";
  return {
    id: values.id || uid("tax-deadline"),
    category,
    customName: typeof values.customName === "string" ? values.customName.trim() : "",
    taxYear: typeof values.taxYear === "string" ? values.taxYear.trim() : "",
    owner: typeof values.owner === "string" ? values.owner.trim() : "",
    originalDueDate: typeof values.originalDueDate === "string" && values.originalDueDate
      ? values.originalDueDate : dueDate,
    dueDate,
    reminderDays: normalizedReminderDays(values.reminderDays),
    state,
    completedAt: state === "completed" ? (values.completedAt || now) : "",
    linkedWorkstreamId: typeof values.linkedWorkstreamId === "string" && values.linkedWorkstreamId
      ? values.linkedWorkstreamId : null,
    linkedEngagementId: typeof values.linkedEngagementId === "string" && values.linkedEngagementId
      ? values.linkedEngagementId : null,
    reference: typeof values.reference === "string" ? values.reference.trim() : "",
    note: typeof values.note === "string" ? values.note.trim() : "",
    revisions: Array.isArray(values.revisions)
      ? values.revisions.map(normalizeTaxDeadlineRevision).filter(Boolean) : [],
    createdAt: values.createdAt || now,
    updatedAt: values.updatedAt || now,
  };
}

export function reviseTaxDeadline(current, values = {}, reason = "", changedAt = new Date().toISOString()) {
  const normalized = makeTaxDeadline({ ...current, ...values, id: current.id, createdAt: current.createdAt,
    originalDueDate: current.originalDueDate || current.dueDate || values.dueDate,
    revisions: current.revisions || [], updatedAt: changedAt });
  const dueDateChanged = Boolean(current.dueDate && normalized.dueDate && current.dueDate !== normalized.dueDate);
  const revisionReason = typeof reason === "string" ? reason.trim() : "";
  if (dueDateChanged && !revisionReason) throw new Error("A reason is required when changing a saved tax deadline date.");
  if (dueDateChanged) normalized.revisions = [...normalized.revisions, {
    fromDueDate: current.dueDate,
    toDueDate: normalized.dueDate,
    reason: revisionReason,
    changedAt,
  }];
  normalized.completedAt = normalized.state === "completed"
    ? (current.state === "completed" && current.completedAt ? current.completedAt : changedAt) : "";
  return normalized;
}

export function taxDeadlineCategoryLabel(deadlineOrCategory, language = "zh") {
  const category = typeof deadlineOrCategory === "string" ? deadlineOrCategory : deadlineOrCategory?.category;
  const customName = typeof deadlineOrCategory === "object" ? deadlineOrCategory?.customName : "";
  if (category === "custom" && customName) return customName;
  const key = TAX_DEADLINE_CATEGORY_KEYS[category] || TAX_DEADLINE_CATEGORY_KEYS.custom;
  if (language === "en") return {
    profits_tax_filing: "Profits tax filing",
    tax_payment: "Tax payment",
    employers_return: "Employer’s return",
    custom: "Other tax deadline",
  }[category] || "Other tax deadline";
  return language === "zh-Hant" ? toTraditional(key) : key;
}

export function taxDeadlineStateLabel(state, language = "zh") {
  const key = TAX_DEADLINE_STATE_KEYS[state] || TAX_DEADLINE_STATE_KEYS.open;
  if (language === "en") return { open: "Open", completed: "Completed", not_applicable: "Not applicable" }[state] || "Open";
  return language === "zh-Hant" ? toTraditional(key) : key;
}

function utcDay(value) {
  if (!validIsoDate(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function todayUtc(now = new Date()) {
  const current = now instanceof Date ? new Date(now) : new Date(now);
  return Number.isNaN(current.getTime()) ? null
    : Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
}

export function taxDeadlineUrgency(deadline, now = new Date()) {
  if (!deadline || deadline.state !== "open") return { level: "inactive", daysUntil: null, daysOverdue: 0 };
  const due = utcDay(deadline.dueDate);
  const today = todayUtc(now);
  if (due === null || today === null) return { level: "inactive", daysUntil: null, daysOverdue: 0 };
  const daysUntil = Math.round((due - today) / 86400000);
  if (daysUntil < 0) return { level: "overdue", daysUntil, daysOverdue: Math.abs(daysUntil) };
  if (daysUntil === 0) return { level: "due_today", daysUntil, daysOverdue: 0 };
  if (daysUntil <= normalizedReminderDays(deadline.reminderDays)) {
    return { level: "due_soon", daysUntil, daysOverdue: 0 };
  }
  return { level: "upcoming", daysUntil, daysOverdue: 0 };
}

export function taxDeadlineSummary(deadlines = [], now = new Date()) {
  const open = deadlines.filter((deadline) => deadline?.state === "open");
  const dated = open.filter((deadline) => utcDay(deadline.dueDate) !== null).sort((left, right) =>
    left.dueDate.localeCompare(right.dueDate) || taxDeadlineCategoryLabel(left, "en").localeCompare(taxDeadlineCategoryLabel(right, "en")));
  const attention = dated.filter((deadline) => ["overdue", "due_today", "due_soon"].includes(taxDeadlineUrgency(deadline, now).level));
  const next = attention[0] || dated[0] || null;
  return { openCount: open.length, attentionCount: attention.length, next,
    urgency: next ? taxDeadlineUrgency(next, now).level : "inactive" };
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

function normalizeLegacyStore(value) {
  const outstandingStatuses = normalizeOutstandingStatuses(value.outstandingStatuses);
  const sourceVersion = Number(value.version) || 1;
  const workstreamCategories = normalizeWorkstreamCategories(value.workstreamCategories);
  if (sourceVersion < 10 && !workstreamCategories.some((category) => category.id === "bookkeeping")) {
    const customIndex = workstreamCategories.findIndex((category) => category.id === "custom");
    const bookkeepingCategory = { id: "bookkeeping", builtinType: "bookkeeping", name: "" };
    if (customIndex < 0) workstreamCategories.push(bookkeepingCategory);
    else workstreamCategories.splice(customIndex, 0, bookkeepingCategory);
  }
  const categoryById = new Map(workstreamCategories.map((category) => [category.id, category]));
  const rawSamples = Array.isArray(value.samples) ? value.samples : [value.sample];
  const restoreMissingBuiltinSamples = !Array.isArray(value.samples) || Number(value.version) < 5;
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
  if (sourceVersion < 10 && !samples.some((sample) => sample.workstreamType === "bookkeeping")) {
    const bookkeepingSample = createDefaultSample("zh", "bookkeeping");
    if (seenSampleIds.has(bookkeepingSample.id)) bookkeepingSample.id = uid("sample");
    seenSampleIds.add(bookkeepingSample.id);
    samples.push(bookkeepingSample);
  }
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
  const hasExplicitGroupSamples = Array.isArray(value.groupSamples);
  const rawGroupSamples = hasExplicitGroupSamples ? value.groupSamples : [];
  const seenGroupSampleIds = new Set();
  const groupSamples = rawGroupSamples.filter(Boolean).map((sample) => {
    const normalized = normalizeGroupSample(sample);
    if (seenGroupSampleIds.has(normalized.id)) normalized.id = uid("group-sample");
    seenGroupSampleIds.add(normalized.id);
    return normalized;
  });
  if (!groupSamples.length && (!hasExplicitGroupSamples || sourceVersion < STORE_VERSION)) {
    groupSamples.push(createDefaultGroupSample());
  }
  const selectedGroupSampleId = groupSamples.some((sample) => sample.id === value.selectedGroupSampleId)
    ? value.selectedGroupSampleId : groupSamples[0]?.id || null;
  const defaultGroupSample = groupSamples.find((sample) => sample.id === selectedGroupSampleId)
    || groupSamples[0] || createDefaultGroupSample();
  const normalizeConversionState = (state) => {
    if (!state || typeof state !== "object") return undefined;
    const normalized = {};
    if (state.project && typeof state.project === "object") normalized.project = {
      entity: typeof state.project.entity === "string" ? state.project.entity : "",
      engagementTypes: engagementTypeValues(state.project),
      engagementType: engagementTypeValues(state.project)[0] || "",
      reportingFramework: typeof state.project.reportingFramework === "string" ? state.project.reportingFramework : "",
      workstreams: Array.isArray(state.project.workstreams)
        ? state.project.workstreams.map((workstream) => normalizeWorkstream(workstream)) : [],
    };
    if (state.group && typeof state.group === "object") normalized.group = {
      consolidationEnabled: state.group.consolidationEnabled !== false,
      ...(consolidationIsSimple(state.group) ? { consolidationMode: "simple" } : {}),
      nodes: normalizeNodeList(state.group.nodes),
    };
    return Object.keys(normalized).length ? normalized : undefined;
  };
  const projects = value.projects.map((project) => {
    const owner = typeof project.owner === "string" ? project.owner : "";
    const dueDate = typeof project.dueDate === "string" ? project.dueDate : "";
    const keepsExplicitEmptyWorkstreams = sourceVersion >= 10 && Array.isArray(project.workstreams);
    const rawWorkstreams = Array.isArray(project.workstreams) && (project.workstreams.length || keepsExplicitEmptyWorkstreams)
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
    if (!workstreams.length && !keepsExplicitEmptyWorkstreams) {
      workstreams.push(makeWorkstream({ type: "audit", owner, dueDate }, []));
    }
    const workstreamIds = new Set(workstreams.map((workstream) => workstream.id));
    const outstandingItems = Array.isArray(project.outstandingItems)
      ? project.outstandingItems.map((item) => {
        const normalized = makeOutstandingItem(item, outstandingStatuses);
        return { ...normalized, workstreamId: workstreamIds.has(normalized.workstreamId) ? normalized.workstreamId : null };
      }) : [];
    const taxDeadlines = Array.isArray(project.taxDeadlines)
      ? project.taxDeadlines.map(makeTaxDeadline).map((deadline) => ({ ...deadline,
        linkedWorkstreamId: workstreamIds.has(deadline.linkedWorkstreamId) ? deadline.linkedWorkstreamId : null })) : [];
    return {
      id: project?.id || uid("project"),
      name: typeof project?.name === "string" && project.name.trim() ? project.name.trim() : "未命名项目",
      entity: typeof project?.entity === "string" ? project.entity : "",
      engagementTypes: engagementTypeValues(project),
      engagementType: engagementTypeValues(project)[0] || "",
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
      taxDeadlines,
      workstreams,
      conversionState: normalizeConversionState(project?.conversionState),
    };
  });
  const groups = Array.isArray(value.groups) ? value.groups.map((group) => ({
    id: group?.id || uid("group"),
    name: typeof group?.name === "string" && group.name.trim() ? group.name.trim() : "未命名控股公司",
    engagementTypes: engagementTypeValues(group).length ? engagementTypeValues(group) : ["Group consolidation"],
    engagementType: engagementTypeValues(group)[0] || "Group consolidation",
    period: typeof group?.period === "string" ? group.period : "",
    periodStart: typeof group?.periodStart === "string" ? group.periodStart : "",
    periodEnd: typeof group?.periodEnd === "string" ? group.periodEnd : "",
    startDate: typeof group?.startDate === "string" ? group.startDate : "",
    dueDate: typeof group?.dueDate === "string" ? group.dueDate : "",
    owner: typeof group?.owner === "string" ? group.owner : "",
    notes: typeof group?.notes === "string" ? group.notes : "",
    consolidationEnabled: group?.consolidationEnabled !== false,
    ...(consolidationIsSimple(group) ? { consolidationMode: "simple" } : {}),
    archived: Boolean(group?.archived),
    createdAt: group?.createdAt || new Date().toISOString(),
    updatedAt: group?.updatedAt || new Date().toISOString(),
    members: Array.isArray(group?.members) ? group.members.filter((member) => member?.refId)
      .map((member) => makeGroupMember(member, defaultGroupSample)) : [],
    outstandingItems: Array.isArray(group?.outstandingItems)
      ? group.outstandingItems.map((item) => makeOutstandingItem(item, outstandingStatuses)) : [],
    taxDeadlines: Array.isArray(group?.taxDeadlines)
      ? group.taxDeadlines.map((deadline) => ({ ...makeTaxDeadline(deadline), linkedWorkstreamId: null })) : [],
    nodes: normalizeNodeList(group?.nodes),
    conversionState: normalizeConversionState(group?.conversionState),
  })) : [];
  return {
    version: STORE_VERSION,
    projects,
    groups,
    scheduleOrder: workspaceScheduleOrder({ projects, groups, scheduleOrder: value.scheduleOrder }),
    samples,
    workstreamCategories,
    selectedSampleIdsByCategory,
    groupSamples,
    selectedGroupSampleId,
    outstandingStatuses,
  };
}

function validIsoDate(value) { return calendarDate(value); }

export function normalizeFiscalYearPreset(value, fallback = "calendar") {
  return FISCAL_YEAR_PRESETS.includes(value) ? value
    : (FISCAL_YEAR_PRESETS.includes(fallback) ? fallback : "calendar");
}

export function normalizeEngagementPeriodPreset(value, fallback = "custom") {
  return ENGAGEMENT_PERIOD_PRESETS.includes(value) ? value
    : (ENGAGEMENT_PERIOD_PRESETS.includes(fallback) ? fallback : "custom");
}

export function inferPeriodPreset(periodStart, periodEnd) {
  if (!validIsoDate(periodStart) || !validIsoDate(periodEnd)) return "custom";
  const startYear = Number(periodStart.slice(0, 4));
  if (periodStart === `${startYear}-01-01` && periodEnd === `${startYear}-12-31`) return "calendar";
  if (periodStart === `${startYear}-04-01` && periodEnd === `${startYear + 1}-03-31`) return "apr_mar";
  return "custom";
}

function rawReportingPeriods(engagement = {}) {
  const source = engagement && typeof engagement === "object" ? engagement : {};
  if (Array.isArray(source.reportingPeriods) && source.reportingPeriods.length) {
    return source.reportingPeriods;
  }
  if (source.periodStart || source.periodEnd) return [{
    periodPreset: source.periodPreset,
    periodStart: source.periodStart || "",
    periodEnd: source.periodEnd || "",
  }];
  return [];
}

export function engagementReportingPeriods(engagement = {}) {
  return rawReportingPeriods(engagement).map((period, index) => {
    const periodStart = typeof period?.periodStart === "string" ? period.periodStart : "";
    const periodEnd = typeof period?.periodEnd === "string" ? period.periodEnd : "";
    return {
      id: typeof period?.id === "string" && period.id ? period.id : `reporting-period-${index}-${periodStart}-${periodEnd}`,
      periodPreset: normalizeEngagementPeriodPreset(period?.periodPreset,
        inferPeriodPreset(periodStart, periodEnd)),
      periodStart,
      periodEnd,
    };
  }).filter((period) => period.periodStart || period.periodEnd)
    .sort((left, right) => left.periodStart.localeCompare(right.periodStart)
      || left.periodEnd.localeCompare(right.periodEnd));
}

export function engagementReportingYears(engagement = {}) {
  return [...new Set(engagementReportingPeriods(engagement)
    .map((period) => /^\d{4}-\d{2}-\d{2}$/u.test(period.periodEnd) ? period.periodEnd.slice(0, 4) : "")
    .filter(Boolean))].sort((left, right) => right.localeCompare(left));
}

export function engagementMatchesNavigationFilters(engagement = {}, filters = {}) {
  const owner = String(filters.owner || "").trim();
  const engagementType = String(filters.engagementType || "").trim();
  const reportingYear = String(filters.reportingYear || "").trim();
  if (owner && String(engagement.owner || "").trim() !== owner) return false;
  if (engagementType && !engagementTypeValues(engagement)
    .some((value) => value.toLocaleLowerCase() === engagementType.toLocaleLowerCase())) return false;
  if (reportingYear && !engagementReportingYears(engagement).includes(reportingYear)) return false;
  return true;
}

function normalizeReportingPeriods(engagement = {}) {
  const suppliedIds = new Set(rawReportingPeriods(engagement).map((period) => period?.id)
    .filter((id) => typeof id === "string" && id));
  const seen = new Set();
  return engagementReportingPeriods(engagement).filter((period) => {
    const key = `${period.periodStart}|${period.periodEnd}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((period) => ({ ...period,
    id: suppliedIds.has(period.id) ? period.id : uid("reporting-period") }));
}

function reportingPeriodKey(period = {}) {
  return `${period.periodStart || ""}|${period.periodEnd || ""}`;
}

export function engagementReportingPeriodsMatch(left, right) {
  const leftPeriods = engagementReportingPeriods(left); const rightPeriods = engagementReportingPeriods(right);
  if (!leftPeriods.length || !rightPeriods.length || [...leftPeriods, ...rightPeriods].some(period =>
    !validIsoDate(period.periodStart) || !validIsoDate(period.periodEnd) || period.periodEnd < period.periodStart)) return false;
  const leftKeys = leftPeriods.map(reportingPeriodKey);
  const rightKeys = rightPeriods.map(reportingPeriodKey);
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]);
}

export function engagementLatestPeriodEnd(engagement = {}) {
  return engagementReportingPeriods(engagement).at(-1)?.periodEnd || engagement?.periodEnd || "";
}

export function fiscalPeriodForYear(preset, baseYear) {
  const normalizedPreset = normalizeFiscalYearPreset(preset, "custom");
  const year = Number(baseYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || normalizedPreset === "custom") {
    return { periodPreset: "custom", periodStart: "", periodEnd: "" };
  }
  if (normalizedPreset === "apr_mar") return {
    periodPreset: "apr_mar",
    periodStart: `${year}-04-01`,
    periodEnd: `${year + 1}-03-31`,
  };
  return {
    periodPreset: "calendar",
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
  };
}

export function fiscalPeriodFromIncorporation(entity = {}) {
  const periodStart = typeof entity.incorporationDate === "string" ? entity.incorporationDate : "";
  if (!validIsoDate(periodStart)) return { periodPreset: "doi_year_end", periodStart: "", periodEnd: "" };
  const preset = normalizeFiscalYearPreset(entity.fiscalYearPreset, "custom");
  const year = Number(periodStart.slice(0, 4));
  if (preset === "calendar") return { periodPreset: "doi_year_end", periodStart, periodEnd: `${year}-12-31` };
  if (preset === "apr_mar") {
    const endYear = periodStart.slice(5) <= "03-31" ? year : year + 1;
    return { periodPreset: "doi_year_end", periodStart, periodEnd: `${endYear}-03-31` };
  }
  return { periodPreset: "doi_year_end", periodStart, periodEnd: "" };
}

export function periodBaseYear(engagement) {
  const periodStart = engagementReportingPeriods(engagement)[0]?.periodStart || engagement?.periodStart;
  if (!validIsoDate(periodStart)) return null;
  return Number(periodStart.slice(0, 4));
}

function singleFiscalPeriodShortLabel(engagement, language = "en") {
  const preset = normalizeFiscalYearPreset(engagement?.periodPreset,
    inferPeriodPreset(engagement?.periodStart, engagement?.periodEnd));
  const year = periodBaseYear(engagement);
  if (year && preset === "calendar" && inferPeriodPreset(engagement.periodStart, engagement.periodEnd) === "calendar") {
    return `FY${year}`;
  }
  if (year && preset === "apr_mar" && inferPeriodPreset(engagement.periodStart, engagement.periodEnd) === "apr_mar") {
    return `FY${year}/${String(year + 1).slice(-2)}`;
  }
  return reportingPeriodLabel({ periodStart: engagement?.periodStart, periodEnd: engagement?.periodEnd,
    period: engagement?.legacyPeriod || engagement?.period || "" }, language);
}

export function fiscalPeriodShortLabel(engagement, language = "en") {
  const periods = engagementReportingPeriods(engagement);
  if (periods.length > 1) return periods.map((period) => singleFiscalPeriodShortLabel(period, language)).join(" · ");
  return singleFiscalPeriodShortLabel(periods[0] || engagement, language);
}

export function engagementPeriodExists(store, entityId, periodStart, periodEnd, excludeEngagementId = "") {
  if (!entityId || !periodStart || !periodEnd) return false;
  return (store?.engagements || []).some((engagement) => engagement.entityId === entityId
    && engagement.id !== excludeEngagementId && engagementReportingPeriods(engagement)
      .some((period) => period.periodStart === periodStart && period.periodEnd === periodEnd));
}

export function suggestNextFiscalYear(entity, engagements = []) {
  const preset = normalizeFiscalYearPreset(entity?.fiscalYearPreset, "calendar");
  if (preset === "custom") return null;
  const years = engagements.filter((engagement) => engagement.entityId === entity?.id)
    .flatMap((engagement) => engagementReportingPeriods(engagement)).map((period) => {
    if (inferPeriodPreset(period.periodStart, period.periodEnd) === preset) {
      const baseYear = periodBaseYear(period);
      return Number.isInteger(baseYear) ? baseYear + 1 : null;
    }
    if (period.periodPreset !== "doi_year_end" || !validIsoDate(period.periodEnd)) return null;
    const endYear = Number(period.periodEnd.slice(0, 4));
    if (preset === "calendar" && period.periodEnd.endsWith("-12-31")) return endYear + 1;
    if (preset === "apr_mar" && period.periodEnd.endsWith("-03-31")) return endYear;
    return null;
  }).filter(Number.isInteger);
  const currentYear = new Date().getFullYear();
  return years.length ? Math.max(...years) : currentYear;
}

function normalizeEntityRecord(value = {}) {
  const now = new Date().toISOString();
  const parentEntityId = typeof value.parentEntityId === "string" && value.parentEntityId ? value.parentEntityId : null;
  return {
    id: value.id || uid("entity"),
    legalName: typeof value.legalName === "string" && value.legalName.trim()
      ? value.legalName.trim() : "未命名公司",
    entityType: typeof value.entityType === "string" ? value.entityType.trim()
      : (typeof value.legalForm === "string" ? value.legalForm.trim() : ""),
    incorporationDate: typeof value.incorporationDate === "string" && validIsoDate(value.incorporationDate)
      ? value.incorporationDate : (typeof value.dateOfIncorporation === "string" && validIsoDate(value.dateOfIncorporation)
        ? value.dateOfIncorporation : ""),
    kind: value.kind === "holding_company" ? "holding_company" : "company",
    parentEntityId,
    relationshipRole: parentEntityId && typeof value.relationshipRole === "string" ? value.relationshipRole.trim() : "",
    fiscalYearPreset: normalizeFiscalYearPreset(value.fiscalYearPreset, "calendar"),
    taxDeadlines: Array.isArray(value.taxDeadlines) ? value.taxDeadlines.map(makeTaxDeadline) : [],
    notes: typeof value.notes === "string" ? value.notes : "",
    archived: Boolean(value.archived),
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
}

function normalizeConsolidationComponent(value = {}, entityById = new Map(), engagementById = new Map(), groupSample) {
  const targetEngagement = engagementById.get(value.engagementId || value.refId);
  const entityId = value.entityId || targetEngagement?.entityId || "";
  const entity = entityById.get(entityId);
  const auditType = GROUP_AUDIT_TYPES.includes(value.auditType) ? value.auditType : "internal_team";
  const defaultConditions = groupSample?.readinessTemplates?.[auditType] || [];
  return {
    id: value.id || uid("component"),
    entityId: entityId || null,
    engagementId: targetEngagement?.id || null,
    role: typeof value.role === "string" ? value.role.trim() : "",
    auditType,
    readinessConditions: (Array.isArray(value.readinessConditions) ? value.readinessConditions : defaultConditions)
      .map((condition) => ({
        id: condition?.id || uid("readiness-condition"),
        label: typeof condition === "string" ? condition : (typeof condition?.label === "string" ? condition.label : ""),
        done: Boolean(condition?.done),
      })),
    entitySnapshot: {
      id: value.entitySnapshot?.id || entity?.id || entityId || "",
      legalName: value.entitySnapshot?.legalName || entity?.legalName || value.sourceName || "",
      entityType: value.entitySnapshot?.entityType || entity?.entityType || "",
      kind: value.entitySnapshot?.kind || entity?.kind || "company",
    },
    periodSnapshot: {
      engagementId: value.periodSnapshot?.engagementId || targetEngagement?.id || value.engagementId || "",
      periodStart: value.periodSnapshot?.periodStart || targetEngagement?.periodStart || "",
      periodEnd: value.periodSnapshot?.periodEnd || targetEngagement?.periodEnd || "",
      reportingPeriods: engagementReportingPeriods(value.periodSnapshot?.reportingPeriods?.length
        ? value.periodSnapshot : (targetEngagement || value.periodSnapshot || {})),
      label: value.periodSnapshot?.label || fiscalPeriodShortLabel(targetEngagement || value.periodSnapshot || {}, "en"),
    },
  };
}

function normalizeEngagementRecord(value = {}, context = {}) {
  const now = new Date().toISOString();
  const owner = typeof value.owner === "string" ? value.owner.trim() : "";
  const dueDate = typeof value.dueDate === "string" ? value.dueDate : "";
  const categoryById = context.categoryById || new Map();
  const keepsExplicitEmptyWorkstreams = Array.isArray(value.workstreams);
  const rawWorkstreams = keepsExplicitEmptyWorkstreams ? value.workstreams : [];
  const seenBuiltinTypes = new Set();
  const workstreams = rawWorkstreams.map((workstream) => {
    const normalized = normalizeWorkstream(workstream, { owner, dueDate });
    const category = categoryById.get(normalized.categoryId);
    return !category || (category.builtinType || "custom") !== normalized.type
      ? { ...normalized, categoryId: normalized.type } : normalized;
  }).filter((workstream) => {
    if (workstream.type === "custom") return true;
    if (seenBuiltinTypes.has(workstream.type)) return false;
    seenBuiltinTypes.add(workstream.type);
    return true;
  });
  const workstreamIds = new Set(workstreams.map((workstream) => workstream.id));
  const outstandingItems = Array.isArray(value.outstandingItems)
    ? value.outstandingItems.map((item) => {
      const normalized = makeOutstandingItem(item, context.outstandingStatuses);
      return { ...normalized, workstreamId: workstreamIds.has(normalized.workstreamId) ? normalized.workstreamId : null };
    }) : [];
  const reportingPeriods = normalizeReportingPeriods(value);
  const periodStart = reportingPeriods[0]?.periodStart || (typeof value.periodStart === "string" ? value.periodStart : "");
  const periodEnd = reportingPeriods.at(-1)?.periodEnd || (typeof value.periodEnd === "string" ? value.periodEnd : "");
  const inferredPreset = reportingPeriods.length === 1
    ? reportingPeriods[0].periodPreset : inferPeriodPreset(periodStart, periodEnd);
  const explicitEngagementTypes = engagementTypeValues(value);
  const inferredWorkstreamType = workstreams.some((workstream) => workstream.type === "audit") ? "Audit"
    : workstreams[0] ? workstreamTypeLabel(workstreams[0].type, "en", workstreams[0].customName) : "";
  const engagementTypes = explicitEngagementTypes.length ? explicitEngagementTypes
    : [value.consolidation ? "Group consolidation" : inferredWorkstreamType].filter(Boolean);
  return {
    id: value.id || uid("engagement"),
    entityId: typeof value.entityId === "string" ? value.entityId : "",
    internalName: typeof value.internalName === "string" ? value.internalName.trim()
      : (typeof value.name === "string" ? value.name.trim() : ""),
    periodPreset: normalizeEngagementPeriodPreset(value.periodPreset, inferredPreset),
    periodStart,
    periodEnd,
    reportingPeriods,
    legacyPeriod: typeof value.legacyPeriod === "string" ? value.legacyPeriod
      : (typeof value.period === "string" ? value.period : ""),
    engagementTypes,
    engagementType: engagementTypes[0] || "",
    reportingFramework: typeof value.reportingFramework === "string" ? value.reportingFramework.trim() : "",
    owner,
    startDate: typeof value.startDate === "string" ? value.startDate : "",
    dueDate,
    notes: typeof value.notes === "string" ? value.notes : "",
    archived: Boolean(value.archived),
    workstreams,
    outstandingItems,
    consolidation: value.consolidation && typeof value.consolidation === "object" ? {
      enabled: value.consolidation.enabled !== false,
      ...simpleModeField(value),
      nodes: normalizeNodeList(value.consolidation.nodes),
      components: Array.isArray(value.consolidation.components) ? value.consolidation.components : [],
      structureSyncedAt: value.consolidation.structureSyncedAt || "",
    } : null,
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
    ...(value.conversionState ? { conversionState: value.conversionState } : {}),
  };
}

function holdingEntityContains(entities, rootId, targetId, visited = new Set()) {
  if (!rootId || !targetId || visited.has(rootId)) return false;
  if (rootId === targetId) return true;
  const next = new Set(visited).add(rootId);
  return entities.filter((entity) => entity.parentEntityId === rootId)
    .some((entity) => holdingEntityContains(entities, entity.id, targetId, next));
}

function normalizeEntityHierarchy(entities) {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  return entities.map((entity) => {
    const parent = byId.get(entity.parentEntityId);
    if (!parent || parent.kind !== "holding_company" || parent.id === entity.id
      || holdingEntityContains(entities, entity.id, parent.id)) {
      return entity.parentEntityId ? { ...entity, parentEntityId: null, relationshipRole: "" } : entity;
    }
    return entity;
  });
}

function normalizeScheduleOrderForV11(value, engagements, entityById) {
  const validKeys = engagements.map((engagement) => {
    const kind = entityById.get(engagement.entityId)?.kind === "holding_company" ? "group" : "project";
    return `${kind}:${engagement.id}`;
  });
  const valid = new Set(validKeys);
  const seen = new Set();
  const supplied = Array.isArray(value) ? value.map((key) => typeof key === "string"
    ? key.replace(/^engagement:/u, "project:") : key) : [];
  const normalized = supplied.flatMap((key) => {
    if (valid.has(key)) return [key];
    const id = typeof key === "string" ? key.split(":").slice(1).join(":") : "";
    const match = validKeys.find((candidate) => candidate.endsWith(`:${id}`));
    return match ? [match] : [];
  }).filter((key) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...normalized, ...validKeys.filter((key) => !seen.has(key))];
}

function addRuntimeViews(store) {
  const entityById = new Map((store.entities || []).map((entity) => [entity.id, entity]));
  const engagementById = new Map((store.engagements || []).map((engagement) => [engagement.id, engagement]));
  const projects = [];
  const groups = [];
  (store.engagements || []).forEach((engagement) => {
    const entity = entityById.get(engagement.entityId);
    if (!entity) return;
    const common = {
      id: engagement.id,
      entityId: entity.id,
      name: engagement.internalName || entity.legalName,
      entity: entity.legalName,
      entityType: entity.entityType,
      engagementTypes: engagement.engagementTypes,
      engagementType: engagement.engagementType,
      reportingFramework: engagement.reportingFramework,
      period: engagement.legacyPeriod || "",
      periodPreset: engagement.periodPreset,
      periodStart: engagement.periodStart,
      periodEnd: engagement.periodEnd,
      reportingPeriods: engagement.reportingPeriods,
      startDate: engagement.startDate,
      dueDate: engagement.dueDate,
      owner: engagement.owner,
      notes: engagement.notes,
      archived: engagement.archived,
      createdAt: engagement.createdAt,
      updatedAt: engagement.updatedAt,
      outstandingItems: engagement.outstandingItems,
      taxDeadlines: entity.taxDeadlines,
      ...(engagement.conversionState ? { conversionState: engagement.conversionState } : {}),
    };
    if (entity.kind === "holding_company") {
      const consolidation = engagement.consolidation || { enabled: false, nodes: [], components: [] };
      const members = (consolidation.components || []).flatMap((component) => {
        const targetEngagement = engagementById.get(component.engagementId);
        const targetEntity = targetEngagement ? entityById.get(targetEngagement.entityId) : null;
        if (!targetEngagement || !targetEntity) return [];
        return [{
          id: component.id,
          kind: targetEntity.kind === "holding_company" ? "group" : "project",
          refId: targetEngagement.id,
          role: component.role || "",
          auditType: targetEntity.kind === "holding_company" ? "subgroup" : component.auditType,
          readinessConditions: targetEntity.kind === "holding_company" ? [] : component.readinessConditions,
          entityId: targetEntity.id,
        }];
      });
      groups.push({ ...common, name: entity.legalName, consolidationEnabled: consolidation.enabled !== false,
        nodes: consolidation.nodes || [], members, consolidation });
    } else {
      projects.push({ ...common, workstreams: engagement.workstreams || [] });
    }
  });
  return { ...store, projects, groups };
}

function sharedStoreFields(value) {
  const legacy = normalizeLegacyStore({ ...value, projects: [], groups: [], scheduleOrder: [] });
  return {
    samples: legacy.samples,
    workstreamCategories: legacy.workstreamCategories,
    selectedSampleIdsByCategory: legacy.selectedSampleIdsByCategory,
    groupSamples: legacy.groupSamples,
    selectedGroupSampleId: legacy.selectedGroupSampleId,
    outstandingStatuses: legacy.outstandingStatuses,
  };
}

function normalizeCanonicalStore(value) {
  const shared = sharedStoreFields(value);
  const seenEntityIds = new Set();
  let entities = (Array.isArray(value.entities) ? value.entities : []).map((source) => {
    const entity = normalizeEntityRecord(source);
    if (seenEntityIds.has(entity.id)) entity.id = uid("entity");
    seenEntityIds.add(entity.id);
    return entity;
  });
  entities = normalizeEntityHierarchy(entities);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const categoryById = new Map(shared.workstreamCategories.map((category) => [category.id, category]));
  const seenEngagementIds = new Set();
  let engagements = (Array.isArray(value.engagements) ? value.engagements : []).map((source) => {
    const engagement = normalizeEngagementRecord(source, {
      categoryById,
      outstandingStatuses: shared.outstandingStatuses,
    });
    if (seenEngagementIds.has(engagement.id)) engagement.id = uid("engagement");
    seenEngagementIds.add(engagement.id);
    return engagement;
  }).filter((engagement) => entityById.has(engagement.entityId));
  const engagementById = new Map(engagements.map((engagement) => [engagement.id, engagement]));
  const defaultGroupSample = shared.groupSamples.find((sample) => sample.id === shared.selectedGroupSampleId)
    || shared.groupSamples[0] || createDefaultGroupSample();
  engagements = engagements.map((engagement) => ({ ...engagement,
    consolidation: engagement.consolidation ? { ...engagement.consolidation,
      components: engagement.consolidation.components.map((component) =>
        normalizeConsolidationComponent(component, entityById, engagementById, defaultGroupSample)) } : null,
  }));
  const finalEngagementById = new Map(engagements.map((engagement) => [engagement.id, engagement]));
  entities = entities.map((entity) => ({ ...entity,
    taxDeadlines: entity.taxDeadlines.map((deadline) => {
      const linkedEngagement = finalEngagementById.get(deadline.linkedEngagementId);
      const validEngagement = linkedEngagement?.entityId === entity.id ? linkedEngagement : null;
      let linkedEngagementId = validEngagement?.id || null;
      let linkedWorkstreamId = null;
      if (validEngagement?.workstreams.some((workstream) => workstream.id === deadline.linkedWorkstreamId)) {
        linkedWorkstreamId = deadline.linkedWorkstreamId;
      } else if (!linkedEngagementId && deadline.linkedWorkstreamId) {
        const matches = engagements.filter((engagement) => engagement.entityId === entity.id
          && engagement.workstreams.some((workstream) => workstream.id === deadline.linkedWorkstreamId));
        if (matches.length === 1) {
          linkedEngagementId = matches[0].id;
          linkedWorkstreamId = deadline.linkedWorkstreamId;
        }
      }
      return { ...deadline, linkedEngagementId, linkedWorkstreamId };
    }),
  }));
  const finalEntityById = new Map(entities.map((entity) => [entity.id, entity]));
  const validEntityIds = new Set(entities.map((entity) => entity.id));
  const rawEntityOrder = Array.isArray(value.entityOrder) ? value.entityOrder : entities.map((entity) => entity.id);
  const seenOrder = new Set();
  const entityOrder = [...rawEntityOrder.filter((id) => validEntityIds.has(id) && !seenOrder.has(id) && seenOrder.add(id)),
    ...entities.map((entity) => entity.id).filter((id) => !seenOrder.has(id))];
  const store = {
    version: STORE_VERSION,
    entities,
    engagements,
    entityOrder,
    scheduleOrder: normalizeScheduleOrderForV11(value.scheduleOrder, engagements, finalEntityById),
    ...shared,
  };
  return addRuntimeViews(store);
}

function legacyMemberToComponent(member, engagementById, entityById) {
  const target = engagementById.get(member.refId);
  const entity = target ? entityById.get(target.entityId) : null;
  if (!target || !entity) return null;
  return {
    id: member.id || uid("component"),
    entityId: entity.id,
    engagementId: target.id,
    role: member.role || "",
    auditType: GROUP_AUDIT_TYPES.includes(member.auditType) ? member.auditType : "internal_team",
    readinessConditions: member.readinessConditions || [],
    entitySnapshot: { id: entity.id, legalName: entity.legalName, entityType: entity.entityType, kind: entity.kind },
    periodSnapshot: { engagementId: target.id, periodStart: target.periodStart, periodEnd: target.periodEnd,
      reportingPeriods: engagementReportingPeriods(target),
      label: fiscalPeriodShortLabel(target, "en") },
  };
}

function migrateLegacyStore(value) {
  const sourceVersion = Number(value?.version) || 1;
  const legacy = normalizeLegacyStore(value);
  const now = new Date().toISOString();
  const entityIdByLegacy = new Map();
  const entities = [];
  const engagements = [];
  legacy.projects.forEach((project) => {
    const entityId = `entity-${project.id}`;
    entityIdByLegacy.set(`project:${project.id}`, entityId);
    entities.push(normalizeEntityRecord({ id: entityId, legalName: project.entity || project.name,
      entityType: project.entityType || project.legalForm,
      incorporationDate: project.incorporationDate || project.dateOfIncorporation,
      kind: "company", fiscalYearPreset: inferPeriodPreset(project.periodStart, project.periodEnd),
      taxDeadlines: (project.taxDeadlines || []).map((deadline) => ({ ...deadline,
        linkedEngagementId: deadline.linkedWorkstreamId ? project.id : null })), archived: project.archived,
      createdAt: project.createdAt, updatedAt: project.updatedAt }));
    engagements.push(normalizeEngagementRecord({ id: project.id, entityId,
      internalName: project.name && project.name !== (project.entity || project.name) ? project.name : "",
      periodPreset: inferPeriodPreset(project.periodStart, project.periodEnd), periodStart: project.periodStart,
      periodEnd: project.periodEnd, legacyPeriod: project.period,
      engagementTypes: project.engagementTypes, engagementType: project.engagementType || project.projectType,
      reportingFramework: project.reportingFramework,
      owner: project.owner, startDate: project.startDate, dueDate: project.dueDate, notes: project.notes,
      archived: project.archived, workstreams: project.workstreams, outstandingItems: project.outstandingItems,
      consolidation: project.conversionState?.group ? { enabled: project.conversionState.group.consolidationEnabled !== false, ...simpleModeField(project.conversionState.group),
        nodes: project.conversionState.group.nodes || [], components: [] } : null,
      conversionState: project.conversionState, createdAt: project.createdAt, updatedAt: project.updatedAt }, {
      categoryById: new Map(legacy.workstreamCategories.map((category) => [category.id, category])),
      outstandingStatuses: legacy.outstandingStatuses,
    }));
  });
  legacy.groups.forEach((group) => {
    const entityId = `entity-${group.id}`;
    entityIdByLegacy.set(`group:${group.id}`, entityId);
    entities.push(normalizeEntityRecord({ id: entityId, legalName: group.name,
      entityType: group.entityType || group.legalForm,
      incorporationDate: group.incorporationDate || group.dateOfIncorporation, kind: "holding_company",
      fiscalYearPreset: inferPeriodPreset(group.periodStart, group.periodEnd), taxDeadlines: group.taxDeadlines,
      archived: group.archived, createdAt: group.createdAt, updatedAt: group.updatedAt }));
    engagements.push(normalizeEngagementRecord({ id: group.id, entityId, internalName: "", engagementTypes: group.engagementTypes,
      engagementType: group.engagementType || "Group consolidation",
      periodPreset: inferPeriodPreset(group.periodStart, group.periodEnd), periodStart: group.periodStart,
      periodEnd: group.periodEnd, legacyPeriod: group.period, reportingFramework: "", owner: group.owner,
      startDate: group.startDate, dueDate: group.dueDate, notes: group.notes, archived: group.archived,
      workstreams: [], outstandingItems: group.outstandingItems,
      consolidation: { enabled: group.consolidationEnabled !== false, ...simpleModeField(group), nodes: group.nodes, components: [] },
      conversionState: group.conversionState, createdAt: group.createdAt, updatedAt: group.updatedAt }, {
      categoryById: new Map(legacy.workstreamCategories.map((category) => [category.id, category])),
      outstandingStatuses: legacy.outstandingStatuses,
    }));
  });
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const engagementById = new Map(engagements.map((engagement) => [engagement.id, engagement]));
  legacy.groups.forEach((group) => {
    const parentEntityId = entityIdByLegacy.get(`group:${group.id}`);
    group.members.forEach((member) => {
      const childEntityId = entityIdByLegacy.get(`${member.kind}:${member.refId}`);
      const childIndex = entities.findIndex((entity) => entity.id === childEntityId);
      if (childIndex >= 0 && !entities[childIndex].parentEntityId) entities[childIndex] = {
        ...entities[childIndex], parentEntityId, relationshipRole: member.role || "",
      };
    });
    const engagementIndex = engagements.findIndex((engagement) => engagement.id === group.id);
    if (engagementIndex >= 0) engagements[engagementIndex] = { ...engagements[engagementIndex],
      consolidation: { ...engagements[engagementIndex].consolidation,
        components: group.members.map((member) => legacyMemberToComponent(member, engagementById, entityById)).filter(Boolean),
        structureSyncedAt: group.updatedAt || now } };
  });
  return normalizeCanonicalStore({
    version: STORE_VERSION,
    entities,
    engagements,
    entityOrder: [...legacy.groups, ...legacy.projects].map((record) => entityIdByLegacy.get(
      `${legacy.groups.includes(record) ? "group" : "project"}:${record.id}`)).filter(Boolean),
    scheduleOrder: legacy.scheduleOrder,
    samples: legacy.samples,
    workstreamCategories: legacy.workstreamCategories,
    selectedSampleIdsByCategory: legacy.selectedSampleIdsByCategory,
    groupSamples: legacy.groupSamples,
    selectedGroupSampleId: legacy.selectedGroupSampleId,
    outstandingStatuses: legacy.outstandingStatuses,
    migratedFromVersion: sourceVersion,
  });
}

function comparableLegacyViews(store) {
  const selectProject = (project) => ({ ...project });
  const selectGroup = (group) => ({ ...group });
  return JSON.stringify({ projects: (store.projects || []).map(selectProject), groups: (store.groups || []).map(selectGroup) });
}

// Runtime members omit unassigned/missing annual links. Absence from that view is not deletion.
function reconcileRuntimeComponents(previous, oldMembers, members, engagementById, entityById) {
  const oldById = new Map(oldMembers.map(member => [member.id, member]));
  const previousById = new Map(previous.map(component => [component.id, component]));
  const nextById = new Map(members.map(member => {
    const old = oldById.get(member.id); const component = previousById.get(member.id);
    if (!component || !old || old.refId !== member.refId || old.kind !== member.kind) {
      return [member.id, legacyMemberToComponent(member, engagementById, entityById)];
    }
    const patch = {};
    for (const key of ['role', 'auditType', 'readinessConditions']) {
      if (JSON.stringify(old[key]) !== JSON.stringify(member[key])) patch[key] = member[key];
    }
    return [member.id, { ...component, ...patch }];
  }).filter(([, component]) => component));
  const remaining = previous.filter(component => !oldById.has(component.id) || nextById.has(component.id));
  const next = remaining.map(component => nextById.get(component.id) || component);
  for (const [id, component] of nextById) if (!previousById.has(id)) next.push(component);
  const visibleOrder = members.map(member => member.id).filter(id => nextById.has(id));
  let index = 0;
  return next.map(component => nextById.has(component.id) ? nextById.get(visibleOrder[index++]) : component);
}

function syncCanonicalFromLegacyViews(previous, candidate) {
  let entities = previous.entities.map((entity) => ({ ...entity }));
  let engagements = previous.engagements.map((engagement) => ({ ...engagement }));
  const existingEngagementById = new Map(engagements.map((engagement) => [engagement.id, engagement]));
  const previousViewById = new Map([...(previous.projects || []), ...(previous.groups || [])]
    .map((record) => [record.id, record]));
  const candidateRecords = [
    ...(candidate.projects || []).map((record) => ({ record, kind: "company" })),
    ...(candidate.groups || []).map((record) => ({ record, kind: "holding_company" })),
  ];
  const candidateIds = new Set(candidateRecords.map(({ record }) => record.id));
  engagements = engagements.filter((engagement) => candidateIds.has(engagement.id));
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const now = new Date().toISOString();
  candidateRecords.forEach(({ record, kind }) => {
    const previousEngagement = existingEngagementById.get(record.id);
    let entityId = record.entityId || previousEngagement?.entityId;
    if (!entityById.has(entityId)) {
      entityId = uid("entity");
      const entity = normalizeEntityRecord({ id: entityId, legalName: record.entity || record.name,
        entityType: record.entityType || record.legalForm,
        incorporationDate: record.incorporationDate || record.dateOfIncorporation,
        kind, fiscalYearPreset: inferPeriodPreset(record.periodStart, record.periodEnd), createdAt: record.createdAt });
      entities.push(entity);
      entityById.set(entity.id, entity);
    }
    const previousView = previousViewById.get(record.id);
    const changed = !previousView || JSON.stringify(previousView) !== JSON.stringify(record);
    if (!changed) return;
    const entityIndex = entities.findIndex((entity) => entity.id === entityId);
    const currentEntity = entities[entityIndex];
    const entityPatch = {};
    if (!previousView || record.entity !== previousView.entity) {
      entityPatch.legalName = (record.entity || record.name || currentEntity.legalName).trim();
    } else if (kind === "holding_company" && record.name !== previousView.name) {
      entityPatch.legalName = (record.name || currentEntity.legalName).trim();
    }
    if (currentEntity.kind !== kind) entityPatch.kind = kind;
    if (Array.isArray(record.taxDeadlines) && JSON.stringify(record.taxDeadlines) !== JSON.stringify(previousView?.taxDeadlines)) {
      entityPatch.taxDeadlines = record.taxDeadlines.map(makeTaxDeadline);
    }
    if (Object.keys(entityPatch).length) {
      entities[entityIndex] = { ...currentEntity, ...entityPatch, updatedAt: now };
      entityById.set(entityId, entities[entityIndex]);
    }
    const workstreams = kind === "company" ? (record.workstreams || []) : (previousEngagement?.workstreams || []);
    const priorConsolidation = previousEngagement?.consolidation;
    const membersChanged = !previousView || JSON.stringify(record.members || []) !== JSON.stringify(previousView.members || []);
    const consolidation = kind === "holding_company" ? {
      ...priorConsolidation,
      enabled: record.consolidationEnabled !== false,
      nodes: record.nodes || [],
      components: membersChanged ? reconcileRuntimeComponents(priorConsolidation?.components || [],
        previousView?.members || [], record.members || [], new Map(engagements.map(item => [item.id, item])), entityById)
        : priorConsolidation?.components || [],
      structureSyncedAt: priorConsolidation?.structureSyncedAt || now,
    } : priorConsolidation || null;
    const normalized = normalizeEngagementRecord({ ...previousEngagement, id: record.id, entityId,
      internalName: previousView && record.name === previousView.name ? previousEngagement?.internalName || ""
        : record.name && record.name !== (record.entity || record.name) ? record.name : "",
      engagementTypes: record.engagementTypes || previousEngagement?.engagementTypes,
      engagementType: record.engagementType || record.projectType || previousEngagement?.engagementType,
      periodPreset: record.periodPreset || inferPeriodPreset(record.periodStart, record.periodEnd),
      periodStart: record.periodStart, periodEnd: record.periodEnd,
      reportingPeriods: record.reportingPeriods || previousEngagement?.reportingPeriods, legacyPeriod: record.period,
      reportingFramework: record.reportingFramework, owner: record.owner, startDate: record.startDate,
      dueDate: record.dueDate, notes: record.notes, archived: record.archived,
      workstreams, outstandingItems: record.outstandingItems, consolidation,
      conversionState: record.conversionState, createdAt: record.createdAt, updatedAt: record.updatedAt || now }, {
      categoryById: new Map(candidate.workstreamCategories.map((category) => [category.id, category])),
      outstandingStatuses: candidate.outstandingStatuses,
    });
    const engagementIndex = engagements.findIndex((engagement) => engagement.id === record.id);
    if (engagementIndex >= 0) engagements[engagementIndex] = normalized; else engagements.push(normalized);
  });
  // Only explicit membership deltas may affect today's master relationship.
  // Content edits and historical annual membership are not a structure-sync command.
  const removals = []; const additions = [];
  for (const group of candidate.groups || []) {
    const oldMembers = previousViewById.get(group.id)?.members || [];
    const members = group.members || [];
    const parentId = engagements.find(engagement => engagement.id === group.id)?.entityId;
    if (!parentId) continue;
    for (const member of oldMembers) if (!members.some(next => next.refId === member.refId)) {
      removals.push({ childId: existingEngagementById.get(member.refId)?.entityId, parentId });
    }
    for (const member of members) if (!oldMembers.some(old => old.refId === member.refId)) {
      additions.push({ childId: engagements.find(engagement => engagement.id === member.refId)?.entityId,
        parentId, role: member.role || "" });
    }
  }
  entities = entities.map(entity => {
    const addition = additions.find(change => change.childId === entity.id);
    if (addition) return { ...entity, parentEntityId: addition.parentId, relationshipRole: addition.role };
    if (removals.some(change => change.childId === entity.id && change.parentId === entity.parentEntityId)) {
      return { ...entity, parentEntityId: null, relationshipRole: "" };
    }
    return entity;
  });
  return normalizeCanonicalStore({ ...candidate, entities, engagements });
}

export function normalizeStore(value) {
  if (!value || typeof value !== "object") return emptyStore();
  const sourceVersion = Number(value.version) || 1;
  if (sourceVersion < STORE_VERSION || !Array.isArray(value.entities) || !Array.isArray(value.engagements)) {
    return migrateLegacyStore(value);
  }
  const canonical = normalizeCanonicalStore(value);
  if ((Array.isArray(value.projects) || Array.isArray(value.groups))
    && comparableLegacyViews(value) !== comparableLegacyViews(canonical)) {
    return syncCanonicalFromLegacyViews(canonical, value);
  }
  return canonical;
}

export function reconcileWorkbenchStore(previous, candidate) {
  if (!candidate || typeof candidate !== "object") return previous;
  if (!Array.isArray(previous?.entities) || !Array.isArray(previous?.engagements)) return normalizeStore(candidate);
  const canonicalChanged = candidate.entities !== previous.entities || candidate.engagements !== previous.engagements;
  if (canonicalChanged) return normalizeCanonicalStore(candidate);
  const legacyChanged = candidate.projects !== previous.projects || candidate.groups !== previous.groups;
  if (legacyChanged) return syncCanonicalFromLegacyViews(previous, candidate);
  return addRuntimeViews({ ...candidate, entities: previous.entities, engagements: previous.engagements });
}

export function canonicalStorePayload(store) {
  const { projects: _projects, groups: _groups, ...canonical } = normalizeCanonicalStore(store);
  return canonical;
}

export function entityForEngagement(store, engagementOrId) {
  const engagement = typeof engagementOrId === "string"
    ? store?.engagements?.find((item) => item.id === engagementOrId) : engagementOrId;
  return store?.entities?.find((entity) => entity.id === engagement?.entityId) || null;
}

export function engagementsForEntity(store, entityId, { includeArchived = true } = {}) {
  return (store?.engagements || []).filter((engagement) => engagement.entityId === entityId
    && (includeArchived || !engagement.archived)).sort((left, right) =>
    engagementLatestPeriodEnd(right).localeCompare(engagementLatestPeriodEnd(left))
      || (right.createdAt || "").localeCompare(left.createdAt || ""));
}

export function currentEntityChildren(store, parentEntityId) {
  return (store?.entities || []).filter((entity) => entity.parentEntityId === parentEntityId);
}

export function canMoveEntity(store, entityId, parentEntityId = "") {
  const entity = store?.entities?.find((item) => item.id === entityId);
  if (!entity || entity.archived) return false;
  if (!parentEntityId) return true;
  const parent = store.entities.find((item) => item.id === parentEntityId);
  return Boolean(parent && !parent.archived && parent.kind === "holding_company" && parent.id !== entityId
    && !holdingEntityContains(store.entities, entityId, parentEntityId));
}

export function moveEntity(store, entityId, parentEntityId = "", relationshipRole = undefined) {
  if (!canMoveEntity(store, entityId, parentEntityId)) return store;
  const now = new Date().toISOString();
  return normalizeCanonicalStore({ ...store, entities: store.entities.map((entity) => entity.id === entityId ? {
    ...entity,
    parentEntityId: parentEntityId || null,
    relationshipRole: !parentEntityId ? "" : relationshipRole === undefined
      ? entity.relationshipRole : String(relationshipRole || "").trim(),
    updatedAt: now,
  } : entity) });
}

export function makeEntity(values = {}) {
  return normalizeEntityRecord({ ...values, id: values.id || uid("entity"),
    fiscalYearPreset: normalizeFiscalYearPreset(values.fiscalYearPreset, "calendar") });
}

function resetNodeStructure(nodes = []) {
  return nodes.map((node) => makeNode({ title: node.title, description: node.description,
    conditions: (node.conditions || []).map((condition) => condition.label) }));
}

export function makeEngagement(values = {}, options = {}) {
  const now = new Date().toISOString();
  const source = options.sourceEngagement || null;
  const sourceMode = options.sourceMode || (source ? "previous" : "template");
  let workstreams = [];
  if (sourceMode === "previous" && source) {
    workstreams = (source.workstreams || []).map((workstream) => makeWorkstream({
      type: workstream.type,
      categoryId: workstream.categoryId,
      customName: workstream.customName,
      owner: "",
      dueDate: "",
    }, resetNodeStructure(workstream.nodes)));
  } else if (sourceMode !== "blank") {
    const project = makeProject({ ...values, name: values.internalName || "", entity: "",
      workstreamSelections: values.workstreamSelections || [] }, true, options.samples || [], options.workstreamCategories || []);
    workstreams = project.workstreams;
  }
  let reportingPeriods = engagementReportingPeriods(values);
  if (!reportingPeriods.length || reportingPeriods.some((period) => !validIsoDate(period.periodStart)
    || !validIsoDate(period.periodEnd) || period.periodEnd < period.periodStart)) {
    throw new Error("A complete valid reporting period is required.");
  }
  const periodKeys = reportingPeriods.map(reportingPeriodKey);
  if (new Set(periodKeys).size !== periodKeys.length) throw new Error("Duplicate reporting periods are not allowed.");
  reportingPeriods = normalizeReportingPeriods(values);
  const periodStart = reportingPeriods[0].periodStart;
  const periodEnd = reportingPeriods.at(-1).periodEnd;
  const entity = options.entity;
  if (options.store && reportingPeriods.some((period) => engagementPeriodExists(options.store,
    values.entityId || entity?.id, period.periodStart, period.periodEnd, values.id || ""))) {
    throw new Error("An engagement already exists for this reporting period.");
  }
  const consolidation = entity?.kind === "holding_company" ? {
    enabled: values.consolidationMode === 'simple' || values.consolidationEnabled !== false,
    ...simpleModeField({ mode: values.consolidationMode ?? (sourceMode === 'previous' && consolidationIsSimple(source) ? 'simple' : 'full'),
      enabled: values.consolidationMode === 'simple' || values.consolidationEnabled !== false }),
    nodes: sourceMode === "previous" && source?.consolidation
      ? resetNodeStructure(source.consolidation.nodes) : (sourceMode === "blank" ? []
        : resetNodeStructure(options.groupSample?.nodes || [])),
    components: [],
    structureSyncedAt: now,
  } : (source?.consolidation ? { ...source.consolidation, nodes: resetNodeStructure(source.consolidation.nodes),
    components: [], structureSyncedAt: now } : null);
  return normalizeEngagementRecord({
    id: values.id || uid("engagement"),
    entityId: values.entityId || entity?.id || "",
    internalName: values.internalName || "",
    engagementTypes: values.engagementTypes
      ?? (values.engagementType !== undefined ? [values.engagementType] : source?.engagementTypes),
    engagementType: values.engagementType ?? source?.engagementType
      ?? (entity?.kind === "holding_company" ? "Group consolidation" : "Audit"),
    periodPreset: values.periodPreset || inferPeriodPreset(periodStart, periodEnd),
    periodStart,
    periodEnd,
    reportingPeriods,
    legacyPeriod: values.legacyPeriod || "",
    reportingFramework: values.reportingFramework ?? source?.reportingFramework ?? "",
    owner: values.owner || "",
    startDate: values.startDate || "",
    dueDate: values.dueDate || "",
    notes: values.notes || "",
    archived: false,
    workstreams,
    outstandingItems: [],
    consolidation,
    createdAt: now,
    updatedAt: now,
  }, {
    categoryById: new Map((options.workstreamCategories || []).map((category) => [category.id, category])),
    outstandingStatuses: options.outstandingStatuses || createDefaultOutstandingStatuses(),
  });
}

export function componentsForCurrentStructure(store, holdingEntityId, periodStart, periodEnd,
  groupSample = createDefaultGroupSample(), reportingPeriods = null) {
  const children = currentEntityChildren(store, holdingEntityId);
  const targetPeriods = Array.isArray(reportingPeriods) && reportingPeriods.length
    ? { reportingPeriods } : { periodStart, periodEnd };
  return children.map((entity) => {
    const matches = (store.engagements || []).filter((engagement) => engagement.entityId === entity.id
      && engagementReportingPeriodsMatch(engagement, targetPeriods));
    const engagement = matches.length === 1 ? matches[0] : null;
    const auditType = "internal_team";
    return normalizeConsolidationComponent({
      id: uid("component"), entityId: entity.id, engagementId: engagement?.id || null,
      role: entity.relationshipRole || "", auditType,
      readinessConditions: (groupSample?.readinessTemplates?.[auditType] || []).map((condition) => ({
        id: uid("readiness-condition"), label: condition.label, done: false,
      })),
      entitySnapshot: { id: entity.id, legalName: entity.legalName, entityType: entity.entityType, kind: entity.kind },
      periodSnapshot: { engagementId: engagement?.id || "", periodStart: engagement?.periodStart || periodStart,
        periodEnd: engagement?.periodEnd || periodEnd,
        reportingPeriods: engagement ? engagementReportingPeriods(engagement) : engagementReportingPeriods(targetPeriods),
        label: engagement ? fiscalPeriodShortLabel(engagement, "en") : "" },
    }, new Map(store.entities.map((item) => [item.id, item])),
    new Map(store.engagements.map((item) => [item.id, item])), groupSample);
  });
}

export function syncEngagementToCurrentStructure(store, engagementId, groupSample = createDefaultGroupSample()) {
  const engagement = store.engagements.find((item) => item.id === engagementId);
  const entity = entityForEngagement(store, engagement);
  if (!engagement || entity?.kind !== "holding_company") return store;
  const previousByEntity = new Map((engagement.consolidation?.components || []).map((component) => [component.entityId, component]));
  const current = componentsForCurrentStructure(store, entity.id, engagement.periodStart, engagement.periodEnd, groupSample,
    engagement.reportingPeriods)
    .map((component) => {
      const previous = previousByEntity.get(component.entityId);
      return previous ? { ...component, id: previous.id, role: previous.role || component.role,
        auditType: previous.auditType || component.auditType,
        readinessConditions: previous.readinessConditions || component.readinessConditions } : component;
    });
  return normalizeCanonicalStore({ ...store, engagements: store.engagements.map((item) => item.id === engagementId ? {
    ...item,
    consolidation: { ...(item.consolidation || { enabled: true, nodes: [] }), components: current,
      structureSyncedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  } : item) });
}

// Destructive merging must reject ambiguity before deleting the source master.
export function entityMergeProblem(store, sourceEntityId, targetEntityId) {
  if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) return 'selection';
  const source = store.entities.find(e => e.id === sourceEntityId);
  const target = store.entities.find(e => e.id === targetEntityId);
  if (!source || !target) return 'missing';
  if (source.archived || target.archived) return 'archived';
  if (source.kind !== target.kind) return 'kind';
  const historicalContains = (from, to) => {
    const visited = new Set(); const pending = [from];
    while (pending.length) {
      const id = pending.pop(); if (id === to) return true;
      if (visited.has(id)) continue; visited.add(id);
      for (const job of store.engagements.filter(e => e.entityId === id)) {
        for (const part of job.consolidation?.components || []) if (part.entityId) pending.push(part.entityId);
      }
    }
    return false;
  };
  if (holdingEntityContains(store.entities, source.id, target.id) || holdingEntityContains(store.entities, target.id, source.id)
    || historicalContains(source.id, target.id) || historicalContains(target.id, source.id)) return 'relationship';
  for (const key of ['entityType', 'incorporationDate', 'fiscalYearPreset', 'notes', 'parentEntityId', 'relationshipRole']) {
    if (String(source[key] || '').trim() && String(target[key] || '').trim() && source[key] !== target[key]) return 'metadata';
  }
  const sourceJobs = engagementsForEntity(store, source.id); const targetJobs = engagementsForEntity(store, target.id);
  if (sourceJobs.some(e => engagementReportingPeriods(e).some(p => targetJobs.some(other =>
    engagementReportingPeriods(other).some(q => reportingPeriodKey(p) === reportingPeriodKey(q)))))) return 'periods';
  return null;
}

export function mergeEntities(store, sourceEntityId, targetEntityId) {
  const problem = entityMergeProblem(store, sourceEntityId, targetEntityId);
  if (problem) {
    const error = new Error(problem === 'periods' ? 'The entities have duplicate reporting periods.' : `Unsafe company merge: ${problem}.`);
    error.code = problem; throw error;
  }
  const source = store.entities.find(entity => entity.id === sourceEntityId);
  const target = store.entities.find(entity => entity.id === targetEntityId);
  const now = new Date().toISOString();
  const taxIds = new Set((target.taxDeadlines || []).map((deadline) => deadline.id));
  const sourceTax = (source.taxDeadlines || []).map((deadline) => taxIds.has(deadline.id)
    ? { ...deadline, id: uid("tax-deadline") } : deadline);
  const entities = store.entities.filter((entity) => entity.id !== sourceEntityId).map((entity) => {
    if (entity.id === targetEntityId) return { ...entity,
      ...Object.fromEntries(['entityType', 'incorporationDate', 'notes', 'parentEntityId', 'relationshipRole'].map(key =>
        [key, String(entity[key] || '').trim() ? entity[key] : source[key]])),
      taxDeadlines: [...entity.taxDeadlines, ...sourceTax], updatedAt: now };
    if (entity.parentEntityId === sourceEntityId) return { ...entity, parentEntityId: targetEntityId, updatedAt: now };
    return entity;
  });
  const engagements = store.engagements.map(engagement => ({
    ...engagement,
    ...(engagement.entityId === sourceEntityId ? { entityId: targetEntityId, updatedAt: now } : {}),
    consolidation: engagement.consolidation ? { ...engagement.consolidation,
      components: engagement.consolidation.components.map(component => component.entityId === sourceEntityId
        ? { ...component, entityId: targetEntityId } : component) } : null,
  }));
  return normalizeCanonicalStore({ ...store, entities, engagements,
    entityOrder: (store.entityOrder || []).filter((id) => id !== sourceEntityId) });
}

export function makeProject(values, useStarter = true, sampleSource = null, categorySource = null) {
  const now = new Date().toISOString();
  const legacyNodes = Array.isArray(sampleSource) && sampleSource.length && "title" in sampleSource[0] ? sampleSource : null;
  const suppliedSampleLibrary = Array.isArray(sampleSource) && !legacyNodes;
  const availableSamples = Array.isArray(sampleSource) && !legacyNodes ? sampleSource : createDefaultSamples();
  const availableCategories = normalizeWorkstreamCategories(categorySource);
  const categoryById = new Map(availableCategories.map((category) => [category.id, category]));
  const hasExplicitSelections = Array.isArray(values.workstreamSelections);
  const selections = hasExplicitSelections ? values.workstreamSelections : [{ type: "audit" }];
  const seenBuiltinTypes = new Set();
  const cleanedSelections = selections.filter((selection) => {
    const type = WORKSTREAM_TYPES.includes(selection.type) ? selection.type : "audit";
    if (type === "custom") return Boolean(selection.customName?.trim());
    if (seenBuiltinTypes.has(type)) return false;
    seenBuiltinTypes.add(type);
    return true;
  });
  const workstreams = cleanedSelections.map((selection) => {
    const type = WORKSTREAM_TYPES.includes(selection.type) ? selection.type : "audit";
    const requestedCategory = categoryById.get(selection.categoryId || type);
    const categoryId = requestedCategory && (requestedCategory.builtinType || "custom") === type
      ? requestedCategory.id : type;
    const selectionHasSample = Object.prototype.hasOwnProperty.call(selection, "sampleId");
    const sample = legacyNodes && type === "audit" ? legacyNodes
      : (selectionHasSample && !selection.sampleId ? null
        : availableSamples.find((item) => item.id === selection.sampleId && item.categoryId === categoryId)
          || availableSamples.find((item) => item.categoryId === categoryId)
          || (!suppliedSampleLibrary && type !== "custom" ? createDefaultSample("zh", type) : null));
    return makeWorkstream({ type, categoryId, customName: selection.customName, owner: selection.owner || values.owner,
      dueDate: selection.dueDate || values.dueDate }, useStarter ? sample : []);
  });
  const fallbackEngagementType = workstreams.some((workstream) => workstream.type === "audit")
    ? "Audit" : workstreams[0] ? workstreamTypeLabel(workstreams[0].type, "en", workstreams[0].customName) : "";
  const engagementTypes = engagementTypeValues(values).length ? engagementTypeValues(values)
    : [fallbackEngagementType].filter(Boolean);
  return {
    id: uid("project"),
    name: values.name?.trim() || "未命名项目",
    entity: values.entity?.trim() || "",
    engagementTypes,
    engagementType: engagementTypes[0] || "",
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
    taxDeadlines: [],
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
    engagementTypes: ["Group consolidation"],
    engagementType: "Group consolidation",
    period: project.period || "",
    periodStart: project.periodStart || "",
    periodEnd: project.periodEnd || "",
    startDate: project.startDate || "",
    dueDate: project.dueDate || "",
    owner: project.owner || "",
    notes: project.notes || "",
    consolidationEnabled,
    ...(consolidationIsSimple(previousGroup) ? { consolidationMode: "simple" } : {}),
    archived: Boolean(project.archived),
    createdAt: project.createdAt || now,
    updatedAt: now,
    members: [],
    outstandingItems: (project.outstandingItems || []).map((item) => ({ ...item, workstreamId: null, updatedAt: now })),
    taxDeadlines: (project.taxDeadlines || []).map((deadline) => ({ ...makeTaxDeadline(deadline), linkedWorkstreamId: null })),
    nodes: consolidationEnabled ? normalizeNodeList(starterNodes) : [],
    conversionState: mergeConversionState(project.conversionState, { project: {
      entity: project.entity || "",
      engagementTypes: engagementTypeValues(project),
      engagementType: project.engagementType || "Audit",
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
    scheduleOrder: workspaceScheduleOrder(store).map((key) => key === `project:${projectId}` ? `group:${projectId}` : key),
  };
}

export function convertGroupToProject(store, groupId, groupSample = createDefaultGroupSample()) {
  const group = store.groups.find((item) => item.id === groupId);
  if (!group) return store;
  const savedProject = group.conversionState?.project;
  const savedEngagementTypes = engagementTypeValues(savedProject);
  const baseProject = makeProject({ name: group.name, entity: savedProject?.entity || group.name,
    engagementTypes: savedEngagementTypes.length ? savedEngagementTypes : ["Audit"],
    engagementType: savedEngagementTypes[0] || "Audit", reportingFramework: savedProject?.reportingFramework || "",
    period: group.period, periodStart: group.periodStart,
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
    engagementTypes: savedEngagementTypes.length ? savedEngagementTypes : ["Audit"],
    engagementType: savedEngagementTypes[0] || "Audit",
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
    taxDeadlines: (group.taxDeadlines || []).map((deadline) => ({ ...makeTaxDeadline(deadline), linkedWorkstreamId: null })),
    workstreams,
    conversionState: mergeConversionState(group.conversionState, { group: {
      consolidationEnabled: group.consolidationEnabled !== false,
      ...(consolidationIsSimple(group) ? { consolidationMode: "simple" } : {}),
      nodes: normalizeNodeList(group.nodes),
    } }),
  };
  return { ...store,
    projects: [...store.projects, project],
    groups: store.groups.filter((item) => item.id !== groupId).map((parent) => ({ ...parent,
      members: parent.members.map((member) => member.kind === "group" && member.refId === groupId
        ? makeGroupMember({ id: member.id, kind: "project", refId: groupId, role: member.role,
          auditType: "internal_team" }, groupSample) : member) })),
    scheduleOrder: workspaceScheduleOrder(store).map((key) => key === `group:${groupId}` ? `project:${groupId}` : key),
  };
}

export function emptyStore() {
  const samples = createDefaultSamples();
  const groupSample = createDefaultGroupSample();
  const workstreamCategories = createDefaultWorkstreamCategories();
  return addRuntimeViews({ version: STORE_VERSION, entities: [], engagements: [], entityOrder: [], scheduleOrder: [], samples, workstreamCategories,
    selectedSampleIdsByCategory: Object.fromEntries(workstreamCategories.map((category) => [category.id,
      samples.find((sample) => sample.categoryId === category.id)?.id || null])),
    groupSamples: [groupSample], selectedGroupSampleId: groupSample.id,
    outstandingStatuses: createDefaultOutstandingStatuses() });
}

export function isValidStore(value) {
  const version = Number(value?.version);
  if (!["number", "string"].includes(typeof value?.version)
    || !Number.isInteger(version) || version < 1 || version > STORE_VERSION) return false;
  return version >= STORE_VERSION
    ? Array.isArray(value.entities) && Array.isArray(value.engagements) && validWorkspaceRecords(value)
    : Array.isArray(value.projects) && validWorkspaceRecords(value, true);
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
    if (!isValidStore(parsed)) return emptyStore();
    preserveLegacyRecovery(raw);
    return normalizeStore(parsed);
  } catch {
    return emptyStore();
  }
}

export function preserveLegacyRecovery(value, storage = globalThis.localStorage) {
  try {
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const version = Number(parsed?.version) || 1;
    if (version >= STORE_VERSION || !isValidStore(parsed) || storage?.getItem?.(V10_RECOVERY_KEY)) return false;
    storage?.setItem?.(V10_RECOVERY_KEY, raw);
    return true;
  } catch {
    return false;
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
  if (Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const entityById = new Map(store.entities.map((entity) => [entity.id, entity]));
    const engagementIdsByEntity = new Map();
    store.engagements.forEach((engagement) => engagementIdsByEntity.set(engagement.entityId,
      [...(engagementIdsByEntity.get(engagement.entityId) || []), engagement.id]));
    store.engagements.forEach((engagement) => {
      const entity = entityById.get(engagement.entityId);
      const archived = Boolean(entity?.archived || engagement.archived);
      const view = entity?.kind === "holding_company"
        ? store.groups.find((group) => group.id === engagement.id)
        : store.projects.find((project) => project.id === engagement.id);
      const complete = entity?.kind === "holding_company"
        ? Boolean(view && groupProgress(store, view.id).ready) : Boolean(view && projectStats(view).complete);
      if (archived) counts.archived += 1;
      else { counts.all += 1; counts[complete ? "completed" : "active"] += 1; }
    });
    store.entities.filter((entity) => !(engagementIdsByEntity.get(entity.id)?.length)).forEach((entity) => {
      if (entity.archived) counts.archived += 1;
      else { counts.all += 1; counts.active += 1; }
    });
    return counts;
  }
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

export function engagementNavigationStatusCounts(store) {
  if (!Array.isArray(store?.entities) || !Array.isArray(store?.engagements)) {
    return navigationStatusCounts(store);
  }
  const counts = { active: 0, completed: 0, all: 0, archived: 0 };
  const entityById = new Map(store.entities.map((entity) => [entity.id, entity]));
  store.engagements.forEach((engagement) => {
    const entity = entityById.get(engagement.entityId);
    const archived = Boolean(entity?.archived || engagement.archived);
    const view = entity?.kind === "holding_company"
      ? store.groups.find((group) => group.id === engagement.id)
      : store.projects.find((project) => project.id === engagement.id);
    const complete = entity?.kind === "holding_company"
      ? Boolean(view && groupProgress(store, engagement.id).ready)
      : Boolean(view && projectStats(view).complete);
    if (archived) counts.archived += 1;
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
  const makeAlert = ({ id, targetKind, targetId, scope, recordName, owner, dueDate }) => {
    if (!dueDate) return null;
    const due = Date.parse(`${dueDate}T00:00:00Z`);
    if (Number.isNaN(due) || due >= today) return null;
    return { id, targetKind, targetId, scope, recordName, owner: owner || "", dueDate,
      daysOverdue: Math.floor((today - due) / 86400000) };
  };
  const alerts = [];

  if (Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const entityById = new Map(store.entities.map((entity) => [entity.id, entity]));
    store.engagements.filter((engagement) => !engagement.archived && !entityById.get(engagement.entityId)?.archived)
      .forEach((engagement) => {
        const entity = entityById.get(engagement.entityId);
        if (!entity) return;
        const targetKind = entity.kind === "holding_company" ? "group" : "project";
        const view = targetKind === "group" ? store.groups.find((group) => group.id === engagement.id)
          : store.projects.find((project) => project.id === engagement.id);
        const complete = targetKind === "group" ? Boolean(view && groupProgress(store, engagement.id).ready)
          : Boolean(view && projectStats(view).complete);
        if (!complete) {
          const alert = makeAlert({ id: `${targetKind}:${engagement.id}`, targetKind, targetId: engagement.id,
            scope: targetKind, recordName: `${entity.legalName} · ${yearEndOrPeriodLabel(engagement, "en")}`,
            owner: engagement.owner, dueDate: engagement.dueDate });
          if (alert) alerts.push(alert);
        }
      });
    store.entities.filter((entity) => !entity.archived).forEach((entity) => {
      (entity.taxDeadlines || []).forEach((deadline) => {
        const urgency = taxDeadlineUrgency(deadline, now);
        if (!["overdue", "due_today", "due_soon"].includes(urgency.level)) return;
        alerts.push({ id: `tax:entity:${entity.id}:${deadline.id}`, targetKind: "entity", targetId: entity.id,
          scope: "tax", recordName: entity.legalName, owner: deadline.owner || "", dueDate: deadline.dueDate,
          daysOverdue: urgency.daysOverdue, daysUntil: urgency.daysUntil, urgency: urgency.level,
          taxDeadline: { ...deadline } });
      });
    });
    const urgencyRank = { overdue: 0, due_today: 1, due_soon: 2 };
    return alerts.sort((left, right) => (urgencyRank[left.urgency || "overdue"] ?? 0) - (urgencyRank[right.urgency || "overdue"] ?? 0)
      || (left.urgency === "overdue" || !left.urgency ? right.daysOverdue - left.daysOverdue : left.dueDate.localeCompare(right.dueDate))
      || left.dueDate.localeCompare(right.dueDate) || left.recordName.localeCompare(right.recordName));
  }

  (store.projects || []).filter((project) => !project.archived).forEach((project) => {
    const recordName = project.entity || project.name;
    if (!projectStats(project).complete) {
      const alert = makeAlert({ id: `project:${project.id}`, targetKind: "project", targetId: project.id,
        scope: "project", recordName, owner: project.owner, dueDate: project.dueDate });
      if (alert) alerts.push(alert);
    }
    (project.taxDeadlines || []).forEach((deadline) => {
      const urgency = taxDeadlineUrgency(deadline, now);
      if (!["overdue", "due_today", "due_soon"].includes(urgency.level)) return;
      alerts.push({ id: `tax:project:${project.id}:${deadline.id}`, targetKind: "project", targetId: project.id,
        scope: "tax", recordName, owner: deadline.owner || project.owner || "", dueDate: deadline.dueDate,
        daysOverdue: urgency.daysOverdue, daysUntil: urgency.daysUntil, urgency: urgency.level,
        taxDeadline: { ...deadline } });
    });
  });

  (store.groups || []).filter((group) => !group.archived && !groupProgress(store, group.id).ready).forEach((group) => {
    const alert = makeAlert({ id: `group:${group.id}`, targetKind: "group", targetId: group.id,
      scope: "group", recordName: group.name, owner: group.owner, dueDate: group.dueDate });
    if (alert) alerts.push(alert);
  });
  (store.groups || []).filter((group) => !group.archived).forEach((group) => {
    (group.taxDeadlines || []).forEach((deadline) => {
      const urgency = taxDeadlineUrgency(deadline, now);
      if (!["overdue", "due_today", "due_soon"].includes(urgency.level)) return;
      alerts.push({ id: `tax:group:${group.id}:${deadline.id}`, targetKind: "group", targetId: group.id,
        scope: "tax", recordName: group.name, owner: deadline.owner || group.owner || "", dueDate: deadline.dueDate,
        daysOverdue: urgency.daysOverdue, daysUntil: urgency.daysUntil, urgency: urgency.level,
        taxDeadline: { ...deadline, linkedWorkstreamId: null } });
    });
  });

  const urgencyRank = { overdue: 0, due_today: 1, due_soon: 2 };
  return alerts.sort((left, right) => (urgencyRank[left.urgency || "overdue"] ?? 0) - (urgencyRank[right.urgency || "overdue"] ?? 0)
    || (left.urgency === "overdue" || !left.urgency ? right.daysOverdue - left.daysOverdue : left.dueDate.localeCompare(right.dueDate))
    || left.dueDate.localeCompare(right.dueDate) || left.recordName.localeCompare(right.recordName));
}

function overviewDay(value) {
  if (!validIsoDate(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

export function homeOverviewData(store, now = new Date()) {
  const current = now instanceof Date ? new Date(now) : new Date(now);
  const safeNow = Number.isNaN(current.getTime()) ? new Date() : current;
  const today = Date.UTC(safeNow.getFullYear(), safeNow.getMonth(), safeNow.getDate());
  const entityById = new Map((store?.entities || []).map((entity) => [entity.id, entity]));
  const records = (store?.engagements || []).flatMap((engagement) => {
    const entity = entityById.get(engagement.entityId);
    if (!entity || entity.archived || engagement.archived) return [];
    const kind = entity.kind === "holding_company" ? "group" : "project";
    const view = kind === "group" ? store.groups?.find((group) => group.id === engagement.id)
      : store.projects?.find((project) => project.id === engagement.id);
    const stats = kind === "group" ? groupProgress(store, engagement.id) : projectStats(view || engagement);
    return [{ id: engagement.id, kind, engagement, entity, view: view || engagement,
      percentage: stats.percentage || 0, complete: kind === "group" ? Boolean(stats.ready) : Boolean(stats.complete),
      started: kind === "group" ? (stats.percentage || 0) > 0 : Boolean(stats.started) }];
  });
  const recordById = new Map(records.map((record) => [record.id, record]));
  const activeRecords = records.filter((record) => !record.complete);
  const completedRecords = records.filter((record) => record.complete);
  const alerts = deadlineAlerts(store, safeNow);
  const upcomingDeadlines = activeRecords.flatMap((record) => {
    const due = overviewDay(record.engagement.dueDate);
    if (due === null) return [];
    const daysUntil = Math.floor((due - today) / 86400000);
    return daysUntil >= 0 && daysUntil <= 14 ? [{ record, daysUntil, dueDate: record.engagement.dueDate }] : [];
  }).sort((left, right) => left.daysUntil - right.daysUntil || left.record.entity.legalName.localeCompare(right.record.entity.legalName));
  const incompleteSetups = activeRecords.flatMap((record) => {
    const issues = [];
    if (!record.engagement.startDate) issues.push("start_date");
    if (!record.engagement.dueDate) issues.push("due_date");
    if (record.kind === "project" && !(record.engagement.workstreams || []).length) issues.push("workstreams");
    return issues.length ? [{ record, issues }] : [];
  });
  const openOutstanding = records.flatMap((record) => (record.engagement.outstandingItems || [])
    .filter((item) => outstandingIsOpen(item, store.outstandingStatuses))
    .map((item) => ({ record, item }))).sort((left, right) =>
      String(left.item.createdAt || "").localeCompare(String(right.item.createdAt || ""))
      || left.item.title.localeCompare(right.item.title));
  const entityIdsWithActiveEngagements = new Set(records.map((record) => record.entity.id));
  const entitiesWithoutEngagement = (store?.entities || []).filter((entity) => !entity.archived
    && !entityIdsWithActiveEngagements.has(entity.id)).sort((left, right) => left.legalName.localeCompare(right.legalName));
  const priorityItems = [
    ...alerts.map((alert) => ({ category: "deadline", urgency: alert.urgency || "overdue", alert,
      record: recordById.get(alert.targetId) || null, sortDate: alert.dueDate || "" })),
    ...upcomingDeadlines.map((item) => ({ category: "upcoming", urgency: item.daysUntil === 0 ? "due_today" : "due_soon",
      ...item, sortDate: item.dueDate })),
    ...incompleteSetups.map((item) => ({ category: "setup", urgency: "setup", ...item, sortDate: "" })),
    ...entitiesWithoutEngagement.map((entity) => ({ category: "new_engagement", urgency: "setup", entity, sortDate: "" })),
    ...openOutstanding.map((entry) => ({ category: "outstanding", urgency: "outstanding", ...entry,
      sortDate: entry.item.createdAt || "" })),
  ];
  const urgencyRank = { overdue: 0, due_today: 1, due_soon: 2, setup: 3, outstanding: 4 };
  priorityItems.sort((left, right) => (urgencyRank[left.urgency] ?? 9) - (urgencyRank[right.urgency] ?? 9)
    || left.sortDate.localeCompare(right.sortDate)
    || (left.record?.entity.legalName || left.entity?.legalName || left.alert?.recordName || "")
      .localeCompare(right.record?.entity.legalName || right.entity?.legalName || right.alert?.recordName || ""));
  const averageProgress = activeRecords.length
    ? Math.round(activeRecords.reduce((sum, record) => sum + record.percentage, 0) / activeRecords.length) : 0;
  return { records, activeRecords, completedRecords, alerts, upcomingDeadlines, incompleteSetups,
    openOutstanding, entitiesWithoutEngagement, priorityItems, averageProgress,
    deadlineAttentionCount: alerts.length + upcomingDeadlines.length,
    immediateDeadlineCount: priorityItems.filter((item) => ["overdue", "due_today"].includes(item.urgency)).length };
}

export function findParentMembership(store, kind, refId) {
  for (const group of store.groups || []) {
    const member = group.members.find((entry) => entry.kind === kind && entry.refId === refId);
    if (member) return { group, member };
  }
  return null;
}

export function workspaceScheduleOrder(store) {
  const rows = [
    ...(store?.projects || []).map((project) => ({ key: `project:${project.id}`, name: project.entity || project.name,
      owner: project.owner, startDate: project.startDate })),
    ...(store?.groups || []).map((group) => ({ key: `group:${group.id}`, name: group.name,
      owner: group.owner, startDate: group.startDate })),
  ];
  const validKeys = rows.map((row) => row.key);
  const valid = new Set(validKeys);
  const seen = new Set();
  const supplied = Array.isArray(store?.scheduleOrder) ? store.scheduleOrder : rows
    .sort((left, right) => (left.owner || "\uffff").localeCompare(right.owner || "\uffff")
      || (left.startDate || "9999-99-99").localeCompare(right.startDate || "9999-99-99")
      || String(left.name || "").localeCompare(String(right.name || ""))).map((row) => row.key);
  const ordered = supplied.filter((key) => {
    if (typeof key !== "string" || !valid.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...ordered, ...validKeys.filter((key) => !seen.has(key))];
}

export function reorderWorkspaceSchedule(store, sourceKey, targetKey, position = "before") {
  if (sourceKey === targetKey) return store;
  const order = workspaceScheduleOrder(store);
  if (!order.includes(sourceKey) || !order.includes(targetKey)) return store;
  const withoutSource = order.filter((key) => key !== sourceKey);
  const targetIndex = withoutSource.indexOf(targetKey);
  const insertionIndex = Math.max(0, targetIndex + (position === "after" ? 1 : 0));
  withoutSource.splice(insertionIndex, 0, sourceKey);
  return { ...store, scheduleOrder: withoutSource };
}

export function reorderWorkstreams(workstreams, sourceId, targetId, position = "before") {
  const current = Array.isArray(workstreams) ? workstreams : [];
  if (sourceId === targetId) return current;
  const source = current.find((workstream) => workstream.id === sourceId);
  if (!source || !current.some((workstream) => workstream.id === targetId)) return current;
  const reordered = current.filter((workstream) => workstream.id !== sourceId);
  const targetIndex = reordered.findIndex((workstream) => workstream.id === targetId);
  reordered.splice(Math.max(0, targetIndex + (position === "after" ? 1 : 0)), 0, source);
  return reordered.every((workstream, index) => workstream === current[index]) ? current : reordered;
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
  const role = assignment?.role?.trim() || "";
  let nextMember = null;
  if (targetGroup) {
    nextMember = current?.group.id === targetGroup.id && current.member.auditType === auditType
      ? (current.member.role === role ? current.member : { ...current.member, role, auditType })
      : makeGroupMember({ kind: "project", refId: projectId, role, auditType }, groupSample);
  }
  const now = new Date().toISOString();
  return { ...store, groups: store.groups.map((group) => {
    const memberIndex = group.members.findIndex((member) => member.kind === "project" && member.refId === projectId);
    if (group.id === targetGroup?.id && nextMember) {
      if (memberIndex >= 0 && group.members[memberIndex] === nextMember) return group;
      const members = [...group.members];
      if (memberIndex >= 0) members[memberIndex] = nextMember; else members.push(nextMember);
      return { ...group, members, updatedAt: now };
    }
    if (memberIndex < 0) return group;
    const members = group.members.filter((_, index) => index !== memberIndex);
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
  if (Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const engagement = store.engagements.find((item) => item.id === groupId);
    const entity = entityForEngagement(store, engagement);
    if (!engagement || entity?.kind !== "holding_company" || engagement.archived || entity.archived) {
      return { componentPercentage: 0, consolidationPercentage: 0,
        percentage: 0, ready: false, readyMembers: 0, totalMembers: 0, readyCompanies: 0, totalCompanies: 0 };
    }
    if (consolidationIsSimple(engagement)) {
      const workflow = workflowStats(engagement.consolidation?.nodes || []);
      return { componentPercentage: 0, consolidationPercentage: workflow.percentage,
        percentage: workflow.percentage, ready: workflow.complete,
        readyMembers: 0, totalMembers: 0, readyCompanies: 0, totalCompanies: 0 };
    }
    const nextVisited = new Set(visited).add(groupId);
    const components = engagement.consolidation?.components || [];
    const results = components.map((component) => {
      const target = store.engagements.find((item) => item.id === component.engagementId);
      const targetEntity = entityForEngagement(store, target);
      if (!target || !targetEntity || target.archived || targetEntity.archived
        || target.entityId !== component.entityId || !engagementReportingPeriodsMatch(target, engagement)) {
        return { percentage: 0, ready: false, readyCompanies: 0, totalCompanies: 1 };
      }
      if (targetEntity.kind === "holding_company") {
        const child = groupProgress(store, target.id, nextVisited);
        return { percentage: child.percentage, ready: child.ready,
          readyCompanies: child.totalCompanies ? child.readyCompanies : Number(child.ready), totalCompanies: child.totalCompanies || 1 };
      }
      const audit = (target.workstreams || []).find((workstream) => workstream.type === "audit");
      const readiness = component.readinessConditions || [];
      return {
        percentage: audit ? workstreamStats(audit).percentage
          : (readiness.length ? Math.round((readiness.filter((condition) => condition.done).length / readiness.length) * 100) : 0),
        ready: readiness.length > 0 && readiness.every((condition) => condition.done),
        readyCompanies: readiness.length > 0 && readiness.every((condition) => condition.done) ? 1 : 0,
        totalCompanies: 1,
      };
    });
    const componentPercentage = results.length
      ? Math.round(results.reduce((sum, result) => sum + result.percentage, 0) / results.length) : 0;
    const consolidationPercentage = workflowStats(engagement.consolidation?.nodes || []).percentage;
    const enabled = engagement.consolidation?.enabled !== false;
    const percentage = enabled ? Math.round(componentPercentage * 0.7 + consolidationPercentage * 0.3) : componentPercentage;
    const readyMembers = results.filter((result) => result.ready).length;
    const consolidationReady = !enabled || ((engagement.consolidation?.nodes || []).length > 0
      && (engagement.consolidation?.nodes || []).every(nodeIsComplete));
    return {
      componentPercentage,
      consolidationPercentage,
      percentage,
      ready: results.length > 0 && readyMembers === results.length && consolidationReady,
      readyMembers,
      totalMembers: results.length,
      readyCompanies: results.reduce((sum, result) => sum + result.readyCompanies, 0),
      totalCompanies: results.reduce((sum, result) => sum + result.totalCompanies, 0),
    };
  }
  const group = (store.groups || []).find((item) => item.id === groupId);
  if (!group) return { componentPercentage: 0, consolidationPercentage: 0,
    percentage: 0, ready: false, readyMembers: 0, totalMembers: 0, readyCompanies: 0, totalCompanies: 0 };
  if (consolidationIsSimple(group)) {
    const workflow = workflowStats(group.nodes || []);
    return { componentPercentage: 0, consolidationPercentage: workflow.percentage,
      percentage: workflow.percentage, ready: !group.archived && workflow.complete,
      readyMembers: 0, totalMembers: 0, readyCompanies: 0, totalCompanies: 0 };
  }
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
  if (consolidationIsSimple(group)) return own;
  const children = group.members.flatMap((member) => {
    if (member.kind === "project") {
      const project = store.projects.find((item) => item.id === member.refId);
      if (!project || (!includeArchived && (project.archived || entityForEngagement(store, project.id)?.archived))) return [];
      return (project?.outstandingItems || []).map((item) => ({
        item, sourceType: "project", sourceId: project.id, sourceName: project.name, depth: depth + 1,
      }));
    }
    const child = store.groups.find((item) => item.id === member.refId);
    if (!child || (!includeArchived && (child.archived || entityForEngagement(store, child.id)?.archived))) return [];
    return collectGroupOutstandingEntries(store, member.refId, nextVisited, depth + 1, includeArchived);
  });
  return [...own, ...children];
}

export function collectGroupTaxDeadlineEntries(store, groupId, visited = new Set(), depth = 0, includeArchived = false,
  seenEntries = new Set()) {
  if (visited.has(groupId)) return [];
  const group = (store.groups || []).find((item) => item.id === groupId);
  if (!group) return [];
  const nextVisited = new Set(visited).add(groupId);
  const own = (group.taxDeadlines || []).flatMap((deadline) => {
    const entryKey = `group:${group.id}:${deadline.id}`;
    if (seenEntries.has(entryKey)) return [];
    seenEntries.add(entryKey);
    return [{ deadline, sourceType: "group", sourceId: group.id, sourceName: group.name, depth }];
  });
  const children = (group.members || []).flatMap((member) => {
    if (member.kind === "project") {
      const project = (store.projects || []).find((item) => item.id === member.refId);
      if (!project || (!includeArchived && project.archived)) return [];
      return (project.taxDeadlines || []).flatMap((deadline) => {
        const entryKey = `project:${project.id}:${deadline.id}`;
        if (seenEntries.has(entryKey)) return [];
        seenEntries.add(entryKey);
        return [{ deadline, sourceType: "project", sourceId: project.id,
          sourceName: project.entity || project.name, depth: depth + 1 }];
      });
    }
    const child = (store.groups || []).find((item) => item.id === member.refId);
    if (!child || (!includeArchived && child.archived)) return [];
    return collectGroupTaxDeadlineEntries(store, member.refId, nextVisited, depth + 1, includeArchived, seenEntries);
  });
  return [...own, ...children];
}

export function activeOutstandingItems(store) {
  if (Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const activeEntities = new Set(store.entities.filter((entity) => !entity.archived).map((entity) => entity.id));
    return store.engagements.filter((engagement) => activeEntities.has(engagement.entityId) && !engagement.archived)
      .flatMap((engagement) => engagement.outstandingItems || []);
  }
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

function formatFormalDate(value, language = "en") {
  if (!validIsoDate(value)) return value || "";
  if (language !== "en") {
    const [year, month, day] = value.split("-").map(Number);
    return `${year}年${month}月${day}日`;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formalSingleReportingPeriodLabel(engagement, language = "en") {
  const start = engagement?.periodStart || "";
  const end = engagement?.periodEnd || "";
  if (!start && !end) return language === "en" ? "No annual engagement"
    : language === "zh-Hant" ? "尚無年度項目" : "尚无年度项目";
  const formattedStart = formatFormalDate(start, language);
  const formattedEnd = formatFormalDate(end, language);
  if (engagement?.periodPreset === "doi_year_end" && start && end) {
    if (language === "en") return `For the period from ${formattedStart} (DOI) to ${formattedEnd}`;
    return language === "zh-Hant" ? `期間：${formattedStart}（DOI）至${formattedEnd}`
      : `期间：${formattedStart}（DOI）至${formattedEnd}`;
  }
  if (["calendar", "apr_mar"].includes(inferPeriodPreset(start, end))) return formattedEnd;
  if (start && end) {
    if (language === "en") return `For the period from ${formattedStart} to ${formattedEnd}`;
    return language === "zh-Hant" ? `期間：${formattedStart}至${formattedEnd}` : `期间：${formattedStart}至${formattedEnd}`;
  }
  return formattedEnd || formattedStart;
}

export function formalReportingPeriodLabel(engagement, language = "en") {
  const periods = engagementReportingPeriods(engagement);
  if (periods.length > 1) return periods.map((period) => formalSingleReportingPeriodLabel(period, language)).join(" · ");
  return formalSingleReportingPeriodLabel(periods[0] || engagement, language);
}

export function yearEndOrPeriodLabel(engagement, language = "en") {
  const periods = engagementReportingPeriods(engagement);
  const labelFor = (period) => {
    const label = formalSingleReportingPeriodLabel(period, language);
    if (!["calendar", "apr_mar"].includes(inferPeriodPreset(period?.periodStart, period?.periodEnd))) return label;
    if (language === "en") return `YE ${label}`;
    return language === "zh-Hant" ? `年結：${label}` : `年结：${label}`;
  };
  if (periods.length) return periods.map(labelFor).join(" · ");
  return labelFor(engagement);
}

export function reportingPeriodLabel(item, language = "zh") {
  const periods = engagementReportingPeriods(item);
  if (periods.length > 1) return periods.map((period) => reportingPeriodLabel(period, language)).join(" · ");
  const current = periods[0] || item;
  const start = current?.periodStart;
  const end = current?.periodEnd;
  if (start && end) return `${formatDate(start, language)} – ${formatDate(end, language)}`;
  if (start) return language === "en" ? `From ${formatDate(start, language)}`
    : language === "zh-Hant" ? `自 ${formatDate(start, language)} 起` : `自 ${formatDate(start, language)} 起`;
  if (end) return language === "en" ? `To ${formatDate(end, language)}`
    : language === "zh-Hant" ? `截至 ${formatDate(end, language)}` : `截至 ${formatDate(end, language)}`;
  return typeof current?.period === "string" ? current.period : "";
}

export function dueTone(project) {
  if (!project.dueDate || projectStats(project).complete) return "neutral";
  const due = new Date(`${project.dueDate}T23:59:59`).getTime();
  const days = Math.ceil((due - Date.now()) / 86400000);
  if (days < 0) return "danger";
  if (days <= 7) return "warning";
  return "neutral";
}
