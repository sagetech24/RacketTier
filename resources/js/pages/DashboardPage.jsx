import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchDashboardSummary } from '../api/dashboard.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { LogoutButton } from '../components/LogoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDefaultGameRoomHref } from '../hooks/useDefaultGameRoomHref.js';

const IMG_PLAY_BG =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAdeD9jD4wFP5m8jeHYihc9onG4ZLyRfTmD5RvFgsnbJueMquK9TNRW_SyHqXiIDR9B3CH692i5gr4ce_y_Oup803Q_AcpyvX-y5KMaYf_yXfTl5AOu0K8GL2lcpnv7uvGZvNwoLRT4Sf3r-w5mlohM6S-Dtd2AngioMwnLGH8pUY4eXUvZAWvpm65heuxqA3sVBvBmhR6wRxb6rrp4U3yk5rc-MHX2OG0Jp16jur2xfsCeZV090T9-FFgbHyrLZj9mOjaMMqBev_U';

const DEMO_ACTIVITY = [
    {
        icon: 'military_tech',
        iconWrap: 'bg-[#4ce081]/10',
        iconColor: 'text-[#4ce081]',
        title: 'Won Match vs. J. Doe',
        subtitle: '+12 Ranking Points',
        time: '2h ago',
    },
    {
        icon: 'event_available',
        iconWrap: 'bg-[#c2c1ff]/10',
        iconColor: 'text-[#c2c1ff]',
        title: 'Upcoming: Padel Finals',
        subtitle: 'Courtside Club • 18:00',
        time: 'Tomorrow',
    },
    {
        icon: 'forum',
        iconWrap: 'bg-[#353438]',
        iconColor: 'text-[#c8c5d2]',
        title: 'New Message',
        subtitle: 'Coach Smith: Great serve!',
        time: '1d ago',
    },
];

/**
 * @param {{ name?: string; email?: string } | null } user
 */
function greetingFirstName(user) {
    if (!user) return 'there';
    const first = user.name?.trim().split(/\s+/)[0];
    if (first) return first;
    const local = user.email?.split('@')[0]?.trim();
    if (local) return local;
    return 'there';
}

