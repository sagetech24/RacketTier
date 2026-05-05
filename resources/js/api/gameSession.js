import { postJson } from '../lib/http.js';

/**
 * @typedef {{ id: number, slug: string, name: string, code: string, icon: string }} SportRow
 * @typedef {{ id: number, name: string, email: string }} FacilityPlayerRow
 */

/**
 * @returns {Promise<SportRow[]>}
 */
export async function fetchSports() {
    const res = await fetch('/auth/sports', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error('Failed to load sports');
    }
    const json = await res.json();
    return json.data ?? [];
}

/**
 * @param {string} [q]
 * @returns {Promise<FacilityPlayerRow[]>}
 */
export async function fetchFacilityPlayers(q = '') {
    const params = new URLSearchParams();
    if (q.trim()) {
        params.set('q', q.trim());
    }
    const qs = params.toString();
    const url = qs ? `/auth/facility-players?${qs}` : '/auth/facility-players';
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error('Failed to load players');
    }
    const json = await res.json();
    return json.data ?? [];
}

/**
 * @param {{
 *   facility_id: number,
 *   sport_slug: string,
 *   match_type: 'singles' | 'doubles',
 *   game_type: string,
 *   court_preference: string | null,
 *   player_ids: number[],
 *   team_assignments: Array<{ user_id: number, team: 1 | 2 }>,
 * }} payload
 * @returns {Promise<Response>}
 */
export function postCreateGameSession(payload) {
    return postJson('/auth/game-sessions', payload);
}

/**
 * @typedef {{
 *   user_id: number,
 *   name: string,
 *   team: number,
 *   won: boolean,
 *   rating_before: number,
 *   rating_after: number,
 *   rating_change: number,
 *   session_points_earned: number,
 * }} LastMatchPlayerBreakdown
 *
 * @typedef {{
 *   team1_score: number,
 *   team2_score: number,
 *   winning_team: number | null,
 *   finished_at: string | null,
 *   players: LastMatchPlayerBreakdown[],
 * }} GameSessionLastMatch
 *
 * @typedef {{
 *   id: number,
 *   facility?: { id: number, name: string, address: string | null },
 *   sport: { slug: string, name: string, code: string, icon?: string },
 *   match_type: string,
 *   game_type: string,
 *   court_preference: string | null,
 *   is_active: boolean,
 *   status: 'queueing' | 'ongoing' | 'finished',
 *   last_match?: GameSessionLastMatch,
 *   started_at: string | null,
 *   ended_at: string | null,
 *   is_host: boolean,
 *   created_by?: { id: number, name: string, email: string },
 *   participant_count?: number,
 *   players?: Array<{
 *     id: number,
 *     queue_position: number,
 *     is_waiting: boolean,
 *     is_playing: boolean,
 *     team?: number | null,
 *     wins_count?: number,
 *     losses_count?: number,
 *     session_points?: number,
 *     elo_rating?: number,
 *     user: { id: number, name: string, email: string },
 *   }>,
 * }} GameSessionDetail
 */

/**
 * @param {number | string} [facilityId] When set, only sessions for this facility are returned.
 * @returns {Promise<GameSessionDetail[]>}
 */
export async function fetchMyGameSessions(facilityId) {
    const params = new URLSearchParams();
    if (facilityId != null && String(facilityId).trim() !== '') {
        params.set('facility_id', String(facilityId));
    }
    const qs = params.toString();
    const url = qs ? `/auth/game-sessions?${qs}` : '/auth/game-sessions';
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error('Failed to load sessions');
    }
    const json = await res.json();
    return json.data ?? [];
}

/**
 * @param {string | number} id
 * @param {{ facilityId?: number | string }} [opts] When set, session must belong to this facility.
 * @returns {Promise<GameSessionDetail>}
 */
export async function fetchGameSession(id, opts = {}) {
    const params = new URLSearchParams();
    if (opts.facilityId != null && String(opts.facilityId).trim() !== '') {
        params.set('facility_id', String(opts.facilityId));
    }
    const qs = params.toString();
    const path = `/auth/game-sessions/${encodeURIComponent(String(id))}`;
    const url = qs ? `${path}?${qs}` : path;
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (res.status === 404) {
        throw new Error('Session not found');
    }
    if (!res.ok) {
        throw new Error('Failed to load session');
    }
    const json = await res.json();
    if (!json.data) {
        throw new Error('Invalid session response');
    }
    return json.data;
}

/**
 * @param {string | number} id
 * @param {{ facilityId?: number | string }} [opts]
 * @returns {Promise<GameSessionDetail>}
 */
export async function postStartGameSessionMatch(id, opts = {}) {
    const body = {};
    if (opts.facilityId != null && String(opts.facilityId).trim() !== '') {
        body.facility_id = Number(opts.facilityId);
    }
    const res = await postJson(`/auth/game-sessions/${encodeURIComponent(String(id))}/start-match`, body);
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (res.status === 403) {
        throw new Error('Only the session host can start a match.');
    }
    if (!res.ok) {
        let msg = 'Could not start the match.';
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
            /* keep default */
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
 * @param {string | number} id
 * @param {{ team1_score: number, team2_score: number, facilityId?: number | string }} body
 * @returns {Promise<GameSessionDetail>}
 */
export async function postFinishGameSessionMatch(id, body) {
    const payload = {
        team1_score: body.team1_score,
        team2_score: body.team2_score,
    };
    if (body.facilityId != null && String(body.facilityId).trim() !== '') {
        payload.facility_id = Number(body.facilityId);
    }
    const res = await postJson(`/auth/game-sessions/${encodeURIComponent(String(id))}/finish-match`, payload);
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (res.status === 403) {
        throw new Error('Only the session host can finish the match.');
    }
    if (!res.ok) {
        let msg = 'Could not finish the match.';
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
            /* keep default */
        }
        throw new Error(msg);
    }
    const json = await res.json();
    if (!json.data) {
        throw new Error('Invalid session response');
    }
    return json.data;
}
