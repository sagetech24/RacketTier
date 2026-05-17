import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchFacilityPlayers, fetchGameSession } from '../api/gameSession.js';
import { deleteQueueingSessionPlayer, postAddQueueingSessionPlayer } from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizedAppPath, queueingSessionNavPaths, queueingSessionTabClass } from '../lib/queueingSessionNav.js';

function displayName(row) {
    if (row.is_guest) return row.guest_name || 'Guest';
    return row.user?.name || 'Player';
}

export function QueueingSessionPlayersPage() {
    const { id: idParam } = useParams();
    const location = useLocation();
    const sessionId = idParam && /^\d+$/.test(idParam) ? Number.parseInt(idParam, 10) : null;
    const { user } = useAuth();

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [playerSearch, setPlayerSearch] = useState('');
    const [searchRows, setSearchRows] = useState([]);
    const [guestName, setGuestName] = useState('');

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
                const data = await fetchGameSession(String(sessionId));
                if (!cancelled) setSession(data);
            } catch {
                if (!cancelled) setError('Could not load session.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    useEffect(() => {
        let cancelled = false;
        const t = window.setTimeout(() => {
            (async () => {
                try {
                    const rows = await fetchFacilityPlayers(playerSearch, {
                        includeMe: true,
                        sportId: session?.sport?.id,
                    });
                    if (!cancelled) setSearchRows(rows);
                } catch {
                    if (!cancelled) setSearchRows([]);
                }
            })();
        }, 200);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [playerSearch, session?.sport?.id]);

    const isHost = Boolean(session?.is_host);
    const canManagePlayers = isHost && session?.is_active && session?.status === 'queueing';

    const rosterUserIds = useMemo(() => {
        const ids = new Set();
        for (const p of session?.players ?? []) {
            if (p.user?.id) ids.add(p.user.id);
        }
        return ids;
    }, [session?.players]);

    const addablePlayers = useMemo(
        () => searchRows.filter((row) => !rosterUserIds.has(row.id)),
        [searchRows, rosterUserIds],
    );

    async function onAddMember(userId) {
        if (sessionId == null || !canManagePlayers) return;
        setActionError('');
        setBusy(true);
        try {
            const data = await postAddQueueingSessionPlayer(sessionId, { user_id: userId });
            setSession(data);
            setPlayerSearch('');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not add player.');
        } finally {
            setBusy(false);
        }
    }

    async function onAddGuest() {
        if (sessionId == null || !canManagePlayers || !guestName.trim()) return;
        setActionError('');
        setBusy(true);
        try {
            const data = await postAddQueueingSessionPlayer(sessionId, { guest_name: guestName.trim() });
            setSession(data);
            setGuestName('');
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not add guest.');
        } finally {
            setBusy(false);
        }
    }

    async function onRemove(playerRowId) {
        if (sessionId == null || !canManagePlayers) return;
        setActionError('');
        setBusy(true);
        try {
            const data = await deleteQueueingSessionPlayer(sessionId, playerRowId);
            setSession(data);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not remove player.');
        } finally {
            setBusy(false);
        }
    }

    const navPath = normalizedAppPath(location.pathname);
    const queueingNav = session != null ? queueingSessionNavPaths(session.id) : { dash: '', players: '', matches: '' };

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-28">
                {loading ? <div className="h-32 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

                {session ? (
                    <div className="space-y-4">
                        <section>
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
                                <div className="mt-3 flex justify-between">
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
                                {!canManagePlayers ? (
                                    <p className="mt-4 text-sm text-[#918f9c]">
                                        {isHost
                                            ? 'Player changes are locked once a match is ongoing or session is ended.'
                                            : 'View-only access. Only QM can manage this roster.'}
                                    </p>
                                ) : null}
                            </article>
                        </section>

                        {actionError ? (
                            <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{actionError}</p>
                        ) : null}

                        {canManagePlayers ? (
                            <section className="rounded-xl border border-[#3c3c3e] bg-[#1b1b1e] p-4">
                                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#918f9c]">Add players</h2>
                                <input
                                    value={playerSearch}
                                    onChange={(e) => setPlayerSearch(e.target.value)}
                                    placeholder="Search members…"
                                    className="mb-2 w-full rounded-lg border border-[#3c3c3e] bg-[#131316] p-3 text-md focus:ring-[#4ce081] focus:ring-1 outline-none"
                                />
                                <div className="max-h-44 space-y-1.5 overflow-y-auto">
                                    {addablePlayers.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            disabled={busy}
                                            onClick={() => onAddMember(r.id)}
                                            className="line-clamp-2 flex w-full items-center justify-between rounded-lg bg-white/10 border border-[#514c53] px-3 py-2 text-left text-md hover:border-[#4ce081]/50"
                                        >
                                            <span className="flex min-w-0 flex-1 items-center gap-2">
                                                <span className="truncate">{r.name}</span>
                                                {session?.sport?.id != null ? (
                                                    <span
                                                        className="shrink-0 rounded-full border border-[#514c53] bg-[#c2c1ff]/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#c8c5d2]"
                                                        title="Tier for this session’s sport (lifetime session points)"
                                                    >
                                                        {r.tier?.name ?? '—'}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="text-xs text-[#c2c1ff]/70">ADD</span>
                                        </button>
                                    ))}
                                </div>
                                <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-[#918f9c] text-center">or Add a Guest Player</h2>
                                <div className="mt-3 flex gap-2">
                                    <input
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        placeholder="Add Guest Player Name"
                                        className="min-w-0 flex-1 rounded-lg border border-[#3c3c3e] bg-[#131316] p-3 text-md focus:ring-[#4ce081] focus:ring-1 outline-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => onAddGuest()}
                                        className="rounded bg-[#3c3c3e] px-3 py-2 text-md font-bold"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>

                                    </button>
                                </div>
                            </section>
                        ) : null}

                        <section>
                            <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tighter md:text-6xl">
                                Current <span className="text-[#c2c1ff]">Players</span>
                            </h1>
                            <ul className="space-y-3">
                                {(session.players ?? []).map((p) => (
                                    <li key={p.id} className="flex items-center justify-between rounded-lg bg-[#2a2a2d] border border-[#2a2a2d] px-3 py-3 text-sm shadow-sm">
                                        <div>
                                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                <span className="font-semibold capitalize">{displayName(p)}</span>
                                                {p.is_guest ?
                                                    <span
                                                        className="shrink-0 rounded-full border border-[#514c53] bg-[#c2c1ff]/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#c8c5d2]"
                                                        title="Guest Player"
                                                    >Guest</span> : null}
                                                {!p.is_guest && session?.sport?.id != null ? (
                                                    <span
                                                        className="shrink-0 rounded-full border border-[#514c53] bg-[#c2c1ff]/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#c8c5d2]"
                                                        title="Tier for this session’s sport (lifetime session points)"
                                                    >
                                                        {p.tier?.name ?? '—'}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="text-xs text-[#918f9c]">
                                                {(p.session_points ?? 0) > 0
                                                    ? `Earned: ${p.session_points} points`
                                                    : null}
                                            </div>
                                        </div>
                                        {canManagePlayers && !p.is_playing ? (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => onRemove(p.id)}
                                                className="text-xs font-bold text-red-300 hover:text-red-200"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>
                ) : null}
            </main>
            <DashboardMobileNav />
        </div>
    );
}
