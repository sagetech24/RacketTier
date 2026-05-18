import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchQueueingSessions } from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizedAppPath, queueingSessionNavPaths, queueingSessionTabClass } from '../lib/queueingSessionNav.js';

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

/**
 * @param {{ row: import('../api/gameSession.js').GameSessionDetail, navPath: string, viewOnly: boolean }} props
 */
function QueueingSessionCard({ row, navPath, viewOnly }) {
    const paths = queueingSessionNavPaths(row.id);
    return (
        <article
            className={`rounded-xl border bg-[#1b1b1e] p-4 ${
                viewOnly ? 'border-[#2a2a2d]' : 'border-[#3c3c3e]'
            }`}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold">
                    <SportIcon icon={row.sport?.icon} className="text-[#4ce081]" />
                    {row.queue_name?.trim()
                        ? row.queue_name.trim()
                        : `${row.sport?.name ?? 'Sport'} Queue`}
                </h2>
                <QueueSessionCardBadges row={row} viewOnly={viewOnly} />
            </div>
            <p className="text-sm text-[#c8c5d2]/90 capitalize">
                {row.match_type} · Queue Master: {row.created_by?.name ?? 'Unknown'}
            </p>
            <p className="mt-1 text-xs text-[#918f9c]">
                Started: {formatTime(row.started_at)}
                <br />
                Ended: {formatTime(row.ended_at)}
                <br />
                Players: {row.participant_count ?? 0}
                {row.completed_matches_count != null ? (
                    <>
                        <br />
                        Matches: {row.completed_matches_count}
                    </>
                ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                <Link
                    to={paths.dash}
                    className={`${queueingSessionTabClass(navPath === paths.dash)} text-white/70 border-white/70`}
                >
                    {viewOnly ? 'Summary' : 'Dashboard'}
                </Link>
                <Link
                    to={paths.players}
                    className={`${queueingSessionTabClass(navPath === paths.players)} text-white/70 border-white/70`}
                >
                    Players
                </Link>
                <Link
                    to={paths.matches}
                    className={`${queueingSessionTabClass(navPath === paths.matches)} text-white/70 border-white/70`}
                >
                    Matches
                </Link>
            </div>
        </article>
    );
}

function QueueSessionCardBadges({ row, viewOnly }) {
    return (
        <div className="flex flex-col items-end gap-1">
            <span
                className={
                    row.is_active
                        ? 'capitalize rounded-full bg-[#4ce081]/20 px-2 py-0.5 text-xs font-bold text-[#4ce081]'
                        : 'capitalize rounded-full bg-[#353438] px-2 py-0.5 text-xs font-bold text-[#c8c5d2]'
                }
            >
                {row.is_active ? row.status : 'finished'}
            </span>
        </div>
    );
}

export function QueueingSessionListPage() {
    const { user } = useAuth();
    const location = useLocation();
    const navPath = normalizedAppPath(location.pathname);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const [mineOnly, setMineOnly] = useState(false);
    const [sort, setSort] = useState('updated_desc');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await fetchQueueingSessions({ q, status, mineOnly, sort });
                if (!cancelled) setRows(data);
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Could not load queueing sessions.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [q, status, mineOnly, sort]);

    const { activeRows, finishedTodayRows } = useMemo(() => {
        const active = rows.filter((row) => row.is_active);
        const finishedToday = rows.filter((row) => !row.is_active);
        return { activeRows: active, finishedTodayRows: finishedToday };
    }, [rows]);

    const emptyMessage = useMemo(() => {
        if (loading) return '';
        if (q.trim()) return 'No sessions match your filters.';
        return 'No queueing sessions yet.';
    }, [loading, q]);

    const showActiveSection = status !== 'finished';
    const showFinishedSection = status !== 'active';

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">
                            Queueing <span className="text-[#c2c1ff]">Sessions</span>
                        </h1>
                        <p className="text-sm text-[#c8c5d2]/80 mt-2">
                            Browse active queues and review today&apos;s finished sessions.
                        </p>
                    </div>
                    <Link
                        to="/queueing-session/new"
                        className="flex items-center rounded-xl bg-[#4ce081] px-2.5 py-2 text-sm font-semibold text-[#003919] transition hover:brightness-105"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="size-4"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Queue
                    </Link>
                </div>

                <section className="mb-4 rounded-xl border border-[#3c3c3e] bg-[#1b1b1e] p-4">
                    <div className="grid gap-3 grid-cols-4">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by queue name, sport, queue master, or queue ID"
                            className="col-span-4 rounded-lg border border-[#3c3c3e] bg-[#131316] px-3 py-3 text-sm"
                        />
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="col-span-2 rounded-lg border border-[#3c3c3e] bg-[#131316] px-3 py-3 text-sm"
                        >
                            <option value="updated_desc">Recently Updated</option>
                            <option value="updated_asc">Least Recently Updated</option>
                            <option value="created_desc">Newest</option>
                            <option value="created_asc">Oldest</option>
                        </select>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="col-span-2 rounded-lg border border-[#3c3c3e] bg-[#131316] px-3 py-3 text-sm"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="finished">Finished Today</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 mt-1 px-3 py-3 text-sm checked:bg-[#4ce081]/20">
                        <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                        My Queues Only
                    </label>
                </section>

                {error ? (
                    <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </p>
                ) : null}

                {loading ? <div className="h-40 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}

                {!loading && rows.length === 0 ? (
                    <p className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] px-4 py-5 text-sm text-[#918f9c]">
                        {emptyMessage}
                    </p>
                ) : null}

                {showActiveSection && activeRows.length > 0 ? (
                    <section className="mb-6">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#918f9c]">Active</h2>
                        <div className="space-y-3">
                            {activeRows.map((row) => (
                                <QueueingSessionCard key={row.id} row={row} navPath={navPath} viewOnly={false} />
                            ))}
                        </div>
                    </section>
                ) : null}

                {showFinishedSection && finishedTodayRows.length > 0 ? (
                    <section>
                        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[#918f9c]">
                            Finished today
                        </h2>
                        <p className="mb-3 text-xs text-[#918f9c]">
                            View only — open summary for leaderboard and session stats.
                        </p>
                        <div className="space-y-3">
                            {finishedTodayRows.map((row) => (
                                <QueueingSessionCard key={row.id} row={row} navPath={navPath} viewOnly />
                            ))}
                        </div>
                    </section>
                ) : null}
            </main>
            <DashboardMobileNav />
        </div>
    );
}
