import { fetchGameSession } from '../api/gameSession.js';
import {
    deleteQueueingSessionMatch,
    patchQueueingSessionMatch,
    patchReorderQueueingCheckIn,
    patchUpdateQueueingSession,
    patchUpdateQueueingSessionPlayer,
    postAddQueueingSessionPlayer,
    postApproveAutoSuggest,
    postBatchSyncQueueingSession,
    postDismissAutoSuggest,
    postEndQueueingSession,
    postFinishQueueingMatch,
    postRestoreQueueingSessionPlayer,
    postStartQueueingSessionMatch,
    postCreateQueueingSessionMatch,
    postCreateQueueingSessionReserveMatch,
    postPromoteQueueingSessionReserveMatch,
    deleteQueueingSessionPlayer,
} from '../api/queueingOfflineApi.js';
import { setConnectionStatus } from '../lib/connection.js';
import { parseMutationResponse } from './parseMutationResponse.js';
import {
    getOfflineSession,
    putOfflineSession,
    removeOutboxEntry,
    seedOfflineSession,
    setConflict,
    setPendingEnd,
} from './queueingDraftDb.js';

/**
 * Replay outbox entries against Laravel APIs in order.
 *
 * @param {number|string} sessionId
 * @param {{
 *   onConflict?: (info: { draft_version?: number, message?: string }) => void,
 *   onAuthError?: () => void,
 * }} [hooks]
 */
export async function syncQueueingOutbox(sessionId, hooks = {}) {
    let record = await getOfflineSession(sessionId);
    if (!record) return { synced: 0, remaining: 0 };

    if (record.conflict) {
        setConnectionStatus('offline', { outboxCount: record.outbox?.length ?? 0 });
        return { synced: 0, remaining: record.outbox?.length ?? 0, conflict: true };
    }

    const queue = [...(record.outbox ?? [])];
    if (queue.length === 0 && !record.pendingEnd) {
        setConnectionStatus('online', { outboxCount: 0 });
        return { synced: 0, remaining: 0 };
    }

    setConnectionStatus('syncing', { outboxCount: queue.length });
    let synced = 0;
    let draftVersion = Number(record.draft_version ?? record.session?.draft_version ?? 0);

    // Prefer batch sync when multiple mutations are pending (flaky gym Wi‑Fi).
    if (queue.length > 1) {
        try {
            await postBatchSyncQueueingSession(
                sessionId,
                queue.map((entry) => ({ type: entry.type, payload: entry.payload ?? {} })),
                draftVersion,
            );
            for (const entry of queue) {
                await removeOutboxEntry(sessionId, entry.id);
            }
            synced = queue.length;
            record = await getOfflineSession(sessionId);
            if (record?.pendingEnd) {
                try {
                    const latest = await getOfflineSession(sessionId);
                    draftVersion = Number(latest?.draft_version ?? draftVersion);
                    await postEndQueueingSession(sessionId, draftVersion);
                    await setPendingEnd(sessionId, false);
                } catch (err) {
                    const status = err?.status;
                    if (status === 409) {
                        await setConflict(sessionId, true);
                        hooks.onConflict?.({
                            draft_version: err.draft_version,
                            message: err.message,
                        });
                        setConnectionStatus('offline', { outboxCount: 0 });
                        return { synced, remaining: 0, conflict: true };
                    }
                    throw err;
                }
            }
            try {
                const fresh = await fetchGameSession(String(sessionId));
                const matchesRes = await fetch(
                    `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches`,
                    { headers: { Accept: 'application/json' }, credentials: 'same-origin' },
                );
                const matchesJson = matchesRes.ok ? await matchesRes.json() : { data: [] };
                await seedOfflineSession(sessionId, {
                    session: fresh,
                    matches: matchesJson.data ?? [],
                    replaceOutbox: true,
                });
            } catch {
                /* keep local */
            }
            setConnectionStatus('online', { outboxCount: 0 });
            return { synced, remaining: 0 };
        } catch (err) {
            const status = err?.status ?? err?.responseStatus;
            if (status === 409) {
                await setConflict(sessionId, true);
                hooks.onConflict?.({
                    draft_version: err.draft_version,
                    message: err.message,
                });
                setConnectionStatus('offline', { outboxCount: queue.length });
                return { synced: 0, remaining: queue.length, conflict: true };
            }
            if (status === 401 || status === 419) {
                hooks.onAuthError?.();
                setConnectionStatus('offline', { outboxCount: queue.length });
                return { synced: 0, remaining: queue.length, authError: true };
            }
            // Fall through to one-by-one replay
        }
    }

    // id remap: local temporary match ids → server ids after create
    /** @type {Map<string|number, number>} */
    const matchIdMap = new Map();

    for (const entry of queue) {
        try {
            const result = await replayEntry(sessionId, entry, draftVersion, matchIdMap);
            if (typeof result?.draft_version === 'number') {
                draftVersion = result.draft_version;
            }
            await removeOutboxEntry(sessionId, entry.id);
            synced += 1;
            setConnectionStatus('syncing', { outboxCount: queue.length - synced });
        } catch (err) {
            const status = err?.status ?? err?.responseStatus;
            if (status === 409) {
                await setConflict(sessionId, true);
                hooks.onConflict?.({
                    draft_version: err.draft_version,
                    message: err.message,
                });
                setConnectionStatus('offline', { outboxCount: queue.length - synced });
                return { synced, remaining: queue.length - synced, conflict: true };
            }
            if (status === 401 || status === 419) {
                hooks.onAuthError?.();
                setConnectionStatus('offline', { outboxCount: queue.length - synced });
                return { synced, remaining: queue.length - synced, authError: true };
            }
            // Network failure mid-sync
            setConnectionStatus('offline', { outboxCount: queue.length - synced });
            throw err;
        }
    }

    record = await getOfflineSession(sessionId);
    if (record?.pendingEnd) {
        try {
            await postEndQueueingSession(sessionId, draftVersion);
            await setPendingEnd(sessionId, false);
        } catch (err) {
            const status = err?.status;
            if (status === 409) {
                await setConflict(sessionId, true);
                hooks.onConflict?.({ draft_version: err.draft_version, message: err.message });
                setConnectionStatus('offline', { outboxCount: 0 });
                return { synced, remaining: 0, conflict: true };
            }
            setConnectionStatus('offline', { outboxCount: 0 });
            throw err;
        }
    }

    try {
        const fresh = await fetchGameSession(String(sessionId));
        const matchesRes = await fetch(
            `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches`,
            { headers: { Accept: 'application/json' }, credentials: 'same-origin' },
        );
        const matchesJson = matchesRes.ok ? await matchesRes.json() : { data: [] };
        await seedOfflineSession(sessionId, {
            session: fresh,
            matches: matchesJson.data ?? [],
            replaceOutbox: true,
        });
    } catch {
        // keep local after successful outbox drain
        record = await getOfflineSession(sessionId);
        if (record) {
            record.draft_version = draftVersion;
            if (record.session) record.session.draft_version = draftVersion;
            await putOfflineSession(record);
        }
    }

    setConnectionStatus('online', { outboxCount: 0 });
    return { synced, remaining: 0 };
}

