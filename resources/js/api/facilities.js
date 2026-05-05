import { patchJson, postJson } from '../lib/http.js';

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   address: string | null,
 *   game_sessions_count?: number,
 *   today_checked_in_players_count?: number
 * }} FacilityRow
 */

/**
 * @param {string} [q]
 * @returns {Promise<FacilityRow[]>}
 */
export async function fetchFacilities(q = '') {
    const params = new URLSearchParams();
    if (q.trim()) {
        params.set('q', q.trim());
    }
    const qs = params.toString();
    const url = qs ? `/auth/facilities?${qs}` : '/auth/facilities';
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error('Failed to load facilities');
    }
    const json = await res.json();
    return json.data ?? [];
}

/**
 * @param {{ name: string, address: string }} payload
 * @returns {Promise<FacilityRow>}
 */
export async function postFacility(payload) {
    const res = await postJson('/auth/facilities', payload);
    const data = await res.json().catch(() => ({}));
    if (res.status === 422) {
        const err = new Error(data.message ?? 'Check the form and try again.');
        /** @type {Record<string, string[]>} */
        const errors = data.errors ?? {};
        Object.assign(err, { errors });
        throw err;
    }
    if (!res.ok) {
        throw new Error(data.message ?? 'Could not add facility');
    }
    if (!data.data) {
        throw new Error('Invalid response');
    }
    return data.data;
}

/**
 * @param {number} facilityId
 * @param {{ name: string, address: string }} payload
 * @returns {Promise<FacilityRow>}
 */
export async function patchFacility(facilityId, payload) {
    const res = await patchJson(`/auth/facilities/${facilityId}`, payload);
    const data = await res.json().catch(() => ({}));
    if (res.status === 422) {
        const err = new Error(data.message ?? 'Check the form and try again.');
        /** @type {Record<string, string[]>} */
        const errors = data.errors ?? {};
        Object.assign(err, { errors });
        throw err;
    }
    if (!res.ok) {
        throw new Error(data.message ?? 'Could not update facility');
    }
    if (!data.data) {
        throw new Error('Invalid response');
    }
    return data.data;
}
