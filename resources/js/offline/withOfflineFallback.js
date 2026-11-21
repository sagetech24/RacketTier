import { isOfflineStatus } from '../lib/connection.js';
import { applyLocalMutation } from './queueingMutationRouter.js';

/**
 * Prefer online API; if offline (or network fails), apply local draft mutation.
 *
 * @param {number|string} sessionId
 * @param {{
 *   type: string,
 *   payload: Record<string, unknown>,
 *   online: () => Promise<unknown>,
 * }} opts
 */
export async function withOfflineFallback(sessionId, opts) {
    if (isOfflineStatus() || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        return applyLocalMutation(sessionId, opts.type, opts.payload);
    }
    try {
        return await opts.online();
    } catch (err) {
        const isNetwork =
            err instanceof TypeError ||
            err?.message === 'Failed to fetch' ||
            /network/i.test(String(err?.message ?? ''));
        if (!isNetwork) throw err;
        return applyLocalMutation(sessionId, opts.type, opts.payload);
    }
}
