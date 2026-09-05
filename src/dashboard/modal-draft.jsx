import React from "react";

export const ModalDraftContext = React.createContext(null);

// Only explicit editor state is tracked. Search terms, disclosures and live settings
// are not unsaved drafts. Reverting to the initial value removes the warning.
export function useModalDraft(value, onClose) {
  const context = React.useContext(ModalDraftContext);
  const key = React.useId();
  const signature = JSON.stringify(value);
  const baseline = React.useRef(signature);
  React.useLayoutEffect(() => {
    context?.registry.update(key, baseline.current, signature);
  }, [context, key, signature]);
  React.useLayoutEffect(() => () => context?.registry.remove(key), [context, key]);
  return {
    closeEditor: () => context ? context.requestClose(onClose) : onClose?.(),
    confirmTransition: (action) => context ? context.requestClose(action) : action?.(),
  };
}
