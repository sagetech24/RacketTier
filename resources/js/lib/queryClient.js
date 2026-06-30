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
    queueingSession: (sessionId) => ['queueing-session', sessionId],
    queueingSessionMatches: (sessionId, draftVersion = null) => [
        'queueing-session-matches',
        sessionId,
        draftVersion,
    ],
    rankings: (sportId, search) => ['rankings', sportId, search],
    queueingSessions: (params) => ['queueing-sessions', params],
};
