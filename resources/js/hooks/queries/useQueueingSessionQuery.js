import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGameSession } from '../../api/gameSession.js';
import { fetchQueueingSessionMatches } from '../../api/queueingSession.js';
import { queryKeys } from '../../lib/queryClient.js';

const ACTIVE_POLL_MS = 10_000;

/**
 * @param {string | number | null | undefined} sessionId
 * @param {{ enabled?: boolean }} [options]
 */
export function useQueueingSessionQuery(sessionId, options = {}) {
    const { enabled = true } = options;

    return useQuery({
        queryKey: queryKeys.queueingSession(sessionId),
        queryFn: async () => fetchGameSession(String(sessionId)),
        enabled: enabled && sessionId != null && sessionId !== '',
        staleTime: 5_000,
        refetchInterval: (query) => {
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

    return useQuery({
        queryKey: queryKeys.queueingSessionMatches(sessionId, session?.draft_version ?? null),
        queryFn: async () => fetchQueueingSessionMatches(String(sessionId)),
        enabled: enabled && sessionId != null && sessionId !== '' && isActive,
        staleTime: 5_000,
        refetchInterval: isActive ? ACTIVE_POLL_MS : false,
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
