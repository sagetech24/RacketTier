import { useEffect, useMemo, useRef, useState } from 'react';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import {
    playerRosterStatus,
    reservedQueueingPlayerIds,
    rosterPlayerLabel,
} from '../../lib/queueingMatchLineup.js';

/** @param {{ status: { label: string, className: string } | null }} props */
function PlayerStatusBadge({ status }) {
    if (!status) return null;
    return (
        <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold tracking-wide ${status.className}`}
        >
            {status.label}
        </span>
    );
}

/** @param {NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number]} p */
function CreateMatchPlayerSessionStats({ p }) {
    const wins = p.wins_count ?? 0;
    const losses = p.losses_count ?? 0;
    const earnedLabel = String(p.session_points ?? 0);

    return (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[#918f9c]">
            <span className="inline-flex items-center gap-0.5" title="Wins">
                <MaterialIcon name="arrow_upward" className="text-[14px]! text-[#4ce081]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{wins}</span>
            </span>
            <span className="inline-flex items-center gap-0.5" title="Losses">
                <MaterialIcon name="arrow_downward" className="text-[14px]! text-red-300/90" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{losses}</span>
            </span>
            <span className="inline-flex items-center gap-0.5" title="Points earned">
                <MaterialIcon name="award_star" className="text-[14px]! text-[#c2c1ff]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{earnedLabel}</span>
            </span>
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
 *   onSave: (lineup: { id: number, team?: number }[]) => Promise<void>,
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

    const matchLineupMaxPerTeam = session.match_type === 'doubles' ? 2 : 1;

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
            const max = session.match_type === 'doubles' ? 2 : 1;
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
     * @param {1 | 2} team
     * @param {number} playerId
     */
    function removePlayerFromMatchLineupTeam(team, playerId) {
        setMatchLineupTeams((prev) => ({
            team1: team === 1 ? prev.team1.filter((id) => id !== playerId) : prev.team1,
            team2: team === 2 ? prev.team2.filter((id) => id !== playerId) : prev.team2,
        }));
    }

    /** @returns {{ id: number, team?: number }[] | null} */
    function buildMatchLineupPayload() {
        if (!matchLineupValid) return null;
        const { team1, team2 } = matchLineupTeams;
        if (session.match_type === 'doubles') {
            return [...team1.map((id) => ({ id, team: 1 })), ...team2.map((id) => ({ id, team: 2 }))];
        }
        return [{ id: team1[0] }, { id: team2[0] }];
    }

    async function handleSave() {
        const lineup = buildMatchLineupPayload();
        if (!lineup) return;
        await onSave(lineup);
    }

    if (!open) return null;

    return (
        <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center p-4 pt-10 sm:items-center md:p-6">
            <div className="rt-end-match-modal-sheet flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl md:max-w-2xl md:rounded-2xl">
                <div className="border-b border-[#2a2a2d] p-5 pb-4">
                    <h3 className="text-lg font-bold">
                        {mode === 'edit'
                            ? `Edit Match${editingMatchNo != null ? ` #${editingMatchNo}` : ''}`
                            : 'Create Match'}
                    </h3>
                    <p className="mt-1 text-xs text-[#918f9c]">
                        {mode === 'edit'
                            ? 'Update players on Team 1 or Team 2 for this queued match.'
                            : 'Search players who are in the queue and not on court, assign them to Team 1 or Team 2, then add the match to the queue.'}{' '}
                        <br />
                        <br />
                        <span className="text-md capitalize">{session.match_type}</span>: {matchLineupMaxPerTeam} player(s) per team.
                    </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
                    <div className="space-y-5 md:grid md:grid-cols-1 md:items-start md:gap-6 md:space-y-0">
                        <div className="min-w-0">
                            <label htmlFor="create-match-player-search" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                Search players
                            </label>
                            <input
                                id="create-match-player-search"
                                type="search"
                                autoComplete="off"
                                placeholder="Name or email…"
                                value={matchLineupSearch}
                                onChange={(e) => setMatchLineupSearch(e.target.value)}
                                className="w-full rounded-xl border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-md text-[#e4e1e6] outline-none placeholder:text-[#918f9c] focus:border-[#4ce081]/50"
                            />
                            <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-[#2a2a2d] bg-[#131316] md:max-h-72">
                                {assignableSessionPlayers.length === 0 ? (
                                    <p className="px-3 py-3 text-xs text-[#918f9c]">
                                        No eligible players (must be waiting in queue and not in a match). Add players on the Players tab or wait until a match ends.
                                    </p>
                                ) : matchLineupSearchResults.length === 0 ? (
                                    <p className="px-3 py-3 text-xs text-[#918f9c]">
                                        {matchLineupSearch.trim()
                                            ? 'No matching players, or everyone matching is already on a team below.'
                                            : 'Everyone eligible is already assigned — remove someone from a team to search again, or clear a slot with ×.'}
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-[#2a2a2d]">
                                        {matchLineupSearchResults.map((p) => {
                                            const t1Full = matchLineupTeams.team1.length >= matchLineupMaxPerTeam;
                                            const t2Full = matchLineupTeams.team2.length >= matchLineupMaxPerTeam;
                                            const rosterStatus = playerRosterStatus(
                                                p,
                                                reservedPlayerIds,
                                                Boolean(session.is_active),
                                            );
                                            return (
                                                <li key={p.id} className="flex items-start justify-between gap-2 px-3 py-2.5">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate md:text-lg text-md font-medium text-[#e4e1e6]">{rosterPlayerLabel(p)}</p>
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <CreateMatchPlayerSessionStats p={p} />
                                                            <PlayerStatusBadge status={rosterStatus} />
                                                        </div>
                                                    </div>
                                                    <div className="flex md:flex-row flex-col shrink-0 gap-2 pt-0.5">
                                                        <button
                                                            type="button"
                                                            disabled={busy || t1Full}
                                                            onClick={() => addPlayerToMatchLineupTeam(1, p.id)}
                                                            className="rounded-lg border border-[#4ce081]/50 px-3 py-1.5 text-xs font-bold text-[#4ce081] disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Assign to Team 1
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy || t2Full}
                                                            onClick={() => addPlayerToMatchLineupTeam(2, p.id)}
                                                            className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-bold text-[#e4e1e6] disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Assign to Team 2
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="min-w-0">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#918f9c]">Teams</p>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="flex min-h-[140px] flex-col rounded-xl border border-[#4ce081]/35 bg-[#131316] p-3">
                                    <p className="mb-2 border-b border-[#4ce081]/20 pb-2 text-center text-xs font-bold uppercase tracking-wide text-[#4ce081]">
                                        Team 1 ({matchLineupTeams.team1.length}/{matchLineupMaxPerTeam})
                                    </p>
                                    <div className="flex flex-1 flex-col gap-2">
                                        {matchLineupTeams.team1.map((pid) => {
                                            const p = session.players?.find((row) => row.id === pid);
                                            return (
                                                <div
                                                    key={pid}
                                                    className="flex items-center justify-between gap-1 rounded-lg border border-[#4ce081]/30 bg-[#4ce081]/10 px-2 py-1.5 text-xs font-semibold text-[#4ce081]"
                                                >
                                                    <span className="min-w-0 truncate">{rosterPlayerLabel(p)}</span>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => removePlayerFromMatchLineupTeam(1, pid)}
                                                        className="shrink-0 rounded px-1 text-[#e4e1e6]/70 hover:text-white"
                                                        aria-label={`Remove ${rosterPlayerLabel(p)} from team 1`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {matchLineupTeams.team1.length === 0 ? (
                                            <p className="flex flex-1 items-center justify-center text-center text-[11px] leading-snug text-[#918f9c]">
                                                Use Team 1 in search results
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex min-h-[140px] flex-col rounded-xl border border-white/15 bg-[#131316] p-3">
                                    <p className="mb-2 border-b border-white/10 pb-2 text-center text-xs font-bold uppercase tracking-wide text-[#c8c5d2]">
                                        Team 2 ({matchLineupTeams.team2.length}/{matchLineupMaxPerTeam})
                                    </p>
                                    <div className="flex flex-1 flex-col gap-2">
                                        {matchLineupTeams.team2.map((pid) => {
                                            const p = session.players?.find((row) => row.id === pid);
                                            return (
                                                <div
                                                    key={pid}
                                                    className="flex items-center justify-between gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-[#e4e1e6]"
                                                >
                                                    <span className="min-w-0 truncate">{rosterPlayerLabel(p)}</span>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => removePlayerFromMatchLineupTeam(2, pid)}
                                                        className="shrink-0 rounded px-1 text-[#e4e1e6]/70 hover:text-white"
                                                        aria-label={`Remove ${rosterPlayerLabel(p)} from team 2`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {matchLineupTeams.team2.length === 0 ? (
                                            <p className="flex flex-1 items-center justify-center text-center text-[11px] leading-snug text-[#918f9c]">
                                                Use Team 2 in search results
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 gap-2 border-t border-[#2a2a2d] p-5 pt-4">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={busy || !matchLineupValid}
                        onClick={() => handleSave()}
                        className="flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {mode === 'edit' ? 'Save changes' : 'Create Match'}
                    </button>
                </div>
            </div>
        </div>
    );
}
