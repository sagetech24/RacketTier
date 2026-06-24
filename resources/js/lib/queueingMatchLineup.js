/** @param {unknown} lineup */
export function lineupPlayerIds(lineup) {
    const rows = Array.isArray(lineup) ? lineup : [];
    return rows
        .map((p) => Number(p.game_session_player_id ?? p.id ?? 0))
        .filter((id) => id > 0);
}

/** @param {unknown} lineup */
export function lineupToTeams(lineup) {
    const rows = Array.isArray(lineup) ? lineup : [];
    /** @type {number[]} */
    const team1 = [];
    /** @type {number[]} */
    const team2 = [];
    /** @type {number[]} */
    const unteamed = [];
    for (const p of rows) {
        const id = Number(p.game_session_player_id ?? p.id ?? 0);
        if (id <= 0) continue;
        const team = Number(p.team);
        if (team === 1) team1.push(id);
        else if (team === 2) team2.push(id);
        else unteamed.push(id);
    }
    if (unteamed.length === 2 && team1.length === 0 && team2.length === 0) {
        return { team1: [unteamed[0]], team2: [unteamed[1]] };
    }
    return { team1, team2 };
}

/** @param {{ user?: { name?: string } | null, guest_name?: string | null } | null | undefined} p */
export function rosterPlayerLabel(p) {
    if (!p) return 'Player';
    const n = (p.user?.name ?? p.guest_name ?? '').trim();
    return n || 'Player';
}

/**
 * @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} p
 * @param {Set<number>} reservedPlayerIds
 * @param {boolean} sessionActive
 */
export function playerRosterStatus(p, reservedPlayerIds, sessionActive) {
    if (!sessionActive) {
        return null;
    }
    if (p.is_playing) {
        return { label: 'Playing', className: 'border border-[#4ce081]/40 bg-[#4ce081]/20 text-[#4ce081]' };
    }
    if (reservedPlayerIds.has(p.id)) {
        return { label: 'Queueing', className: 'border border-amber-400/40 bg-amber-400/20 text-amber-200' };
    }
    return { label: 'Waiting', className: 'border border-[#514c53] bg-[#353438] text-[#918f9c]' };
}

/**
 * @param {Array<{ status?: string, lineup?: unknown, id?: number }>} matches
 * @param {number | null | undefined} excludeMatchId
 */
export function reservedQueueingPlayerIds(matches, excludeMatchId = null) {
    const ids = new Set();
    for (const row of matches) {
        if (row.status !== 'queueing') continue;
        if (excludeMatchId != null && row.id === excludeMatchId) continue;
        for (const pid of lineupPlayerIds(row.lineup)) {
            ids.add(pid);
        }
    }
    return ids;
}
