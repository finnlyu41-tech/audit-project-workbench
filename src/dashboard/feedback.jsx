import React from 'react';
import { Info, X } from 'lucide-react';
import { useUiLanguage } from './i18n.jsx';
import { createFeedbackTimer, feedbackDuration } from './feedback-timer.js';

export const FeedbackContext = React.createContext(null);
export function useFeedbackController() {
  const [message, setMessage] = React.useState(null);
  const sequence = React.useRef(0);
  const timer = React.useRef(null);
  const pauses = React.useRef(new Set());
  const publish = React.useCallback((text) => {
    setMessage(text ? { id: ++sequence.current, text: String(text) } : null);
  }, []);
  const dismiss = React.useCallback((id) => {
    setMessage((current) => current?.id === id ? null : current);
  }, []);
  const pause = React.useCallback((reason) => { pauses.current.add(reason); timer.current?.pause(reason); }, []);
  const resume = React.useCallback((reason) => { pauses.current.delete(reason); timer.current?.resume(reason); }, []);
  React.useEffect(() => {
    if (!message) return;
    const current = createFeedbackTimer(() => dismiss(message.id), feedbackDuration(message.text), {
      now: () => Date.now(), setTimer: (action, delay) => window.setTimeout(action, delay),
      clearTimer: (handle) => window.clearTimeout(handle),
    });
    timer.current = current;
    pauses.current.forEach((reason) => current.pause(reason));
    return () => { current.cancel(); if (timer.current === current) timer.current = null; };
  }, [message, dismiss]);
  React.useEffect(() => {
    const update = () => document.hidden ? pause('page-hidden') : resume('page-hidden');
    update(); document.addEventListener('visibilitychange', update);
    return () => { document.removeEventListener('visibilitychange', update); resume('page-hidden'); };
  }, [pause, resume]);
  return React.useMemo(() => ({ message, publish, dismiss, pause, resume }), [message, publish, dismiss, pause, resume]);
}

const available = (element) => element?.isConnected && !element.disabled && element.getClientRects().length
  && !element.closest('[hidden], [inert]') && getComputedStyle(element).visibility !== 'hidden';

export function FeedbackSlot({ surface, active = true }) {
  const feedback = React.useContext(FeedbackContext);
  const { t } = useUiLanguage();
  const slot = React.useRef(null);
  const returnFocus = React.useRef(null);
  const key = React.useId();
  const message = active ? feedback?.message : null;
  const { pause, resume } = feedback || {};
  React.useEffect(() => () => {
    resume?.(`${key}:pointer`); resume?.(`${key}:focus`);
  }, [active, Boolean(message), key, resume]);
  const dismiss = () => {
    const root = slot.current.closest('[role="dialog"]') || slot.current.closest('.audit-workbench');
    const restore = slot.current.contains(document.activeElement);
    feedback.dismiss(message.id);
    if (!restore) return;
    window.requestAnimationFrame(() => {
      if (!root.isConnected) return;
      const previous = returnFocus.current;
      const usable = (element) => available(element) && !element.closest('.feedback-slot');
      const fallback = [...root.querySelectorAll('input, select, textarea, [data-dialog-initial-focus]')].find(usable)
        || [...root.querySelectorAll('.project-detail, button')].find(usable);
      const target = usable(previous) && root.contains(previous) ? previous : fallback;
      target?.focus({ preventScroll: true });
    });
  };
  return <div ref={slot} className="feedback-slot" data-feedback-surface={surface}
    data-feedback-active={Boolean(message) || undefined} hidden={!active}
    onPointerEnter={() => pause?.(`${key}:pointer`)} onPointerLeave={() => resume?.(`${key}:pointer`)}
    onFocusCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) returnFocus.current = event.relatedTarget;
      pause?.(`${key}:focus`);
    }} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) resume?.(`${key}:focus`);
    }}>
    {message && <Info aria-hidden="true" className="feedback-icon" />}
    <div className="feedback-copy" role={message ? 'status' : undefined} aria-live="polite" aria-atomic="true"
      aria-label={message ? t("操作提示") : undefined} tabIndex={message ? 0 : -1}>
      {message && <span key={message.id} data-feedback-sequence={message.id}>{message.text}</span>}
    </div>
    {message && <button type="button" className="feedback-dismiss" data-feedback-dismiss
      aria-label={t("关闭提示")} title={t("关闭提示")} onClick={dismiss}><X aria-hidden="true" /></button>}
  </div>;
}
