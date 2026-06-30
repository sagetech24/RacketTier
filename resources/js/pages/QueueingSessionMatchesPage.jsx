import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchGameSession, postFinishGameSessionMatch } from '../api/gameSession.js';
import {
    deleteQueueingSessionMatch,
    patchUpdateQueueingSessionMatch,
    postEndQueueingSession,
    postStartQueueingSessionMatch,
} from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { QueueingSessionEndLoadingOverlay } from '../components/queueing/QueueingSessionEndLoadingOverlay.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { QueueingSessionMatchFabPanel } from '../components/queueing/QueueingSessionMatchFabPanel.jsx';
import { QueueingSessionMatchLineupModal } from '../components/queueing/QueueingSessionMatchLineupModal.jsx';
import { lineupToTeams } from '../lib/queueingMatchLineup.js';
import {
    useInvalidateQueueingSession,
    useQueueingSessionMatchesQuery,
    useQueueingSessionQuery,
} from '../hooks/queries/useQueueingSessionQuery.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

const MATCH_STATUS_TABS = ['ongoing', 'queueing', 'finished'];

/** @type {Record<string, string>} */
const MATCH_TAB_LABELS = {
    ongoing: 'Playing',
    queueing: 'Queueing',
    finished: 'Finished',
};

function sectionTitle(status) {
    if (status === 'queueing') return 'Queueing';
    if (status === 'ongoing') return 'Playing';
    if (status === 'finished') return 'Finished';
    return status;
}

/** @param {boolean} active */
function matchStatusTabClass(active) {
    return active
        ? 'bg-[#c2c1ff]/25 text-white border-[#c2c1ff]/50'
        : 'bg-transparent text-[#918f9c] border-transparent hover:text-[#e4e1e6]';
}

