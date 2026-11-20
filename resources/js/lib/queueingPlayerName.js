/**
 * Compact in-session label: first token of the player's name.
 * Full name stays available for search, sort, and confirmations.
 *
 * @param {string | null | undefined} name
 */
export function sessionFirstName(name) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) return 'Player';
    return trimmed.split(/\s+/)[0] || 'Player';
}
