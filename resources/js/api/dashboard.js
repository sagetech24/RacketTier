/**
 * @typedef {object} DashboardSummary
 * @property {{ id: number, name: string, email: string, member_since: string | null }} user
 * @property {{ rating: number | null, matches_played: number, matches_won: number, sessions_active: number }} stats
 * @property {{ id: number, name: string, slug: string, code: string } | null} primary_sport Most-played sport by match history (wins + losses)
 * @property {{ id: number, tier_no: number, name: string, start_point: number, end_point: number, wallet_balance: number } | null} tier
 * @property {number} total_point_balance Sum of member_point_wallets.balance across all sports
 * @property {{ title: string, meta: string, finished_at?: string | null }[]} highlights
 */

/**
 * @returns {Promise<DashboardSummary>}
 */
export async function fetchDashboardSummary() {
    const res = await fetch('/auth/dashboard-summary', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (res.status === 401) {
        throw new Error('Unauthorized');
    }

    if (!res.ok) {
        throw new Error('Failed to load dashboard');
    }

    return res.json();
}
