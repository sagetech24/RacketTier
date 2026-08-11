import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { postFinishGameSessionMatch } from '../api/gameSession.js';
import {
    deleteQueueingSessionMatch,
    patchUpdateQueueingSessionMatch,
    postStartQueueingSessionMatch,
} from '../api/queueingSession.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { MODAL_OVERLAY_CLASS, ModalPortal } from '../components/app/ModalPortal.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { QueueingSessionFinishedMatches } from '../components/queueing/QueueingSessionFinishedMatches.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { QueueingSessionMatchCard } from '../components/queueing/QueueingSessionMatchCard.jsx';
import { QueueingSessionMatchFabPanel } from '../components/queueing/QueueingSessionMatchFabPanel.jsx';
import { QueueingSessionMatchLineupModal } from '../components/queueing/QueueingSessionMatchLineupModal.jsx';
import { QueueingSessionMatchesLoading } from '../components/queueing/QueueingSessionMatchesLoading.jsx';
import { lineupToTeams } from '../lib/queueingMatchLineup.js';
import { lineupDisplayNamesByTeam, sortFinishedMatchesRecentFirst } from '../lib/queueingMatchDisplay.js';
import {
    useInvalidateQueueingSession,
    useQueueingSessionMatchesQuery,
    useQueueingSessionQuery,
} from '../hooks/queries/useQueueingSessionQuery.js';
import { useAuth } from '../context/AuthContext.jsx';

const MATCH_STATUS_TABS = ['ongoing', 'queueing', 'finished'];

/** @type {Record<string, { label: string, icon: string }>} */
const MATCH_TAB_META = {
    ongoing: { label: 'Playing', icon: 'sports_tennis' },
    queueing: { label: 'Queueing', icon: 'hourglass_top' },
    finished: { label: 'Finished', icon: 'emoji_events' },
};

/** @type {Record<string, { title: string, description: string, icon: string }>} */
const MATCH_EMPTY_STATES = {
    ongoing: {
        title: 'No matches on court',
        description: 'Start a queued match to see live games here.',
        icon: 'sports_tennis',
    },
    queueing: {
        title: 'No matches queued',
        description: 'Create a match to line up players for the next game.',
        icon: 'hourglass_top',
    },
    finished: {
        title: 'No results yet',
        description: 'Completed matches and scores will appear here.',
        icon: 'emoji_events',
    },
};

function sectionTitle(status) {
    return MATCH_TAB_META[status]?.label ?? status;
}

/**
 * @param {{
 *   status: string,
 *   rows: Array<Record<string, unknown>>,
 *   canManageMatches: boolean,
 *   canEndMatch: boolean,
 *   busy: boolean,
 *   onStartQueuedMatch: (matchId: number) => void,
 *   onEditMatch: (row: Record<string, unknown>) => void,
 *   onRemoveMatch: (row: Record<string, unknown>) => void,
 *   onEndMatch: (row: Record<string, unknown>) => void,
 * }} props
 */
