import { isOfflineStatus, markNetworkFailure, setConnectionStatus } from '../lib/connection.js';
import { isNetworkError } from '../lib/networkError.js';
import { queryKeys } from '../lib/queryClient.js';
import { applyOfflineMutation } from './applyOfflineMutation.js';
import {
    appendOutbox,
    getOfflineSession,
    putOfflineSession,
    seedOfflineSession,
    setPendingEnd,
} from './queueingDraftDb.js';
import { generateAutoSuggestMatches } from './autoMatchFromDraft.js';
import { syncQueueingOutbox } from './syncQueueingOutbox.js';

function newOutboxId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ob-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Run an online API call; on network failure fall back to offline apply.
 *
 * @param {number|string} sessionId
 * @param {{
 *   type: string,
 *   payload: Record<string, unknown>,
 *   online: () => Promise<{ session?: Record<string, unknown>, matches?: unknown[], data?: unknown }>,
 *   queryClient?: import('@tanstack/react-query').QueryClient,
 * }} opts
 */
export async function runQueueingMutation(sessionId, opts) {
    const forceOffline = isOfflineStatus() || (typeof navigator !== 'undefined' && navigator.onLine === false);

    if (!forceOffline) {
        try {
            const result = await opts.online();
            const session = result?.session ?? result?.data ?? result;
            if (session && typeof session === 'object' && session.id != null) {
                await seedOfflineSession(sessionId, {
                    session,
                    matches: result.matches,
                });
                if (opts.queryClient) {
                    opts.queryClient.setQueryData(queryKeys.queueingSession(sessionId), session);
                    if (result.matches) {
                        opts.queryClient.setQueryData(
                            queryKeys.queueingSessionMatches(sessionId, session.draft_version ?? null),
                            result.matches,
                        );
                    }
                }
            }
            return { mode: 'online', result };
        } catch (err) {
            if (!isNetworkError(err)) throw err;
            markNetworkFailure();
        }
    }

    return applyLocalMutation(sessionId, opts.type, opts.payload, opts.queryClient);
}

/**
 * @param {number|string} sessionId
 * @param {string} type
 * @param {Record<string, unknown>} payload
 * @param {import('@tanstack/react-query').QueryClient} [queryClient]
 */
export async function applyLocalMutation(sessionId, type, payload, queryClient) {
    let record = await getOfflineSession(sessionId);
    if (!record?.session) {
        throw new Error('Session is not available offline. Open it once while online first.');
    }

    const baseVersion = Number(record.draft_version ?? record.session.draft_version ?? 0);
    const next = applyOfflineMutation(
        { session: record.session, matches: record.matches ?? [] },
        { type, payload },
    );

    // Refresh local auto-suggest from draft-only engine
    try {
        const suggest = generateAutoSuggestMatches({
            session: next.session,
            players: next.session.players ?? [],
            matches: next.matches,
        });
        next.session.auto_suggest_matches = suggest.suggestions ?? suggest.proposals ?? [];
    } catch {
        /* keep previous suggestions */
    }

    record = {
        ...record,
        session: next.session,
        matches: next.matches,
        draft_version: next.draft_version,
        auto_suggest_matches: next.session.auto_suggest_matches ?? null,
    };

    await putOfflineSession(record);
    await appendOutbox(sessionId, {
        id: newOutboxId(),
        type,
        payload: {
            ...payload,
            ...(type === 'create_match' || type === 'approve_auto_suggest'
                ? { _local_match_numeric_id: next.matches[next.matches.length - 1]?.id }
                : {}),
        },
        baseVersion,
    });

    const fresh = await getOfflineSession(sessionId);
    setConnectionStatus('offline', { outboxCount: fresh?.outbox?.length ?? 0 });

    if (queryClient) {
        queryClient.setQueryData(queryKeys.queueingSession(sessionId), next.session);
        queryClient.setQueryData(
            queryKeys.queueingSessionMatches(sessionId, next.draft_version),
            next.matches,
        );
    }

    return { mode: 'offline', session: next.session, matches: next.matches };
}

/**
 * @param {number|string} sessionId
 * @param {import('@tanstack/react-query').QueryClient} [queryClient]
 */
export async function requestEndWhenOnline(sessionId, queryClient) {
    if (!isOfflineStatus() && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
            await syncQueueingOutbox(sessionId);
            const { postEndQueueingSession } = await import('../api/queueingOfflineApi.js');
            const record = await getOfflineSession(sessionId);
            await postEndQueueingSession(
                sessionId,
                Number(record?.draft_version ?? record?.session?.draft_version ?? 0),
            );
            return { mode: 'online' };
        } catch (err) {
            if (!/network|fetch/i.test(String(err?.message ?? ''))) throw err;
            markNetworkFailure();
        }
    }
    await setPendingEnd(sessionId, true);
    if (queryClient) {
        const record = await getOfflineSession(sessionId);
        if (record?.session) {
            queryClient.setQueryData(queryKeys.queueingSession(sessionId), {
                ...record.session,
                _pending_end: true,
            });
        }
    }
    return { mode: 'pending_end' };
}