/**
 * @param {number|string} sessionId
 * @param {{ type: string, payload: Record<string, unknown>, baseVersion: number }} entry
 * @param {number} draftVersion
 * @param {Map<string|number, number>} matchIdMap
 */
async function replayEntry(sessionId, entry, draftVersion, matchIdMap) {
    const p = entry.payload ?? {};
    const resolveMatchId = (id) => {
        if (matchIdMap.has(id)) return matchIdMap.get(id);
        if (matchIdMap.has(String(id))) return matchIdMap.get(String(id));
        return Number(id);
    };

    switch (entry.type) {
        case 'add_guest':
            return postAddQueueingSessionPlayer(sessionId, {
                guest_name: p.guest_name,
                pronoun: p.pronoun,
                skill_level: p.skill_level,
                draft_version: draftVersion,
            });
        case 'add_member':
            return postAddQueueingSessionPlayer(sessionId, {
                user_id: p.user_id,
                pronoun: p.pronoun,
                skill_level: p.skill_level,
                draft_version: draftVersion,
            });
        case 'update_player':
            return patchUpdateQueueingSessionPlayer(sessionId, p.player_id, {
                guest_name: p.guest_name,
                pronoun: p.pronoun,
                skill_level: p.skill_level,
                draft_version: draftVersion,
            });
        case 'remove_player':
            return deleteQueueingSessionPlayer(sessionId, p.player_id, draftVersion);
        case 'restore_player':
            return postRestoreQueueingSessionPlayer(sessionId, p.player_id, draftVersion);
        case 'reorder_check_in':
            return patchReorderQueueingCheckIn(sessionId, p.player_ids, draftVersion);
        case 'create_match':
        case 'approve_auto_suggest': {
            const created = await postCreateQueueingSessionMatch(
                sessionId,
                p.lineup,
                draftVersion,
            );
            if (p.local_match_id != null && created?.id != null) {
                matchIdMap.set(p.local_match_id, Number(created.id));
            }
            if (p._local_match_numeric_id != null && created?.id != null) {
                matchIdMap.set(p._local_match_numeric_id, Number(created.id));
            }
            return created;
        }
        case 'create_reserve_match': {
            const created = await postCreateQueueingSessionReserveMatch(
                sessionId,
                p.lineup,
                draftVersion,
            );
            if (p.local_match_id != null && created?.id != null) {
                matchIdMap.set(p.local_match_id, Number(created.id));
            }
            if (p._local_match_numeric_id != null && created?.id != null) {
                matchIdMap.set(p._local_match_numeric_id, Number(created.id));
            }
            return created;
        }
        case 'promote_reserve_match':
            return postPromoteQueueingSessionReserveMatch(
                sessionId,
                resolveMatchId(p.match_id),
                draftVersion,
            );
        case 'start_match':
            return postStartQueueingSessionMatch(sessionId, resolveMatchId(p.match_id), draftVersion);
        case 'delete_match':
            return deleteQueueingSessionMatch(sessionId, resolveMatchId(p.match_id), draftVersion);
        case 'update_match_lineup':
            return patchQueueingSessionMatch(
                sessionId,
                resolveMatchId(p.match_id),
                p.lineup,
                draftVersion,
            );
        case 'finish_match':
            return postFinishQueueingMatch(sessionId, {
                queueing_session_match_id: resolveMatchId(p.match_id),
                team1_score: p.team1_score,
                team2_score: p.team2_score,
                winning_team: p.winning_team,
                draft_version: draftVersion,
            });
        case 'switch_result':
            return postSwitchResult(sessionId, resolveMatchId(p.match_id), draftVersion);
        case 'update_settings':
            return patchUpdateQueueingSession(sessionId, { ...p, draft_version: draftVersion });
        case 'dismiss_auto_suggest':
            return postDismissAutoSuggest(sessionId, p.suggestion_id, draftVersion);
        default:
            throw Object.assign(new Error(`Unknown outbox type: ${entry.type}`), { status: 422 });
    }
}

async function postSwitchResult(sessionId, matchId, draftVersion) {
    const { postJson, withDraftVersion } = await import('../lib/http.js');
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/${encodeURIComponent(String(matchId))}/switch-result`,
        withDraftVersion({}, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}
