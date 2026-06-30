import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchQueueingSessionSummary } from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { QueueingSessionMatchFabPanel } from '../components/queueing/QueueingSessionMatchFabPanel.jsx';
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

/** @param {number} [wins] @param {number} [losses] */
function winRateLabel(wins, losses) {
    const w = wins ?? 0;
    const l = losses ?? 0;
    const total = w + l;
    if (total === 0) return '—';
    return `${Math.round((w / total) * 100)}%`;
}

const CROWN_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

/** @param {{ color: string }} props */
function RankingCrownIcon({ color }) {
    return (
        <svg className="opacity-70" fill={color} height="20" width="20" viewBox="0 0 246.001 246.001" aria-hidden="true">
            <path d="M211.667,238.5c0,4.142-3.358,7.5-7.5,7.5h-163c-4.142,0-7.5-3.358-7.5-7.5v-16c0-4.142,3.358-7.5,7.5-7.5h163 c4.142,0,7.5,3.358,7.5,7.5V238.5z M241.748,0.74c-3.043-1.458-6.683-0.71-8.899,1.83l-59.492,68.199l-44.08-67.375 C127.891,1.277,125.53,0,123,0s-4.891,1.276-6.276,3.394L72.627,70.795L13.137,3.012C10.914,0.481,7.277-0.26,4.24,1.204 c-3.034,1.465-4.72,4.773-4.12,8.089l33,182.541c0.645,3.57,3.752,6.166,7.38,6.166h165c3.629,0,6.737-2.598,7.381-6.169l33-183 C246.48,5.512,244.788,2.2,241.748,0.74z" />
        </svg>
    );
}

/**
 * @param {{ p: { wins?: number, losses?: number, total_matches?: number, earned_points?: number }, omitPoints?: boolean }} props
 */
function LeaderboardStats({ p, omitPoints = false }) {
    const wins = p.wins ?? 0;
    const losses = p.losses ?? 0;
    const total = p.total_matches ?? wins + losses;
    const points = p.earned_points ?? 0;
    const winPct = winRateLabel(wins, losses);

    return (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] uppercase tracking-wider text-[#c8c5d2] md:gap-x-4">
            <span className="inline-flex items-center normal-case">
                <span className="inline-flex items-center gap-0.5">
                    <MaterialIcon name="arrow_upward" className="text-[13px]! text-[#4ce081]" />
                    <span className="font-bold tabular-nums text-[#4ce081]">{wins}</span>
                </span>
                <span className="text-[#918f9c]">-</span>
                <span className="inline-flex items-center gap-0.5">
                    <MaterialIcon name="arrow_downward" className="text-[13px]! text-red-300/90" />
                    <span className="font-bold tabular-nums text-red-300/90">{losses}</span>
                </span>
            </span>
            {/* <span>
                <span className="font-bold text-[#e4e1e6]">{total}</span> Total
            </span> */}
            {!omitPoints ? (
                <span>
                    <span className="font-bold text-[#c2c1ff]">{points}</span> PTS
                </span>
            ) : null}
            <span>
                <span className="font-bold text-[#e4e1e6]">{winPct}</span> Win%
            </span>
        </div>
    );
}

