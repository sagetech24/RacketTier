import { useEffect, useMemo, useRef, useState } from 'react';
import {
    reservedQueueingPlayerIds,
    rosterPlayerLabel,
} from '../../lib/queueingMatchLineup.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { DraggableMatchLineup } from './DraggableMatchLineup.jsx';

/** @param {number | null | undefined} skillLevel */
function skillLevelLabel(skillLevel) {
    if (skillLevel == null) return null;
    const level = Math.min(5, Math.max(1, skillLevel));
    return `Lvl ${level}`;
}

/**
 * @param {{
 *   p: NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number],
 *   trailing?: import('react').ReactNode,
 * }} props
 */
function LineupPlayerCard({ p, trailing = null }) {
    const skillLabel = skillLevelLabel(p.skill_level);
    const isGuest = Boolean(p.is_guest || p.guest_name);

    return (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-[#c2c1ff]/30 shadow-sm bg-[#131316] p-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="mb-1 truncate text-sm font-semibold capitalize text-[#e4e1e6] md:text-lg">
                        {rosterPlayerLabel(p)}
                    </p>
                    {isGuest ? (
                        <span
                            className="rounded-full border border-[#747374] bg-[#c2c1ff]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c8c5d2] md:text-[12px]"
                            title="Guest player"
                        >
                            Guest
                        </span>
                    ) : null}
                </div>
                {skillLabel ? (
                    <p className="inline-flex items-center gap-0.5" title="Skill level">
                        <MaterialIcon name="star" className="text-[15px]! text-[#c2c1ff] md:text-xl!" />
                        <span className="truncate text-xs font-medium text-[#c2c1ff] md:text-lg">{skillLabel}</span>
                    </p>
                ) : null}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#918f9c]">
                    <span className="inline-flex items-center gap-0.5" title="Wins">
                        <MaterialIcon name="arrow_upward" className="text-[13px]! text-[#4ce081] md:text-xl!" />
                        <span className="text-xs font-medium tabular-nums text-[#e4e1e6] md:text-lg">
                            {p.wins_count ?? 0}
                        </span>
                    </span>
                    <span className="inline-flex items-center gap-0.5" title="Losses">
                        <MaterialIcon name="arrow_downward" className="text-[13px]! text-red-300/90 md:text-xl!" />
                        <span className="text-xs font-medium tabular-nums text-[#e4e1e6] md:text-lg">
                            {p.losses_count ?? 0}
                        </span>
                    </span>
                </div>
            </div>
            <div className="flex shrink-0 flex-col items-end">
                {trailing}
            </div>
        </div>
    );
}

/**
 * @param {{
 *   open: boolean,
 *   mode: 'create' | 'edit',
 *   session: import('../../api/gameSession.js').GameSessionDetail,
 *   matches?: Array<{ status?: string, lineup?: unknown, id?: number }>,
 *   editingMatchId?: number | null,
 *   editingMatchNo?: number | null,
 *   initialTeams?: { team1: number[], team2: number[] },
 *   busy?: boolean,
 *   onClose: () => void,
 *   onSave: (
 *     lineup: { id: number, team?: number }[],
 *     options?: { start?: boolean },
 *   ) => Promise<void>,
 * }} props
 */
export function QueueingSessionMatchLineupModal({
    open,
    mode,
    session,
    matches = [],
    editingMatchId = null,
    editingMatchNo = null,
    initialTeams = { team1: [], team2: [] },
    busy = false,
    onClose,
    onSave,
}) {
    const [matchLineupTeams, setMatchLineupTeams] = useState({ team1: [], team2: [] });
    const [matchLineupSearch, setMatchLineupSearch] = useState('');
    const initialTeamsRef = useRef(initialTeams);
    initialTeamsRef.current = initialTeams;

    useEffect(() => {
        if (!open) return;
        setMatchLineupTeams(initialTeamsRef.current);
        setMatchLineupSearch('');
    }, [open]);

    const reservedPlayerIds = useMemo(
        () => reservedQueueingPlayerIds(matches, mode === 'edit' ? editingMatchId : null),
        [matches, mode, editingMatchId],
    );

    const assignableSessionPlayers = useMemo(() => {
        const rows = Array.isArray(session.players) ? session.players : [];
        return rows.filter((p) => p.is_waiting && !p.is_playing && !reservedPlayerIds.has(p.id));
    }, [session.players, reservedPlayerIds]);

    const matchLineupSearchResults = useMemo(() => {
        const assigned = new Set([...matchLineupTeams.team1, ...matchLineupTeams.team2]);
        const pool = assignableSessionPlayers.filter((p) => !assigned.has(p.id));
        const q = matchLineupSearch.trim().toLowerCase();
        if (!q) return pool;
        return pool.filter((p) => {
            const label = rosterPlayerLabel(p).toLowerCase();
            const email = (p.user?.email ?? '').toLowerCase();
            return label.includes(q) || email.includes(q);
        });
    }, [assignableSessionPlayers, matchLineupSearch, matchLineupTeams.team1, matchLineupTeams.team2]);

    const matchType = session.match_type === 'doubles' ? 'doubles' : 'singles';
    const matchLineupMaxPerTeam = matchType === 'doubles' ? 2 : 1;
    const requiredPlayers = matchLineupMaxPerTeam * 2;
    const teamLabel = matchType === 'doubles' ? 'Team' : 'Player';

    const matchLineupValid = useMemo(() => {
        const { team1, team2 } = matchLineupTeams;
        const max = matchLineupMaxPerTeam;
        if (team1.length !== max || team2.length !== max) return false;
        const all = [...team1, ...team2];
        return new Set(all).size === all.length;
    }, [matchLineupTeams, matchLineupMaxPerTeam]);

    /**
     * @param {1 | 2} team
     * @param {number} playerId
     */
    function addPlayerToMatchLineupTeam(team, playerId) {
        setMatchLineupTeams((prev) => {
            const max = matchType === 'doubles' ? 2 : 1;
            const t1 = prev.team1.filter((id) => id !== playerId);
            const t2 = prev.team2.filter((id) => id !== playerId);
            if (team === 1) {
                if (t1.length >= max) return prev;
                return { team1: [...t1, playerId], team2: t2 };
            }
            if (t2.length >= max) return prev;
            return { team1: t1, team2: [...t2, playerId] };
        });
    }

    /**
     * @param {number} playerId
     */
    function removePlayerFromMatchLineup(playerId) {
        setMatchLineupTeams((prev) => ({
            team1: prev.team1.filter((id) => id !== playerId),
            team2: prev.team2.filter((id) => id !== playerId),
        }));
    }

    const lineupTeam1Players = useMemo(() => {
        const rows = Array.isArray(session.players) ? session.players : [];
        return matchLineupTeams.team1
            .map((id) => rows.find((row) => row.id === id))
            .filter(Boolean)
            .map((p) => ({
                id: p.id,
                name: rosterPlayerLabel(p),
                skill_level: p.skill_level ?? null,
                wins_count: p.wins_count ?? 0,
                losses_count: p.losses_count ?? 0,
                is_guest: Boolean(p.is_guest || p.guest_name),
            }));
    }, [session.players, matchLineupTeams.team1]);

    const lineupTeam2Players = useMemo(() => {
        const rows = Array.isArray(session.players) ? session.players : [];
        return matchLineupTeams.team2
            .map((id) => rows.find((row) => row.id === id))
            .filter(Boolean)
            .map((p) => ({
                id: p.id,
                name: rosterPlayerLabel(p),
                skill_level: p.skill_level ?? null,
                wins_count: p.wins_count ?? 0,
                losses_count: p.losses_count ?? 0,
                is_guest: Boolean(p.is_guest || p.guest_name),
            }));
    }, [session.players, matchLineupTeams.team2]);

    /** @returns {{ id: number, team?: number }[] | null} */
    function buildMatchLineupPayload() {
        if (!matchLineupValid) return null;
        const { team1, team2 } = matchLineupTeams;
        if (matchType === 'doubles') {
            return [...team1.map((id) => ({ id, team: 1 })), ...team2.map((id) => ({ id, team: 2 }))];
        }
        return [{ id: team1[0] }, { id: team2[0] }];
    }

    /** @param {{ start?: boolean }} [options] */
    async function handleSave(options = {}) {
        const lineup = buildMatchLineupPayload();
        if (!lineup) return;
        await onSave(lineup, options);
    }

    if (!open) return null;

    return (
        <div className="rt-end-match-modal-overlay fixed inset-0 z-99 flex items-end justify-center pt-10 sm:items-center">
            <div className="rt-end-match-modal-sheet flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl border border-[#747474] bg-[#1b1b1e] shadow-xl sm:rounded-2xl">
                <div className="border-b border-[#2a2a2d] p-5 pb-4">
                    <h3 className="text-lg md:text-3xl font-bold">
                        {mode === 'edit'
                            ? `Edit Match${editingMatchNo != null ? ` #${editingMatchNo}` : ''}`
                            : 'Create Match'}
                    </h3>
                    <p className="my-2 text-base! text-[#918f9c] md:text-lg!">
                        {mode === 'edit'
                            ? 'Update players on Team 1 or Team 2 for this queued match.'
                            : 'Search eligible players, assign them to teams, then queue the match or start it immediately.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-[#45454a] bg-[#c2c1ff] px-2 py-1 text-xs font-semibold capitalize text-[#131316]">
                            {matchType}
                        </span>
                        <span className="rounded-full border border-[#45454a] bg-[#c2c1ff] px-2 py-1 text-xs font-semibold text-[#131316]">
                            {matchLineupMaxPerTeam} per {teamLabel.toLowerCase()}
                        </span>
                    </div>
                    <p className="mt-2 text-base! text-[#918f9c] md:text-lg!">
                        {assignableSessionPlayers.length} eligible · {requiredPlayers} player(s) per {matchType} match
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-12">
                    <div className="space-y-5">
                        <div className="min-w-0">
                            <label
                                htmlFor="create-match-player-search"
                                className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-[#918f9c] md:text-[14px]"
                            >
                                Search players
                            </label>
                            <div className="relative">
                                <MaterialIcon
                                    name="search"
                                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px]! text-[#918f9c] md:text-2xl!"
                                />
                                <input
                                    id="create-match-player-search"
                                    type="search"
                                    autoComplete="off"
                                    placeholder="Name or email…"
                                    value={matchLineupSearch}
                                    onChange={(e) => setMatchLineupSearch(e.target.value)}
                                    className="w-full rounded-xl border border-[#c2c1ff]/30 bg-[#131316] py-2.5 pr-3 pl-10 text-base text-[#e4e1e6] outline-none placeholder:text-[#918f9c] focus:border-[#c2c1ff]/60 md:text-lg"
                                />
                            </div>

                            <div className="mt-3 space-y-2">
                                {assignableSessionPlayers.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[#45454a] bg-[#131316] p-6 text-center">
                                        <p className="text-sm font-semibold text-[#e4e1e6] md:text-lg">
                                            No eligible players
                                        </p>
                                        <p className="mt-1 text-xs text-[#918f9c] md:text-base">
                                            Players must be waiting in queue and not in a match. Add players on the
                                            Players tab or wait until a match ends.
                                        </p>
                                    </div>
                                ) : matchLineupSearchResults.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[#45454a] bg-[#131316] p-6 text-center">
                                        <p className="text-sm font-semibold text-[#e4e1e6] md:text-lg">
                                            No matching players
                                        </p>
                                        <p className="mt-1 text-xs text-[#918f9c] md:text-base">
                                            {matchLineupSearch.trim()
                                                ? 'No matching players, or everyone matching is already assigned.'
                                                : 'Everyone eligible is already assigned — remove someone from a team to pick again.'}
                                        </p>
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {matchLineupSearchResults.map((p) => {
                                            const t1Full = matchLineupTeams.team1.length >= matchLineupMaxPerTeam;
                                            const t2Full = matchLineupTeams.team2.length >= matchLineupMaxPerTeam;
                                            return (
                                                <li key={p.id}>
                                                    <LineupPlayerCard
                                                        p={p}
                                                        trailing={
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={busy || t1Full}
                                                                    onClick={() => addPlayerToMatchLineupTeam(1, p.id)}
                                                                    className="inline-flex items-center justify-center gap-1 rounded-full border border-[#4ce081]/50 bg-[#4ce081]/15 px-2.5 py-1 text-xs font-bold text-[#4ce081] disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    <MaterialIcon name="group_add" className="text-[16px]! md:text-lg!" />
                                                                    Assign to {teamLabel} 1
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={busy || t2Full}
                                                                    onClick={() => addPlayerToMatchLineupTeam(2, p.id)}
                                                                    className="inline-flex items-center justify-center gap-1 rounded-full border border-[#c2c1ff]/50 bg-[#c2c1ff]/15 px-2.5 py-1 text-xs font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    <MaterialIcon name="group_add" className="text-[16px]! md:text-lg!" />
                                                                    Assign to {teamLabel} 2
                                                                </button>
                                                            </div>
                                                        }
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <DraggableMatchLineup
                            matchType={matchType}
                            team1={lineupTeam1Players}
                            team2={lineupTeam2Players}
                            disabled={busy}
                            onChange={setMatchLineupTeams}
                            onRemove={removePlayerFromMatchLineup}
                        />
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 border-t border-[#747474] p-5 pt-4">
                    {mode === 'create' ? (
                        <>
                            <button
                                type="button"
                                disabled={busy || !matchLineupValid}
                                onClick={() => void handleSave()}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <MaterialIcon name="playlist_add" className="text-[16px]! md:text-xl!" />
                                <span className="text-sm! md:text-lg!">Queue</span>
                            </button>
                            <button
                                type="button"
                                disabled={busy || !matchLineupValid}
                                onClick={() => void handleSave({ start: true })}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#c2c1ff]/50 bg-[#c2c1ff]/20 py-2.5 text-sm font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <MaterialIcon name="play_arrow" className="text-[16px]! md:text-xl!" />
                                <span className="text-sm! md:text-lg!">Start</span>
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            disabled={busy || !matchLineupValid}
                            onClick={() => void handleSave()}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <MaterialIcon name="save" className="text-[16px]! md:text-xl!" />
                            <span className="text-sm! md:text-lg!">Save</span>
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-300/50 bg-red-100/10 py-2.5 text-sm font-bold text-red-300/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <MaterialIcon name="close" className="text-[16px]! md:text-xl!" />
                        <span className="text-sm! md:text-lg!">Exit</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
