export const WORKSTREAM_STATUSES = ['not_started', 'in_progress', 'on_hold', 'completed'];
export const workstreamIsSimple = value => value?.mode === 'simple';
// The recorded module outcome is shared; mode only chooses its editing surface.
export const hasWorkstreamStatus = value => WORKSTREAM_STATUSES.includes(value?.simpleStatus);
export const workstreamStatus = value => {
  if (hasWorkstreamStatus(value)) return value.simpleStatus;
  const stats = workflowStats(value);
  return stats.complete ? 'completed' : stats.started ? 'in_progress' : 'not_started';
};
export const workstreamStatusLabel = value => ({ not_started: '未开始', in_progress: '进行中', on_hold: '待处理', completed: '已完成' })[workstreamStatus(value)];
export const activeWorkstreamNodes = value => workstreamIsSimple(value) ? [] : value?.nodes || [];

// Omit optional defaults in old workspaces. Retain inactive mode data for a reversible switch.
export function workstreamModeFields(value = {}) {
  return {
    ...(workstreamIsSimple(value) ? { mode: 'simple' } : {}),
    ...(value.simpleStatus !== undefined ? { simpleStatus: workstreamStatus(value) } : {}),
    ...(typeof value.startDate === 'string' ? { startDate: value.startDate } : {}),
    ...(typeof value.notes === 'string' ? { notes: value.notes } : {}),
  };
}

export function simpleWorkstreamStats(value) {
  const status = workstreamStatus(value), complete = status === 'completed';
  return { conditions: 0, completedConditions: 0, nodes: 0, completedNodes: 0,
    percentage: complete ? 100 : 0, complete, started: status !== 'not_started' };
}

// A real checklist edit supersedes a manual outcome; text/reorder/no-op edits do not.
export function withWorkstreamNodes(workstream, nodes) {
  const progress = rows => JSON.stringify(rows.map(n => JSON.stringify([n.id,
    n.conditions.map(c => JSON.stringify([c.id, c.done])).sort()])).sort());
  const result = { ...workstream, nodes };
  if (hasWorkstreamStatus(workstream) && progress(workstream.nodes) !== progress(nodes)) delete result.simpleStatus;
  return result;
}

// Shared checklist calculation; importing from model.js remains supported.
export function nodeIsComplete(node) {
  return node.conditions.length > 0 && node.conditions.every((condition) => condition.done);
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
