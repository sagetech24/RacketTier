import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchFacilityPlayers } from '../api/gameSession.js';
import {
    deleteQueueingSessionPlayer,
    patchUpdateQueueingSessionPlayer,
    postAddQueueingSessionPlayer,
} from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { AddQueueingSessionPlayerModal } from '../components/queueing/AddQueueingSessionPlayerModal.jsx';
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
    { value: 'rank', label: 'Rank' },
    { value: 'name', label: 'Name' },
    { value: 'pronoun', label: 'Pronoun' },
    { value: 'player_type', label: 'Player type' },
    { value: 'status', label: 'Status' },
];

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
        return { label: 'Playing', className: 'border border-[#4ce081]/40 bg-[#4ce081]/20 text-[#4ce081]' };
    }
    if (reservedPlayerIds.has(p.id)) {
        return { label: 'Queueing', className: 'border border-amber-400/40 bg-amber-400/20 text-amber-200' };
    }
    return { label: 'Waiting', className: 'border border-[#514c53] bg-[#353438] text-[#918f9c]' };
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

const SKILL_LEVEL_NAMES = {
    1: 'Starter',
    2: 'Beginner',
    3: 'Intermediate',
    4: 'Sempai',
    5: 'Sensie',
};

/** @param {number} level */
function skillLevelBackgroundOpacity(level) {
    const clamped = Math.min(5, Math.max(1, level));
    return 0.15 + ((clamped - 1) / 4) * 0.65;
}

/** @param {number} level */
function skillLevelTextClass(level) {
    const clamped = Math.min(5, Math.max(1, level));
    const classes = {
        1: 'text-[#e4e1e6]',
        2: 'text-[#c8c5d2]',
        3: 'text-[#c9c8d0]',
        4: 'text-[#353438]',
        5: 'text-[#131316]',
    };
    return classes[clamped] ?? classes[1];
}

