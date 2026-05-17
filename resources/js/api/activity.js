/**
 * @typedef {{
 *   id: string,
 *   kind: 'facility_match' | 'queueing_match',
 *   finished_at: string | null,
 *   sport: { id: number, name: string, slug: string, code: string } | null,
 *   facility: { id: number, name: string } | null,
 *   session: { id: number, session_context: string, queue_name: string | null },
 *   match_no: number | null,
 *   team1_score: number | null,
 *   team2_score: number | null,
 *   won: boolean | null,
 *   session_points_earned: number | null,
 *   rating_change: number | null,
 *   title: string,
 *   subtitle: string,
 *   href: string,
 * }} UserActivityItem
 */

/**
 * @typedef {{
 *   data: UserActivityItem[],
 *   meta: { next_cursor: string | null, has_more: boolean }
 * }} UserActivityPage
 */

/**
 * @param {{ limit?: number, cursor?: string | null }} [opts]
 * @returns {Promise<UserActivityPage>}
 */
export async function fetchMyActivity(opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit != null && String(opts.limit).trim() !== '') {
        params.set('limit', String(opts.limit));
    }
    if (opts.cursor != null && String(opts.cursor).trim() !== '') {
        params.set('cursor', String(opts.cursor));
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

    return {
        data: json.data ?? [],
        meta: {
            next_cursor: json.meta?.next_cursor ?? null,
            has_more: Boolean(json.meta?.has_more),
        },
    };
}