export function DashboardPage() {
    const { user: authUser } = useAuth();
    const gameRoomHref = useDefaultGameRoomHref();
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setError('');
            setLoading(true);
            try {
                const data = await fetchDashboardSummary();
                if (!cancelled) setSummary(data);
            } catch {
                if (!cancelled) setError('Could not load your dashboard. Refresh and try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const user = summary?.user ?? authUser;
    const displayName = greetingFirstName(user);
    const profileLoading = loading && !summary;

    const goalMatches = 5;
    const played = summary?.stats.matches_played ?? 0;
    const streakPct = Math.min(100, Math.round((played / goalMatches) * 100));

    const activityRows =
        summary?.highlights?.length > 0
            ? summary.highlights.map((h, idx) => ({
                  key: `highlight-${idx}`,
                  icon: 'military_tech',
                  iconWrap: 'bg-[#4ce081]/10',
                  iconColor: 'text-[#4ce081]',
                  title: h.title,
                  subtitle: h.meta,
                  time: '',
              }))
            : DEMO_ACTIVITY.map((row, idx) => ({
                  ...row,
                  key: `demo-${idx}`,
              }));

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={profileLoading} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-28">
                <section className="mb-10">
                    <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-[#e4e1e6]">
                        {loading ? (
                            <span className="inline-block h-10 w-56 animate-pulse rounded-lg bg-[#2a2a2d]" />
                        ) : (
                            <>Hello, {displayName}.</>
                        )}
                    </h2>
                    <p className="font-medium text-[#c8c5d2]/70">Ready to climb the tiers today?</p>
                </section>

                {error ? (
                    <div
                        className="mb-8 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : null}

                <div className="mb-10 grid grid-cols-2 gap-4">
                    <Link
                        to={gameRoomHref}
                        className="group relative col-span-2 block h-48 cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-[#c2c1ff] to-[#8a89d9] transition-transform duration-200 active:scale-95"
                    >
                        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                            <img
                                alt=""
                                src={IMG_PLAY_BG}
                                className="h-full w-full object-cover"
                                decoding="async"
                            />
                        </div>
                        <div className="relative flex h-full flex-col justify-end p-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <MaterialIcon
                                        name="sports_tennis"
                                        className="mb-2 text-4xl text-[#211e6a]"
                                        filled
                                    />
                                    <h3 className="text-2xl font-bold tracking-tight text-[#211e6a]">PLAY</h3>
                                </div>
                                <MaterialIcon name="arrow_forward" className="text-[#211e6a]/50" />
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/facilities"
                        className="group flex h-40 cursor-pointer flex-col justify-between rounded-xl bg-[#1b1b1e] p-6 transition-transform active:scale-95"
                    >
                        <MaterialIcon name="group_add" className="text-3xl text-[#4ce081]" />
                        <div>
                            <h3 className="text-lg font-bold text-[#e4e1e6]">JOIN</h3>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                Active Hubs
                            </p>
                        </div>
                    </Link>

                    <Link
                        to="/ranking"
                        className="group flex h-40 cursor-pointer flex-col justify-between rounded-xl bg-[#1f1f22] p-6 transition-transform active:scale-95"
                    >
                        <MaterialIcon name="leaderboard" className="text-3xl text-[#c2c1ff]" />
                        <div>
                            <h3 className="text-lg font-bold text-[#e4e1e6]">RANK</h3>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                Tier 4 Elite
                            </p>
                        </div>
                    </Link>
                </div>

                <section className="mb-6">
                    <div className="mb-6 flex items-end justify-between">
                        <h2 className="text-xl font-bold tracking-tight text-[#e4e1e6]">Recent Activity</h2>
                        <button
                            type="button"
                            className="rounded-full bg-[#c2c1ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff]"
                            title="Coming soon"
                        >
                            View All
                        </button>
                    </div>

                    <div className="space-y-4">
                        {activityRows.map((row) => (
                            <div
                                key={row.key}
                                className="flex items-center gap-4 rounded-xl bg-[#1b1b1e] p-4 transition-colors hover:bg-[#1f1f22]"
                            >
                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${row.iconWrap}`}
                                >
                                    <MaterialIcon name={row.icon} className={row.iconColor} />
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
                            </div>
                        ))}
                    </div>
                </section>

                <section className="relative mt-8 overflow-hidden rounded-xl bg-[#353438] p-6">
                    <div className="absolute left-0 top-0 h-full w-1 bg-[#4ce081]" aria-hidden />
                    <div className="pointer-events-none absolute -right-5 -top-5" aria-hidden>
                        <MaterialIcon name="trending_up" className="dashboard-v2-watermark-icon" />
                    </div>

                    <div className="relative z-10">
                        <h3 className="mb-1 text-lg font-bold text-[#e4e1e6]">
                            {played > 0 ? 'On a Streak!' : 'Start your streak'}
                        </h3>
                        <p className="mb-4 text-sm text-[#c8c5d2]">
                            {played === 0
                                ? "You haven't recorded a ranked match yet. Queue up a session to begin."
                                : `You've played ${played} ranked ${played === 1 ? 'match' : 'matches'}. Keep the momentum going to unlock the next tier.`}
                        </p>

                        <div className="mb-2 h-1.5 w-full rounded-full bg-[#131316]">
                            <div
                                className="h-full rounded-full bg-[#4ce081] transition-[width] duration-500"
                                style={{ width: `${streakPct}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4ce081]">
                                {streakPct}% to Goal
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]">
                                {played >= goalMatches ? 'Goal met' : `${Math.max(0, goalMatches - played)} match${goalMatches - played === 1 ? '' : 'es'} left`}
                            </span>
                        </div>
                    </div>
                </section>

                <div className="mt-10 flex justify-center">
                    <LogoutButton className="text-xs font-medium uppercase tracking-wider text-[#c8c5d2]/80 underline-offset-4 transition hover:text-[#e4e1e6]" />
                </div>
            </main>

            <DashboardMobileNav />

            <button
                type="button"
                className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-[#c2c1ff] to-[#8a89d9] text-[#131316] shadow-xl transition-transform active:scale-90"
                aria-label="Add"
                title="Coming soon"
            >
                <MaterialIcon name="add" className="text-3xl" />
            </button>
        </div>
    );
}
