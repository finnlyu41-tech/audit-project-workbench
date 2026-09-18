import React from 'react';
import { useUiLanguage } from './i18n.jsx';
import { workstreamTypeLabel } from './model.js';
import { WORKSTREAM_STATUSES, workstreamStatus, workstreamStatusLabel } from './workstream-mode.js';
import './simple-workstream.css';

function InlineValue({ value = '', onCommit, multiline = false, ...props }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  const Field = multiline ? 'textarea' : 'input';
  return <Field {...props} value={draft} onChange={event => setDraft(event.target.value)}
    onBlur={event => { if (event.currentTarget.reportValidity() && draft !== value) onCommit(draft); }}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') { event.preventDefault(); setDraft(value); }
      if (event.key === 'Enter' && !multiline) { event.preventDefault();
        if (event.currentTarget.reportValidity()) event.currentTarget.blur(); }
    }} />;
}

export function SimpleWorkstream({ workstream, readOnly, selected, openItems = 0, onChange, onEdit, onSelect,
  dragging, dropPosition, onDragStart, onDragEnd, onDragOver, onDrop, onReorderKeyDown }) {
  const { language, t } = useUiLanguage();
  const name = workstreamTypeLabel(workstream.type, language, workstream.customName);
  return <article className="simple-workstream" aria-label={name} data-workstream-id={workstream.id}
    data-selected={selected || undefined} data-dragging={dragging || undefined} data-drop-position={dropPosition}
    onFocusCapture={onSelect} onDragOver={onDragOver} onDrop={onDrop}>
    <button type="button" className="simple-workstream-name" aria-pressed={selected} onClick={onSelect}
      draggable={!readOnly} onDragStart={onDragStart} onDragEnd={onDragEnd} onKeyDown={onReorderKeyDown}
      aria-keyshortcuts={!readOnly ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}>
      <strong>{name}</strong>{openItems > 0 && <small>{t('{count} 项未清', { count: openItems })}</small>}</button>
    <label className="simple-workstream-status"><span>{t('模块状态')}</span><select disabled={readOnly} value={workstreamStatus(workstream)}
      onChange={event => onChange({ simpleStatus: event.target.value })}>{WORKSTREAM_STATUSES.map(simpleStatus => <option key={simpleStatus} value={simpleStatus}>
        {t(workstreamStatusLabel({ simpleStatus }))}</option>)}</select></label>
    <label><span>{t('负责人')}</span><InlineValue disabled={readOnly} value={workstream.owner}
      onCommit={owner => onChange({ owner: owner.trim() })} /></label>
    <label><span>{t('截止日')}</span><InlineValue type="date" disabled={readOnly} min={workstream.startDate || undefined}
      value={workstream.dueDate} onCommit={dueDate => onChange({ dueDate })} /></label>
    <details className="simple-workstream-more"><summary>{t('更多资料')}</summary><div>
      <label><span>{t('开始日')}</span><InlineValue type="date" disabled={readOnly} max={workstream.dueDate || undefined}
        value={workstream.startDate} onCommit={startDate => onChange({ startDate })} /></label>
      <label className="simple-workstream-notes"><span>{t('备注')}</span><InlineValue multiline disabled={readOnly}
        value={workstream.notes} onCommit={notes => onChange({ notes })} /></label>
      {!readOnly && <button className="button secondary" type="button" onClick={onEdit}>{t('编辑模块资料')}</button>}
    </div></details>
  </article>;
}
