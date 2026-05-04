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
 *   sport_slug: string,
 *   match_type: 'singles' | 'doubles',
 *   game_type: string,
 *   court_preference: string | null,
 *   player_ids: number[],
 * }} payload
 * @returns {Promise<Response>}
 */
export function postCreateGameSession(payload) {
    return postJson('/auth/game-sessions', payload);
}
