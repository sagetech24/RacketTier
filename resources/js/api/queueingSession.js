import { deleteJson, patchJson, postJson } from '../lib/http.js';

/**
 * @param {{
 *   queue_name: string,
 *   win_points: number,
 *   loss_points: number,
 *   skip_scores?: boolean,
 * }} payload
 */
export async function patchUpdateQueueingSession(sessionId, payload) {
    const res = await patchJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}`,
        payload,
    );
    if (!res.ok) {
        let msg = 'Could not update queueing session.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') {
                msg = j.message;
            } else if (j.errors && typeof j.errors === 'object') {
                const first = Object.values(j.errors)[0];
                if (Array.isArray(first) && first[0]) {
                    msg = String(first[0]);
                }
            }
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {{
 *   queue_name: string,
 *   sport_slug: string,
 *   match_type: 'singles' | 'doubles',
 *   win_points: number,
 *   loss_points: number,
 *   skip_scores?: boolean,
 * }} payload
 */
export async function postCreateQueueingSession(payload) {
    const res = await postJson('/auth/queueing-sessions', payload);
    if (!res.ok) {
        let msg = 'Could not create queueing session.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') {
                msg = j.message;
            } else if (j.errors && typeof j.errors === 'object') {
                const first = Object.values(j.errors)[0];
                if (Array.isArray(first) && first[0]) {
                    msg = String(first[0]);
                }
            }
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {{
 *   q?: string,
 *   sort?: 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc',
 *   mineOnly?: boolean,
 *   status?: 'all' | 'active' | 'finished',
 * }} [opts]
 */
export async function fetchQueueingSessions(opts = {}) {
    const params = new URLSearchParams();
    params.set('session_context', 'queueing');
    if (opts.q && opts.q.trim()) {
        params.set('q', opts.q.trim());
    }
    const res = await fetch(`/auth/game-sessions?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (!res.ok) {
        throw new Error('Could not load queueing sessions.');
    }
    const json = await res.json();
    /** @type {Array<import('./gameSession.js').GameSessionDetail>} */
    let activeRows = json.data ?? [];
    /** @type {Array<import('./gameSession.js').GameSessionDetail>} */
    const finishedTodayRows = json.finished_today ?? [];
    const activeIds = new Set(activeRows.map((row) => row.id));
    let rows = [
        ...activeRows,
        ...finishedTodayRows.filter((row) => !activeIds.has(row.id)),
    ];

    if (opts.mineOnly) {
        rows = rows.filter((row) => row.is_host);
    }
    if (opts.status === 'active') {
        rows = rows.filter((row) => row.is_active);
    } else if (opts.status === 'finished') {
        rows = rows.filter((row) => !row.is_active);
    }
    if (opts.q && opts.q.trim()) {
        const needle = opts.q.trim().toLowerCase();
        rows = rows.filter((row) => {
            const sport = (row.sport?.name ?? '').toLowerCase();
            const creator = (row.created_by?.name ?? '').toLowerCase();
            const qName = (row.queue_name ?? '').toLowerCase();
            return (
                qName.includes(needle) ||
                sport.includes(needle) ||
                creator.includes(needle) ||
                String(row.id).includes(needle)
            );
        });
    }

    const byUpdated = (a, b) =>
        new Date(b.ended_at ?? b.started_at ?? 0).getTime() - new Date(a.ended_at ?? a.started_at ?? 0).getTime();
    const byCreated = (a, b) => Number(b.id) - Number(a.id);

    switch (opts.sort) {
        case 'updated_asc':
            rows.sort((a, b) => byUpdated(b, a));
            break;
        case 'created_asc':
            rows.sort((a, b) => byCreated(b, a));
            break;
        case 'created_desc':
            rows.sort(byCreated);
            break;
        case 'updated_desc':
        default:
            rows.sort(byUpdated);
            break;
    }

    return rows;
}

/**
 * @param {number|string} sessionId
 */
export async function fetchQueueingSessionMatches(sessionId) {
    const res = await fetch(`/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (!res.ok) {
        throw new Error('Could not load queueing matches.');
    }
    const json = await res.json();
    return json.data ?? [];
}

/**
 * @param {number|string} sessionId
 * @param {{ lineup: Array<{ id: number, team?: number }> }} body
 */
export async function postCreateQueueingSessionMatch(sessionId, body) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches`,
        body,
    );
    if (!res.ok) {
        let msg = 'Could not create match.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
            else if (j.errors && typeof j.errors === 'object') {
                const first = Object.values(j.errors)[0];
                if (Array.isArray(first) && first[0]) msg = String(first[0]);
            }
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number|string} sessionId
 * @param {number|string} matchId
 */
export async function postStartQueueingSessionMatch(sessionId, matchId) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/${encodeURIComponent(String(matchId))}/start`,
        {},
    );
    if (!res.ok) {
        let msg = 'Could not start match.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    if (!json.data) {
        throw new Error('Invalid session response');
    }
    return json.data;
}

/**
 * @param {number|string} sessionId
 * @param {number|string} matchId
 * @param {{ lineup: Array<{ id: number, team?: number }> }} body
 */
export async function patchUpdateQueueingSessionMatch(sessionId, matchId, body) {
    const res = await patchJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/${encodeURIComponent(String(matchId))}`,
        body,
    );
    if (!res.ok) {
        let msg = 'Could not update match.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
            else if (j.errors && typeof j.errors === 'object') {
                const first = Object.values(j.errors)[0];
                if (Array.isArray(first) && first[0]) msg = String(first[0]);
            }
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number|string} sessionId
 * @param {number|string} matchId
 */
export async function deleteQueueingSessionMatch(sessionId, matchId) {
    const res = await deleteJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/${encodeURIComponent(String(matchId))}`,
    );
    if (!res.ok) {
        let msg = 'Could not delete match.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
}

/**
 * @param {number|string} sessionId
 * @param {{ user_id?: number, guest_name?: string }} body
 */
export async function postAddQueueingSessionPlayer(sessionId, body) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players`,
        body,
    );
    if (!res.ok) {
        let msg = 'Could not add player.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number|string} sessionId
 * @param {number|string} playerRowId
 */
export async function deleteQueueingSessionPlayer(sessionId, playerRowId) {
    const res = await deleteJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players/${encodeURIComponent(String(playerRowId))}`,
    );
    if (!res.ok) {
        let msg = 'Could not remove player.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number|string} sessionId
 */
export async function postEndQueueingSession(sessionId) {
    const res = await postJson(`/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/end`, {});
    if (!res.ok) {
        let msg = 'Could not end session.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number|string} sessionId
 * @returns {Promise<object>}
 */
export async function fetchQueueingSessionSummary(sessionId) {
    const res = await fetch(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/summary`,
        {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        },
    );
    if (!res.ok) {
        throw new Error('Could not load summary.');
    }
    const json = await res.json();
    return json.data;
}
