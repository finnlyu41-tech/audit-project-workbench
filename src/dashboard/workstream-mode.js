export const WORKSTREAM_STATUSES = ['not_started', 'in_progress', 'on_hold', 'completed'];
export const workstreamIsSimple = value => value?.mode === 'simple';
export const workstreamStatus = value => WORKSTREAM_STATUSES.includes(value?.simpleStatus) ? value.simpleStatus : 'not_started';
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
  const complete = workstreamStatus(value) === 'completed';
  return { conditions: 0, completedConditions: 0, nodes: 0, completedNodes: 0,
    percentage: complete ? 100 : 0, complete, started: workstreamStatus(value) !== 'not_started' };
}
