import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import {
    deleteQueueingSessionPlayer,
    patchUpdateQueueingSessionPlayer,
} from '../api/queueingSession.js';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { AddQueueingSessionPlayerModal } from '../components/queueing/AddQueueingSessionPlayerModal.jsx';
import {
    QueueingSessionPlayerCard,
    playerRosterStatus,
    rosterPlayerName,
} from '../components/queueing/QueueingSessionPlayerCard.jsx';
import { QueueingSessionPlayersLoading } from '../components/queueing/QueueingSessionPlayersLoading.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { QueueingSessionMatchFabPanel } from '../components/queueing/QueueingSessionMatchFabPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
    useInvalidateQueueingSession,
    useQueueingSessionMatchesQuery,
    useQueueingSessionQuery,
} from '../hooks/queries/useQueueingSessionQuery.js';

const ROSTER_PAGE_SIZE = 10;

const ROSTER_SORT_OPTIONS = [
    { value: 'total_games', label: 'Total games' },
    { value: 'wins', label: 'No. of wins' },
    { value: 'losses', label: 'No. of losses' },
    { value: 'status', label: 'Status' },
    { value: 'rank', label: 'Skill level' },
    { value: 'name', label: 'Name' },
    { value: 'pronoun', label: 'Pronoun' },
    { value: 'player_type', label: 'Player type' },
];

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'playing', label: 'Playing' },
    { value: 'queueing', label: 'Queueing' },
    { value: 'waiting', label: 'Waiting' },
];

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
function rosterStatusSortRank(p, reservedPlayerIds, sessionActive) {
    if (!sessionActive) {
        return 99;
    }
    if (p.is_playing) {
        return 0;
    }
    if (reservedPlayerIds.has(p.id)) {
        return 1;
    }
    if (p.is_waiting && !p.is_playing) {
        return 2;
    }
    return 3;
}

