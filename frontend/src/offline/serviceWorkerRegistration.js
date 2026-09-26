// Thin wrapper around vite-plugin-pwa's virtual register module, so the
// rest of the app doesn't import the `virtual:pwa-register` specifier
// directly. Call registerAppServiceWorker() once from main.jsx.

import { registerSW } from 'virtual:pwa-register';

export function registerAppServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh() {
      // A new version was precached — Phase 7 can wire this to a toast/prompt.
      // For now, silently take the update on next load rather than forcing
      // a disruptive reload mid-session.
      console.log('[sw] New content available, will be used on next reload.');
    },
    onOfflineReady() {
      console.log('[sw] App is ready to work offline.');
    },
  });

  return updateSW;
}