/** @param {{ status?: string }} props */
function MatchStatusIndicator({ status }) {
    const label = sectionTitle(status);
    const circleClass =
        status === 'ongoing'
            ? 'rt-match-status-circle rt-match-status-circle-ongoing'
            : status === 'finished'
              ? 'rt-match-status-circle rt-match-status-circle-finished'
              : 'rt-match-status-circle rt-match-status-circle-queueing';

    return (
        <span className="inline-flex items-center" role="status" aria-label={label} title={label}>
            <span className={circleClass} aria-hidden />
        </span>
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
    const base = 'text-lg font-semibold capitalize md:text-xl';
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
        return (
            <p className="flex min-h-18 items-center justify-center rounded-xl border border-[#45454a] bg-[#1b1b1e] text-sm italic text-[#918f9c] md:col-span-2">
                No {sectionTitle(status).toLowerCase()} matches.
            </p>
        );
    }

    return (
        <ul className="rt-match-cards-grid space-y-3 md:space-y-0">
            {rows.map((row) => (
                <li
                    key={row.id}
                    className={`rounded-xl border p-4 ${
                        row.status === 'ongoing'
                            ? 'rt-ongoing-match-card border-orange-400'
                            : row.status === 'finished'
                              ? 'rt-finished-match-card'
                              : 'border-[#45454a] bg-[#1b1b1e]'
                    }`}
                >
                    <div className="mb-2 flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 text-xl font-semibold leading-snug text-[#e4e1e6]">
                            <LineupDisplay lineup={row.lineup} status={row.status} winningTeam={row.winning_team} />
                        </p>
                        <MatchStatusIndicator status={row.status} />
                    </div>
                    <div className="mb-2 flex flex-col gap-0.5 text-xs text-[#918f9c] md:flex-row md:flex-wrap md:gap-x-4">
                        <span>
                            <span className="font-bold">Started:</span>
                            <span className="font-normal"> {formatTime(row.started_at)}</span>
                        </span>
                        <span>
                            <span className="font-bold">Finished:</span>
                            <span className="font-normal"> {formatTime(row.finished_at)}</span>
                        </span>
                    </div>
                    <p
                        className={`mt-1 text-sm text-[#c8c5d2] ${
                            row.winning_team == null && (row.team1_score == null || row.team2_score == null)
                                ? 'hidden'
                                : 'mb-4'
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
                    {canManageMatches && row.status === 'queueing' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onStartQueuedMatch(row.id)}
                                className="rounded-full bg-[#A2A2D4] px-3 py-1 text-xs font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Start
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onEditMatch(row)}
                                className="rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/15 px-3 py-1 text-xs font-bold text-[#c2c1ff] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onRemoveMatch(row)}
                                className="rounded-full border border-red-400/30 bg-red-400/20 px-3 py-1 text-xs font-bold text-red-400/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Remove
                            </button>
                        </div>
                    ) : null}
                    {canManageMatches && row.status === 'ongoing' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {canEndMatch ? (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onEndMatch(row)}
                                    className="rounded-full bg-[#e4b555] px-3 py-1 text-xs font-bold text-[#714e07] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    End
                                </button>
                            ) : null}
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onRemoveMatch(row)}
                                className="rounded-full border border-red-400/30 bg-red-400/20 px-3 py-1 text-xs font-bold text-red-400/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : null}
                </li>
            ))}
        </ul>
    );
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
            <span className="mx-1.5 text-lg text-[#e4e1e6] md:text-xl">VS</span>
            {' '}
            <span className={lineupTeamSideClass(status, winningTeam, 2)}>{right}</span>
        </>
    );
}

export function QueueingSessionMatchesPage() {
    const { id: idParam } = useParams();
    const navigate = useNavigate();
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
    const [editInitialTeams, setEditInitialTeams] = useState({ team1: [], team2: [] });
    const [stopSessionOpen, setStopSessionOpen] = useState(false);
    const [endingSession, setEndingSession] = useState(false);
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
        setEditInitialTeams({ team1: [], team2: [] });
    }

    /**
     * @param {{ id?: number, match_no?: number, lineup?: unknown }} row
     */
    function openEditMatchModal(row) {
        setActionError('');
        setEditingMatchId(row.id ?? null);
        setEditingMatchNo(row.match_no ?? null);
        setEditInitialTeams(lineupToTeams(row.lineup));
        setEditLineupOpen(true);
    }

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

    async function onStopQueueSession() {
        if (sessionId == null || endingSession) return;
        setActionError('');
        setStopSessionOpen(false);
        setEndingSession(true);
        try {
            await postEndQueueingSession(sessionId);
            navigate(`/queueing-session/${sessionId}`);
        } catch (e) {
            setEndingSession(false);
            setActionError(e instanceof Error ? e.message : 'Could not stop session.');
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
    const canStopSession = Boolean(session?.can_manage) && Boolean(session?.is_active);
    const canEndMatch = canManageMatches && session?.status === 'ongoing';
    const hasOngoingMatchRecord = matches.some((row) => row.status === 'ongoing');
    const hasStaleOngoingSession = session?.status === 'ongoing' && !hasOngoingMatchRecord;
    const isAdmin = Boolean(user?.is_admin);
    const canForceEndSession = canStopSession && isAdmin && hasOngoingMatchRecord;
    const blockEndSession = hasOngoingMatchRecord && !isAdmin;

    const queueSessionLabel =
        session?.queue_name?.trim() ||
        (session?.sport?.name ? `${session.sport.name} queue` : 'this queue session');

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36 md:max-w-3xl md:px-8 md:pb-20 md:pt-32 lg:max-w-5xl">
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
                    <div className="space-y-4">
                        <div>
                            <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                                {sectionTitle(activeMatchTab ?? 'ongoing')}{' '}
                                <span className="text-[#c2c1ff]">Matches</span>
                            </h1>
                            <div
                                className="mb-4 flex w-full rounded-xl border border-[#45454a] bg-[#1b1b1e] p-1"
                                role="tablist"
                                aria-label="Match status"
                            >
                                {availableMatchTabs.map((tab) => {
                                    const count = (grouped[tab] ?? []).length;
                                    const isActive = tab === activeMatchTab;
                                    return (
                                        <button
                                            key={tab}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`match-tab-panel-${tab}`}
                                            id={`match-tab-${tab}`}
                                            onClick={() => setActiveMatchTab(tab)}
                                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors md:px-3 md:py-2.5 md:text-sm ${matchStatusTabClass(isActive)}`}
                                        >
                                            <span>{MATCH_TAB_LABELS[tab]}</span>
                                            {count > 0 ? (
                                                <span className="tabular-nums text-[10px] opacity-80">({count})</span>
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
                            {availableMatchTabs.map((status) => (
                                <section
                                    key={status}
                                    id={`match-tab-panel-${status}`}
                                    role="tabpanel"
                                    aria-labelledby={`match-tab-${status}`}
                                    aria-hidden={status !== activeMatchTab}
                                    className="w-full min-w-full shrink-0 snap-start"
                                >
                                    <MatchCardsList
                                        status={status}
                                        rows={grouped[status] ?? []}
                                        canManageMatches={canManageMatches}
                                        canEndMatch={canEndMatch}
                                        busy={busy}
                                        onStartQueuedMatch={onStartQueuedMatch}
                                        onEditMatch={openEditMatchModal}
                                        onRemoveMatch={openRemoveMatchConfirm}
                                        onEndMatch={openFinishMatchModal}
                                    />
                                </section>
                            ))}
                        </div>
                    </div>
                ) : null}
            </main>

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
                    initialTeams={editInitialTeams}
                    busy={busy}
                    onClose={closeEditLineupModal}
                    onSave={onSaveEditMatchLineup}
                />
            ) : null}

            {finishOpen ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center p-4 sm:items-center md:p-6">
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
                title={canForceEndSession ? 'Force stop queue session?' : 'Stop queue session?'}
                description={
                    canForceEndSession
                        ? `This will cancel the ongoing match, close pending matches, and permanently end ${queueSessionLabel} for all players. No scores or rankings will be recorded for cancelled matches.`
                        : `This permanently ends ${queueSessionLabel} for all players. No new matches can be started and the session will show as finished.`
                }
                busy={busy}
                confirmDisabled={blockEndSession}
                confirmLabel={canForceEndSession ? 'Force stop session' : 'Stop session'}
                confirmBusyLabel={canForceEndSession ? 'Force stopping…' : 'Stopping…'}
                onCancel={() => setStopSessionOpen(false)}
                onConfirm={() => void onStopQueueSession()}
            >
                {blockEndSession ? (
                    <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                        Finish or cancel the ongoing match before stopping the session.
                    </p>
                ) : null}
                {hasStaleOngoingSession ? (
                    <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                        Session status was out of sync. Ending will clear stale player states and close the session.
                    </p>
                ) : null}
                {canForceEndSession ? (
                    <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                        Admin override: ongoing and queued matches will be closed without recording results.
                    </p>
                ) : null}
            </ConfirmActionModal>

            <QueueingSessionEndLoadingOverlay
                open={endingSession}
                queueName={session?.queue_name ?? session?.sport?.name}
            />

            <DashboardMobileNav />
        </div>
    );
}
