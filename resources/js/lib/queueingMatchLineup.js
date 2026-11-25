import { sessionFirstName } from './queueingPlayerName.js';

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

/** Full name for search/filters. @param {{ user?: { name?: string } | null, guest_name?: string | null } | null | undefined} p */
export function rosterPlayerLabel(p) {
    if (!p) return 'Player';
    const n = (p.user?.name ?? p.guest_name ?? '').trim();
    return n || 'Player';
}

/** First name only for in-session lineup cards. @param {{ user?: { name?: string } | null, guest_name?: string | null } | null | undefined} p */
export function rosterPlayerSessionLabel(p) {
    return sessionFirstName(rosterPlayerLabel(p));
}

/**
 * @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} p
 * @param {Set<number>} reservedPlayerIds
 * @param {boolean} sessionActive
 * @param {Set<number>} [heldForReserveOnlyIds] players only soft-held by reserved matches (not queueing)
 */
export function playerRosterStatus(p, reservedPlayerIds, sessionActive, heldForReserveOnlyIds = null) {
    if (!sessionActive) {
        return null;
    }
    if (p.is_playing) {
        return { label: 'Playing', className: 'border border-[#4ce081]/40 bg-[#4ce081]/20 text-[#4ce081]' };
    }
    if (reservedPlayerIds.has(p.id)) {
        const reserveOnly = heldForReserveOnlyIds?.has(p.id);
        if (reserveOnly) {
            return { label: 'Reserved', className: 'border border-sky-400/40 bg-sky-400/20 text-sky-200' };
        }
        return { label: 'Queueing', className: 'border border-amber-400/40 bg-amber-400/20 text-amber-200' };
    }
    return { label: 'Waiting', className: 'border border-[#514c53] bg-[#353438] text-[#918f9c]' };
}

/**
 * Soft-held player ids from queueing and/or reserved matches.
 * @param {Array<{ status?: string, lineup?: unknown, id?: number }>} matches
 * @param {number | null | undefined} excludeMatchId
 * @param {{ includeQueueing?: boolean, includeReserved?: boolean }} [opts]
 */
export function reservedQueueingPlayerIds(
    matches,
    excludeMatchId = null,
    opts = { includeQueueing: true, includeReserved: true },
) {
    const includeQueueing = opts.includeQueueing !== false;
    const includeReserved = opts.includeReserved !== false;
    const ids = new Set();
    for (const row of matches) {
        const status = row.status;
        if (status === 'queueing' && !includeQueueing) continue;
        if (status === 'reserved' && !includeReserved) continue;
        if (status !== 'queueing' && status !== 'reserved') continue;
        if (excludeMatchId != null && row.id === excludeMatchId) continue;
        for (const pid of lineupPlayerIds(row.lineup)) {
            ids.add(pid);
        }
    }
    return ids;
}

/**
 * Players held only by reserved matches (not also on a queueing match).
 * @param {Array<{ status?: string, lineup?: unknown, id?: number }>} matches
 */
export function reservedOnlyPlayerIds(matches) {
    const queueing = reservedQueueingPlayerIds(matches, null, {
        includeQueueing: true,
        includeReserved: false,
    });
    const reserved = reservedQueueingPlayerIds(matches, null, {
        includeQueueing: false,
        includeReserved: true,
    });
    const only = new Set();
    for (const id of reserved) {
        if (!queueing.has(id)) only.add(id);
    }
    return only;
}
