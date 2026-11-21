import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGameSession } from '../../api/gameSession.js';
import { fetchQueueingSessionMatches } from '../../api/queueingSession.js';
import { useConnectionStatus } from '../useConnectionStatus.js';
import { queryKeys } from '../../lib/queryClient.js';
import { getOfflineSession, seedOfflineSession } from '../../offline/queueingDraftDb.js';
import { isOfflineStatus, markNetworkFailure, wireConnectionListeners } from '../../lib/connection.js';
import { isNetworkError } from '../../lib/networkError.js';

const ACTIVE_POLL_MS = 10_000;

/**
 * @param {string | number | null | undefined} sessionId
 * @param {{ enabled?: boolean }} [options]
 */
export function useQueueingSessionQuery(sessionId, options = {}) {
    const { enabled = true } = options;
    const { isOffline } = useConnectionStatus();
    const queryClient = useQueryClient();

    useEffect(() => {
        wireConnectionListeners();
    }, []);

    return useQuery({
        queryKey: queryKeys.queueingSession(sessionId),
        queryFn: async () => {
            const preferLocal =
                isOffline || isOfflineStatus() || (typeof navigator !== 'undefined' && navigator.onLine === false);
            if (preferLocal) {
                const local = await getOfflineSession(sessionId);
                if (local?.session) return local.session;
                throw new Error('Session unavailable offline.');
            }
            try {
                const session = await fetchGameSession(String(sessionId));
                void seedOfflineSession(sessionId, { session });
                return session;
            } catch (err) {
                const local = await getOfflineSession(sessionId);
                if (local?.session) {
                    if (isNetworkError(err)) markNetworkFailure();
                    queryClient.setQueryData(queryKeys.queueingSession(sessionId), local.session);
                    return local.session;
                }
                throw err;
            }
        },
        enabled: enabled && sessionId != null && sessionId !== '',
        staleTime: 5_000,
        refetchInterval: (query) => {
            if (isOffline || isOfflineStatus()) return false;
            const session = query.state.data;
            if (!session?.is_active) {
                return false;
            }
            return ACTIVE_POLL_MS;
        },
    });
}

/**
 * @param {string | number | null | undefined} sessionId
 * @param {{ enabled?: boolean, session?: { is_active?: boolean, draft_version?: number } | null }} [options]
 */
export function useQueueingSessionMatchesQuery(sessionId, options = {}) {
    const { enabled = true, session = null } = options;
    const isActive = session?.is_active ?? true;
    const { isOffline } = useConnectionStatus();

    return useQuery({
        queryKey: queryKeys.queueingSessionMatches(sessionId, session?.draft_version ?? null),
        queryFn: async () => {
            const preferLocal =
                isOffline || isOfflineStatus() || (typeof navigator !== 'undefined' && navigator.onLine === false);
            if (preferLocal) {
                const local = await getOfflineSession(sessionId);
                if (local?.matches) return local.matches;
                return [];
            }
            try {
                const matches = await fetchQueueingSessionMatches(String(sessionId));
                const local = await getOfflineSession(sessionId);
                if (local?.session) {
                    void seedOfflineSession(sessionId, { session: local.session, matches });
                }
                return matches;
            } catch (err) {
                const local = await getOfflineSession(sessionId);
                if (local?.matches) {
                    if (isNetworkError(err)) markNetworkFailure();
                    return local.matches;
                }
                throw err;
            }
        },
        enabled: enabled && sessionId != null && sessionId !== '',
        staleTime: 5_000,
        refetchInterval:
            isOffline || isOfflineStatus() ? false : isActive ? ACTIVE_POLL_MS : false,
    });
}

/**
 * Invalidate queueing session + matches after a mutation.
 */
export function useInvalidateQueueingSession() {
    const queryClient = useQueryClient();

    return (sessionId) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.queueingSession(sessionId) });
        queryClient.invalidateQueries({ queryKey: ['queueing-session-matches', sessionId] });
    };
}
