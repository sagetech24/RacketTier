import { deleteJson, patchJson, postJson } from '../lib/http.js';

/**
 * @param {{
 *   queue_name: string,
 *   win_points: number,
 *   loss_points: number,
 *   skip_scores?: boolean,
 *   optional_guest_skill?: boolean,
 *   optional_guest_gender?: boolean,
 *   skill_level?: boolean,
 *   skill_match_mode?: 'balanced' | 'same_level',
 *   wl_statistics?: boolean,
 *   sequence?: boolean,
 *   genderless_mixed?: boolean,
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
 * @param {number|string} sessionId
 */
export async function deleteQueueingSession(sessionId) {
    const res = await deleteJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}`,
    );
    if (!res.ok) {
        let msg = 'Could not delete queueing session.';
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
 * @param {{
 *   queue_name: string,
 *   sport_slug: string,
 *   match_type: 'singles' | 'doubles',
 *   win_points: number,
 *   loss_points: number,
 *   skip_scores?: boolean,
 *   optional_guest_skill?: boolean,
 *   optional_guest_gender?: boolean,
 *   skill_level?: boolean,
 *   skill_match_mode?: 'balanced' | 'same_level',
 *   wl_statistics?: boolean,
 *   sequence?: boolean,
 *   genderless_mixed?: boolean,
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
 * Duplicate a finished queueing session (settings + roster, no matches).
 * @param {number|string} sessionId
 */
export async function postDuplicateQueueingSession(sessionId) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/duplicate`,
        {},
    );
    if (!res.ok) {
        let msg = 'Could not duplicate queueing session.';
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
 * @typedef {{
 *   data: import('./gameSession.js').GameSessionDetail[],
 *   meta: { next_cursor: string | null, has_more: boolean },
 * }} QueueingSessionHistoryPage
 */

/**
 * @param {{
 *   q?: string,
 *   mineOnly?: boolean,
 *   limit?: number,
 *   cursor?: string | null,
 * }} [opts]
 * @returns {Promise<QueueingSessionHistoryPage>}
 */
export async function fetchQueueingSessionHistory(opts = {}) {
    const params = new URLSearchParams();
    if (opts.q && opts.q.trim()) {
        params.set('q', opts.q.trim());
    }
    if (opts.mineOnly) {
        params.set('mine_only', '1');
    }
    if (opts.limit != null) {
        params.set('limit', String(opts.limit));
    }
    if (opts.cursor != null && String(opts.cursor).trim() !== '') {
        params.set('cursor', String(opts.cursor));
    }
    const qs = params.toString();
    const url = qs ? `/auth/queueing-sessions/history?${qs}` : '/auth/queueing-sessions/history';

    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error('Could not load session history.');
    }
    const json = await res.json();
    return {
        data: json.data ?? [],
        meta: {
            next_cursor: json.meta?.next_cursor ?? null,
            has_more: Boolean(json.meta?.has_more),
        },
    };
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
 * @typedef {{
 *   skill_level: boolean,
 *   skill_match_mode: 'balanced' | 'same_level',
 *   wl_statistics: boolean,
 *   sequence: boolean,
 *   genderless_mixed: boolean,
 *   refresh_seed?: number,
 * }} AutoMatchCriteria
 *
 * @typedef {{
 *   game_session_player_id: number,
 *   user_id: number | null,
 *   guest_name: string | null,
 *   name: string,
 *   is_guest: boolean,
 *   queue_position: number,
 *   skill_level: number | null,
 *   wins_count: number,
 *   losses_count: number,
 *   matches_played: number,
 *   team: 1 | 2,
 * }} AutoProposalPlayer
 *
 * @typedef {{
 *   proposal_id: string,
 *   match_type: 'singles' | 'doubles',
 *   bracket_label: string | null,
 *   players: AutoProposalPlayer[],
 *   lineup: Array<{ id: number, team: 1 | 2 }>,
 * }} AutoMatchProposal
 *
 * @typedef {{
 *   total_roster: number,
 *   playing: number,
 *   queued_in_matches: number,
 *   waiting_available: number,
 *   not_in_queue: number,
 * }} AutoMatchEligibilityBreakdown
 *
 * @typedef {{
 *   criteria?: AutoMatchCriteria,
 *   proposals: AutoMatchProposal[],
 *   total_eligible: number,
 *   required_per_match: number,
 *   has_stats: boolean,
 *   match_type: 'singles' | 'doubles',
 *   eligibility_breakdown?: AutoMatchEligibilityBreakdown,
 * }} AutoProposalsResponse
 */

/**
 * @param {number|string} sessionId
 * @param {AutoMatchCriteria} [criteria]
 * @returns {Promise<AutoProposalsResponse>}
 */
export async function fetchQueueingSessionAutoProposals(sessionId, criteria) {
    const params = new URLSearchParams();
    if (criteria) {
        params.set('skill_level', criteria.skill_level ? '1' : '0');
        params.set('skill_match_mode', criteria.skill_match_mode);
        params.set('wl_statistics', criteria.wl_statistics ? '1' : '0');
        params.set('sequence', criteria.sequence ? '1' : '0');
        params.set('genderless_mixed', criteria.genderless_mixed ? '1' : '0');
        if (typeof criteria.refresh_seed === 'number' && criteria.refresh_seed > 0) {
            params.set('refresh_seed', String(criteria.refresh_seed));
        }
    }
    const query = params.toString();
    const res = await fetch(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/auto-proposals${query ? `?${query}` : ''}`,
        {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        },
    );
    if (!res.ok) {
        let msg = 'Could not load match suggestions.';
        try {
            const j = await res.json();
            if (typeof j.message === 'string') msg = j.message;
        } catch {
            /* ignore */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    const data = json.data ?? {};
    const rawCriteria = data.criteria ?? {};
    const rawBreakdown = data.eligibility_breakdown ?? {};
    return {
        criteria: {
            skill_level: rawCriteria.skill_level !== false,
            skill_match_mode: rawCriteria.skill_match_mode === 'same_level' ? 'same_level' : 'balanced',
            wl_statistics: rawCriteria.wl_statistics !== false,
            sequence: rawCriteria.sequence !== false,
            genderless_mixed: rawCriteria.genderless_mixed !== false,
            refresh_seed:
                typeof rawCriteria.refresh_seed === 'number' && rawCriteria.refresh_seed > 0
                    ? rawCriteria.refresh_seed
                    : undefined,
        },
        proposals: Array.isArray(data.proposals) ? data.proposals : [],
        total_eligible: Number(data.total_eligible ?? 0),
        required_per_match: Number(data.required_per_match ?? 2),
        has_stats: Boolean(data.has_stats),
        match_type: data.match_type === 'doubles' ? 'doubles' : 'singles',
        eligibility_breakdown: {
            total_roster: Number(rawBreakdown.total_roster ?? 0),
            playing: Number(rawBreakdown.playing ?? 0),
            queued_in_matches: Number(rawBreakdown.queued_in_matches ?? 0),
            waiting_available: Number(rawBreakdown.waiting_available ?? data.total_eligible ?? 0),
            not_in_queue: Number(rawBreakdown.not_in_queue ?? 0),
        },
    };
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
 * @param {{ user_id?: number, guest_name?: string, pronoun?: string | null, skill_level?: number | null }} body
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
 * @param {{ guest_name?: string, pronoun?: string | null, skill_level?: number | null }} body
 */
export async function patchUpdateQueueingSessionPlayer(sessionId, playerRowId, body) {
    const res = await patchJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players/${encodeURIComponent(String(playerRowId))}`,
        body,
    );
    if (!res.ok) {
        let msg = 'Could not update player.';
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
