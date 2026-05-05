/**
 * @typedef {{
 *   rank: number,
 *   rating: number,
 *   wallet_balance: number,
 *   user: { id: number, name: string, email: string | null },
 *   sport: { id: number, name: string | null, slug: string | null, code: string | null },
 *   tier: {
 *     id: number,
 *     tier_no: number,
 *     name: string,
 *     start_point: number,
 *     end_point: number,
 *   } | null,
 * }} RankingRow
 */

/**
 * @param {{ sportId?: number | null, search?: string, limit?: number }} [opts]
 * @returns {Promise<RankingRow[]>}
 */
export async function fetchRankings(opts = {}) {
    const params = new URLSearchParams();
    if (opts.sportId != null) {
        params.set('sport_id', String(opts.sportId));
    }
    if (typeof opts.search === 'string' && opts.search.trim() !== '') {
        params.set('search', opts.search.trim());
    }
    if (typeof opts.limit === 'number' && Number.isFinite(opts.limit)) {
        params.set('limit', String(Math.max(1, Math.floor(opts.limit))));
    }

    const qs = params.toString();
    const url = qs ? `/auth/rankings?${qs}` : '/auth/rankings';
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error('Failed to load rankings');
    }

    const json = await res.json();
    return json.data ?? [];
}
