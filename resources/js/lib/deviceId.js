const STORAGE_KEY = 'rt_device_id';

/**
 * Stable per-browser device id for offline ownership / handoff.
 * @returns {string}
 */
export function getDeviceId() {
    try {
        let id = window.localStorage.getItem(STORAGE_KEY);
        if (!id) {
            id =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            window.localStorage.setItem(STORAGE_KEY, id);
        }
        return id;
    } catch {
        return `dev-ephemeral-${Date.now()}`;
    }
}
