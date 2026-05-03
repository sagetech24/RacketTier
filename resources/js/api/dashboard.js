/**
 * @typedef {object} DashboardSummary
 * @property {{ id: number, name: string, email: string, member_since: string | null }} user
 * @property {{ rating: number, matches_played: number, matches_won: number, sessions_active: number }} stats
 * @property {{ title: string, meta: string }[]} highlights
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