/** @param {{ skillLevel?: number | null }} props */
function PlayerSkillLevelIndicator({ skillLevel }) {
    if (skillLevel == null) return null;

    const level = Math.min(5, Math.max(1, skillLevel));
    const opacity = skillLevelBackgroundOpacity(level);
    const textClass = skillLevelTextClass(level);
    const tierName = SKILL_LEVEL_NAMES[level] ?? `Level ${level}`;

    return (
        <div
            className="flex w-11 shrink-0 flex-col items-center justify-center self-stretch border-r border-[#514c53]/40"
            style={{ backgroundColor: `rgba(194, 193, 255, ${opacity})` }}
            title={`Skill level ${level} — ${tierName}`}
        >
            <span className={`text-lg font-extrabold leading-none tabular-nums ${textClass}`}>
                {level}
            </span>
            <span className={`mt-0.5 text-[7px] font-semibold uppercase tracking-wide ${textClass}`}>
                Skill <br />Level
            </span>
        </div>
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

/**
 * @param {{
 *   stats?: { wins: number, losses: number, total_matches: number } | null,
 *   sportName?: string | null,
 * }} props
 */
function MemberSportStats({ stats, sportName }) {
    const wins = stats?.wins ?? 0;
    const losses = stats?.losses ?? 0;
    const total = stats?.total_matches ?? wins + losses;
    const label = sportName ? `${sportName} stats` : 'Sport stats';

    return (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#918f9c]" title={label}>
            <span className="inline-flex items-center gap-0.5">
                <MaterialIcon name="arrow_upward" className="text-[13px]! text-[#4ce081]" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{wins}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
                <MaterialIcon name="arrow_downward" className="text-[13px]! text-red-300/90" />
                <span className="tabular-nums font-medium text-[#e4e1e6]">{losses}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
                Total:
                <span className="tabular-nums font-medium text-[#e4e1e6]">{total} games</span>
            </span>
        </div>
    );
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
    const [playerSearch, setPlayerSearch] = useState('');
    const [searchRows, setSearchRows] = useState([]);
    const [visibleRosterCount, setVisibleRosterCount] = useState(ROSTER_PAGE_SIZE);
    const [loadingMoreRoster, setLoadingMoreRoster] = useState(false);
    const [rosterSortField, setRosterSortField] = useState('status');
    const [rosterSortDirection, setRosterSortDirection] = useState('asc');
    const [addPlayerModal, setAddPlayerModal] = useState(
        /** @type {{
         *   mode: 'guest' | 'member',
         *   intent: 'add' | 'edit',
         *   playerRowId?: number,
         *   member?: { id?: number, name: string, pronoun?: string | null, skill_level?: number | null },
         *   guest?: { name?: string, pronoun?: string | null, skill_level?: number | null },
         * } | null} */ (null),
    );
    const [removeTarget, setRemoveTarget] = useState(
        /** @type {{ id: number, name: string, isGuest: boolean } | null} */ (null),
    );

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
    const canManagePlayers = Boolean(session?.can_manage) && Boolean(session?.is_active);
    const canManageMatches = canManagePlayers;

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
    const sortedRosterPlayers = useMemo(() => {
        const players = [...rosterPlayers];
        const dir = rosterSortDirection === 'asc' ? 1 : -1;
        const sessionActive = Boolean(session?.is_active);

        players.sort((a, b) => {
            let cmp = 0;

            switch (rosterSortField) {
                case 'rank': {
                    const aRank = a.skill_level ?? 99;
                    const bRank = b.skill_level ?? 99;
                    cmp = aRank - bRank;
                    break;
                }
                case 'name':
                    cmp = displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' });
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
    }, [rosterPlayers, rosterSortField, rosterSortDirection, reservedPlayerIds, session?.is_active]);
    const visibleRosterPlayers = useMemo(
        () => sortedRosterPlayers.slice(0, visibleRosterCount),
        [sortedRosterPlayers, visibleRosterCount],
    );
    const hasMoreRoster = visibleRosterCount < sortedRosterPlayers.length;

    useEffect(() => {
        setVisibleRosterCount(ROSTER_PAGE_SIZE);
    }, [sessionId, rosterSortField, rosterSortDirection]);

    const loadMoreRoster = useCallback(() => {
        if (!hasMoreRoster || loadingMoreRoster) return;
        setLoadingMoreRoster(true);
        window.setTimeout(() => {
            setVisibleRosterCount((prev) => Math.min(prev + ROSTER_PAGE_SIZE, sortedRosterPlayers.length));
            setLoadingMoreRoster(false);
        }, 200);
    }, [hasMoreRoster, loadingMoreRoster, sortedRosterPlayers.length]);

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

    function onAddMemberClick(row) {
        if (!canManagePlayers || busy) return;
        setAddPlayerModal({
            mode: 'member',
            intent: 'add',
            member: {
                id: row.id,
                name: row.name,
                pronoun: row.pronoun ?? null,
            },
        });
    }

    /**
     * @param {NonNullable<import('../api/gameSession.js').GameSessionDetail['players']>[number]} p
     */
    function onEditPlayerClick(p) {
        if (!canManagePlayers || busy || p.is_playing) return;

        if (p.is_guest) {
            setAddPlayerModal({
                mode: 'guest',
                intent: 'edit',
                playerRowId: p.id,
                guest: {
                    name: p.guest_name ?? '',
                    pronoun: p.pronoun ?? null,
                    skill_level: p.skill_level ?? null,
                },
            });
            return;
        }

        setAddPlayerModal({
            mode: 'member',
            intent: 'edit',
            playerRowId: p.id,
            member: {
                id: p.user?.id,
                name: displayName(p),
                pronoun: p.pronoun ?? null,
                skill_level: p.skill_level ?? null,
            },
        });
    }

    async function onConfirmAddPlayer(payload) {
        if (sessionId == null || !canManagePlayers || !addPlayerModal) return;
        setActionError('');
        setBusy(true);
        try {
            const isEdit = addPlayerModal.intent === 'edit';
            const isGuest = addPlayerModal.mode === 'guest';

            if (isEdit) {
                if (addPlayerModal.playerRowId == null) return;
                const body = isGuest
                    ? {
                          guest_name: payload.guest_name,
                          pronoun: payload.pronoun ?? null,
                          skill_level: payload.skill_level,
                      }
                    : {
                          skill_level: payload.skill_level,
                      };
                await patchUpdateQueueingSessionPlayer(
                    sessionId,
                    addPlayerModal.playerRowId,
                    body,
                );
                invalidateQueueingSession(sessionId);
                await refetchSession();
                setAddPlayerModal(null);
                return;
            }

            const body = isGuest
                ? {
                      guest_name: payload.guest_name,
                      pronoun: payload.pronoun ?? null,
                      skill_level: payload.skill_level,
                  }
                : {
                      user_id: addPlayerModal.member?.id,
                      skill_level: payload.skill_level,
                  };
            await postAddQueueingSessionPlayer(sessionId, body);
            invalidateQueueingSession(sessionId);
            await refetchSession();
            if (addPlayerModal.mode === 'member') {
                setPlayerSearch('');
                setAddPlayerModal(null);
            }
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
        setRemoveTarget({ id: p.id, name: displayName(p), isGuest: Boolean(p.is_guest) });
    }

    async function onConfirmRemove() {
        if (!removeTarget) return;
        const id = removeTarget.id;
        await onRemove(id);
        setRemoveTarget(null);
    }

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36 md:max-w-3xl md:px-8 md:pb-20 md:pt-32 lg:max-w-5xl">
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
                                            : 'View-only access. Only the queue master or an admin can manage this roster.'}
                                    </p>
                                ) : null}
                        </section>

                        {actionError ? (
                            <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{actionError}</p>
                        ) : null}

                        <div className={canManagePlayers ? 'flex flex-col gap-6 mt-4' : ''}>
                        {canManagePlayers ? (
                            <section className="rounded-xl border border-[#3c3c3e] bg-[#1b1b1e] p-4 md:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="flex-1 text-sm font-bold uppercase tracking-wide text-[#918f9c]">Add players</h2>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => setAddPlayerModal({ mode: 'guest', intent: 'add' })}
                                        className="flex items-center justify-center gap-1 text-sm font-semibold text-[#cacaca] border border-[#505050] rounded-md px-2.5 py-1"
                                    >
                                        <MaterialIcon name="person_add" className="text-[15px]! text-[#4ce081]" />
                                        Add a Guest Player
                                    </button>    
                                </div>
                                <input
                                    value={playerSearch}
                                    onChange={(e) => setPlayerSearch(e.target.value)}
                                    placeholder="Search members…"
                                    className="mb-2 w-full rounded-lg border border-[#3c3c3e] bg-[#131316] p-3 text-md outline-none focus:ring-1 focus:ring-[#4ce081]"
                                />
                                <div className="max-h-60 space-y-4 overflow-y-auto md:max-h-[min(28rem,calc(100dvh-22rem))]">
                                    {addablePlayers.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            disabled={busy}
                                            onClick={() => onAddMemberClick(r)}
                                            className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/10 border border-[#514c53] px-3 py-2 text-left text-md hover:border-[#4ce081]/50"
                                        >
                                            <span className="flex min-w-0 flex-1 flex-col">
                                                <span className="flex min-w-0 items-center gap-2">
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
                                                {session?.sport?.id != null ? (
                                                    <MemberSportStats
                                                        stats={r.stats}
                                                        sportName={session?.sport?.name}
                                                    />
                                                ) : null}
                                            </span>
                                            <span className="shrink-0 text-xs text-[#c2c1ff]/70">
                                                <MaterialIcon name="add" className="text-xs text-[#c2c1ff]/70" />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        <section className="mt-10 min-w-0">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h1 className="text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                                    Current <span className="text-[#c2c1ff]">Players</span>
                                </h1>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <select
                                        value={rosterSortField}
                                        onChange={(e) => setRosterSortField(e.target.value)}
                                        aria-label="Sort players by"
                                        className="max-w-[9.5rem] rounded-lg border border-[#3c3c3e] bg-[#1b1b1e] px-2.5 py-2 text-xs font-medium text-[#e4e1e6] outline-none focus:ring-1 focus:ring-[#4ce081] md:max-w-none md:px-3 md:text-sm"
                                    >
                                        {ROSTER_SORT_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRosterSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                                        }
                                        aria-label={rosterSortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
                                        title={rosterSortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                        className="flex size-9 items-center justify-center rounded-lg border border-[#3c3c3e] bg-[#1b1b1e] text-[#c2c1ff] transition-colors hover:border-[#c2c1ff]/50"
                                    >
                                        <MaterialIcon
                                            name={rosterSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                            className="text-[18px]!"
                                        />
                                    </button>
                                </div>
                            </div>
                            <ul className="rt-player-cards-grid space-y-3 md:space-y-0">
                                {visibleRosterPlayers.map((p) => {
                                    const canEditPlayer = canManagePlayers && !p.is_playing;
                                    const isPlaying = Boolean(session?.is_active && p.is_playing);

                                    return (
                                    <li
                                        key={p.id}
                                        role={canEditPlayer ? 'button' : undefined}
                                        tabIndex={canEditPlayer && !busy ? 0 : undefined}
                                        onClick={() => {
                                            if (canEditPlayer && !busy) onEditPlayerClick(p);
                                        }}
                                        onKeyDown={(e) => {
                                            if (!canEditPlayer || busy) return;
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onEditPlayerClick(p);
                                            }
                                        }}
                                        className={`flex items-stretch overflow-hidden rounded-lg border text-sm shadow-sm ${
                                            isPlaying
                                                ? 'rt-playing-player-card'
                                                : 'border-[#2a2a2d] bg-[#2a2a2d]'
                                        } ${
                                            canEditPlayer
                                                ? 'cursor-pointer transition-colors hover:border-[#514c53] hover:bg-[#313134] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ce081]/50'
                                                : ''
                                        }`}
                                    >
                                        <PlayerSkillLevelIndicator skillLevel={p.skill_level} />
                                        <div className="flex min-w-0 flex-1 items-start justify-between gap-2 px-3 py-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                    <span className="font-semibold capitalize">
                                                        {displayName(p)}
                                                        {p.pronoun ? (
                                                            <span className="ml-1.5 text-xs font-medium normal-case text-[#c2c1ff]/80">
                                                                {p.pronoun}
                                                            </span>
                                                        ) : null}
                                                    </span>
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
                                                <div className="mt-2 flex items-center gap-4">
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
                                            {canEditPlayer ? (
                                                <div className="flex shrink-0 items-center gap-3">
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditPlayerClick(p);
                                                        }}
                                                        className="text-[#c2c1ff] hover:text-[#e4e1e6] disabled:opacity-60"
                                                        aria-label={`Edit ${displayName(p)}`}
                                                    >
                                                        <MaterialIcon name="edit" className="text-[16px]!" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveClick(p);
                                                        }}
                                                        className="text-red-300 hover:text-red-200 disabled:opacity-60"
                                                        aria-label={`Remove ${displayName(p)}`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </li>
                                    );
                                })}
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
                    </div>
                ) : null}
            </main>
            <AddQueueingSessionPlayerModal
                open={addPlayerModal != null}
                mode={addPlayerModal?.mode ?? 'guest'}
                intent={addPlayerModal?.intent ?? 'add'}
                member={addPlayerModal?.mode === 'member' ? addPlayerModal.member ?? null : null}
                guest={addPlayerModal?.mode === 'guest' ? addPlayerModal.guest ?? null : null}
                busy={busy}
                onCancel={() => {
                    if (!busy) setAddPlayerModal(null);
                }}
                onConfirm={(payload) => onConfirmAddPlayer(payload)}
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