export function QueueingSessionPlayersPage() {
    const { id: idParam } = useParams();
    const sessionId = idParam && /^\d+$/.test(idParam) ? Number.parseInt(idParam, 10) : null;
    const { user } = useAuth();
    const invalidateQueueingSession = useInvalidateQueueingSession();
    const {
        data: session = null,
        isLoading: loading,
        isError,
        refetch: refetchSession,
    } = useQueueingSessionQuery(sessionId);
    const { data: matches = [], refetch: refetchMatches } = useQueueingSessionMatchesQuery(sessionId, {
        session,
        enabled: sessionId != null,
    });

    const error = sessionId == null ? 'Invalid session.' : isError ? 'Could not load session.' : '';
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [visibleRosterCount, setVisibleRosterCount] = useState(ROSTER_PAGE_SIZE);
    const [loadingMoreRoster, setLoadingMoreRoster] = useState(false);
    const [rosterSortField, setRosterSortField] = useState('total_games');
    const [rosterSortDirection, setRosterSortDirection] = useState('desc');
    const [statusFilter, setStatusFilter] = useState('all');
    const [playerSearch, setPlayerSearch] = useState('');
    const [editPlayerModal, setEditPlayerModal] = useState(
        /** @type {{
         *   mode: 'guest' | 'member',
         *   playerRowId: number,
         *   member?: { id?: number, name: string, pronoun?: string | null, skill_level?: number | null },
         *   guest?: { name?: string, pronoun?: string | null, skill_level?: number | null },
         * } | null} */ (null),
    );
    const [removeTarget, setRemoveTarget] = useState(
        /** @type {{ id: number, name: string, isGuest: boolean } | null} */ (null),
    );

    const isHost = Boolean(session?.is_host);
    const canManagePlayers = Boolean(session?.can_manage) && Boolean(session?.is_active);
    const canManageMatches = canManagePlayers;
    const sessionActive = Boolean(session?.is_active);

    const reload = useCallback(async () => {
        if (sessionId == null) return;
        invalidateQueueingSession(sessionId);
        await Promise.all([refetchSession(), refetchMatches()]);
    }, [invalidateQueueingSession, refetchMatches, refetchSession, sessionId]);

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

    const filteredRosterPlayers = useMemo(() => {
        const query = playerSearch.trim().toLowerCase();

        return rosterPlayers.filter((p) => {
            const status = playerRosterStatus(p, reservedPlayerIds, sessionActive);
            if (statusFilter !== 'all' && status?.key !== statusFilter) {
                return false;
            }
            if (!query) return true;
            const haystack = [
                rosterPlayerName(p),
                p.pronoun ?? '',
                p.is_guest ? 'guest' : 'member',
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [playerSearch, reservedPlayerIds, rosterPlayers, sessionActive, statusFilter]);

    const sortedRosterPlayers = useMemo(() => {
        const players = [...filteredRosterPlayers];
        const dir = rosterSortDirection === 'asc' ? 1 : -1;

        players.sort((a, b) => {
            let cmp = 0;

            switch (rosterSortField) {
                case 'total_games': {
                    const aGames = (a.wins_count ?? 0) + (a.losses_count ?? 0);
                    const bGames = (b.wins_count ?? 0) + (b.losses_count ?? 0);
                    cmp = aGames - bGames;
                    break;
                }
                case 'wins':
                    cmp = (a.wins_count ?? 0) - (b.wins_count ?? 0);
                    break;
                case 'losses':
                    cmp = (a.losses_count ?? 0) - (b.losses_count ?? 0);
                    break;
                case 'rank': {
                    const aRank = a.skill_level ?? 99;
                    const bRank = b.skill_level ?? 99;
                    cmp = aRank - bRank;
                    break;
                }
                case 'name':
                    cmp = rosterPlayerName(a).localeCompare(rosterPlayerName(b), undefined, {
                        sensitivity: 'base',
                    });
                    break;
                case 'pronoun': {
                    const aPronoun = (a.pronoun ?? '').trim().toLowerCase();
                    const bPronoun = (b.pronoun ?? '').trim().toLowerCase();
                    if (!aPronoun && bPronoun) {
                        cmp = 1;
                    } else if (aPronoun && !bPronoun) {
                        cmp = -1;
                    } else {
                        cmp = aPronoun.localeCompare(bPronoun);
                    }
                    break;
                }
                case 'player_type':
                    cmp = Number(Boolean(a.is_guest)) - Number(Boolean(b.is_guest));
                    break;
                case 'status':
                    cmp =
                        rosterStatusSortRank(a, reservedPlayerIds, sessionActive) -
                        rosterStatusSortRank(b, reservedPlayerIds, sessionActive);
                    break;
                default:
                    cmp = 0;
            }

            if (cmp === 0) {
                cmp = (a.queue_position ?? 0) - (b.queue_position ?? 0);
            }

            return cmp * dir;
        });

        return players;
    }, [
        filteredRosterPlayers,
        rosterSortField,
        rosterSortDirection,
        reservedPlayerIds,
        sessionActive,
    ]);

    const visibleRosterPlayers = useMemo(
        () => sortedRosterPlayers.slice(0, visibleRosterCount),
        [sortedRosterPlayers, visibleRosterCount],
    );
    const hasMoreRoster = visibleRosterCount < sortedRosterPlayers.length;

    const statusCounts = useMemo(() => {
        const counts = { all: rosterPlayers.length, playing: 0, queueing: 0, waiting: 0 };
        for (const p of rosterPlayers) {
            const status = playerRosterStatus(p, reservedPlayerIds, sessionActive);
            if (status?.key === 'playing') counts.playing += 1;
            else if (status?.key === 'queueing') counts.queueing += 1;
            else if (status?.key === 'waiting') counts.waiting += 1;
        }
        return counts;
    }, [reservedPlayerIds, rosterPlayers, sessionActive]);

    useEffect(() => {
        setVisibleRosterCount(ROSTER_PAGE_SIZE);
    }, [sessionId, rosterSortField, rosterSortDirection, statusFilter, playerSearch]);

    const loadMoreRoster = useCallback(() => {
        if (!hasMoreRoster || loadingMoreRoster) return;
        setLoadingMoreRoster(true);
        window.setTimeout(() => {
            setVisibleRosterCount((prev) => Math.min(prev + ROSTER_PAGE_SIZE, sortedRosterPlayers.length));
            setLoadingMoreRoster(false);
        }, 200);
    }, [hasMoreRoster, loadingMoreRoster, sortedRosterPlayers.length]);

    /**
     * @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} p
     */
    function onEditPlayerClick(p) {
        if (!canManagePlayers || busy || p.is_playing) return;

        if (p.is_guest) {
            setEditPlayerModal({
                mode: 'guest',
                playerRowId: p.id,
                guest: {
                    name: p.guest_name ?? '',
                    pronoun: p.pronoun ?? null,
                    skill_level: p.skill_level ?? null,
                },
            });
            return;
        }

        setEditPlayerModal({
            mode: 'member',
            playerRowId: p.id,
            member: {
                id: p.user?.id,
                name: rosterPlayerName(p),
                pronoun: p.pronoun ?? null,
                skill_level: p.skill_level ?? null,
            },
        });
    }

    async function onConfirmEditPlayer(payload) {
        if (sessionId == null || !canManagePlayers || !editPlayerModal) return;
        setActionError('');
        setBusy(true);
        try {
            const isGuest = editPlayerModal.mode === 'guest';
            const body = isGuest
                ? {
                      guest_name: payload.guest_name,
                      pronoun: payload.pronoun ?? null,
                      skill_level: payload.skill_level ?? null,
                  }
                : {
                      skill_level: payload.skill_level,
                  };
            await patchUpdateQueueingSessionPlayer(sessionId, editPlayerModal.playerRowId, body);
            invalidateQueueingSession(sessionId);
            await refetchSession();
            setEditPlayerModal(null);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not save player.');
            throw e;
        } finally {
            setBusy(false);
        }
    }

    async function onRemove(playerRowId) {
        if (sessionId == null || !canManagePlayers) return;
        setActionError('');
        setBusy(true);
        try {
            await deleteQueueingSessionPlayer(sessionId, playerRowId);
            invalidateQueueingSession(sessionId);
            await refetchSession();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not remove player.');
        } finally {
            setBusy(false);
        }
    }

    function onRemoveClick(p) {
        if (!canManagePlayers || busy) return;
        setRemoveTarget({ id: p.id, name: rosterPlayerName(p), isGuest: Boolean(p.is_guest) });
    }

    async function onConfirmRemove() {
        if (!removeTarget) return;
        const id = removeTarget.id;
        await onRemove(id);
        setRemoveTarget(null);
    }

    const showInitialSkeleton = loading && !session && !error;
    const showEmptyRoster = !showInitialSkeleton && rosterPlayers.length === 0;
    const showNoFilterResults =
        !showInitialSkeleton && rosterPlayers.length > 0 && sortedRosterPlayers.length === 0;

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="rt-page-main">
                {showInitialSkeleton ? <QueueingSessionPlayersLoading /> : null}

                {!showInitialSkeleton ? (
                    <>
                {error ? (
                    <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </p>
                ) : null}

                {session ? (
                    <div className="space-y-4">
                        <section>
                            <QueueingSessionHeader session={session} className="mb-4" />
                            {!canManagePlayers ? (
                                <p className="mt-4 text-sm text-[#918f9c]">
                                    {isHost
                                        ? 'Player changes are locked once the session has ended.'
                                        : 'View-only access. Only the queue master or an admin can manage this roster.'}
                                </p>
                            ) : null}
                        </section>

                        {actionError ? (
                            <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                                {actionError}
                            </p>
                        ) : null}

                        <section className="mt-4 min-w-0" aria-label="Session roster">
                            <div className="rt-roster-head mb-5">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <h1 className="text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                                            Current <span className="text-[#c2c1ff]">Players</span>
                                        </h1>
                                        {rosterPlayers.length > 0 ? (
                                            <span className="rt-qs-dash-stats rt-qs-dash-stats--enter border border-white/20 rounded-full px-3 py-1 md:px-4 md:py-1.5 md:text-lg! text-xs! flex items-center gap-1">
                                                <MaterialIcon name="groups" className="text-lg! md:text-xl!" />
                                                <span className="text-xs! md:text-sm!">
                                                    <strong>{rosterPlayers.length}</strong> players
                                                </span>
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-sm md:text-lg text-[#918f9c]">
                                        {sessionActive
                                            ? 'Tap a player to edit details. Status updates live as matches progress.'
                                            : 'Final roster for this session.'}
                                    </p>
                                </div>

                                {rosterPlayers.length > 0 ? (
                                    <div className="rt-ranking-toolbar rt-ranking-toolbar--enter mt-5">
                                        <div className="rt-ranking-toolbar-search group relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                                                <MaterialIcon name="search" className="text-xl!" />
                                            </div>
                                            <input
                                                type="search"
                                                placeholder="Search by name or pronoun…"
                                                value={playerSearch}
                                                onChange={(e) => setPlayerSearch(e.target.value)}
                                                className="rt-input border border-white/10 px-4 py-2 text-xs! md:text-sm!"
                                                aria-label="Search players"
                                            />
                                        </div>

                                        {sessionActive ? (
                                            <div
                                                className="rt-ranking-toolbar-filters rt-scroll-inline flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"
                                                role="tablist"
                                                aria-label="Filter by status"
                                            >
                                                {STATUS_FILTERS.map((filter) => {
                                                    const count = statusCounts[filter.value] ?? 0;
                                                    const isActive = statusFilter === filter.value;
                                                    return (
                                                        <button
                                                            key={filter.value}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={isActive}
                                                            onClick={() => setStatusFilter(filter.value)}
                                                            className={[
                                                                'rt-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm',
                                                                isActive ? 'rt-chip-active' : 'rt-chip-idle',
                                                            ].join(' ')}
                                                        >
                                                            {filter.label}
                                                            <span
                                                                className={[
                                                                    'rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums',
                                                                    isActive
                                                                        ? 'bg-[#003919]/15 text-[#003919]'
                                                                        : 'bg-white/8 text-[#c8c5d2]',
                                                                ].join(' ')}
                                                            >
                                                                {count}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        <div className="flex items-center gap-2">
                                            <label className="sr-only" htmlFor="roster-sort-field">
                                                Sort players by
                                            </label>
                                            <select
                                                id="roster-sort-field"
                                                value={rosterSortField}
                                                onChange={(e) => setRosterSortField(e.target.value)}
                                                className="rt-roster-sort-select min-w-0 flex-1 text-xs! md:text-sm!"
                                            >
                                                {ROSTER_SORT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        Sort: {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRosterSortDirection((prev) =>
                                                        prev === 'asc' ? 'desc' : 'asc',
                                                    )
                                                }
                                                aria-label={
                                                    rosterSortDirection === 'asc'
                                                        ? 'Sort ascending'
                                                        : 'Sort descending'
                                                }
                                                title={
                                                    rosterSortDirection === 'asc' ? 'Ascending' : 'Descending'
                                                }
                                                className="rt-roster-sort-direction"
                                            >
                                                <MaterialIcon
                                                    name={
                                                        rosterSortDirection === 'asc'
                                                            ? 'arrow_upward'
                                                            : 'arrow_downward'
                                                    }
                                                    className="text-[18px]!"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {showEmptyRoster ? (
                                <EmptyState
                                    icon="groups"
                                    title="No players yet"
                                    description="Add members or guests from the match panel to build your roster."
                                />
                            ) : null}

                            {showNoFilterResults ? (
                                <EmptyState
                                    icon="search_off"
                                    title="No players match"
                                    description="Try a different search term or clear your status filter."
                                />
                            ) : null}

                            {visibleRosterPlayers.length > 0 ? (
                                <div className="rt-roster-player-cards-grid">
                                    {visibleRosterPlayers.map((p, index) => {
                                        const canEditPlayer = canManagePlayers && !p.is_playing;
                                        const status = playerRosterStatus(
                                            p,
                                            reservedPlayerIds,
                                            sessionActive,
                                        );

                                        return (
                                            <QueueingSessionPlayerCard
                                                key={p.id}
                                                player={p}
                                                status={status}
                                                sessionActive={sessionActive}
                                                isYou={user?.id != null && p.user?.id === user.id}
                                                canEdit={canEditPlayer}
                                                busy={busy}
                                                style={{
                                                    animationDelay: `${0.08 + (index % 10) * 0.04}s`,
                                                }}
                                                onEdit={() => onEditPlayerClick(p)}
                                                onRemove={() => onRemoveClick(p)}
                                            />
                                        );
                                    })}
                                </div>
                            ) : null}

                            {hasMoreRoster ? (
                                <div className="mt-5 flex justify-center">
                                    <button
                                        type="button"
                                        disabled={loadingMoreRoster}
                                        onClick={() => loadMoreRoster()}
                                        className="rt-roster-load-more"
                                    >
                                        {loadingMoreRoster ? (
                                            <>
                                                <MaterialIcon
                                                    name="progress_activity"
                                                    className="animate-spin text-base!"
                                                />
                                                Loading…
                                            </>
                                        ) : (
                                            <>
                                                View more
                                                <span className="text-[#918f9c]">
                                                    ({sortedRosterPlayers.length - visibleRosterCount} left)
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : null}
                        </section>
                    </div>
                ) : null}
                    </>
                ) : null}
            </main>
            <AddQueueingSessionPlayerModal
                open={editPlayerModal != null}
                mode={editPlayerModal?.mode ?? 'guest'}
                intent="edit"
                member={editPlayerModal?.mode === 'member' ? editPlayerModal.member ?? null : null}
                guest={editPlayerModal?.mode === 'guest' ? editPlayerModal.guest ?? null : null}
                optionalGuestSkill={session?.optional_guest_skill !== false}
                optionalGuestGender={session?.optional_guest_gender !== false}
                busy={busy}
                onCancel={() => {
                    if (!busy) setEditPlayerModal(null);
                }}
                onConfirm={(payload) => onConfirmEditPlayer(payload)}
            />
            <ConfirmActionModal
                open={removeTarget != null}
                title={removeTarget?.isGuest ? 'Remove guest player?' : 'Remove player?'}
                description={
                    removeTarget
                        ? `Remove "${removeTarget.name}" from this queue session? This cannot be undone.`
                        : ''
                }
                confirmLabel="Remove"
                confirmBusyLabel="Removing…"
                busy={busy}
                onCancel={() => {
                    if (!busy) setRemoveTarget(null);
                }}
                onConfirm={() => {
                    onConfirmRemove();
                }}
            />
            <QueueingSessionMatchFabPanel
                session={session}
                sessionId={sessionId}
                canManage={canManageMatches}
                matches={matches}
                onReload={reload}
                onActionError={setActionError}
            />
            <DashboardMobileNav />
        </div>
    );
}
