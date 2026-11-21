import { isOfflineStatus, markNetworkFailure } from '../lib/connection.js';
import { isNetworkError } from '../lib/networkError.js';
import { withSilentToasts } from '../lib/toast.js';
import { applyLocalMutation } from './queueingMutationRouter.js';

/**
 * Prefer online API; if offline (or network fails), apply local draft mutation.
 * Online attempts are silent so a failed fetch does not toast before offline fallback.
 *
 * @param {number|string} sessionId
 * @param {{
 *   type: string,
 *   payload: Record<string, unknown>,
 *   online: () => Promise<unknown>,
 *   queryClient?: import('@tanstack/react-query').QueryClient,
 * }} opts
 */
export async function withOfflineFallback(sessionId, opts) {
    const forceOffline =
        isOfflineStatus() || (typeof navigator !== 'undefined' && navigator.onLine === false);

    if (forceOffline) {
        return applyLocalMutation(sessionId, opts.type, opts.payload, opts.queryClient);
    }

    try {
        const result = await withSilentToasts(() => opts.online());
        return result;
    } catch (err) {
        if (!isNetworkError(err)) throw err;
        markNetworkFailure();
        return applyLocalMutation(sessionId, opts.type, opts.payload, opts.queryClient);
    }
}
