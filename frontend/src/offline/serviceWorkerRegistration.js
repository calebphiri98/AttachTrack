import { registerSW } from 'virtual:pwa-register';

export function registerAppServiceWorker() {
  return registerSW({
    immediate: true,
    onNeedRefresh() {},
    onOfflineReady() {},
  });
}
