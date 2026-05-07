import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyActivity } from '../api/activity.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
}

export function ActivityPage() {
    const { user } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setError('');
            setLoading(true);
            try {
                const data = await fetchMyActivity({ limit: 25 });
                if (!cancelled) setRows(data);
            } catch {
                if (!cancelled) setError('Could not load your activity. Refresh and try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const items = useMemo(() => {
        return rows.map((s) => {
            const last = s.last_match;
            const score =
                last && typeof last.team1_score === 'number' && typeof last.team2_score === 'number'
                    ? `${last.team1_score}-${last.team2_score}`
                    : '—';
            return {
                id: s.id,
                title: `${s.sport?.name ?? 'Sport'} • ${s.facility?.name ?? 'Facility'}`,
                subtitle: `Score ${score}`,
                time: formatDate(last?.finished_at ?? s.ended_at ?? null),
                href: s.facility?.id ? `/facility/${s.facility.id}/game-room` : '/facilities',
            };
        });
    }, [rows]);

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-28">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#e4e1e6]">Activity</h2>
                    <Link
                        to="/dashboard"
                        className="rounded-full bg-[#c2c1ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] transition-opacity hover:opacity-80"
                    >
                        Back
                    </Link>
                </div>

                {error ? (
                    <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="space-y-4">
                        <div className="h-16 animate-pulse rounded-xl bg-[#1b1b1e]" />
                        <div className="h-16 animate-pulse rounded-xl bg-[#1b1b1e]" />
                        <div className="h-16 animate-pulse rounded-xl bg-[#1b1b1e]" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-xl bg-[#1b1b1e] p-4 text-sm text-[#c8c5d2]">
                        No finished matches yet. Start a session from Facilities to record your first result.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((row) => (
                            <Link
                                key={row.id}
                                to={row.href}
                                className="flex items-center gap-4 rounded-xl bg-[#1b1b1e] p-4 transition-colors hover:bg-[#1f1f22]"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#c2c1ff]/10">
                                    <MaterialIcon name="history" className="text-[#c2c1ff]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="truncate font-semibold text-[#e4e1e6]">{row.title}</h4>
                                    <p className="text-xs text-[#c8c5d2]">{row.subtitle}</p>
                                </div>
                                {row.time ? (
                                    <div className="text-right">
                                        <p className="text-[10px] font-medium text-[#c8c5d2]/60">{row.time}</p>
                                    </div>
                                ) : null}
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <DashboardMobileNav />
        </div>
    );
}

