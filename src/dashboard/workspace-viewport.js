import { useSyncExternalStore } from 'react';

// Layout viewport is an external browser value. Reading it during render also
// prevents delayed/missed MediaQueryList notifications from retaining a docked
// navigation column after a narrow resize (observed in Linux WebKit).
const getWidth = () => window.innerWidth;
const serverWidth = () => 1440;
function subscribe(listener) {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}
export function useWorkspaceViewportWidth() {
  return useSyncExternalStore(subscribe, getWidth, serverWidth);
}
