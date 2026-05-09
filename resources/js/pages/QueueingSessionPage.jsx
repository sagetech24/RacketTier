import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchGameSession } from '../api/gameSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * @param {import('../api/gameSession.js').GameSessionDetail['players'] extends (infer U)[] | undefined ? U : never} row
 */
function displayName(row) {
    if (row.is_guest) return row.guest_name || 'Guest';
    return row.user?.name || 'Player';
}

export function QueueingSessionPage() {
    const { id: idParam } = useParams();
    const sessionId = idParam && /^\d+$/.test(idParam) ? Number.parseInt(idParam, 10) : null;
    const { user } = useAuth();

    const [session, setSession] = useState(/** @type {import('../api/gameSession.js').GameSessionDetail | null} */ (null));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        if (!session?.is_active) return undefined;
        const t = window.setInterval(() => {
            reload().catch(() => {});
        }, 4000);
        return () => window.clearInterval(t);
    }, [session?.is_active, reload]);

    const leaderboard = useMemo(() => {
        if (!session?.players) return [];
        const rows = [...session.players];
        rows.sort((a, b) => {
            const pa = a.session_points ?? -1;
            const pb = b.session_points ?? -1;
            if (pb !== pa) return pb - pa;
            return (b.wins_count ?? 0) - (a.wins_count ?? 0);
        });
        return rows;
    }, [session?.players]);

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
            <main className="mx-auto min-h-screen max-w-lg px-4 pb-32 pt-24">
                {loading ? <div className="h-32 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="text-red-300">{error}</p> : null}

                {session ? (
                    <div className="space-y-6">
                        {session.session_context && session.session_context !== 'queueing' ? (
                            <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                                This session is not a queueing session. Use the facility game room for facility matches.
                            </p>
                        ) : null}
                        <header className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4 mt-1">
                            <div className="mb-2 flex items-center gap-2">
                                <SportIcon icon={session.sport?.icon} className="text-2xl text-[#4ce081]" />
                                <h1 className="text-xl font-extrabold">{session.sport?.name} Queue</h1>
                            </div>
                            <p className="text-sm text-[#c8c5d2]/80">
                                Game Type: {session.match_type}
                            </p>
                            <p className="text-sm text-[#c8c5d2]/80">
                                Queue Master: {session.created_by?.name ?? 'Unknown'}
                            </p>
                            <p className="text-sm text-[#c8c5d2]/80">
                                Win +{session.win_points ?? '—'} / Loss +
                                {session.loss_points ?? '—'}
                            </p>
                            <p className="mt-2 text-xs text-[#918f9c]">
                                Status: <span className="font-bold text-[#e4e1e6] capitalize">{session.status}</span>
                            </p>
                            <div className="mt-3">
                                <div className="flex flex-wrap gap-2">
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
                            </div>
                        </header>

                        <h2 className="mb-3 text-lg font-bold uppercase tracking-wide text-[#918f9c]">Leaderboard</h2>
                        <section className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-xs text-[#918f9c]">
                                            <th className="pb-2 pr-2">Player</th>
                                            <th className="pb-2 pr-2">W</th>
                                            <th className="pb-2 pr-2">L</th>
                                            <th className="pb-2 pr-2">TOTAL</th>
                                            <th className="pb-2 pr-2">PTS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((p) => (
                                            <tr key={p.id} className="border-t border-[#2a2a2d]">
                                                <td className="py-2 pr-2 font-medium capitalize">{displayName(p)}</td>
                                                <td className="py-2 pr-2">{p.wins_count ?? 0}</td>
                                                <td className="py-2 pr-2">{p.losses_count ?? 0}</td>
                                                <td className="py-2 pr-2">{(p.wins_count ?? 0) + (p.losses_count ?? 0)}</td>
                                                <td className="py-2 pr-2">{p.session_points == null ? '—' : p.session_points}</td>
                                            </tr>
                                        ))}
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
