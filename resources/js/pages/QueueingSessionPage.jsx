import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchGameSession } from '../api/gameSession.js';
import { fetchQueueingSessionSummary } from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { QueueingSessionHeader } from '../components/queueing/QueueingSessionHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling.js';

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

/** @param {number} rank */
function formatRankLabel(rank) {
    if(rank === 1) return <span className="text-[#c2c1ff] font-bold text-lg">1<sup className="font-normal italic">st</sup></span>;
    if(rank === 2) return <span className="text-[#c2c1ff] font-bold text-lg">2<sup className="font-normal italic">nd</sup></span>;
    if(rank === 3) return <span className="text-[#c2c1ff] font-bold text-lg">3<sup className="font-normal italic">rd</sup></span>;
    if(rank === 4) return <span className="text-[#c2c1ff] font-bold text-lg">4<sup className="font-normal italic">th</sup></span>;
    return String(rank);
}

export function QueueingSessionPage() {
    const { id: idParam } = useParams();
    const sessionId = idParam && /^\d+$/.test(idParam) ? Number.parseInt(idParam, 10) : null;
    const { user } = useAuth();

    const [session, setSession] = useState(/** @type {import('../api/gameSession.js').GameSessionDetail | null} */ (null));
    const [summary, setSummary] = useState(/** @type {Record<string, unknown> | null} */ (null));
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [error, setError] = useState('');

    const isViewOnly = Boolean(session && !session.is_active);

    const reload = useCallback(async () => {
        if (sessionId == null) return;
        const data = await fetchGameSession(String(sessionId));
        setSession(data);
    }, [sessionId]);

    useEffect(() => {
        if (sessionId == null) {
            setError('Invalid session.');
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setError('');
            setLoading(true);
            try {
                const data = await fetchGameSession(String(sessionId));
                if (!cancelled) setSession(data);
            } catch {
                if (!cancelled) setError('Could not load this session.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

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

    useVisibilityPolling(
        () => reload(),
        { enabled: Boolean(session?.is_active), intervalMs: 10_000 },
    );

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
            wins: p.wins_count ?? 0,
            losses: p.losses_count ?? 0,
            total_matches: (p.wins_count ?? 0) + (p.losses_count ?? 0),
            earned_points: p.session_points ?? 0,
            is_guest: Boolean(p.is_guest),
        }));
    }, [session?.players, summary?.players]);

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
                        <section className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4 md:p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm md:text-base">
                                    <thead>
                                        <tr className="text-xs text-[#918f9c] md:text-sm">
                                            <th className="w-12 px-2 pb-2 text-left md:px-3">#</th>
                                            <th className="pb-2 text-left md:pr-4">Player</th>
                                            <th className="px-2 pb-2 text-center md:px-3">W</th>
                                            <th className="pb-2 text-center md:px-3">L</th>
                                            <th className="pb-2 text-center md:px-3">TOTAL</th>
                                            <th className="pb-2 text-center md:px-3">PTS</th>
                                            <th className="pb-2 text-right md:pl-3">Win%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-4 text-center text-[#918f9c]">
                                                    No players in this session.
                                                </td>
                                            </tr>
                                        ) : (
                                            leaderboard.map((p, idx) => (
                                                <tr key={p.rank ?? idx} className={`border-t border-[#2a2a2d] ${idx < 4 ? 'text-md font-bold text-[#c2c1ff] md:text-base' : 'text-[#b2acc5]'}`}>
                                                    <td className="px-2 py-2 text-left md:px-3 md:py-2.5">
                                                        {formatRankLabel(p.rank ?? idx + 1)}
                                                    </td>
                                                    <td className="flex flex-col items-start justify-start py-2 text-left font-medium capitalize md:py-2.5">
                                                        <span className="line-clamp-1 text-md leading-none md:text-base">{p.name ?? 'Player'}</span>
                                                        {p.is_guest ? (
                                                            <span className="text-[9px] font-normal">
                                                                (guest)
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-2 py-2 text-center md:px-3 md:py-2.5">{p.wins ?? 0}</td>
                                                    <td className="py-2 text-center md:py-2.5">{p.losses ?? 0}</td>
                                                    <td className="py-2 text-center md:py-2.5">
                                                        {p.total_matches ?? (p.wins ?? 0) + (p.losses ?? 0)}
                                                    </td>
                                                    <td className="py-2 text-center md:py-2.5">
                                                        {p.earned_points ?? 0}
                                                    </td>
                                                    <td className="py-2 text-right md:py-2.5">
                                                        {winRateLabel(p.wins, p.losses)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                ) : null}
            </main>

            <DashboardMobileNav />
        </div>
    );
}
