import { registerSW } from 'virtual:pwa-register';

export function initPwa() {
    const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
            if (window.confirm('A new version of RacketTier is available. Reload to update?')) {
                updateSW(true);
            }
        },
        onOfflineReady() {
            console.info('[PWA] App ready to work offline.');
        },
    });
}
