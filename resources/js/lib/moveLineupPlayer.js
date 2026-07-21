/**
 * Pure lineup move/swap helper for Match Lineup drag-and-drop.
 *
 * @typedef {{ team1: number[], team2: number[] }} LineupTeams
 */

/**
 * @param {number[]} list
 * @param {number} from
 * @param {number} to
 */
function arrayMove(list, from, to) {
    const next = [...list];
    if (from < 0 || from >= next.length) return next;
    const [item] = next.splice(from, 1);
    const insertAt = Math.max(0, Math.min(to, next.length));
    next.splice(insertAt, 0, item);
    return next;
}

/**
 * @param {LineupTeams} teams
 * @param {{
 *   playerId: number,
 *   fromTeam: 1 | 2,
 *   toTeam: 1 | 2,
 *   toIndex?: number | null,
 *   overPlayerId?: number | null,
 *   maxPerTeam: number,
 * }} args
 * @returns {LineupTeams}
 */
export function moveLineupPlayer(teams, { playerId, fromTeam, toTeam, toIndex = null, overPlayerId = null, maxPerTeam }) {
    const sourceKey = fromTeam === 1 ? 'team1' : 'team2';
    const targetKey = toTeam === 1 ? 'team1' : 'team2';

    const source = [...teams[sourceKey]];
    const fromIndex = source.indexOf(playerId);
    if (fromIndex < 0) {
        return { team1: [...teams.team1], team2: [...teams.team2] };
    }

    // Same-team reorder
    if (fromTeam === toTeam) {
        let newIndex = source.length - 1;
        if (overPlayerId != null) {
            const overIdx = source.indexOf(overPlayerId);
            if (overIdx >= 0) newIndex = overIdx;
        } else if (typeof toIndex === 'number') {
            newIndex = toIndex;
        }
        const reordered = arrayMove(source, fromIndex, newIndex);
        if (fromTeam === 1) {
            return { team1: reordered, team2: [...teams.team2] };
        }
        return { team1: [...teams.team1], team2: reordered };
    }

    const target = [...teams[targetKey]];

    // Cross-team: remove from source first
    source.splice(fromIndex, 1);

    // Capacity full → swap with over card, or with last slot if dropping on column
    if (target.length >= maxPerTeam) {
        let swapIndex = target.length - 1;
        if (overPlayerId != null) {
            const overIdx = target.indexOf(overPlayerId);
            if (overIdx >= 0) swapIndex = overIdx;
        } else if (typeof toIndex === 'number' && toIndex >= 0 && toIndex < target.length) {
            swapIndex = toIndex;
        }
        const swapped = target[swapIndex];
        target[swapIndex] = playerId;
        source.splice(Math.min(fromIndex, source.length), 0, swapped);

        if (fromTeam === 1) {
            return { team1: source, team2: target };
        }
        return { team1: target, team2: source };
    }

    // Room available → move
    let insertAt = typeof toIndex === 'number' ? toIndex : target.length;
    if (overPlayerId != null) {
        const overIdx = target.indexOf(overPlayerId);
        if (overIdx >= 0) insertAt = overIdx;
    }
    insertAt = Math.max(0, Math.min(insertAt, target.length));
    target.splice(insertAt, 0, playerId);

    if (fromTeam === 1) {
        return { team1: source, team2: target };
    }
    return { team1: target, team2: source };
}

/**
 * @param {'singles' | 'doubles'} matchType
 */
export function maxPlayersPerTeam(matchType) {
    return matchType === 'doubles' ? 2 : 1;
}
