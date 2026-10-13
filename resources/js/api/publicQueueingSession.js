/**
 * @typedef {object} PublicQueueingSession
 * @property {number} id
 * @property {string | null} queue_name
 * @property {{ name?: string | null, icon?: string | null }} sport
 * @property {string} match_type
 * @property {boolean} optional_guest_skill
 * @property {string | null} queue_master_name
 * @property {string | null} started_at
 * @property {string | null} ended_at
 *
 * @typedef {object} PublicQueueingSummaryPlayer
 * @property {number} rank
 * @property {string} name
 * @property {number} wins
 * @property {number} losses
 * @property {number} total_matches
 * @property {number} earned_points
 * @property {boolean} is_guest
 * @property {number | null} skill_level
 *
 * @typedef {object} PublicQueueingSummary
 * @property {number} session_id
 * @property {{
 *   matches: number,
 *   players: number,
 *   points_awarded: number,
 *   elo_rating_change_sum: number,
 *   wins_recorded: number,
 *   losses_recorded: number,
 * }} totals
 * @property {PublicQueueingSummaryPlayer[]} players
 *
 * @typedef {object} PublicQueueingMatch
 * @property {number} id
 * @property {number} match_no
 * @property {'finished'} status
 * @property {Array<{ name: string, team: number | null }>} lineup
 * @property {number | null} team1_score
 * @property {number | null} team2_score
 * @property {number | null} winning_team
 * @property {string | null} started_at
 * @property {string | null} finished_at
 *
 * @typedef {object} PublicQueueingSessionSummary
 * @property {PublicQueueingSession} session
 * @property {PublicQueueingSummary} summary
 * @property {PublicQueueingMatch[]} matches
 */

/**
 * @param {string} publicKey
 * @returns {Promise<PublicQueueingSessionSummary>}
 */
export async function fetchPublicQueueingSessionSummary(publicKey) {
    const res = await fetch(`/public/queueing-sessions/${encodeURIComponent(publicKey)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (res.status === 404) {
        throw new Error('This summary is not available.');
    }

    if (!res.ok) {
        throw new Error('Could not load this summary.');
    }

    const body = await res.json();
    return body.data;
}
