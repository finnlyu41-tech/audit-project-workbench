import { validSchedulePlan, dateOnly } from "./working-days.js";
// Opt-in local conveniences, deliberately separate from client business backups.
export const PRODUCTIVITY_OPTIONS_KEY = 'audit-progress-workbench:productivity-options:v1';
export const LOCAL_DRAFTS_KEY = 'audit-progress-workbench:local-drafts:v1';
export const SAVED_FILTERS_KEY = 'audit-progress-workbench:saved-filters:v1';
export const LOCAL_PRODUCTIVITY_EVENT = 'apw-local-productivity-changed';
export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
const storageOrDefault = storage => storage || globalThis.localStorage;
function read(key, fallback, storage) {
  try { const raw = storageOrDefault(storage).getItem(key); if (raw && raw.length <= 1_000_000) return JSON.parse(raw); }
  catch { /* Optional data cannot break the workspace. */ }
  return fallback;
}
export const draftRecoveryEnabled = storage => read(PRODUCTIVITY_OPTIONS_KEY, {}, storage)?.drafts === true;
export function setDraftRecoveryEnabled(enabled, storage) {
  const target = storageOrDefault(storage);
  target.setItem(PRODUCTIVITY_OPTIONS_KEY, JSON.stringify({ drafts: Boolean(enabled) }));
  if (!enabled) target.removeItem(LOCAL_DRAFTS_KEY);
  globalThis.window?.dispatchEvent(new Event(LOCAL_PRODUCTIVITY_EVENT));
}
export function resetLocalProductivity(storage) {
  const target = storageOrDefault(storage);
  // This runs before a confirmed workspace replacement, never on a normal reload.
  target.removeItem(LOCAL_DRAFTS_KEY); target.removeItem(SAVED_FILTERS_KEY);
  globalThis.window?.dispatchEvent(new CustomEvent(LOCAL_PRODUCTIVITY_EVENT, { detail: { workspaceReplaced: true } }));
}
function activeDrafts(storage, now) {
  const rows = read(LOCAL_DRAFTS_KEY, [], storage);
  return Array.isArray(rows) ? rows.filter(r => r && typeof r.key === 'string' && typeof r.baseline === 'string'
    && r.expires > now && r.expires <= now + DRAFT_TTL && r.data && typeof r.data === 'object').slice(-12) : [];
}
export function readLocalDraft(key, baseline, storage, now = Date.now()) {
  const row = activeDrafts(storage, now).find(r => r.key === key);
  return row ? { ...row, stale: row.baseline !== baseline } : null;
}
export function writeLocalDraft(key, baseline, data, storage, now = Date.now()) {
  if (!draftRecoveryEnabled(storage)) return false;
  const serialized = JSON.stringify(data);
  if (serialized.length > 100_000 || key.length > 500 || baseline.length > 300_000) throw new Error('draft_too_large');
  const rows = activeDrafts(storage, now).filter(r => r.key !== key);
  rows.push({ key, baseline, data: JSON.parse(serialized), expires: now + DRAFT_TTL });
  let keep = rows.slice(-12);
  while (keep.length > 1 && JSON.stringify(keep).length > 900_000) keep.shift();
  storageOrDefault(storage).setItem(LOCAL_DRAFTS_KEY, JSON.stringify(keep));
  return true;
}
export function deleteLocalDraft(key, storage) {
  const target = storageOrDefault(storage); const rows = read(LOCAL_DRAFTS_KEY, [], storage);
  if (Array.isArray(rows) && rows.some(r => r.key === key)) target.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(rows.filter(r => r.key !== key)));
}
export function savedFilters(scope, storage) {
  const rows = read(SAVED_FILTERS_KEY, [], storage);
  return Array.isArray(rows) ? rows.filter(r => r && r.scope === scope && typeof r.name === 'string' && r.name.length <= 80
    && r.values && typeof r.values === 'object' && !Array.isArray(r.values)).slice(0, 12) : [];
}
export function saveFilter(scope, name, values, storage) {
  if (typeof scope !== 'string' || !name?.trim() || name.length > 80 || JSON.stringify(values).length > 5000) throw new Error('invalid_filter');
  const raw = read(SAVED_FILTERS_KEY, [], storage), rows = Array.isArray(raw) ? raw.slice(-60) : [];
  const next = rows.filter(r => !(r.scope === scope && r.name === name.trim()));
  if (next.filter(r => r.scope === scope).length >= 12) throw new Error('filter_limit');
  next.push({ scope, name: name.trim(), values });
  storageOrDefault(storage).setItem(SAVED_FILTERS_KEY, JSON.stringify(next));
}
export function deleteFilter(scope, name, storage) {
  const raw = read(SAVED_FILTERS_KEY, [], storage);
  storageOrDefault(storage).setItem(SAVED_FILTERS_KEY, JSON.stringify((Array.isArray(raw) ? raw : []).filter(r => r.scope !== scope || r.name !== name)));
}

