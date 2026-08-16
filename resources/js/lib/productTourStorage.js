const CREATE_DISMISSED_KEY = 'rt.tour.dismissed';
const CREATE_PENDING_KEY = 'rt.tour.pending';
const RUN_DISMISSED_KEY = 'rt.tour.run.dismissed';
const RUN_PENDING_KEY = 'rt.tour.run.pending';

function canUseStorage(kind) {
    try {
        const store = kind === 'local' ? window.localStorage : window.sessionStorage;
        const probe = '__rt_tour_probe__';
        store.setItem(probe, '1');
        store.removeItem(probe);
        return true;
    } catch {
        return false;
    }
}

/** @returns {boolean} */
export function isTourDismissed() {
    if (typeof window === 'undefined' || !canUseStorage('local')) return false;
    return window.localStorage.getItem(CREATE_DISMISSED_KEY) === '1';
}

export function markTourDismissed() {
    if (typeof window === 'undefined' || !canUseStorage('local')) return;
    window.localStorage.setItem(CREATE_DISMISSED_KEY, '1');
}

export function clearTourDismissed() {
    if (typeof window === 'undefined' || !canUseStorage('local')) return;
    window.localStorage.removeItem(CREATE_DISMISSED_KEY);
}

/** @returns {boolean} */
export function isTourPending() {
    if (typeof window === 'undefined' || !canUseStorage('session')) return false;
    return window.sessionStorage.getItem(CREATE_PENDING_KEY) === '1';
}

export function markTourPending() {
    if (typeof window === 'undefined' || !canUseStorage('session')) return;
    window.sessionStorage.setItem(CREATE_PENDING_KEY, '1');
}

export function clearTourPending() {
    if (typeof window === 'undefined' || !canUseStorage('session')) return;
    window.sessionStorage.removeItem(CREATE_PENDING_KEY);
}

/** @returns {boolean} */
export function isRunSessionTourDismissed() {
    if (typeof window === 'undefined' || !canUseStorage('local')) return false;
    return window.localStorage.getItem(RUN_DISMISSED_KEY) === '1';
}

export function markRunSessionTourDismissed() {
    if (typeof window === 'undefined' || !canUseStorage('local')) return;
    window.localStorage.setItem(RUN_DISMISSED_KEY, '1');
}

export function clearRunSessionTourDismissed() {
    if (typeof window === 'undefined' || !canUseStorage('local')) return;
    window.localStorage.removeItem(RUN_DISMISSED_KEY);
}

/** @returns {boolean} */
export function isRunSessionTourPending() {
    if (typeof window === 'undefined' || !canUseStorage('session')) return false;
    return window.sessionStorage.getItem(RUN_PENDING_KEY) === '1';
}

export function markRunSessionTourPending() {
    if (typeof window === 'undefined' || !canUseStorage('session')) return;
    window.sessionStorage.setItem(RUN_PENDING_KEY, '1');
}

export function clearRunSessionTourPending() {
    if (typeof window === 'undefined' || !canUseStorage('session')) return;
    window.sessionStorage.removeItem(RUN_PENDING_KEY);
}

/**
 * True when the path is a live queueing-session detail (not list/new/history).
 * @param {string} pathname
 */
export function isLiveQueueingSessionPath(pathname) {
    return /^\/queueing-session\/\d+(\/(players|matches))?\/?$/.test(pathname);
}

/**
 * @param {string} pathname
 * @returns {number | null}
 */
export function parseQueueingSessionId(pathname) {
    const match = pathname.match(/^\/queueing-session\/(\d+)(?:\/(players|matches))?\/?$/);
    if (!match) return null;
    const id = Number.parseInt(match[1], 10);
    return Number.isFinite(id) ? id : null;
}
