// Drafts stay in component memory. This registry tracks differences, never saves data.
export function createDraftRegistry(onChange = () => {}) {
  const entries = new Map();
  let dirty = false;
  const refresh = () => {
    const next = [...entries.values()].some(Boolean);
    if (next !== dirty) { dirty = next; onChange(dirty); }
  };
  return {
    update(key, baseline, current) { entries.set(key, baseline !== current); refresh(); },
    remove(key) { entries.delete(key); refresh(); },
    isDirty() { return dirty; },
  };
}

export function isComposingKey(event) {
  return Boolean(event.isComposing || event.nativeEvent?.isComposing
    || event.keyCode === 229 || event.nativeEvent?.keyCode === 229);
}
