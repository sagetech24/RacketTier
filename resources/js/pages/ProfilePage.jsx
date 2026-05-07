import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { LogoutButton } from '../components/LogoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ProfilePage() {
    const { user: authUser } = useAuth();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setError('');
            setLoading(true);
            try {
                const data = await fetchDashboardSummary();
                if (!cancelled) setSummary(data);
            } catch {
                if (!cancelled) setError('Could not load your profile. Refresh and try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const user = summary?.user ?? authUser;
    const stats = summary?.stats;

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={loading && !summary} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-28">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#e4e1e6]">Profile</h2>
                    {/* <Link
                        to="/dashboard"
                        className="rounded-full bg-[#c2c1ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] transition-opacity hover:opacity-80"
                    >
                        Back
                    </Link> */}
                </div>

                {error ? (
                    <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
                        {error}
                    </div>
                ) : null}

                <div className="rounded-xl bg-[#1b1b1e] p-5">
                    {/* <div className="text-sm text-[#c8c5d2]">Signed in as</div> */}
                    <div className="mt-1 text-lg font-bold text-[#e4e1e6]">{user?.name ?? 'User'}</div>
                    <div className="text-sm text-[#c8c5d2]">{user?.email ?? ''}</div>
                    {user?.member_since ? (
                        <div className="mt-3 text-xs text-[#c8c5d2]/70">
                            Member since {new Date(user.member_since).toLocaleDateString()}
                        </div>
                    ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-[#1f1f22] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">Current Rating</div>
                        <div className="mt-1 text-2xl font-extrabold">{(stats?.rating / 100)?.toLocaleString?.(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }) ?? '0.00'}</div>
                    </div>
                    <div className="rounded-xl bg-[#1f1f22] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">Matches</div>
                        <div className="mt-1 text-2xl font-extrabold">{stats?.matches_played ?? 0}</div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <LogoutButton className="text-xs font-medium uppercase border border-zinc-500 rounded-md px-3 py-2 tracking-wider text-[#c8c5d2]/80 underline-offset-4 transition hover:text-[#e4e1e6]" />
                </div>
            </main>

            <DashboardMobileNav />
        </div>
    );
}

