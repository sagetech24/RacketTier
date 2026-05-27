import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchGameSession, postFinishGameSessionMatch } from '../api/gameSession.js';
import {
    deleteQueueingSessionMatch,
    fetchQueueingSessionMatches,
    patchUpdateQueueingSessionMatch,
    postCreateQueueingSessionMatch,
    postEndQueueingSession,
    postStartQueueingSessionMatch,
} from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { AutoMatchProposalsModal } from '../components/queueing/AutoMatchProposalsModal.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

function statusClass(status) {
    if (status === 'finished') return 'bg-[#c2c1ff]/20 text-[#c2c1ff]';
    if (status === 'ongoing') return 'bg-orange-400/20 text-orange-200';
    if (status === 'queueing') return 'bg-[#c2c1ff]/20 text-[#c2c1ff]';
    return 'bg-[#353438] text-[#c8c5d2]';
}

function sectionTitle(status) {
    if (status === 'queueing') return 'Queueing';
    if (status === 'ongoing') return 'Ongoing';
    if (status === 'finished') return 'Finished';
    return status;
}

/** @param {unknown} lineup */
function lineupPlayerIds(lineup) {
    const rows = Array.isArray(lineup) ? lineup : [];
    return rows
        .map((p) => Number(p.game_session_player_id ?? p.id ?? 0))
        .filter((id) => id > 0);
}

