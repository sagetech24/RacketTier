import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchFacilityPlayers, fetchGameSession } from '../api/gameSession.js';
import { deleteQueueingSessionPlayer, postAddQueueingSessionPlayer } from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function displayName(row) {
    if (row.is_guest) return row.guest_name || 'Guest';
    return row.user?.name || 'Player';
}

export function QueueingSessionPlayersPage() {
    const { id: idParam } = useParams();
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
                    const rows = await fetchFacilityPlayers(playerSearch, { includeMe: true });
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
    }, [playerSearch]);

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

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-32 pt-24">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex gap-4">
                        <Link to={sessionId == null ? '/queueing-session' : `/queueing-session/${sessionId}`} className="text-sm text-[#918f9c] hover:text-[#4ce081]">
                            ← Queueing dashboard
                        </Link>
                        {sessionId != null ? (
                            <Link to={`/queueing-session/${sessionId}/matches`} className="text-sm text-[#918f9c] hover:text-[#4ce081]">
                                Matches
                            </Link>
                        ) : null}
                    </div>
                    <Link to="/queueing-session" className="text-sm text-[#918f9c] hover:text-[#4ce081]">
                        All sessions
                    </Link>
                </div>

                <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Queue players</h1>
                <p className="mb-5 text-sm text-[#c8c5d2]/80">
                    QM can add and remove players while session is queueing. Non-QM users are view-only.
                </p>

                {loading ? <div className="h-32 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

                {session ? (
                    <div className="space-y-4">
                        <section className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e]">
                            <article className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <h2 className="flex items-center gap-2 text-base font-bold">
                                        {/* <SportIcon icon={row.sport?.icon} className="text-[#4ce081]" /> */}
                                        {session.sport?.name} Queue
                                    </h2>
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
                                <p className="text-sm text-[#c8c5d2]/90 capitalize">
                                    {session.match_type} · Queue Master: {session.created_by?.name ?? 'Unknown'}
                                </p>
                                <p className="mt-1 text-xs text-[#918f9c]">
                                    Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}<br />
                                    Ended: {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}<br />
                                    Players: {session.participant_count ?? 0}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link
                                        to={`/queueing-session/${session.id}`}
                                        className="rounded-lg border border-[#818184] px-3 py-1.5 text-xs font-semibold hover:border-[#4ce081]/60"
                                    >
                                        Dashboard
                                    </Link>
                                    <Link
                                        to={`/queueing-session/${session.id}/players`}
                                        className="rounded-lg border border-[#818184] px-3 py-1.5 text-xs font-semibold hover:border-[#4ce081]/60"
                                    >
                                        Players
                                    </Link>
                                    <Link
                                        to={`/queueing-session/${session.id}/matches`}
                                        className="rounded-lg border border-[#818184] px-3 py-1.5 text-xs font-semibold hover:border-[#4ce081]/60"
                                    >
                                        Matches
                                    </Link>
                                </div>
                            </article>

                            {!canManagePlayers ? (
                                <p className="mt-2 text-xs text-[#918f9c]">
                                    {isHost
                                        ? 'Player changes are locked once a match is ongoing or session is ended.'
                                        : 'View-only access. Only QM can manage this roster.'}
                                </p>
                            ) : null}
                        </section>

                        {actionError ? (
                            <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{actionError}</p>
                        ) : null}

                        {canManagePlayers ? (
                            <section className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4">
                                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#918f9c]">Add players</h2>
                                <input
                                    value={playerSearch}
                                    onChange={(e) => setPlayerSearch(e.target.value)}
                                    placeholder="Search members…"
                                    className="mb-2 w-full rounded-lg border border-[#2a2a2d] bg-[#131316] p-4 text-sm"
                                />
                                <div className="max-h-44 space-y-1 overflow-y-auto">
                                    {addablePlayers.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            disabled={busy}
                                            onClick={() => onAddMember(r.id)}
                                            className="flex w-full items-center justify-between rounded-lg border border-[#2a2a2d] px-3 py-2 text-left text-sm hover:border-[#4ce081]/50"
                                        >
                                            <span>{r.name}</span>
                                            <span className="text-xs text-[#918f9c]">Add</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <input
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        placeholder="Add Guest Player Name"
                                        className="min-w-0 flex-1 rounded-lg border border-[#2a2a2d] bg-[#131316] p-3 text-sm"
                                    />
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => onAddGuest()}
                                        className="rounded-lg bg-[#353438] px-4 py-2 text-sm font-bold"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>

                                    </button>
                                </div>
                            </section>
                        ) : null}

                        <section className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4">
                            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#918f9c]">Current Players</h2>
                            <ul className="space-y-2">
                                {(session.players ?? []).map((p) => (
                                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-[#2a2a2d] px-3 py-2 text-sm">
                                        <div>
                                            <span className="font-semibold capitalize">{displayName(p)}</span>
                                            {p.is_guest ? <span className="ml-2 text-xs text-[#918f9c]">(Guest)</span> : null}
                                            <div className="text-xs text-[#918f9c]">
                                                {/* show the points earned by the player */}
                                                {p.session_points ? `Earned: ${p.session_points} points` : null}
                                                {/* {p.is_playing ? 'Playing' : p.is_waiting ? `Queue #${p.queue_position}` : 'Idle'} */}
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
