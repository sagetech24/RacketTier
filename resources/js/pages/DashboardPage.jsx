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

function formatRelativeTime(iso) {
    if (!iso) return '';
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return '';
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
}

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
    const won = summary?.stats.matches_won ?? 0;
    const lost = Math.max(0, played - won);
    const ended = played;
    const streakPct = Math.min(100, Math.round((played / goalMatches) * 100));

    const tierLabel = summary?.tier
        ? `Tier ${summary.tier.tier_no} - ${summary.tier.name}`
        : summary?.primary_sport
          ? 'Unranked'
          : 'Play a match';

    const totalPointBalance = summary?.total_point_balance;

    const activityRows =
        summary?.highlights?.length > 0
            ? summary.highlights.map((h, idx) => ({
                  key: `highlight-${idx}`,
                  icon: 'military_tech',
                  iconWrap: 'bg-[#4ce081]/10',
                  iconColor: 'text-[#4ce081]',
                  title: h.title,
                  subtitle: h.meta,
                  time: formatRelativeTime(h.finished_at),
              }))
            : [];

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

                <section className="mb-10 rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4">
                    {profileLoading ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[1, 2].map((n) => (
                                <div key={n} className="space-y-2">
                                    <div className="h-3 w-20 animate-pulse rounded bg-[#2a2a2d]" />
                                    <div className="h-7 w-full max-w-40 animate-pulse rounded bg-[#2a2a2d]" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]/70">
                                    My Rank
                                </p>
                                    <p className="mt-1 text-lg font-bold leading-snug text-[#e4e1e6] flex items-center gap-1.5">
                                        <svg fill="#a6a5ed" height="18px" width="18px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 246.001 246.001" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M211.667,238.5c0,4.142-3.358,7.5-7.5,7.5h-163c-4.142,0-7.5-3.358-7.5-7.5v-16c0-4.142,3.358-7.5,7.5-7.5h163 c4.142,0,7.5,3.358,7.5,7.5V238.5z M241.748,0.74c-3.043-1.458-6.683-0.71-8.899,1.83l-59.492,68.199l-44.08-67.375 C127.891,1.277,125.53,0,123,0s-4.891,1.276-6.276,3.394L72.627,70.795L13.137,3.012C10.914,0.481,7.277-0.26,4.24,1.204 c-3.034,1.465-4.72,4.773-4.12,8.089l33,182.541c0.645,3.57,3.752,6.166,7.38,6.166h165c3.629,0,6.737-2.598,7.381-6.169l33-183 C246.48,5.512,244.788,2.2,241.748,0.74z"></path> </g></svg>
                                        {tierLabel}
                                    </p>
                                {/* {summary?.primary_sport?.name ? (
                                    <p className="mt-1 text-xs text-[#c8c5d2]/70">{summary.primary_sport.name}</p>
                                ) : null} */}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]/70">
                                    My Points
                                </p>
                                <p className="mt-1 text-lg font-bold tabular-nums text-[#e4e1e6] flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                    </svg>
                                    {totalPointBalance != null ? totalPointBalance.toLocaleString() : '—'}
                                </p>
                                <p className="mt-1 text-xs text-[#c8c5d2]/70">Total across all sports</p>
                            </div>
                        </div>
                    )}
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
                        to="/facilities"
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
                        className="group flex h-32 cursor-pointer flex-col justify-between rounded-xl bg-[#1b1b1e] p-6 transition-transform active:scale-95"
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
                        className="group flex h-32 cursor-pointer flex-col justify-between rounded-xl bg-[#1f1f22] p-6 transition-transform active:scale-95"
                    >
                        <MaterialIcon name="leaderboard" className="text-3xl text-[#c2c1ff]" />
                        <div>
                            <h3 className="text-lg font-bold text-[#e4e1e6]">RANK</h3>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                                {tierLabel}
                            </p>
                        </div>
                    </Link>
                </div>

                <section className="mb-6">
                    <div className="mb-6 flex items-end justify-between">
                        <h2 className="text-xl font-bold tracking-tight text-[#e4e1e6]">Recent Activity</h2>
                        <Link
                            to="/activity"
                            className="rounded-full bg-[#c2c1ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] transition-opacity hover:opacity-80"
                        >
                            View All
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {activityRows.length === 0 ? (
                            <div className="rounded-xl bg-[#1b1b1e] p-4 text-sm text-[#c8c5d2]">
                                No activity yet. Finish a match to see it here.
                            </div>
                        ) : (
                            activityRows.map((row) => (
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
                            ))
                        )}
                    </div>
                </section>

                <section className="relative mt-8 overflow-hidden rounded-xl bg-[#353438] p-6">
                    {/* <div className="absolute left-0 top-0 h-full w-1 bg-[#4ce081]" aria-hidden /> */}
                    <div className="pointer-events-none absolute -right-5 -bottom-18" aria-hidden>
                        <MaterialIcon name="trending_up" className="dashboard-v2-watermark-icon" />
                    </div>

                    <div className="relative z-10 mb-5 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-[#131316]/80 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]/70">Played</p>
                            <p className="mt-1 text-xl font-extrabold tabular-nums text-[#e4e1e6]">{played}</p>
                        </div>
                        <div className="rounded-lg bg-[#131316]/80 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]/70">Won</p>
                            <p className="mt-1 text-xl font-extrabold tabular-nums text-[#4ce081]">{won}</p>
                        </div>
                        <div className="rounded-lg bg-[#131316]/80 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]/70">Lost</p>
                            <p className="mt-1 text-xl font-extrabold tabular-nums text-[#f27c8a]">{lost}</p>
                        </div>
                        <div className="rounded-lg bg-[#131316]/80 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#c8c5d2]/70">Finished</p>
                            <p className="mt-1 text-xl font-extrabold tabular-nums text-[#e4e1e6]">{ended}</p>
                        </div>
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

            {/* <Link
                to={gameRoomHref}
                className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-[#c2c1ff] to-[#8a89d9] text-[#131316] shadow-xl transition-transform active:scale-90"
                aria-label="Play"
                title="Play"
            >
                <MaterialIcon name="add" className="text-3xl" />
            </Link> */}
        </div>
    );
}
