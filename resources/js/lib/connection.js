/** @typedef {'online' | 'offline' | 'syncing'} ConnectionStatus */

/** @type {Set<(status: ConnectionStatus, meta?: { outboxCount?: number }) => void>} */
const listeners = new Set();

/** @type {ConnectionStatus} */
let status =
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online';

/** @type {number} */
let outboxCount = 0;

let wired = false;

function emit() {
    for (const listener of listeners) {
        listener(status, { outboxCount });
    }
}

/**
 * @param {ConnectionStatus} next
 * @param {{ outboxCount?: number }} [meta]
 */
export function setConnectionStatus(next, meta = {}) {
    if (typeof meta.outboxCount === 'number') {
        outboxCount = meta.outboxCount;
    }
    if (status === next && meta.outboxCount === undefined) {
        return;
    }
    status = next;
    emit();
}

export function getConnectionStatus() {
    return status;
}

export function getOutboxCount() {
    return outboxCount;
}

export function isOfflineStatus() {
    return status === 'offline';
}

/**
 * Mark authoritative offline (failed fetch) even if navigator.onLine is true.
 */
export function markNetworkFailure() {
    if (status !== 'syncing') {
        setConnectionStatus('offline');
    }
}

/**
 * Browser came online or a request succeeded — leave offline unless actively syncing.
 */
export function markNetworkSuccess() {
    if (status === 'offline') {
        setConnectionStatus('online');
    }
}

/**
 * @param {(status: ConnectionStatus, meta?: { outboxCount?: number }) => void} listener
 * @returns {() => void}
 */
export function subscribeConnection(listener) {
    listeners.add(listener);
    listener(status, { outboxCount });
    return () => listeners.delete(listener);
}

export function wireConnectionListeners() {
    if (wired || typeof window === 'undefined') {
        return;
    }
    wired = true;

    window.addEventListener('online', () => {
        if (status === 'offline') {
            setConnectionStatus('online');
            window.dispatchEvent(new CustomEvent('rt:connection-online'));
        }
    });

    window.addEventListener('offline', () => {
        setConnectionStatus('offline');
        window.dispatchEvent(new CustomEvent('rt:connection-offline'));
    });
}
