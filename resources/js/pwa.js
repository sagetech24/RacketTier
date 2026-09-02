const SW_URL = '/sw.js';
const SW_SCOPE = '/';

export function initPwa() {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker
        .register(SW_URL, { scope: SW_SCOPE })
        .then((registration) => {
            registration.addEventListener('updatefound', () => {
                const installing = registration.installing;
                if (!installing) return;

                installing.addEventListener('statechange', () => {
                    if (
                        installing.state === 'installed' &&
                        navigator.serviceWorker.controller &&
                        window.confirm('A new version of RacketTier is available. Reload to update?')
                    ) {
                        installing.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        })
        .catch((error) => {
            console.warn('[PWA] Service worker registration failed:', error);
        });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}
