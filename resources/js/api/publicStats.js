/**
 * @typedef {object} PublicStats
 * @property {number} total_members
 * @property {number} total_queueing_sessions
 * @property {number} total_points_awarded
 */

/**
 * @returns {Promise<PublicStats>}
 */
export async function fetchPublicStats() {
    const res = await fetch('/public/stats', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (!res.ok) {
        throw new Error('Failed to load public stats');
    }

    const body = await res.json();
    return body.data;
}
