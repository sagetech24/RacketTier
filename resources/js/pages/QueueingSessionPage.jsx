import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchQueueingSessionSummary } from '../api/queueingSession.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { QueueingSessionDashboardLoading } from '../components/queueing/QueueingSessionDashboardLoading.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { QueueingSessionListRow } from '../components/queueing/QueueingSessionListRow.jsx';
import { QueueingSessionMatchFabPanel } from '../components/queueing/QueueingSessionMatchFabPanel.jsx';
import { QueueingSessionPodiumCard } from '../components/queueing/QueueingSessionPodiumCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
    useInvalidateQueueingSession,
    useQueueingSessionQuery,
} from '../hooks/queries/useQueueingSessionQuery.js';
/**
 * @param {import('../api/gameSession.js').GameSessionDetail['players'] extends (infer U)[] | undefined ? U : never} row
 */
function displayName(row) {
    if (row.is_guest) return row.guest_name || 'Guest';
    return row.user?.name || 'Player';
}

/**
 * @param {{ label: string; value: number | string; signed?: boolean }} props
 */
function SummaryStatCard({ label, value, signed = false }) {
    return (
        <div className="rt-qs-dash-summary-stat rounded-xl border border-white/5 bg-[#1b1b1e] px-3 py-3 md:px-4 md:py-3.5">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold tabular-nums text-[#e4e1e6]">
                {signed && Number(value) > 0 ? '+' : ''}
                {value}
            </dd>
        </div>
    );
}

export function QueueingSessionPage() {
    const { id: idParam } = useParams();
    const sessionId = idParam && /^\d+$/.test(idParam) ? Number.parseInt(idParam, 10) : null;
    const { user } = useAuth();
    const invalidateQueueingSession = useInvalidateQueueingSession();
    const {
        data: session = null,
        isLoading: loading,
        isError,
        refetch,
    } = useQueueingSessionQuery(sessionId);

    const [summary, setSummary] = useState(/** @type {Record<string, unknown> | null} */ (null));
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    const error = sessionId == null ? 'Invalid session.' : isError ? 'Could not load this session.' : '';

    const isViewOnly = Boolean(session && !session.is_active);
    const canManageMatches = Boolean(session?.can_manage) && Boolean(session?.is_active);

    const reload = useCallback(async () => {
        if (sessionId == null) return;
        invalidateQueueingSession(sessionId);
        await refetch();
    }, [invalidateQueueingSession, refetch, sessionId]);

    useEffect(() => {
        if (!session || session.is_active) {
            setSummary(null);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            setSummaryLoading(true);
            try {
                const data = await fetchQueueingSessionSummary(sessionId);
                if (!cancelled) setSummary(data);
            } catch {
                if (!cancelled) setSummary(null);
            } finally {
                if (!cancelled) setSummaryLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [session, sessionId]);

    const leaderboard = useMemo(() => {
        const summaryPlayers = summary?.players;
        if (Array.isArray(summaryPlayers) && summaryPlayers.length > 0) {
            return summaryPlayers;
        }
        if (!session?.players) return [];
        const rows = [...session.players];
        rows.sort((a, b) => {
            const pa = a.session_points ?? -1;
            const pb = b.session_points ?? -1;
            if (pb !== pa) return pb - pa;
            return (b.wins_count ?? 0) - (a.wins_count ?? 0);
        });
        return rows.map((p, idx) => ({
            rank: idx + 1,
            name: displayName(p),
            user_id: p.user?.id ?? null,
            wins: p.wins_count ?? 0,
            losses: p.losses_count ?? 0,
            total_matches: (p.wins_count ?? 0) + (p.losses_count ?? 0),
            earned_points: p.session_points ?? 0,
            is_guest: Boolean(p.is_guest),
            skill_level: p.skill_level ?? null,
        }));
    }, [session?.players, summary?.players]);

    const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
    const restLeaderboard = useMemo(() => leaderboard.slice(3), [leaderboard]);

    const totals = summary?.totals;

    const summaryItems = totals
        ? [
              { label: 'Matches', value: totals.matches ?? 0 },
              { label: 'Players', value: totals.players ?? 0 },
              { label: 'Points awarded', value: totals.points_awarded ?? totals.points_awarded_members ?? 0 },
          ]
        : [];

    const showInitialSkeleton = loading && !session && !error;
    const isRefreshing = loading && Boolean(session) && !showInitialSkeleton;
    const contentKey = `${sessionId}-${session?.updated_at ?? 'loading'}`;

    if (sessionId == null) {
        return (
            <AppShell user={user}>
                <p>Invalid session.</p>
                <Link to="/dashboard" className="text-[#4ce081]">
                    Dashboard
                </Link>
            </AppShell>
        );
    }

    return (
        <AppShell user={user}>
            {showInitialSkeleton ? <QueueingSessionDashboardLoading /> : null}

            {!showInitialSkeleton ? (
                <>
                    {error ? <p className="rt-alert-error mb-4">{error}</p> : null}
                    {actionError ? (
                        <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                            {actionError}
                        </p>
                    ) : null}

                    {session ? (
                        <div
                            key={contentKey}
                            className={[
                                'rt-qs-dash-content space-y-8',
                                isRefreshing ? 'rt-qs-dash-content--refreshing' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-busy={isRefreshing}
                        >
                            {session.session_context && session.session_context !== 'queueing' ? (
                                <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                                    This session is not a queueing session. Use the facility game room for facility
                                    matches.
                                </p>
                            ) : null}

                            <section className="rt-qs-dash-header--enter">
                                <QueueingSessionHeader session={session} />
                            </section>

                            {isViewOnly ? (
                                <section className="rt-qs-dash-summary--enter" aria-label="Session summary">
                                    <h2 className="mb-1 text-2xl font-extrabold leading-none tracking-tighter md:text-3xl">
                                        Session <span className="text-[#c2c1ff]">Summary</span>
                                    </h2>
                                    <p className="mb-4 text-sm text-[#918f9c]">Final totals from this queue.</p>
                                    {summaryLoading ? (
                                        <div className="grid grid-cols-3 gap-3">
                                            {[1, 2, 3].map((n) => (
                                                <div
                                                    key={n}
                                                    className="rt-skeleton h-18 rounded-xl md:h-20"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                    {!summaryLoading && totals ? (
                                        <dl className="grid grid-cols-3 gap-3 md:gap-4">
                                            {summaryItems.map((item) => (
                                                <SummaryStatCard key={item.label} label={item.label} value={item.value} />
                                            ))}
                                        </dl>
                                    ) : null}
                                    {!summaryLoading && !totals ? (
                                        <p className="text-sm text-[#918f9c]">
                                            {session.completed_matches_count
                                                ? 'Summary stats are unavailable.'
                                                : 'No matches were recorded in this session.'}
                                        </p>
                                    ) : null}
                                </section>
                            ) : null}

                            <section aria-label="Session leaderboard">
                                <div className="rt-qs-dash-leaderboard-head mb-5 flex flex-wrap items-end justify-between gap-3">
                                    <div className="w-full">
                                        <div className="flex items-center justify-between gap-3">
                                            <h2 className="text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                                                Leader<span className="text-[#c2c1ff]">board</span>
                                            </h2>
                                            {leaderboard.length > 0 ? (
                                                <span className="rt-qs-dash-stats rt-qs-dash-stats--enter border border-white/40 rounded-full px-4 py-1 md:text-lg! text-xs!">
                                                    <MaterialIcon name="groups" />
                                                    <span>
                                                        <strong>{leaderboard.length}</strong> players
                                                    </span>
                                                </span>
                                            ) : null}
                                        </div>
                                        {isViewOnly ? (
                                            <p className="mt-2 text-sm text-[#918f9c] md:text-lg">
                                                Final standings after the session ended.
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-sm text-[#918f9c] md:text-lg">
                                                Live session points — updated after each match.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {leaderboard.length === 0 ? (
                                    <EmptyState
                                        icon="groups"
                                        title="No players yet"
                                        description="Add players from the Players tab to start tracking standings."
                                        actionLabel="Manage players"
                                        actionTo={`/queueing-session/${sessionId}/players`}
                                    />
                                ) : null}

                                {topThree.length > 0 ? (
                                    <div className="mb-6">
                                        <div className="rt-ranking-podium">
                                            {topThree.map((player, idx) => (
                                                <QueueingSessionPodiumCard
                                                    key={`${player.rank ?? idx}-${player.name}`}
                                                    player={player}
                                                    place={idx}
                                                    isYou={user?.id != null && player.user_id === user.id}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {restLeaderboard.length > 0 ? (
                                    <div>
                                        <div className="rt-ranking-list flex flex-col gap-2 md:gap-3">
                                            {restLeaderboard.map((player) => (
                                                <QueueingSessionListRow
                                                    key={`${player.rank}-${player.name}`}
                                                    player={player}
                                                    isYou={user?.id != null && player.user_id === user.id}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </section>
                        </div>
                    ) : null}
                </>
            ) : null}

            <QueueingSessionMatchFabPanel
                session={session}
                sessionId={sessionId}
                canManage={canManageMatches}
                onReload={reload}
                onActionError={setActionError}
            />
        </AppShell>
    );
}