const currentUserHighlight =
    'ring-2 ring-[#c2c1ff]/60 bg-linear-to-br from-[#c2c1ff]/30 to-[#c2c1ff]/10';

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
            //   { label: 'ELO Δ (sum)', value: totals.elo_rating_change_sum ?? 0, signed: true },
            //   { label: 'Wins', value: totals.wins_recorded ?? 0 },
            //   { label: 'Losses', value: totals.losses_recorded ?? 0 },
          ]
        : [];

    if (sessionId == null) {
        return (
            <div className="dashboard-v2-shell bg-[#131316] p-8 text-[#e4e1e6]">
                <p>Invalid session.</p>
                <Link to="/dashboard" className="text-[#4ce081]">
                    Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36 md:max-w-3xl md:px-8 md:pb-20 md:pt-32 lg:max-w-5xl">
                {loading ? <div className="h-32 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="text-red-300">{error}</p> : null}
                {actionError ? <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{actionError}</p> : null}

                {session ? (
                    <div className="space-y-6">
                        {session.session_context && session.session_context !== 'queueing' ? (
                            <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                                This session is not a queueing session. Use the facility game room for facility matches.
                            </p>
                        ) : null}

                        <section>
                            <QueueingSessionHeader session={session} />
                        </section>

                        {isViewOnly ? (
                            <section>
                                <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                                    Session <span className="text-[#c2c1ff]">Summary</span>
                                </h1>
                                {summaryLoading ? (
                                    <div className="h-16 animate-pulse rounded-xl bg-[#2a2a2d]" />
                                ) : null}
                                {!summaryLoading && totals ? (
                                    <dl className="grid grid-cols-3 gap-3 text-sm md:gap-4">
                                        {summaryItems.map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-lg border border-[#313137] bg-[#1e1e22] px-3 py-2 md:px-4 md:py-3"
                                            >
                                                <dt className="text-xs text-[#918f9c]">{item.label}</dt>
                                                <dd className="mt-0.5 font-bold tabular-nums text-xl">
                                                    {item.signed && Number(item.value) > 0 ? '+' : ''}
                                                    {item.value}
                                                </dd>
                                            </div>
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

                        <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tighter md:text-4xl">
                            Leader<span className="text-[#c2c1ff]">Board</span>
                        </h1>
                        {isViewOnly ? (
                            <p className="-mt-2 mb-3 text-xs text-[#918f9c]">
                                Final Standings after the session ended.
                            </p>
                        ) : null}
                        <section className="flex flex-col gap-3">
                            {leaderboard.length === 0 ? (
                                <div className="rounded-xl border border-[#2a2a2d] bg-[#1f1f22] px-4 py-6 text-center text-sm text-[#918f9c]">
                                    No players in this session.
                                </div>
                            ) : null}

                            {topThree.length > 0 ? (
                                <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-3">
                                    {topThree.map((p, idx) => {
                                        const isYou = user?.id != null && p.user_id === user.id;
                                        const points = p.earned_points ?? 0;
                                        return (
                                            <div
                                                key={p.rank ?? idx}
                                                className={
                                                    idx === 0
                                                        ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#c2c1ff]/10 to-transparent p-px'
                                                        : idx === 1
                                                          ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#4ce081]/5 to-transparent p-px'
                                                          : isYou
                                                            ? 'overflow-hidden rounded-xl bg-linear-to-br from-[#c2c1ff]/20 to-transparent p-px'
                                                            : ''
                                                }
                                            >
                                                <div
                                                    className={`relative flex items-center gap-4 rounded-xl bg-[#1f1f22] p-4 md:h-full md:flex-col md:items-stretch md:gap-3 md:p-5 md:text-center${isYou ? ` ${currentUserHighlight}` : ''}`}
                                                >
                                                    <div className="flex flex-col items-start md:items-center">
                                                        <div className="min-w-6 text-2xl font-extrabold">
                                                            <RankingCrownIcon color={CROWN_COLORS[idx] ?? CROWN_COLORS[2]} />
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 flex-1 md:flex-none">
                                                        <h3 className="font-bold capitalize text-[#e4e1e6] md:text-lg">
                                                            {p.name ?? 'Player'}
                                                            {isYou ? (
                                                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                                                    You
                                                                </span>
                                                            ) : null}
                                                        </h3>
                                                        {p.is_guest ? (
                                                            <p className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">
                                                                Guest
                                                            </p>
                                                        ) : null}
                                                        <div className="md:hidden">
                                                            <LeaderboardStats p={p} omitPoints />
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 text-right md:text-center">
                                                        <div className="text-xl font-extrabold italic text-[#c2c1ff]">
                                                            {points}
                                                        </div>
                                                        <div className="text-sm font-bold text-[#c8c5d2]">PTS</div>
                                                        <div className="hidden md:flex md:w-full md:justify-center mt-4">
                                                            <LeaderboardStats p={p} omitPoints />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            <div className="flex flex-col gap-2 md:gap-3">
                                {restLeaderboard.map((p, idx) => {
                                    const isYou = user?.id != null && p.user_id === user.id;
                                    const points = p.earned_points ?? 0;
                                    return (
                                        <div
                                            key={p.rank ?? idx + 3}
                                            className={`group flex items-center gap-4 rounded-xl border border-[#2a2a2d] bg-[#1f1f22] p-4 transition-colors hover:border-[#45454a] hover:bg-[#1b1b1e] md:px-5 md:py-4${isYou ? ` ${currentUserHighlight}` : ''}`}
                                        >
                                            <div className="w-6 shrink-0 text-center font-bold text-[#c8c5d2] transition-colors group-hover:text-[#c2c1ff]">
                                                <span className="text-2xl font-extrabold italic text-[#c8c5d2]">
                                                    {p.rank ?? idx + 4}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-semibold capitalize text-[#e4e1e6]">
                                                    {p.name ?? 'Player'}
                                                    {isYou ? (
                                                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                                            You
                                                        </span>
                                                    ) : null}
                                                </h4>
                                                {p.is_guest ? (
                                                    <span className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">
                                                        Guest
                                                    </span>
                                                ) : null}
                                                <LeaderboardStats p={p} omitPoints />
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <div className="text-xl font-extrabold italic text-[#c2c1ff]">
                                                    {points}
                                                </div>
                                                <div className="text-sm font-bold text-[#c8c5d2]">PTS</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                ) : null}
            </main>

            <QueueingSessionMatchFabPanel
                session={session}
                sessionId={sessionId}
                canManage={canManageMatches}
                onReload={reload}
                onActionError={setActionError}
            />

            <DashboardMobileNav />
        </div>
    );
}
