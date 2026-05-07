/**
 * @typedef {import('./gameSession.js').GameSessionDetail} GameSessionDetail
 */

/**
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<GameSessionDetail[]>}
 */
export async function fetchMyActivity(opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit != null && String(opts.limit).trim() !== '') {
        params.set('limit', String(opts.limit));
    }
    const qs = params.toString();
    const url = qs ? `/auth/activity?${qs}` : '/auth/activity';

    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error('Failed to load activity');
    }
    const json = await res.json();
    return json.data ?? [];
}