function MatchCardsList({
    status,
    rows,
    canManageMatches,
    canEndMatch,
    busy,
    onStartQueuedMatch,
    onEditMatch,
    onRemoveMatch,
    onEndMatch,
}) {
    if (rows.length === 0) {
        const empty = MATCH_EMPTY_STATES[status] ?? MATCH_EMPTY_STATES.queueing;
        return (
            <EmptyState
                icon={empty.icon}
                title={empty.title}
                description={empty.description}
            />
        );
    }

    return (
        <ul className="rt-match-cards-grid space-y-3 md:space-y-0">
            {rows.map((row, index) => (
                <li key={row.id}>
                    <QueueingSessionMatchCard
                        row={row}
                        index={index}
                        canManageMatches={canManageMatches}
                        canEndMatch={canEndMatch}
                        busy={busy}
                        onStartQueuedMatch={onStartQueuedMatch}
                        onEditMatch={onEditMatch}
                        onRemoveMatch={onRemoveMatch}
                        onEndMatch={onEndMatch}
                    />
                </li>
            ))}
        </ul>
    );
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

export function QueueingSessionMatchesPage() {
    const { id: idParam } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabScrollerRef = useRef(null);
    const skipScrollSyncRef = useRef(false);
    const scrollRafRef = useRef(null);
    const sessionId = idParam && /^\d+$/.test(idParam) ? Number.parseInt(idParam, 10) : null;
    const { user } = useAuth();
    const invalidateQueueingSession = useInvalidateQueueingSession();
    const {
        data: session = null,
        isLoading: sessionLoading,
        isError: sessionError,
        refetch: refetchSession,
    } = useQueueingSessionQuery(sessionId);
    const {
        data: matches = [],
        isLoading: matchesLoading,
        isError: matchesError,
        refetch: refetchMatches,
    } = useQueueingSessionMatchesQuery(sessionId, { session });

    const loading = sessionLoading || matchesLoading;
    const error =
        sessionId == null
            ? 'Invalid session.'
            : sessionError || matchesError
              ? 'Could not load session matches.'
              : '';
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
    const [editLineupOpen, setEditLineupOpen] = useState(false);
    const [editingMatchId, setEditingMatchId] = useState(null);
    const [editingMatchNo, setEditingMatchNo] = useState(null);
    const [editingMatchStatus, setEditingMatchStatus] = useState(null);
    const [editInitialTeams, setEditInitialTeams] = useState({ team1: [], team2: [] });
    /** @type {null | { id: number, matchNo: number | null, status: string }} */
    const [removeMatchConfirm, setRemoveMatchConfirm] = useState(null);

    const reload = useCallback(async () => {
        if (sessionId == null) return;
        invalidateQueueingSession(sessionId);
        await Promise.all([refetchSession(), refetchMatches()]);
    }, [invalidateQueueingSession, refetchMatches, refetchSession, sessionId]);

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
            setFinishOpen(false);
            setSelectedMatchId(null);
            setSelectedMatchNo(null);
            setFinishTeams({ team1: [], team2: [] });
            setT1('');
            setT2('');
            setSelectedWinningTeam(null);
            if (session) {
                invalidateQueueingSession(sessionId);
            }
            void reload();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not end match.');
        } finally {
            setBusy(false);
        }
    }

    function closeEditLineupModal() {
        setEditLineupOpen(false);
        setEditingMatchId(null);
        setEditingMatchNo(null);
        setEditingMatchStatus(null);
        setEditInitialTeams({ team1: [], team2: [] });
    }

    /**
     * @param {{ id?: number, match_no?: number, status?: string, lineup?: unknown }} row
     */
    function openEditMatchModal(row) {
        setActionError('');
        setEditingMatchId(row.id ?? null);
        setEditingMatchNo(row.match_no ?? null);
        setEditingMatchStatus(typeof row.status === 'string' ? row.status : null);
        setEditInitialTeams(lineupToTeams(row.lineup));
        setEditLineupOpen(true);
    }

    /**
     * @param {{ id: number, team?: number }[]} lineup
     */
    async function onSaveEditMatchLineup(lineup) {
        if (sessionId == null || editingMatchId == null) return;
        setActionError('');
        setBusy(true);
        try {
            await patchUpdateQueueingSessionMatch(sessionId, editingMatchId, { lineup });
            await reload();
            closeEditLineupModal();
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Could not update match.');
            throw e;
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
            if (editLineupOpen && editingMatchId === matchId) {
                closeEditLineupModal();
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

    const grouped = useMemo(() => {
        const base = { queueing: [], ongoing: [], finished: [] };
        for (const row of matches) {
            if (row.status === 'queueing' || row.status === 'ongoing' || row.status === 'finished') {
                base[row.status].push(row);
            } else {
                base.queueing.push(row);
            }
        }
        base.finished = sortFinishedMatchesRecentFirst(base.finished);
        return base;
    }, [matches]);

    const availableMatchTabs = useMemo(
        () => (session?.is_active ? MATCH_STATUS_TABS : ['finished']),
        [session?.is_active],
    );

    const tabParam = searchParams.get('tab');
    const activeMatchTab = availableMatchTabs.includes(tabParam ?? '') ? tabParam : availableMatchTabs[0];

    const setActiveMatchTab = useCallback(
        (tab) => {
            if (!availableMatchTabs.includes(tab)) return;
            setSearchParams({ tab }, { replace: true });
        },
        [availableMatchTabs, setSearchParams],
    );

    useEffect(() => {
        if (loading || !session) return;
        if (tabParam !== activeMatchTab) {
            setSearchParams({ tab: activeMatchTab }, { replace: true });
        }
    }, [loading, session, tabParam, activeMatchTab, setSearchParams]);

    useEffect(() => {
        const el = tabScrollerRef.current;
        if (!el) return;
        const index = availableMatchTabs.indexOf(activeMatchTab ?? '');
        if (index < 0) return;
        const targetLeft = index * el.clientWidth;
        if (Math.abs(el.scrollLeft - targetLeft) < 2) return;
        skipScrollSyncRef.current = true;
        el.scrollTo({ left: targetLeft, behavior: 'smooth' });
        const timeoutId = window.setTimeout(() => {
            skipScrollSyncRef.current = false;
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [activeMatchTab, availableMatchTabs]);

    const handleMatchTabScroll = useCallback(() => {
        if (skipScrollSyncRef.current) return;
        if (scrollRafRef.current != null) {
            cancelAnimationFrame(scrollRafRef.current);
        }
        scrollRafRef.current = requestAnimationFrame(() => {
            const el = tabScrollerRef.current;
            if (!el || el.clientWidth === 0) return;
            const index = Math.round(el.scrollLeft / el.clientWidth);
            const tab = availableMatchTabs[index];
            if (tab && tab !== activeMatchTab) {
                setSearchParams({ tab }, { replace: true });
            }
        });
    }, [activeMatchTab, availableMatchTabs, setSearchParams]);

    /**
     * @param {{ id?: number, match_no?: number | null, lineup?: unknown }} row
     */
    function openFinishMatchModal(row) {
        setSelectedMatchId(row.id ?? null);
        setSelectedMatchNo(row.match_no ?? null);
        setFinishTeams(lineupDisplayNamesByTeam(row.lineup));
        setT1('');
        setT2('');
        setSelectedWinningTeam(null);
        setFinishOpen(true);
    }

    const canManageMatches = Boolean(session?.can_manage) && Boolean(session?.is_active);
    const canEndMatch = canManageMatches && session?.status === 'ongoing';
    const activeTabIndex = Math.max(0, availableMatchTabs.indexOf(activeMatchTab ?? ''));
    const activeCount = (grouped[activeMatchTab] ?? []).length;

    return (
        <AppShell user={user}>
            {loading ? <QueueingSessionMatchesLoading /> : null}
            {error ? (
                <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                    {error}
                </p>
            ) : null}
                {actionError ? (
                    <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                        {actionError}
                    </p>
                ) : null}

                {!loading && session ? <QueueingSessionHeader session={session} /> : null}

                {!loading && !error ? (
                    <div className="rt-matches-content space-y-4">
                        <div className="rt-matches-head">
                            <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
                                <h1 className="text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                                    {sectionTitle(activeMatchTab ?? 'ongoing')}{' '}
                                    <span className="text-[#c2c1ff]">Matches</span>
                                </h1>
                                {activeCount > 0 ? (
                                    <span className="rt-matches-count-pill tabular-nums">
                                        {activeCount} total
                                    </span>
                                ) : null}
                            </div>
                            {!session?.is_active ? (
                                <p className="text-sm text-[#918f9c]">
                                    Session ended — showing {(grouped.finished ?? []).length} finished match
                                    {(grouped.finished ?? []).length === 1 ? '' : 'es'}.
                                </p>
                            ) : null}

                            <div
                                className={`rt-match-tabs mt-4 w-full rounded-xl border border-[#45454a] ${
                                    session?.is_active ? 'flex' : 'hidden'
                                }`}
                                role="tablist"
                                aria-label="Match status"
                            >
                                <span
                                    className="rt-match-tabs__indicator"
                                    aria-hidden
                                    style={{
                                        width: `${100 / availableMatchTabs.length}%`,
                                        transform: `translateX(${activeTabIndex * 100}%)`,
                                    }}
                                />
                                {availableMatchTabs.map((tab) => {
                                    const count = (grouped[tab] ?? []).length;
                                    const isActive = tab === activeMatchTab;
                                    const meta = MATCH_TAB_META[tab];
                                    return (
                                        <button
                                            key={tab}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`match-tab-panel-${tab}`}
                                            id={`match-tab-${tab}`}
                                            onClick={() => setActiveMatchTab(tab)}
                                            className={[
                                                'rt-match-tab',
                                                isActive ? 'rt-match-tab--active' : '',
                                            ].join(' ')}
                                        >
                                            <MaterialIcon name={meta.icon} className="text-[16px]!" />
                                            <span>{meta.label}</span>
                                            {count > 0 ? (
                                                <span className="rt-match-tab-count tabular-nums">{count}</span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            ref={tabScrollerRef}
                            className="rt-match-tabs-scroller flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
                            onScroll={handleMatchTabScroll}
                        >
                            {availableMatchTabs.map((status) => {
                                const rows = grouped[status] ?? [];
                                const isActivePanel = status === activeMatchTab;
                                return (
                                    <section
                                        key={status}
                                        id={`match-tab-panel-${status}`}
                                        role="tabpanel"
                                        aria-labelledby={`match-tab-${status}`}
                                        aria-hidden={!isActivePanel}
                                        className={[
                                            'w-full min-w-full shrink-0 snap-start',
                                            isActivePanel ? 'rt-match-panel--enter' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                    >
                                        {status === 'finished' ? (
                                            rows.length === 0 ? (
                                                <EmptyState
                                                    icon={MATCH_EMPTY_STATES.finished.icon}
                                                    title={MATCH_EMPTY_STATES.finished.title}
                                                    description={MATCH_EMPTY_STATES.finished.description}
                                                />
                                            ) : (
                                                <QueueingSessionFinishedMatches rows={rows} />
                                            )
                                        ) : (
                                            <MatchCardsList
                                                status={status}
                                                rows={rows}
                                                canManageMatches={canManageMatches}
                                                canEndMatch={canEndMatch}
                                                busy={busy}
                                                onStartQueuedMatch={onStartQueuedMatch}
                                                onEditMatch={openEditMatchModal}
                                                onRemoveMatch={openRemoveMatchConfirm}
                                                onEndMatch={openFinishMatchModal}
                                            />
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

            <QueueingSessionMatchFabPanel
                session={session}
                sessionId={sessionId}
                canManage={canManageMatches}
                matches={matches}
                onReload={reload}
                onActionError={setActionError}
            />

            {session ? (
                <QueueingSessionMatchLineupModal
                    open={editLineupOpen}
                    mode="edit"
                    session={session}
                    matches={matches}
                    editingMatchId={editingMatchId}
                    editingMatchNo={editingMatchNo}
                    editingMatchStatus={editingMatchStatus}
                    initialTeams={editInitialTeams}
                    busy={busy}
                    onClose={closeEditLineupModal}
                    onSave={onSaveEditMatchLineup}
                />
            ) : null}

            {finishOpen ? (
                <ModalPortal open={finishOpen}>
                    <div className={MODAL_OVERLAY_CLASS}>
                        <div className="rt-end-match-modal-sheet w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl md:max-w-lg">
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
                                        <span className="font-normal capitalize">
                                            {' '}
                                            {finishTeams.team1.length > 0 ? finishTeams.team1.join(', ') : '—'}
                                        </span>
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
                                        <span className="font-normal capitalize">
                                            {' '}
                                            {finishTeams.team2.length > 0 ? finishTeams.team2.join(', ') : '—'}
                                        </span>
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
                </ModalPortal>
            ) : null}

            <ConfirmActionModal
                open={removeMatchConfirm != null}
                title={
                    removeMatchConfirm?.status === 'ongoing'
                        ? `Cancel match${removeMatchConfirm?.matchNo != null ? ` #${removeMatchConfirm.matchNo}` : ''}?`
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
        </AppShell>
    );
}
