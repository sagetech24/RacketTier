import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary } from '../../api/dashboard.js';
import { queryKeys } from '../../lib/queryClient.js';

export function useDashboardSummaryQuery() {
    return useQuery({
        queryKey: queryKeys.dashboardSummary,
        queryFn: fetchDashboardSummary,
        staleTime: 2 * 60_000,
    });
}
