import { useQuery } from '@tanstack/react-query';
import { fetchGameSession } from '../../api/gameSession.js';
import { queryKeys } from '../../lib/queryClient.js';

/**
 * @param {string | number | null} sessionId
 * @param {{ facilityId?: number | string, enabled?: boolean }} [options]
 */
export function useGameSessionQuery(sessionId, options = {}) {
    const { facilityId, enabled = true } = options;

    return useQuery({
        queryKey: queryKeys.gameSession(sessionId, facilityId ?? null),
        queryFn: () => fetchGameSession(String(sessionId), facilityId != null ? { facilityId } : undefined),
        enabled: enabled && sessionId != null && sessionId !== '',
        staleTime: 5_000,
    });
}
