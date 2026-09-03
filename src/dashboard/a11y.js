const TAB_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

export function handleTabListKeyDown(event) {
  if (!TAB_KEYS.has(event.key)) return;
  const currentTab = event.target.closest?.('[role="tab"]');
  if (!currentTab || !event.currentTarget.contains(currentTab)) return;
  const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')]
    .filter((tab) => !tab.disabled && tab.getAttribute("aria-disabled") !== "true");
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < 0 || tabs.length < 2) return;

  event.preventDefault();
  let nextIndex;
  if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else nextIndex = (currentIndex + 1) % tabs.length;

  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}

export function tabIndexFor(selected) {
  return selected ? 0 : -1;
}
