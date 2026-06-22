import { useQuery } from '@tanstack/react-query';
import { fetchFacilities } from '../../api/facilities.js';
import { queryKeys } from '../../lib/queryClient.js';

/**
 * @param {string} [searchQuery]
 */
export function useFacilitiesQuery(searchQuery = '') {
    return useQuery({
        queryKey: queryKeys.facilities(searchQuery),
        queryFn: () => fetchFacilities(searchQuery),
        staleTime: 5 * 60_000,
    });
}
