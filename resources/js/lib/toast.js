const MAX_VISIBLE = 3;

/** @typedef {'success' | 'error' | 'info'} ToastType */

/**
 * @typedef {{
 *   id: number,
 *   type: ToastType,
 *   message: string,
 * }} ToastItem
 */

let nextId = 0;
/** @type {ToastItem[]} */
let toasts = [];
/** @type {Set<() => void>} */
const listeners = new Set();
let silentDepth = 0;

function emit() {
    listeners.forEach((listener) => listener());
}

/**
 * @returns {ToastItem[]}
 */
export function getToasts() {
    return toasts;
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeToasts(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function isToastSilent() {
    return silentDepth > 0;
}

/**
 * Suppress automatic HTTP toasts while `fn` runs (e.g. bulk create).
 * @template T
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withSilentToasts(fn) {
    silentDepth += 1;
    try {
        return await fn();
    } finally {
        silentDepth -= 1;
    }
}

/**
 * @param {ToastType} type
 * @param {string} message
 * @returns {number | null}
 */
function push(type, message) {
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text || silentDepth > 0) {
        return null;
    }
    const item = { id: ++nextId, type, message: text };
    toasts = [...toasts, item].slice(-MAX_VISIBLE);
    emit();
    return item.id;
}

/**
 * @param {number} id
 */
export function dismissToast(id) {
    const next = toasts.filter((item) => item.id !== id);
    if (next.length === toasts.length) {
        return;
    }
    toasts = next;
    emit();
}

export const toast = {
    /**
     * @param {string} message
     * @returns {number | null}
     */
    success(message) {
        return push('success', message);
    },
    /**
     * @param {string} message
     * @returns {number | null}
     */
    error(message) {
        return push('error', message);
    },
    /**
     * @param {string} message
     * @returns {number | null}
     */
    info(message) {
        return push('info', message);
    },
};
