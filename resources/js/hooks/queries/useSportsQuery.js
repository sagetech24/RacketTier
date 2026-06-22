import { useQuery } from '@tanstack/react-query';
import { fetchSports } from '../../api/gameSession.js';
import { queryKeys } from '../../lib/queryClient.js';

export function useSportsQuery() {
    return useQuery({
        queryKey: queryKeys.sports,
        queryFn: fetchSports,
        staleTime: 60 * 60_000,
    });
}
