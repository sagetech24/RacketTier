import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchFacilityPlayers, fetchGameSession } from '../api/gameSession.js';
import {
    deleteQueueingSessionPlayer,
    fetchQueueingSessionMatches,
    postAddQueueingSessionPlayer,
} from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROSTER_PAGE_SIZE = 10;

function displayName(row) {
    if (row.is_guest) return row.guest_name || 'Guest';
    return row.user?.name || 'Player';
}

/** @param {unknown} lineup */
function lineupPlayerIds(lineup) {
    const rows = Array.isArray(lineup) ? lineup : [];
    return rows
        .map((p) => Number(p.game_session_player_id ?? p.id ?? 0))
        .filter((id) => id > 0);
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
            className={`shrink-0 self-center rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide ${status.className}`}
        >
            {status.label}
        </span>
    );
}

/** @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} p */
function PlayerSessionStats({ p }) {
    const wins = p.wins_count ?? 0;
    const losses = p.losses_count ?? 0;
    const total = wins + losses;
    const earnedLabel = p.is_guest ? 'N/A' : String(p.session_points ?? 0);

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#918f9c]">
            <span className="inline-flex items-center gap-0.5">
                <MaterialIcon name="arrow_upward" className="text-[15px]! text-[#4ce081]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{wins}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
                <MaterialIcon name="arrow_downward" className="text-[15px]! text-red-300/90" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{losses}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
                <MaterialIcon name="award_star" className="text-[15px]! text-[#c2c1ff]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{earnedLabel}</span>
            </span>
        </div>
    );
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
    const [matches, setMatches] = useState(/** @type {Array<{ status?: string, lineup?: unknown }>} */ ([]));
    const [visibleRosterCount, setVisibleRosterCount] = useState(ROSTER_PAGE_SIZE);
    const [loadingMoreRoster, setLoadingMoreRoster] = useState(false);

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
                const [data, matchRows] = await Promise.all([
                    fetchGameSession(String(sessionId)),
                    fetchQueueingSessionMatches(sessionId).catch(() => []),
                ]);
                if (!cancelled) {
                    setSession(data);
                    setMatches(matchRows);
                }
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
    const canManagePlayers = isHost && Boolean(session?.is_active);

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

    const rosterPlayers = useMemo(() => session?.players ?? [], [session?.players]);
    const visibleRosterPlayers = useMemo(
        () => rosterPlayers.slice(0, visibleRosterCount),
        [rosterPlayers, visibleRosterCount],
    );
    const hasMoreRoster = visibleRosterCount < rosterPlayers.length;

    useEffect(() => {
        setVisibleRosterCount(ROSTER_PAGE_SIZE);
    }, [sessionId]);

    const loadMoreRoster = useCallback(() => {
        if (!hasMoreRoster || loadingMoreRoster) return;
        setLoadingMoreRoster(true);
        window.setTimeout(() => {
            setVisibleRosterCount((prev) => Math.min(prev + ROSTER_PAGE_SIZE, rosterPlayers.length));
            setLoadingMoreRoster(false);
        }, 200);
    }, [hasMoreRoster, loadingMoreRoster, rosterPlayers.length]);

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
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36">
                {loading ? <div className="h-32 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

                {session ? (
                    <div className="space-y-4">
                        <section>
                            <QueueingSessionHeader session={session} className="mb-4" />
                                {!canManagePlayers ? (
                                    <p className="mt-4 text-sm text-[#918f9c]">
                                        {isHost
                                            ? 'Player changes are locked once the session has ended.'
                                            : 'View-only access. Only QM can manage this roster.'}
                                    </p>
                                ) : null}
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
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
                                {visibleRosterPlayers.map((p) => (
                                    <li key={p.id} className="flex items-start justify-between gap-2 rounded-lg bg-[#2a2a2d] border border-[#2a2a2d] px-3 py-3 text-sm shadow-sm">
                                        <div className="min-w-0 flex-1">
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
                                            <div className="flex items-center gap-4 mt-2">
                                                <PlayerSessionStats p={p} />
                                                <PlayerStatusBadge
                                                    status={playerRosterStatus(
                                                        p,
                                                        reservedPlayerIds,
                                                        Boolean(session?.is_active),
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        {canManagePlayers && !p.is_playing ? (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => onRemove(p.id)}
                                                className="shrink-0 text-xs font-bold text-red-300 hover:text-red-200"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                            {hasMoreRoster ? (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        type="button"
                                        disabled={loadingMoreRoster}
                                        onClick={() => loadMoreRoster()}
                                        className="rounded-lg border border-[#514c53] bg-[#2a2a2d] px-4 py-2 text-sm font-semibold text-[#c2c1ff] transition-colors hover:border-[#c2c1ff]/50 disabled:opacity-60"
                                    >
                                        {loadingMoreRoster ? 'Loading…' : 'View More'}
                                    </button>
                                </div>
                            ) : null}
                        </section>
                    </div>
                ) : null}
            </main>
            <DashboardMobileNav />
        </div>
    );
}
