import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

export const queryKeys = {
    sports: ['sports'],
    dashboardSummary: ['dashboard', 'summary'],
    facilities: (q = '') => ['facilities', { q }],
    gameSession: (sessionId, facilityId) => ['game-session', sessionId, facilityId ?? null],
    rankings: (sportId, search) => ['rankings', sportId, search],
    queueingSessions: (params) => ['queueing-sessions', params],
};
