import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchGameSession, postFinishGameSessionMatch, postStartGameSessionMatch } from '../api/gameSession.js';
import { fetchQueueingSessionMatches } from '../api/queueingSession.js';
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
    if (status === 'finished') return 'bg-[#4ce081]/20 text-[#4ce081]';
    if (status === 'ongoing') return 'bg-orange-400/20 text-orange-200';
    return 'bg-[#353438] text-[#c8c5d2]';
}

export function QueueingSessionMatchesPage() {
    const { id: idParam } = useParams();
    const location = useLocation();
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
            setT1('');
            setT2('');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not end match.');
        } finally {
            setBusy(false);
        }
    }

    async function onCreateMatch() {
        if (sessionId == null) return;
        setActionError('');
        setBusy(true);
        try {
            await postStartGameSessionMatch(String(sessionId));
            await reload();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not create match.');
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

    const canEndMatch =
        Boolean(session?.is_host) &&
        Boolean(session?.is_active) &&
        session?.status === 'ongoing';
    const canCreateMatch =
        Boolean(session?.is_host) &&
        Boolean(session?.is_active);

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
                    <article>
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
                        <p className="mt-1 text-xs text-[#918f9c]">
                            Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}<br />
                            Ended: {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}<br />
                            Total Players: {session.participant_count ?? 0}
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
                                    {session.is_active ? session.status : 'finished'}
                                </span>
                            </div>
                        </div>
                    </article>    
                ) : null}

                {!loading && !error ? (
                    <div className="space-y-5">
                        {(['ongoing', 'queueing', 'finished']).map((status) => (
                            <section key={status} className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4">
                                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#918f9c]">
                                    {status} matches ({grouped[status]?.length ?? 0})
                                </h2>
                                {(grouped[status] ?? []).length === 0 ? (
                                    <p className="text-sm text-[#918f9c]">No {status} matches.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {(grouped[status] ?? []).map((row) => (
                                            <li key={row.id} className="rounded-lg border border-[#2a2a2d] px-3 py-3">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <p className="font-semibold">Match #{row.match_no}</p>
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusClass(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#918f9c]">
                                                    Started: {formatTime(row.started_at)} · Finished: {formatTime(row.finished_at)}
                                                </p>
                                                <p className="mt-1 text-sm text-[#c8c5d2]">
                                                    Score: {row.team1_score == null ? '—' : row.team1_score} - {row.team2_score == null ? '—' : row.team2_score}
                                                    {row.winning_team ? ` · Winner: Team ${row.winning_team}` : ''}
                                                </p>
                                                <div className="mt-2 text-xs text-[#918f9c]">
                                                    Lineup:{' '}
                                                    {(row.lineup ?? [])
                                                        .map((player) => `${player.name || player.guest_name || 'Player'}${player.team ? ` (T${player.team})` : ''}`)
                                                        .join(', ') || '—'}
                                                </div>
                                                {canEndMatch && row.status === 'ongoing' ? (
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => {
                                                            setSelectedMatchId(row.id ?? null);
                                                            setSelectedMatchNo(row.match_no ?? null);
                                                            setFinishOpen(true);
                                                        }}
                                                        className="mt-3 w-full rounded-xl border border-orange-400/50 py-2 text-xs font-bold text-orange-200"
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
                        {canCreateMatch ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onCreateMatch()}
                                className="w-full rounded-xl bg-[#4ce081] py-3 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                Create Match
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </main>

            {finishOpen ? (
                <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/60 p-4 sm:items-center">
                    <div className="w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl">
                        <h3 className="mb-4 text-lg font-bold">
                            End Match{selectedMatchNo != null ? ` #${selectedMatchNo}` : ''}: Final score
                        </h3>
                        <div className="mb-0 grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-[#918f9c]">Team 1</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={t1}
                                    onChange={(e) => setT1(e.target.value)}
                                    className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-[#918f9c]">Team 2</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={t2}
                                    onChange={(e) => setT2(e.target.value)}
                                    className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setFinishOpen(false);
                                    setSelectedMatchId(null);
                                    setSelectedMatchNo(null);
                                }}
                                className="flex-1 rounded-lg border border-[#2a2a2d] py-2 text-sm font-bold"
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
            <DashboardMobileNav />
        </div>
    );
}