/** @param {unknown} lineup */
function lineupToTeams(lineup) {
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
function rosterPlayerLabel(p) {
    if (!p) return 'Player';
    const n = (p.user?.name ?? p.guest_name ?? '').trim();
    return n || 'Player';
}

/**
 * @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} p
 * @param {Set<number>} reservedPlayerIds
 * @param {boolean} sessionActive
 */
function playerRosterStatus(p, reservedPlayerIds, sessionActive) {
    if (!sessionActive) {
        return null;
    }
    if (p.is_playing) {
        return { label: 'Playing', className: 'bg-orange-400/20 text-orange-200' };
    }
    if (reservedPlayerIds.has(p.id)) {
        return { label: 'Queueing', className: 'bg-[#c2c1ff]/20 text-[#c2c1ff]' };
    }
    if (p.is_waiting && !p.is_playing) {
        return { label: 'Waiting', className: 'bg-[#4ce081]/20 text-[#4ce081]' };
    }
    return { label: 'Waiting', className: 'bg-[#353438] text-[#918f9c]' };
}

/** @param {{ status: { label: string, className: string } | null }} props */
function PlayerStatusBadge({ status }) {
    if (!status) return null;
    return (
        <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide ${status.className}`}
        >
            {status.label}
        </span>
    );
}

/** @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} p */
function CreateMatchPlayerSessionStats({ p }) {
    const wins = p.wins_count ?? 0;
    const losses = p.losses_count ?? 0;
    const total = wins + losses;
    const earnedLabel = p.is_guest ? 'N/A' : String(p.session_points ?? 0);

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
            {/* <span className="inline-flex items-center gap-0.5" title="Matches played">
                <MaterialIcon name="sports_tennis" className="text-[14px]! text-[#c8c5d2]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{total}</span>
            </span> */}
            <span className="inline-flex items-center gap-0.5" title="Points earned">
                <MaterialIcon name="award_star" className="text-[14px]! text-[#c2c1ff]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{earnedLabel}</span>
            </span>
        </div>
    );
}

/** @param {unknown} lineup */
function lineupDisplayNamesByTeam(lineup) {
    const rows = Array.isArray(lineup) ? lineup : [];
    const label = (p) => p.name || p.guest_name || 'Player';
    const team1 = rows.filter((p) => p.team === 1).map(label);
    const team2 = rows.filter((p) => p.team === 2).map(label);
    if (team1.length === 0 && team2.length === 0 && rows.length === 2) {
        return { team1: [label(rows[0])], team2: [label(rows[1])] };
    }
    return { team1, team2 };
}

/** @param {string[]} names @param {string} multiSeparator */
function formatLineupSide(names, multiSeparator) {
    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    return names.join(multiSeparator);
}

/** @param {'finished' | 'ongoing' | 'queueing' | string | undefined} status @param {number | null | undefined} winningTeam @param {1 | 2} teamNo */
function lineupTeamSideClass(status, winningTeam, teamNo) {
    const base = 'text-sm font-semibold capitalize';
    if (status !== 'finished' || (winningTeam !== 1 && winningTeam !== 2)) {
        return `${base} text-[#918f9c]`;
    }
    if (winningTeam === teamNo) {
        return `${base} text-[#4ce081]`;
    }
    return `${base} text-red-400`;
}

/**
 * @param {1 | 2} teamNo
 * @param {1 | 2 | null} selectedWinningTeam
 */
function winnerPickerCardClass(teamNo, selectedWinningTeam) {
    const base = 'rounded-xl p-3 text-left transition-colors';
    if (selectedWinningTeam === null) {
        return `${base} border border-[#2a2a2d] bg-[#131316] hover:border-[#4ce081]/40`;
    }
    if (selectedWinningTeam === teamNo) {
        return `${base} border-2 border-[#4ce081] bg-[#4ce081]/15`;
    }
    return `${base} border-2 border-red-400/60 bg-red-400/10`;
}

/**
 * @param {1 | 2} teamNo
 * @param {1 | 2 | null} selectedWinningTeam
 */
function winnerPickerLabelClass(teamNo, selectedWinningTeam) {
    if (selectedWinningTeam === null) {
        return teamNo === 1 ? 'text-[#4ce081]' : 'text-[#c2c1ff]';
    }
    if (selectedWinningTeam === teamNo) {
        return 'text-[#4ce081]';
    }
    return 'text-red-400';
}

/** e.g. singles: "John VS Sam" · doubles: "John, Peter VS Jason & Sam" */
/** @param {{ lineup: unknown, status?: string, winningTeam?: number | null }} props */
function LineupDisplay({ lineup, status, winningTeam }) {
    const { team1, team2 } = lineupDisplayNamesByTeam(lineup);
    const left = formatLineupSide(team1, '/');
    const right = formatLineupSide(team2, '/');
    if (!left && !right) return '—';
    if (!left) return right ?? '—';
    if (!right) return left;
    return (
        <>
            <span className={lineupTeamSideClass(status, winningTeam, 1)}>{left}</span>
            {' '}
            <span className="text-[15px] text-[#e4e1e6] mx-1.5">VS</span>
            {' '}
            <span className={lineupTeamSideClass(status, winningTeam, 2)}>{right}</span>
        </>
    );
}

export function QueueingSessionMatchesPage() {
    const { id: idParam } = useParams();
    const navigate = useNavigate();
    const sessionId = idParam && /^\d+$/.test(idParam) ? Number.parseInt(idParam, 10) : null;
    const { user } = useAuth();
    const [session, setSession] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [finishOpen, setFinishOpen] = useState(false);
    const [t1, setT1] = useState('');
    const [t2, setT2] = useState('');
    /** @type {1 | 2 | null} */
    const [selectedWinningTeam, setSelectedWinningTeam] = useState(null);
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [selectedMatchNo, setSelectedMatchNo] = useState(null);
    const [finishTeams, setFinishTeams] = useState({ team1: [], team2: [] });
    const [matchLineupOpen, setMatchLineupOpen] = useState(false);
    /** @type {'create' | 'edit'} */
    const [matchLineupMode, setMatchLineupMode] = useState('create');
    const [editingMatchId, setEditingMatchId] = useState(null);
    const [editingMatchNo, setEditingMatchNo] = useState(null);
    const [matchLineupTeams, setMatchLineupTeams] = useState({ team1: [], team2: [] });
    const [matchLineupSearch, setMatchLineupSearch] = useState('');
    const [stopSessionOpen, setStopSessionOpen] = useState(false);
    const [autoMatchOpen, setAutoMatchOpen] = useState(false);
    /** @type {null | { id: number, matchNo: number | null, status: string }} */
    const [removeMatchConfirm, setRemoveMatchConfirm] = useState(null);

    const reload = useCallback(async () => {
        if (sessionId == null) return;
        const [sessionData, matchRows] = await Promise.all([
            fetchGameSession(String(sessionId)),
            fetchQueueingSessionMatches(sessionId),
        ]);
        setSession(sessionData);
        setMatches(matchRows);
    }, [sessionId]);

    useEffect(() => {
        if (sessionId == null) {
            setError('Invalid session.');
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const [sessionData, matchRows] = await Promise.all([fetchGameSession(String(sessionId)), fetchQueueingSessionMatches(sessionId)]);
                if (!cancelled) {
                    setSession(sessionData);
                    setMatches(matchRows);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Could not load session matches.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    async function onEndMatch() {
        if (sessionId == null) return;
        const skipScores = Boolean(session?.skip_scores);

        if (skipScores) {
            if (selectedWinningTeam !== 1 && selectedWinningTeam !== 2) {
                setActionError('Select the winning team.');
                return;
            }
        } else {
            const a = Number.parseInt(t1, 10);
            const b = Number.parseInt(t2, 10);
            if (!Number.isFinite(a) || !Number.isFinite(b)) {
                setActionError('Enter both final scores.');
                return;
            }
        }

        setActionError('');
        setBusy(true);
        try {
            if (skipScores) {
                await postFinishGameSessionMatch(sessionId, {
                    winning_team: selectedWinningTeam,
                    queueingSessionMatchId: selectedMatchId ?? undefined,
                });
            } else {
                await postFinishGameSessionMatch(sessionId, {
                    team1_score: Number.parseInt(t1, 10),
                    team2_score: Number.parseInt(t2, 10),
                    queueingSessionMatchId: selectedMatchId ?? undefined,
                });
            }
            await reload();
            setFinishOpen(false);
            setSelectedMatchId(null);
            setSelectedMatchNo(null);
            setFinishTeams({ team1: [], team2: [] });
            setT1('');
            setT2('');
            setSelectedWinningTeam(null);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not end match.');
        } finally {
            setBusy(false);
        }
    }

    const reservedPlayerIds = useMemo(() => {
        const ids = new Set();
        for (const row of matches) {
            if (row.status !== 'queueing') continue;
            if (matchLineupMode === 'edit' && editingMatchId != null && row.id === editingMatchId) continue;
            for (const pid of lineupPlayerIds(row.lineup)) {
                ids.add(pid);
            }
        }
        return ids;
    }, [matches, matchLineupMode, editingMatchId]);

    /** In queue (waiting), not on court, and not reserved in a queued match. */
    const assignableSessionPlayers = useMemo(() => {
        const rows = Array.isArray(session?.players) ? session.players : [];
        return rows.filter((p) => p.is_waiting && !p.is_playing && !reservedPlayerIds.has(p.id));
    }, [session?.players, reservedPlayerIds]);

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

    const matchLineupMaxPerTeam = session?.match_type === 'doubles' ? 2 : 1;

    const matchLineupValid = useMemo(() => {
        const { team1, team2 } = matchLineupTeams;
        const max = matchLineupMaxPerTeam;
        if (team1.length !== max || team2.length !== max) return false;
        const all = [...team1, ...team2];
        return new Set(all).size === all.length;
    }, [matchLineupTeams, matchLineupMaxPerTeam]);

    function closeMatchLineupModal() {
        setMatchLineupOpen(false);
        setMatchLineupMode('create');
        setEditingMatchId(null);
        setEditingMatchNo(null);
        setMatchLineupTeams({ team1: [], team2: [] });
        setMatchLineupSearch('');
    }

    function openCreateMatchModal() {
        setActionError('');
        setMatchLineupMode('create');
        setEditingMatchId(null);
        setEditingMatchNo(null);
        setMatchLineupTeams({ team1: [], team2: [] });
        setMatchLineupSearch('');
        setMatchLineupOpen(true);
    }

    /**
     * @param {{ id?: number, match_no?: number, lineup?: unknown }} row
     */
    function openEditMatchModal(row) {
        setActionError('');
        setMatchLineupMode('edit');
        setEditingMatchId(row.id ?? null);
        setEditingMatchNo(row.match_no ?? null);
        setMatchLineupTeams(lineupToTeams(row.lineup));
        setMatchLineupSearch('');
        setMatchLineupOpen(true);
    }

    /**
     * @param {1 | 2} team
     * @param {number} playerId
     */
    function addPlayerToMatchLineupTeam(team, playerId) {
        setMatchLineupTeams((prev) => {
            const max = session?.match_type === 'doubles' ? 2 : 1;
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
        if (session == null || !matchLineupValid) return null;
        const { team1, team2 } = matchLineupTeams;
        if (session.match_type === 'doubles') {
            return [...team1.map((id) => ({ id, team: 1 })), ...team2.map((id) => ({ id, team: 2 }))];
        }
        return [{ id: team1[0] }, { id: team2[0] }];
    }

    async function onSaveMatchLineup() {
        if (sessionId == null || session == null) return;
        const lineup = buildMatchLineupPayload();
        if (!lineup) {
            setActionError(
                session.match_type === 'doubles'
                    ? 'Assign two players to Team 1 and two to Team 2.'
                    : 'Assign one player to Team 1 and one to Team 2.',
            );
            return;
        }
        setActionError('');
        setBusy(true);
        try {
            if (matchLineupMode === 'edit' && editingMatchId != null) {
                await patchUpdateQueueingSessionMatch(sessionId, editingMatchId, { lineup });
            } else {
                await postCreateQueueingSessionMatch(sessionId, { lineup });
            }
            await reload();
            closeMatchLineupModal();
        } catch (e) {
            setActionError(
                e instanceof Error
                    ? e.message
                    : matchLineupMode === 'edit'
                      ? 'Could not update match.'
                      : 'Could not create match.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function onStartQueuedMatch(matchId) {
        if (sessionId == null) return;
        setActionError('');
        setBusy(true);
        try {
            await postStartQueueingSessionMatch(sessionId, matchId);
            await reload();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not start match.');
        } finally {
            setBusy(false);
        }
    }

    /**
     * @param {{ id?: number, match_no?: number | null, status?: string }} row
     */
    function openRemoveMatchConfirm(row) {
        setActionError('');
        setRemoveMatchConfirm({
            id: row.id ?? 0,
            matchNo: row.match_no ?? null,
            status: row.status ?? 'queueing',
        });
    }

    async function confirmRemoveMatch() {
        if (sessionId == null || removeMatchConfirm == null) return;
        const { id: matchId, status } = removeMatchConfirm;
        setActionError('');
        setBusy(true);
        try {
            await deleteQueueingSessionMatch(sessionId, matchId);
            await reload();
            setRemoveMatchConfirm(null);
            if (matchLineupOpen && editingMatchId === matchId) {
                closeMatchLineupModal();
            }
        } catch (e) {
            setActionError(
                e instanceof Error
                    ? e.message
                    : status === 'ongoing'
                      ? 'Could not cancel match.'
                      : 'Could not remove match.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function onStopQueueSession() {
        if (sessionId == null) return;
        setActionError('');
        setBusy(true);
        try {
            await postEndQueueingSession(sessionId);
            setStopSessionOpen(false);
            navigate(`/queueing-session/${sessionId}`);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not stop session.');
        } finally {
            setBusy(false);
        }
    }

    const grouped = useMemo(() => {
        const base = { queueing: [], ongoing: [], finished: [] };
        for (const row of matches) {
            if (row.status === 'queueing' || row.status === 'ongoing' || row.status === 'finished') {
                base[row.status].push(row);
            } else {
                base.queueing.push(row);
            }
        }
        return base;
    }, [matches]);

    const canManageMatches = Boolean(session?.is_host) && Boolean(session?.is_active);
    const canStopSession = Boolean(session?.is_host) && Boolean(session?.is_active);
    const canEndMatch = canManageMatches && session?.status === 'ongoing';
    const hasOngoingMatch = session?.status === 'ongoing';

    const queueSessionLabel =
        session?.queue_name?.trim() ||
        (session?.sport?.name ? `${session.sport.name} queue` : 'this queue session');

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36">
                {loading ? <div className="h-36 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
                {actionError ? <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{actionError}</p> : null}

                {session ? (
                    <QueueingSessionHeader
                        session={session}
                        canStopSession={canStopSession}
                        endSessionBusy={busy}
                        onEndSessionClick={() => {
                            setActionError('');
                            setStopSessionOpen(true);
                        }}
                    />
                ) : null}

                {!loading && !error ? (
                    <div className="space-y-5">
                        {(['ongoing', 'queueing', 'finished']).map((status) => (
                            <section key={status} className={`${!session?.is_active && status !== 'finished' ? 'hidden' : ''}`}>
                                <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tighter md:text-6xl">
                                    {sectionTitle(status)} <span className="text-[#c2c1ff]">Matches</span>
                                </h1>
                                    {(grouped[status] ?? []).length === 0 ? (
                                        <p className="text-sm text-[#918f9c] min-h-18 flex items-center justify-center border border-[#45454a] bg-[#1b1b1e] italic rounded-xl">No {sectionTitle(status).toLowerCase()} matches.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {(grouped[status] ?? []).map((row) => (
                                                <li key={row.id} className="rounded-xl border border-[#45454a] bg-[#1b1b1e] p-4">
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <p className="font-semibold">Match #{row.match_no}</p>
                                                        <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClass(row.status)}`}>
                                                            {row.status}
                                                        </span>
                                                    </div>
                                                    <p className="flex flex-col text-xs text-[#918f9c]">
                                                        <span>
                                                            <span className="font-bold">Started:</span>
                                                            <span className="font-normal"> {formatTime(row.started_at)}</span>
                                                        </span>
                                                        <span>
                                                            <span className="font-bold">Finished:</span>
                                                            <span className="font-normal"> {formatTime(row.finished_at)}</span>
                                                        </span>
                                                    </p>
                                                    <p
                                                        className={`mt-1 text-sm text-[#c8c5d2] ${
                                                            row.winning_team == null &&
                                                            (row.team1_score == null || row.team2_score == null)
                                                                ? 'hidden'
                                                                : ''
                                                        }`}
                                                    >
                                                        {row.team1_score != null && row.team2_score != null ? (
                                                            <>
                                                                Score: {row.team1_score} - {row.team2_score}
                                                                {row.winning_team ? ` · Winner: Team ${row.winning_team}` : ''}
                                                            </>
                                                        ) : row.winning_team ? (
                                                            <>Winner: Team {row.winning_team}</>
                                                        ) : null}
                                                    </p>
                                                    <p className="mt-2 mb-4 text-xs text-[#c8c5d2] line-clamp-1">
                                                        <LineupDisplay
                                                            lineup={row.lineup}
                                                            status={row.status}
                                                            winningTeam={row.winning_team}
                                                        />
                                                    </p>
                                                    {canManageMatches && row.status === 'queueing' ? (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => onStartQueuedMatch(row.id)}
                                                                className="rounded-full bg-[#A2A2D4] px-3 py-2 text-xs font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Start Match
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => openEditMatchModal(row)}
                                                                className="rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 px-3 py-2 text-xs font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Edit Match
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => openRemoveMatchConfirm(row)}
                                                                className="rounded-full border border-red-400/30 bg-red-400/20 px-3 py-2 text-xs font-bold text-red-400/80 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Remove Match
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    {canManageMatches && row.status === 'ongoing' ? (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {canEndMatch ? (
                                                                <button
                                                                    type="button"
                                                                    disabled={busy}
                                                                    onClick={() => {
                                                                        setSelectedMatchId(row.id ?? null);
                                                                        setSelectedMatchNo(row.match_no ?? null);
                                                                        setFinishTeams(lineupDisplayNamesByTeam(row.lineup));
                                                                        setT1('');
                                                                        setT2('');
                                                                        setSelectedWinningTeam(null);
                                                                        setFinishOpen(true);
                                                                    }}
                                                                    className="rounded-full bg-[#e4b555] px-3 py-2 text-xs font-bold text-[#714e07] disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    End Match
                                                                </button>
                                                            ) : null}
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => openRemoveMatchConfirm(row)}
                                                                className="rounded-full border border-red-400/30 bg-red-400/20 px-3 py-2 text-xs font-bold text-red-400/80 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Cancel Match
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                            </section>
                        ))}
                    </div>
                ) : null}
            </main>

            {canManageMatches ? (
                <>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                            setActionError('');
                            setAutoMatchOpen(true);
                        }}
                        className="fixed bottom-40 right-3 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[#4ce081]/50 bg-[#4ce081]/30 text-[#4ce081] shadow-lg transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:bottom-28 md:right-8"
                        aria-label="Auto-generate matches"
                        title="Auto-generate matches"
                    >
                        <MaterialIcon name="auto_awesome" className="text-xl!" />
                        <span className="absolute -bottom-3 -right-1 flex h-6 w-6 items-center text-[10px] justify-center rounded-full border-2 border-[#131316] bg-[#4ce081] text-[#131316] shadow-md">
                            Ai
                        </span>
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => openCreateMatchModal()}
                        className="rt-kinetic-gradient border border-[#c2c1ff] fixed bottom-24 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:bottom-8 md:right-8"
                        aria-label="Create match"
                        title="Create match"
                    >
                        <img src="/images/rt-logo.png" alt="" className="h-5 w-5" aria-hidden />
                        <span className="absolute -bottom-3 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#131316] bg-[#c2c1ff] text-[#131316] shadow-md">
                            <MaterialIcon name="add" className="text-base! font-bold" />
                        </span>
                    </button>
                </>
            ) : null}

            <AutoMatchProposalsModal
                open={autoMatchOpen && canManageMatches}
                sessionId={sessionId}
                onClose={() => setAutoMatchOpen(false)}
                onApproved={() => reload()}
            />

            {matchLineupOpen && session ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center pt-10 sm:items-center">
                    <div className="rt-end-match-modal-sheet flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl">
                        <div className="border-b border-[#2a2a2d] p-5 pb-4">
                            <h3 className="text-lg font-bold">
                                {matchLineupMode === 'edit'
                                    ? `Edit Match${editingMatchNo != null ? ` #${editingMatchNo}` : ''}`
                                    : 'Create Match'}
                            </h3>
                            <p className="mt-1 text-xs text-[#918f9c]">
                                {matchLineupMode === 'edit'
                                    ? 'Update players on Team 1 or Team 2 for this queued match.'
                                    : 'Search players who are in the queue and not on court, assign them to Team 1 or Team 2, then add the match to the queue.'}{' '}
                                <br />
                                <br />
                                <span className="text-md capitalize">{session.match_type}</span>: {matchLineupMaxPerTeam} player(s) per team.
                            </p>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                            <div className="space-y-5">
                                <div>
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
                                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[#2a2a2d] bg-[#131316]">
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
                                                                <p className="truncate text-sm font-medium text-[#e4e1e6]">{rosterPlayerLabel(p)}</p>
                                                                {p.user?.email ? (
                                                                    <p className="truncate text-xs text-[#918f9c]">{p.user.email}</p>
                                                                ) : null}
                                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                    <CreateMatchPlayerSessionStats p={p} />
                                                                    <PlayerStatusBadge status={rosterStatus} />
                                                                </div>
                                                            </div>
                                                            <div className="flex shrink-0 gap-2 pt-0.5">
                                                                <button
                                                                    type="button"
                                                                    disabled={busy || t1Full}
                                                                    onClick={() => addPlayerToMatchLineupTeam(1, p.id)}
                                                                    className="rounded-lg border border-[#4ce081]/50 px-3 py-1.5 text-xs font-bold text-[#4ce081] disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    Team 1
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={busy || t2Full}
                                                                    onClick={() => addPlayerToMatchLineupTeam(2, p.id)}
                                                                    className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-bold text-[#e4e1e6] disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    Team 2
                                                                </button>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#918f9c]">Teams</p>
                                    <div className="grid grid-cols-2 gap-3">
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
                                onClick={() => closeMatchLineupModal()}
                                className="flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={busy || !matchLineupValid}
                                onClick={() => onSaveMatchLineup()}
                                className="flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {matchLineupMode === 'edit' ? 'Save changes' : 'Create Match'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {finishOpen ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center sm:items-center">
                    <div className="rt-end-match-modal-sheet w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl">
                        <h3 className="mb-4 text-lg font-bold">
                            End Match{selectedMatchNo != null ? ` #${selectedMatchNo}` : ''}
                            {session?.skip_scores ? ': Pick Winner' : ': Final Score'}
                        </h3>
                        {session?.skip_scores ? (
                            <div className="mb-4 space-y-3">
                                <p className="text-xs text-[#918f9c]">Select which team won this match.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => setSelectedWinningTeam(1)}
                                        className={winnerPickerCardClass(1, selectedWinningTeam)}
                                    >
                                        <p className={`text-xs font-bold uppercase ${winnerPickerLabelClass(1, selectedWinningTeam)}`}>
                                            Team 1
                                            {selectedWinningTeam === 1 ? ' · Winner' : selectedWinningTeam === 2 ? ' · Loser' : ''}
                                        </p>
                                        <p
                                            className={`mt-1 text-sm capitalize ${
                                                selectedWinningTeam === 2 ? 'text-red-300/90' : 'text-[#e4e1e6]'
                                            }`}
                                        >
                                            {finishTeams.team1.length > 0 ? finishTeams.team1.join(', ') : '—'}
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => setSelectedWinningTeam(2)}
                                        className={winnerPickerCardClass(2, selectedWinningTeam)}
                                    >
                                        <p className={`text-xs font-bold uppercase ${winnerPickerLabelClass(2, selectedWinningTeam)}`}>
                                            Team 2
                                            {selectedWinningTeam === 2 ? ' · Winner' : selectedWinningTeam === 1 ? ' · Loser' : ''}
                                        </p>
                                        <p
                                            className={`mt-1 text-sm capitalize ${
                                                selectedWinningTeam === 1 ? 'text-red-300/90' : 'text-[#e4e1e6]'
                                            }`}
                                        >
                                            {finishTeams.team2.length > 0 ? finishTeams.team2.join(', ') : '—'}
                                        </p>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs text-[#918f9c]">Team 1</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={t1}
                                        onChange={(e) => setT1(e.target.value)}
                                        placeholder="Team 1 Score"
                                        className="w-full rounded-lg border border-white/50 px-3 py-2 text-white/50 outline-none focus:border-white/70"
                                    />
                                    <div className="mt-2 text-xs line-clamp-1 leading-snug text-[#918f9c] capitalize">
                                        <span className="font-bold">Players:</span>
                                        <span className="font-normal capitalize"> {finishTeams.team1.length > 0 ? finishTeams.team1.join(', ') : '—'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-[#918f9c]">Team 2</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={t2}
                                        onChange={(e) => setT2(e.target.value)}
                                        placeholder="Team 2 Score"
                                        className="w-full rounded-lg border border-white/50 px-3 py-2 text-white/50 outline-none focus:border-white/70"
                                    />
                                    <div className="mt-2 text-xs leading-snug text-[#918f9c]">
                                        <span className="font-bold">Players:</span>
                                        <span className="font-normal capitalize"> {finishTeams.team2.length > 0 ? finishTeams.team2.join(', ') : '—'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setFinishOpen(false);
                                    setSelectedMatchId(null);
                                    setSelectedMatchNo(null);
                                    setFinishTeams({ team1: [], team2: [] });
                                    setSelectedWinningTeam(null);
                                }}
                                className="flex-1 rounded-lg border border-white/50 py-2 text-sm font-bold text-white/50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onEndMatch()}
                                className="flex-1 rounded-lg bg-[#4ce081] py-2 text-sm font-bold text-[#003919]"
                            >
                                {session?.skip_scores ? 'Confirm Winner' : 'Save Score'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <ConfirmActionModal
                open={removeMatchConfirm != null}
                title={
                    removeMatchConfirm?.status === 'ongoing'
                        ? `Cancel match${removeMatchConfirm.matchNo != null ? ` #${removeMatchConfirm.matchNo}` : ''}?`
                        : `Remove match${removeMatchConfirm?.matchNo != null ? ` #${removeMatchConfirm.matchNo}` : ''}?`
                }
                description={
                    removeMatchConfirm?.status === 'ongoing'
                        ? 'Players will return to the queue. No score will be recorded and this match will be deleted.'
                        : 'This queued match will be removed. Assigned players will be available for other matches again.'
                }
                busy={busy}
                confirmLabel={removeMatchConfirm?.status === 'ongoing' ? 'Cancel match' : 'Remove match'}
                confirmBusyLabel={removeMatchConfirm?.status === 'ongoing' ? 'Canceling…' : 'Removing…'}
                onCancel={() => setRemoveMatchConfirm(null)}
                onConfirm={() => confirmRemoveMatch()}
            />

            <ConfirmActionModal
                open={stopSessionOpen}
                title="Stop queue session?"
                description={`This permanently ends ${queueSessionLabel} for all players. No new matches can be started and the session will show as finished.`}
                busy={busy}
                confirmDisabled={hasOngoingMatch}
                confirmLabel="Stop session"
                confirmBusyLabel="Stopping…"
                onCancel={() => setStopSessionOpen(false)}
                onConfirm={() => onStopQueueSession()}
            >
                {hasOngoingMatch ? (
                    <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                        Finish or cancel the ongoing match before stopping the session.
                    </p>
                ) : null}
            </ConfirmActionModal>
            <DashboardMobileNav />
        </div>
    );
}
