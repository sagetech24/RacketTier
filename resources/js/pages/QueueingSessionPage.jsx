import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchGameSession } from '../api/gameSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizedAppPath, queueingSessionNavPaths, queueingSessionTabClass } from '../lib/queueingSessionNav.js';

/**
 * @param {import('../api/gameSession.js').GameSessionDetail['players'] extends (infer U)[] | undefined ? U : never} row
 */
function displayName(row) {
    if (row.is_guest) return row.guest_name || 'Guest';
    return row.user?.name || 'Player';
}

export function QueueingSessionPage() {
    const { id: idParam } = useParams();
    const location = useLocation();
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

    const navPath = normalizedAppPath(location.pathname);
    const queueingNav =
        session != null ? queueingSessionNavPaths(session.id) : { dash: '', players: '', matches: '' };

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
            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-28">
                {loading ? <div className="h-32 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}
                {error ? <p className="text-red-300">{error}</p> : null}

                {session ? (
                    <div className="space-y-6">
                        {session.session_context && session.session_context !== 'queueing' ? (
                            <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                                This session is not a queueing session. Use the facility game room for facility matches.
                            </p>
                        ) : null}
                        {/* <header className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4 mt-1"> */}

                        <section>
                            <article>
                                <div className="flex items-start gap-2 mb-2">
                                    <SportIcon icon={session.sport?.icon} className="text-[#4ce081]" />
                                    <h1 className="mb-4 text-3xl font-extrabold leading-none tracking-tighter md:text-3xl">
                                        {session.queue_name?.trim() ? (
                                            session.queue_name.trim()
                                        ) : (
                                            <>
                                                {session.sport?.name}{' '}
                                                <span className="text-[#c2c1ff]">Queue</span>
                                            </>
                                        )}
                                    </h1>
                                </div>
                                <p className="text-sm text-[#c8c5d2]/90 capitalize">
                                    Game Type: {session.match_type}
                                </p>
                                <p className="text-sm text-[#c8c5d2]/90 capitalize">
                                    Queue Master: {session.created_by?.name ?? 'Unknown'}
                                </p>
                                <p className="mt-1 text-xs text-[#918f9c]">
                                    Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}<br />
                                    Ended: {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}<br />
                                    Total Players: {session.participant_count ?? 0}
                                </p>
                                <div className="mt-3 flex justify-between">
                                    <div className="flex flex-wrap gap-2">
                                        <Link to={queueingNav.dash} className={`${queueingSessionTabClass(navPath === queueingNav.dash)} text-white/70 border-white/70`}>
                                            Dashboard
                                        </Link>
                                        <Link to={queueingNav.players} className={`${queueingSessionTabClass(navPath === queueingNav.players)} text-white/70 border-white/70`}>
                                            Players
                                        </Link>
                                        <Link to={queueingNav.matches} className={`${queueingSessionTabClass(navPath === queueingNav.matches)} text-white/70 border-white/70`}>
                                            Matches
                                        </Link>
                                    </div>
                                    <div className="mb-2 flex items-center justify-between gap-2">
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
                                </div>
                            </article>
                        </section>

                        <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tighter md:text-6xl">
                            Leader<span className="text-[#c2c1ff]">Board</span>
                        </h1>
                        <section className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-xs text-[#918f9c]">
                                            <th className="pb-2 text-left">Player</th>
                                            <th className="pb-2 text-center">W</th>
                                            <th className="pb-2 text-center">L</th>
                                            <th className="pb-2 text-center">TOTAL</th>
                                            <th className="pb-2 text-center">PTS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((p) => (
                                            <tr key={p.id} className="border-t border-[#2a2a2d]">
                                                <td className="py-2 text-left font-medium capitalize">{displayName(p)}</td>
                                                <td className="py-2 text-center">{p.wins_count ?? 0}</td>
                                                <td className="py-2 text-center">{p.losses_count ?? 0}</td>
                                                <td className="py-2 text-center">{(p.wins_count ?? 0) + (p.losses_count ?? 0)}</td>
                                                <td className="py-2 text-center">{p.session_points == null ? '—' : p.session_points}</td>
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
