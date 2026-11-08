/**
 * @param {{
 *   completed_matches_count?: number | null,
 *   participant_count?: number | null,
 *   match_type?: string | null,
 * }} session
 * @returns {number}
 */
export function averageMatchesPerPlayer(session) {
    const players = Number(session?.participant_count ?? 0);
    if (!Number.isFinite(players) || players <= 0) {
        return 0;
    }

    const matches = Number(session?.completed_matches_count ?? 0);
    if (!Number.isFinite(matches) || matches <= 0) {
        return 0;
    }

    const slotsPerMatch = session?.match_type === 'doubles' ? 4 : 2;
    return (matches * slotsPerMatch) / players;
}

/**
 * @param {{
 *   completed_matches_count?: number | null,
 *   participant_count?: number | null,
 *   match_type?: string | null,
 * }} session
 * @returns {string}
 */
export function formatAverageMatchesPerPlayer(session) {
    return String(Math.round(averageMatchesPerPlayer(session)));
}
