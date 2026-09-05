import React from "react";
import { X } from "lucide-react";
import { useUiLanguage } from "./i18n.jsx";
import { createDraftRegistry, isComposingKey } from "./editor-draft-state.js";
import { ModalDraftContext } from "./modal-draft.jsx";
import { FeedbackSlot } from "./feedback.jsx";

const FOCUSABLE = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [tabindex]';
function visibleControls(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE)].filter((element) => !element.disabled
    && element.tabIndex >= 0 && element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== "hidden" && !element.closest('[inert]'));
}

export function Modal({ title, onClose, children, wide = false, large = false }) {
  const { t } = useUiLanguage();
  const dialogRef = React.useRef(null);
  const lastFieldRef = React.useRef(null);
  const backdropStart = React.useRef(false);
  const invalidFrame = React.useRef(null);
  const returnFocusRef = React.useRef(typeof document === "undefined" ? null : document.activeElement);
  const closeRef = React.useRef(onClose);
  const textRef = React.useRef(t);
  closeRef.current = onClose; textRef.current = t;
  const [dirty, setDirty] = React.useState(false);
  const registry = React.useMemo(() => createDraftRegistry(setDirty), []);
  const context = React.useMemo(() => ({ registry, requestClose: (action) => {
    if (registry.isDirty() && !window.confirm(textRef.current("有未保存的更改。确定放弃这些更改并离开此编辑器吗？"))) {
      lastFieldRef.current?.focus({ preventScroll: true }); return false;
    }
    (typeof action === "function" ? action : closeRef.current)?.(); return true;
  } }), [registry]);
  const titleId = React.useId();
  React.useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      const controls = visibleControls(dialog);
      const preferred = controls.find((element) => element.hasAttribute("data-dialog-initial-focus"))
        || controls.find((element) => element.matches("input,select,textarea"));
      (preferred || controls.find((element) => !element.hasAttribute("data-modal-close") && !element.closest(".feedback-slot")) || dialog).focus();
    });
    const escape = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || isComposingKey(event)) return;
      event.preventDefault(); context.requestClose();
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.cancelAnimationFrame(invalidFrame.current);
      window.removeEventListener("keydown", escape);
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [context]);
  React.useEffect(() => {
    if (!dirty) return;
    const protect = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  const trapFocus = (event) => {
    if (event.key !== "Tab") return;
    const controls = visibleControls(event.currentTarget);
    if (!controls.length) { event.preventDefault(); event.currentTarget.focus(); return; }
    const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const revealInvalidField = (event) => {
    const field = event.target;
    for (let ancestor = field.parentElement; ancestor && ancestor !== dialogRef.current; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === "DETAILS") ancestor.open = true;
    }
    if (invalidFrame.current !== null) return;
    invalidFrame.current = window.requestAnimationFrame(() => {
      invalidFrame.current = null;
      if (field.isConnected) { field.focus({ preventScroll: true }); field.scrollIntoView({ block: "center", inline: "nearest" }); }
    });
  };
  return <ModalDraftContext.Provider value={context}>
    <div className="workbench-modal-backdrop" role="presentation"
      onPointerDownCapture={(event) => { backdropStart.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (backdropStart.current && event.target === event.currentTarget) context.requestClose();
        backdropStart.current = false;
      }}>
      <section className="workbench-modal" data-wide={wide || undefined} data-large={large || undefined}
        data-dirty={dirty || undefined} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        tabIndex="-1" onKeyDown={trapFocus} onInvalidCapture={revealInvalidField}
        onFocusCapture={(event) => { if (event.target.matches("input,select,textarea")) lastFieldRef.current = event.target; }}>
        <header><h2 id={titleId}>{title}</h2>{dirty && <span className="modal-unsaved" role="status">{t("未保存更改")}</span>}
          <button type="button" className="icon-button icon-only" onClick={() => context.requestClose()} data-modal-close
            aria-label={t("关闭")} data-tooltip={t("关闭")} data-tooltip-side="left"><X aria-hidden="true" /></button></header>
        <FeedbackSlot surface="dialog" />
        <div className="workbench-modal-body">{children}</div>
      </section>
    </div>
  </ModalDraftContext.Provider>;
}
