// Manual work order belongs to an annual engagement, not its company or deadlines.
export const PROJECT_PRIORITIES = Object.freeze(['urgent', 'high', 'normal', 'low']);
export const PRIORITY_LABELS = Object.freeze({ urgent: '紧急', high: '高', normal: '普通', low: '低' });
export const validProjectPriority = value => PROJECT_PRIORITIES.includes(value);
export const projectPriority = record => validProjectPriority(record?.priority) ? record.priority : 'normal';
export const priorityFields = record => projectPriority(record) === 'normal' ? {} : { priority: record.priority };
export const compareProjectPriority = (left, right) =>
  PROJECT_PRIORITIES.indexOf(projectPriority(left)) - PROJECT_PRIORITIES.indexOf(projectPriority(right));
export function withProjectPriority(record, priority) {
  if (!validProjectPriority(priority)) throw new Error('Invalid project priority');
  const { priority: previous, ...rest } = record;
  return priority === 'normal' ? rest : { ...rest, priority };
}
export function prepareProjectPriority(store, id, priority, baseline) {
  if (!validProjectPriority(priority)) return { error: 'invalid' };
  const record = store.engagements.find(item => item.id === id);
  const entity = store.entities.find(item => item.id === record?.entityId);
  if (!record || !entity || record.archived || entity.archived) return { error: 'readonly' };
  const current = projectPriority(record);
  if (baseline !== undefined && baseline !== current && priority !== current) return { error: 'conflict' };
  return { priority, changed: current !== priority };
}
export function prioritizedActiveRecords(records, owner = '') {
  return records.filter(record => !record.complete && !record.engagement.archived && !record.entity.archived
    && (!owner || record.engagement.owner === owner)).sort((a, b) =>
      compareProjectPriority(a.engagement, b.engagement)
      || comparePriorityDueDates(a.engagement, b.engagement));
}

function comparePriorityDueDates(a, b) {
  if (Boolean(a.dueDate) !== Boolean(b.dueDate)) return a.dueDate ? -1 : 1;
  return (a.dueDate || '').localeCompare(b.dueDate || '');
}
