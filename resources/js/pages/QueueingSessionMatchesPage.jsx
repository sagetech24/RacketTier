import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchGameSession, postFinishGameSessionMatch } from '../api/gameSession.js';
import {
    deleteQueueingSessionMatch,
    fetchQueueingSessionMatches,
    postCreateQueueingSessionMatch,
    postEndQueueingSession,
    postStartQueueingSessionMatch,
} from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizedAppPath, queueingSessionNavPaths, queueingSessionTabClass } from '../lib/queueingSessionNav.js';

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

/** @param {{ user?: { name?: string } | null, guest_name?: string | null } | null | undefined} p */
function rosterPlayerLabel(p) {
    if (!p) return 'Player';
    const n = (p.user?.name ?? p.guest_name ?? '').trim();
    return n || 'Player';
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
    const location = useLocation();
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
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [selectedMatchNo, setSelectedMatchNo] = useState(null);
    const [finishTeams, setFinishTeams] = useState({ team1: [], team2: [] });
    const [createMatchOpen, setCreateMatchOpen] = useState(false);
    const [createMatchTeams, setCreateMatchTeams] = useState({ team1: [], team2: [] });
    const [createMatchSearch, setCreateMatchSearch] = useState('');
    const [stopSessionOpen, setStopSessionOpen] = useState(false);

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
        const a = Number.parseInt(t1, 10);
        const b = Number.parseInt(t2, 10);
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
            setActionError('Enter both final scores.');
            return;
        }
        setActionError('');
        setBusy(true);
        try {
            await postFinishGameSessionMatch(sessionId, {
                team1_score: a,
                team2_score: b,
                queueingSessionMatchId: selectedMatchId ?? undefined,
            });
            await reload();
            setFinishOpen(false);
            setSelectedMatchId(null);
            setSelectedMatchNo(null);
            setFinishTeams({ team1: [], team2: [] });
            setT1('');
            setT2('');
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
            for (const pid of lineupPlayerIds(row.lineup)) {
                ids.add(pid);
            }
        }
        return ids;
    }, [matches]);

    /** In queue (waiting), not on court, and not reserved in a queued match. */
    const assignableSessionPlayers = useMemo(() => {
        const rows = Array.isArray(session?.players) ? session.players : [];
        return rows.filter((p) => p.is_waiting && !p.is_playing && !reservedPlayerIds.has(p.id));
    }, [session?.players, reservedPlayerIds]);

    const createMatchSearchResults = useMemo(() => {
        const assigned = new Set([...createMatchTeams.team1, ...createMatchTeams.team2]);
        const pool = assignableSessionPlayers.filter((p) => !assigned.has(p.id));
        const q = createMatchSearch.trim().toLowerCase();
        if (!q) return pool;
        return pool.filter((p) => {
            const label = rosterPlayerLabel(p).toLowerCase();
            const email = (p.user?.email ?? '').toLowerCase();
            return label.includes(q) || email.includes(q);
        });
    }, [assignableSessionPlayers, createMatchSearch, createMatchTeams.team1, createMatchTeams.team2]);

    const createMatchMaxPerTeam = session?.match_type === 'doubles' ? 2 : 1;

    const createMatchLineupValid = useMemo(() => {
        const { team1, team2 } = createMatchTeams;
        const max = createMatchMaxPerTeam;
        if (team1.length !== max || team2.length !== max) return false;
        const all = [...team1, ...team2];
        return new Set(all).size === all.length;
    }, [createMatchTeams, createMatchMaxPerTeam]);

    function openCreateMatchModal() {
        setActionError('');
        setCreateMatchTeams({ team1: [], team2: [] });
        setCreateMatchSearch('');
        setCreateMatchOpen(true);
    }

    function closeCreateMatchModal() {
        setCreateMatchOpen(false);
        setCreateMatchTeams({ team1: [], team2: [] });
        setCreateMatchSearch('');
    }

    /**
     * @param {1 | 2} team
     * @param {number} playerId
     */
    function addPlayerToCreateMatchTeam(team, playerId) {
        setCreateMatchTeams((prev) => {
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
    function removePlayerFromCreateMatchTeam(team, playerId) {
        setCreateMatchTeams((prev) => ({
            team1: team === 1 ? prev.team1.filter((id) => id !== playerId) : prev.team1,
            team2: team === 2 ? prev.team2.filter((id) => id !== playerId) : prev.team2,
        }));
    }

    async function onCreateMatch() {
        if (sessionId == null || session == null) return;
        if (!createMatchLineupValid) {
            setActionError(
                session.match_type === 'doubles'
                    ? 'Assign two players to Team 1 and two to Team 2.'
                    : 'Assign one player to Team 1 and one to Team 2.',
            );
            return;
        }
        const { team1, team2 } = createMatchTeams;
        /** @type {{ id: number, team?: number }[]} */
        let lineup;
        if (session.match_type === 'doubles') {
            lineup = [...team1.map((id) => ({ id, team: 1 })), ...team2.map((id) => ({ id, team: 2 }))];
        } else {
            lineup = [{ id: team1[0] }, { id: team2[0] }];
        }
        setActionError('');
        setBusy(true);
        try {
            await postCreateQueueingSessionMatch(sessionId, { lineup });
            await reload();
            closeCreateMatchModal();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not create match.');
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

    async function onDeleteQueuedMatch(matchId) {
        if (sessionId == null) return;
        setActionError('');
        setBusy(true);
        try {
            await deleteQueueingSessionMatch(sessionId, matchId);
            await reload();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not delete match.');
        } finally {
            setBusy(false);
        }
    }

    async function onStopQueueSession() {
        if (sessionId == null) return;
        const queueLabel =
            session?.queue_name?.trim() ||
            (session?.sport?.name ? `${session.sport.name} queue` : 'this queue session');

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

    const navPath = normalizedAppPath(location.pathname);
    const queueingNav = session != null ? queueingSessionNavPaths(session.id) : { dash: '', players: '', matches: '' };

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-28">
                {loading ? <div className="h-36 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
                {actionError ? <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{actionError}</p> : null}

                {session ? (
                    <article className="mb-8">
                        <div className="flex items-start gap-2 mb-2">
                            <SportIcon icon={session.sport?.icon} className="text-[#4ce081]" />
                            <h1 className="mb-4 text-3xl font-extrabold leading-none tracking-tighter md:text-3xl">
                                {session.queue_name?.trim() ? (
                                    session.queue_name.trim()
                                ) : (
                                    <>
                                        {session.sport?.name}{' '}
                                        <span className="text-[#c2c1ff]">Queue</span>
                                    </>
                                )}
                            </h1>
                        </div>
                        <p className="text-sm text-[#c8c5d2]/90 capitalize">
                            Game Type: {session.match_type}
                        </p>
                        <p className="text-sm text-[#c8c5d2]/90 capitalize">
                            Queue Master: {session.created_by?.name ?? 'Unknown'}
                        </p>
                        {session.win_points != null || session.loss_points != null ? (
                            <p className="text-sm text-[#c8c5d2]/90">
                                Points: +{session.win_points ?? 0} win / +{session.loss_points ?? 0} loss
                            </p>
                        ) : null}
                        <p className="mt-1 text-xs text-[#918f9c]">
                            Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}<br />
                            Ended: {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}<br />
                            Total Players: {session.participant_count ?? 0}<br />
                            Matches Played: {session.completed_matches_count ?? 0}
                        </p>
                    
                        <div className="mt-3 mb-6 flex justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Link to={queueingNav.dash} className={`${queueingSessionTabClass(navPath === queueingNav.dash)} text-white/70 border-white/70`}>
                                    Dashboard
                                </Link>
                                <Link to={queueingNav.players} className={`${queueingSessionTabClass(navPath === queueingNav.players)} text-white/70 border-white/70`}>
                                    Players
                                </Link>
                                <Link to={queueingNav.matches} className={`${queueingSessionTabClass(navPath === queueingNav.matches)} text-white/70 border-white/70`}>
                                    Matches
                                </Link>
                            </div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span
                                    className={
                                        session.is_active
                                            ? 'capitalize rounded-full bg-[#4ce081]/20 px-2 py-0.5 text-xs font-bold text-[#4ce081]'
                                            : 'capitalize rounded-full bg-[#353438] px-2 py-0.5 text-xs font-bold text-[#c8c5d2]'
                                    }
                                >
                                                                                {session.is_active ? session.status : <span className="text-[#1f753d] bg-[#4ce081] px-2 py-1 rounded-full text-sm font-bold">finished</span>}
                                </span>
                            </div>
                        </div>
                        {canStopSession ? (
                            <div className="mt-2">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        setActionError('');
                                        setStopSessionOpen(true);
                                    }}
                                    className="w-full rounded-xl border-2 border-red-400/50 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300 transition-transform enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Stop Queue Session
                                </button>
                                <p className="mt-2 text-center text-xs text-[#918f9c]">
                                    Ends the queue for everyone. Only you (QM) can do this.
                                </p>
                            </div>
                        ) : null}
                    </article>    
                ) : null}

                {!loading && !error ? (
                    <div className="space-y-5">
                        {(['ongoing', 'queueing', 'finished']).map((status) => (
                            <section key={status} className={`${status !== 'finished' ? 'hidden' : ''}`}>
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
                                                    <p className={`mt-1 text-sm text-[#c8c5d2] ${(row.team1_score == null || row.team2_score == null) ? 'hidden' : ''}`}>
                                                        Score: {row.team1_score == null ? '—' : row.team1_score} - {row.team2_score == null ? '—' : row.team2_score}
                                                        {row.winning_team ? ` · Winner: Team ${row.winning_team}` : ''}
                                                    </p>
                                                    <p className="mt-2 mb-4 text-xs text-[#c8c5d2] line-clamp-1">
                                                        <LineupDisplay
                                                            lineup={row.lineup}
                                                            status={row.status}
                                                            winningTeam={row.winning_team}
                                                        />
                                                    </p>
                                                    {canManageMatches && row.status === 'queueing' ? (
                                                        <div className="mt-3 flex gap-2">
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
                                                                onClick={() => onDeleteQueuedMatch(row.id)}
                                                                className="rounded-full border border-red-400/30 bg-red-400/20 px-3 py-2 text-xs font-bold text-red-400/80 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Delete Match
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    {canEndMatch && row.status === 'ongoing' ? (
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => {
                                                                setSelectedMatchId(row.id ?? null);
                                                                setSelectedMatchNo(row.match_no ?? null);
                                                                setFinishTeams(lineupDisplayNamesByTeam(row.lineup));
                                                                setT1('');
                                                                setT2('');
                                                                setFinishOpen(true);
                                                            }}
                                                            className="mt-3 rounded-full bg-[#e4b555] text-[#714e07] px-3 py-2 text-xs font-bold"
                                                        >
                                                            End Match
                                                        </button>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                            </section>
                        ))}
                        {canManageMatches ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => openCreateMatchModal()}
                                // className="w-full rounded-xl bg-[#4ce081] py-3 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-70"
                                className="rt-kinetic-gradient w-full shrink-0 rounded-xl px-12 py-5 text-xl font-black italic tracking-tight text-[#211e6a] shadow-2xl transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
                            >
                                Create Match
                            </button>


                            
                            
                        ) : null}
                    </div>
                ) : null}
            </main>

            {createMatchOpen && session ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center pt-10 sm:items-center">
                    <div className="rt-end-match-modal-sheet flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl">
                        <div className="border-b border-[#2a2a2d] p-5 pb-4">
                            <h3 className="text-lg font-bold">Create Match</h3>
                            <p className="mt-1 text-xs text-[#918f9c]">
                                Search players who are in the queue and not on court, assign them to Team 1 or Team 2, then add the match to the queue.{' '}
                                <br />
                                <br />
                                <span className="text-md capitalize">{session.match_type}</span>: {createMatchMaxPerTeam} player(s) per team.
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
                                        value={createMatchSearch}
                                        onChange={(e) => setCreateMatchSearch(e.target.value)}
                                        className="w-full rounded-xl border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-md text-[#e4e1e6] outline-none placeholder:text-[#918f9c] focus:border-[#4ce081]/50"
                                    />
                                    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[#2a2a2d] bg-[#131316]">
                                        {assignableSessionPlayers.length === 0 ? (
                                            <p className="px-3 py-3 text-xs text-[#918f9c]">
                                                No eligible players (must be waiting in queue and not in a match). Add players on the Players tab or wait until a match ends.
                                            </p>
                                        ) : createMatchSearchResults.length === 0 ? (
                                            <p className="px-3 py-3 text-xs text-[#918f9c]">
                                                {createMatchSearch.trim()
                                                    ? 'No matching players, or everyone matching is already on a team below.'
                                                    : 'Everyone eligible is already assigned — remove someone from a team to search again, or clear a slot with ×.'}
                                            </p>
                                        ) : (
                                            <ul className="divide-y divide-[#2a2a2d]">
                                                {createMatchSearchResults.map((p) => {
                                                    const t1Full = createMatchTeams.team1.length >= createMatchMaxPerTeam;
                                                    const t2Full = createMatchTeams.team2.length >= createMatchMaxPerTeam;
                                                    return (
                                                        <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-[#e4e1e6]">{rosterPlayerLabel(p)}</p>
                                                                {p.user?.email ? (
                                                                    <p className="truncate text-xs text-[#918f9c]">{p.user.email}</p>
                                                                ) : null}
                                                            </div>
                                                            <div className="flex shrink-0 gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={busy || t1Full}
                                                                    onClick={() => addPlayerToCreateMatchTeam(1, p.id)}
                                                                    className="rounded-lg border border-[#4ce081]/50 px-3 py-1.5 text-xs font-bold text-[#4ce081] disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    Team 1
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={busy || t2Full}
                                                                    onClick={() => addPlayerToCreateMatchTeam(2, p.id)}
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
                                                Team 1 ({createMatchTeams.team1.length}/{createMatchMaxPerTeam})
                                            </p>
                                            <div className="flex flex-1 flex-col gap-2">
                                                {createMatchTeams.team1.map((pid) => {
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
                                                                onClick={() => removePlayerFromCreateMatchTeam(1, pid)}
                                                                className="shrink-0 rounded px-1 text-[#e4e1e6]/70 hover:text-white"
                                                                aria-label={`Remove ${rosterPlayerLabel(p)} from team 1`}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {createMatchTeams.team1.length === 0 ? (
                                                    <p className="flex flex-1 items-center justify-center text-center text-[11px] leading-snug text-[#918f9c]">
                                                        Use Team 1 in search results
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex min-h-[140px] flex-col rounded-xl border border-white/15 bg-[#131316] p-3">
                                            <p className="mb-2 border-b border-white/10 pb-2 text-center text-xs font-bold uppercase tracking-wide text-[#c8c5d2]">
                                                Team 2 ({createMatchTeams.team2.length}/{createMatchMaxPerTeam})
                                            </p>
                                            <div className="flex flex-1 flex-col gap-2">
                                                {createMatchTeams.team2.map((pid) => {
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
                                                                onClick={() => removePlayerFromCreateMatchTeam(2, pid)}
                                                                className="shrink-0 rounded px-1 text-[#e4e1e6]/70 hover:text-white"
                                                                aria-label={`Remove ${rosterPlayerLabel(p)} from team 2`}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {createMatchTeams.team2.length === 0 ? (
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
                                onClick={() => closeCreateMatchModal()}
                                className="flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={busy || !createMatchLineupValid}
                                onClick={() => onCreateMatch()}
                                className="flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Create Match
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {finishOpen ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center sm:items-center">
                    <div className="rt-end-match-modal-sheet w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl">
                        <h3 className="mb-4 text-lg font-bold">
                            End Match{selectedMatchNo != null ? ` #${selectedMatchNo}` : ''}: Final score
                        </h3>
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
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setFinishOpen(false);
                                    setSelectedMatchId(null);
                                    setSelectedMatchNo(null);
                                    setFinishTeams({ team1: [], team2: [] });
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
                                Save score
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {stopSessionOpen ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center sm:items-center">
                    <div className="rt-end-match-modal-sheet w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl">
                        <h3 className="text-lg font-bold text-red-300">Stop queue session?</h3>
                        <p className="mt-2 text-sm text-[#918f9c]">
                            This permanently ends the queue for all players. No new matches can be started and the session
                            will show as finished.
                        </p>
                        {hasOngoingMatch ? (
                            <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                                Finish or end the ongoing match before stopping the session.
                            </p>
                        ) : null}
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setStopSessionOpen(false)}
                                className="flex-1 rounded-lg border border-white/50 py-2 text-sm font-bold text-white/70"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={busy || hasOngoingMatch}
                                onClick={() => onStopQueueSession()}
                                className="flex-1 rounded-lg bg-red-500/90 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busy ? 'Stopping…' : 'Stop Session'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <DashboardMobileNav />
        </div>
    );
}
