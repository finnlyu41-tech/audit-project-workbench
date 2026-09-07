import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { PROJECT_PRIORITIES, PRIORITY_LABELS, projectPriority } from './project-priority.js';

export function ProjectPriorityBadge({ record }) {
  const { t } = useUiLanguage(); const priority = projectPriority(record);
  if (priority === 'normal') return null;
  return <span className="project-priority-badge" data-priority={priority}
    aria-label={t('项目优先级：{priority}', { priority: t(PRIORITY_LABELS[priority]) })}>{t(PRIORITY_LABELS[priority])}</span>;
}

export function ProjectPrioritySelect({ value, onChange, disabled = false, compact = false }) {
  const { t } = useUiLanguage();
  return <label className="project-priority-field" data-compact={compact || undefined}>
    <span>{t('优先级')}</span><select aria-label={t('项目优先级')} value={value} disabled={disabled}
      data-priority={value} onChange={event => onChange(event.target.value)}>
      {PROJECT_PRIORITIES.map(priority => <option key={priority} value={priority}>{t(PRIORITY_LABELS[priority])}</option>)}
    </select>
  </label>;
}