// Structural validation is intentionally permissive about unfinished date/text
// values but strict about types before React editors can dereference them.
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const texts = (value, keys) => object(value) && keys.every(key => typeof value[key] === 'string');
const uniqueRows = (value, check, limit = 100) => Array.isArray(value) && value.length <= limit
  && value.every(check) && new Set(value.map(r => r.id)).size === value.length;
export function validScheduleDraft(value) {
  return object(value) && ['manual', 'workdays'].includes(value.mode)
    && ['forward', 'backward', 'count'].includes(value.direction) && ['mon-fri', 'mon-sat'].includes(value.workweek)
    && texts(value, ['workdays', 'requestedStartDate', 'targetDueDate', 'bufferDays'])
    && (!value.snapshot || (texts(value.snapshot, ['startDate', 'dueDate']) && validSchedulePlan(value.snapshot.schedulePlan)
      && dateOnly(value.snapshot.startDate) && dateOnly(value.snapshot.dueDate)
      && value.snapshot.startDate >= value.snapshot.schedulePlan.requestedStartDate && value.snapshot.dueDate >= value.snapshot.startDate
      && String(value.snapshot.schedulePlan.workdays) === value.workdays && value.snapshot.schedulePlan.workweek === value.workweek));
}
export function validCompanyDraft(data) {
  return object(data) && ['single', 'group'].includes(data.creationMode)
    && texts(data.values, ['legalName', 'aliasesText', 'entityType', 'incorporationDate', 'kind', 'parentEntityId', 'relationshipRole', 'fiscalYearPreset', 'notes'])
    && uniqueRows(data.batchCompanies, row => texts(row, ['id', 'legalName', 'entityType', 'fiscalYearPreset', 'relationshipRole'])) && data.batchCompanies.length > 0;
}
export function validAnnualDraft(data) {
  return object(data) && texts(data, ['sourceMode', 'sourceEngagementId', 'customEngagementType'])
    && ['previous', 'template', 'blank'].includes(data.sourceMode) && validScheduleDraft(data.scheduleDraft)
    && texts(data.values, ['internalName', 'engagementType', 'reportingFramework', 'owner', 'priority', 'startDate', 'dueDate', 'notes', 'consolidationMode'])
    && typeof data.values.consolidationEnabled === 'boolean'
    && Array.isArray(data.values.engagementTypes) && data.values.engagementTypes.every(v => typeof v === 'string')
    && uniqueRows(data.values.reportingPeriods, row => texts(row, ['id', 'periodPreset', 'periodStart', 'periodEnd']) && Number.isFinite(row.baseYear))
    && data.values.reportingPeriods.length > 0 && Array.isArray(data.selections) && data.selections.every(row => texts(row, ['categoryId', 'type', 'customName', 'sampleId']));
}
export function validQuickDraft(data) {
  return object(data) && texts(data, ['baselineContext']) && Boolean(data.baselineContext) && texts(data.values, ['owner', 'startDate', 'dueDate', 'notes'])
    && texts(data.baseline, ['owner', 'startDate', 'dueDate', 'notes']) && (!data.scheduleDraft || validScheduleDraft(data.scheduleDraft));
}
