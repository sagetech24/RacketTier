import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRankings } from '../../api/ranking.js';
import { queryKeys } from '../../lib/queryClient.js';

const RANKINGS_STALE_TIME_MS = 2 * 60_000;
const RANKINGS_DEFAULT_LIMIT = 100;

/**
 * @param {{
 *   sportId: number | null;
 *   search?: string;
 *   limit?: number;
 *   enabled?: boolean;
 * }} opts
 */
export function useRankingsQuery({
    sportId,
    search = '',
    limit = RANKINGS_DEFAULT_LIMIT,
    enabled = true,
}) {
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';

    return useQuery({
        queryKey: queryKeys.rankings(sportId, normalizedSearch, limit),
        queryFn: () =>
            fetchRankings({
                sportId,
                search: normalizedSearch,
                limit,
            }),
        enabled: enabled && sportId != null,
        staleTime: RANKINGS_STALE_TIME_MS,
    });
}

/**
 * Prefetch a sport leaderboard into the React Query cache.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {number} sportId
 * @param {{ search?: string, limit?: number }} [opts]
 */
export function prefetchRankings(queryClient, sportId, opts = {}) {
    const search = typeof opts.search === 'string' ? opts.search.trim() : '';
    const limit = opts.limit ?? RANKINGS_DEFAULT_LIMIT;

    return queryClient.prefetchQuery({
        queryKey: queryKeys.rankings(sportId, search, limit),
        queryFn: () =>
            fetchRankings({
                sportId,
                search,
                limit,
            }),
        staleTime: RANKINGS_STALE_TIME_MS,
    });
}

export function usePrefetchRankings() {
    const queryClient = useQueryClient();

    return useCallback(
        (sportId, opts = {}) => prefetchRankings(queryClient, sportId, opts),
        [queryClient],
    );
}

export { RANKINGS_DEFAULT_LIMIT, RANKINGS_STALE_TIME_MS };
