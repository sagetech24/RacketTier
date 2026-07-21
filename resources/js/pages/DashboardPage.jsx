import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyActivity } from '../api/activity.js';
import { ActivityFeedItem } from '../components/app/ActivityFeedItem.jsx';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { DashboardPageLoading } from '../components/dashboard/DashboardPageLoading.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { LogoutButton } from '../components/LogoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatRating } from '../components/ranking/rankingUtils.js';
import { useDashboardSummaryQuery } from '../hooks/queries/useDashboardSummaryQuery.js';

const IMG_PLAY_BG =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAdeD9jD4wFP5m8jeHYihc9onG4ZLyRfTmD5RvFgsnbJueMquK9TNRW_SyHqXiIDR9B3CH692i5gr4ce_y_Oup803Q_AcpyvX-y5KMaYf_yXfTl5AOu0K8GL2lcpnv7uvGZvNwoLRT4Sf3r-w5mlohM6S-Dtd2AngioMwnLGH8pUY4eXUvZAWvpm65heuxqA3sVBvBmhR6wRxb6rrp4U3yk5rc-MHX2OG0Jp16jur2xfsCeZV090T9-FFgbHyrLZj9mOjaMMqBev_U';

const GOAL_MATCHES = 5;

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

function greetingForTime() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

/**
 * @param {{ start_point: number; end_point: number; wallet_balance: number } | null | undefined} tier
 */
function tierProgressPct(tier) {
    if (!tier) return null;
    const span = tier.end_point - tier.start_point;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((tier.wallet_balance - tier.start_point) / span) * 100));
}

/**
 * @param {{
 *   primary_sport?: { name: string } | null;
 *   tier?: { end_point: number; wallet_balance: number } | null;
 *   stats?: { matches_played?: number; sessions_active?: number };
 * }} summary
 */
function dashboardSubtitle(summary) {
    const sessionsActive = summary?.stats?.sessions_active ?? 0;
    if (sessionsActive > 0) {
        return `You have ${sessionsActive} active queue${sessionsActive === 1 ? '' : 's'}. Jump back in when you're ready.`;
    }

    const played = summary?.stats?.matches_played ?? 0;
    if (played === 0) {
        return 'Start a match or join a queue to begin climbing the tiers.';
    }

    const tier = summary?.tier;
    const sportName = summary?.primary_sport?.name;
    if (tier && sportName) {
        const remaining = Math.max(0, tier.end_point - tier.wallet_balance);
        return `${sportName} · ${remaining.toLocaleString()} pts to the next tier`;
    }

    return 'Ready to climb the tiers today?';
}

/**
 * @param {{
 *   tierLabel: string;
 *   totalPointBalance: number | null | undefined;
 *   rating: number | null | undefined;
 *   primarySport: { name: string; code: string } | null | undefined;
 *   tier: import('../api/dashboard.js').DashboardSummary['tier'];
 *   sessionsActive: number;
 * }} props
 */
function DashboardSnapshot({ tierLabel, totalPointBalance, rating, primarySport, tier, sessionsActive }) {
    const progress = tierProgressPct(tier);

    return (
        <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                {sessionsActive > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                        <span className="animate-pulse flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full animate-pulse bg-red-400" aria-hidden></span>
                            <span>Active</span>
                        </span>
                    </span>
                ) : null}
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-6">
                <div>
                    <p className="rt-dashboard-stat-label">Tier</p>
                    <p className="rt-dashboard-stat-value mt-1 flex items-center gap-1">
                        <MaterialIcon name="star" className="text-lg text-[#c2c1ff]" />
                        <span className="truncate text-base md:text-xl">{tier ? tier.name : '—'}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#c8c5d2]">
                        {tier ? `Tier ${tier.tier_no}` : tierLabel}
                    </p>
                </div>
                <div>
                    <p className="rt-dashboard-stat-label">Points</p>
                    <p className="rt-dashboard-stat-value mt-1 flex items-center gap-1">
                        <MaterialIcon name="database" className="text-lg text-[#4ce081]" />
                        {totalPointBalance != null ? totalPointBalance.toLocaleString() : '—'}
                    </p>
                </div>
                <div>
                    <p className="rt-dashboard-stat-label">Rating</p>
                    <p className="rt-dashboard-stat-value mt-1 flex items-center gap-1">
                        <MaterialIcon name="trending_up" className="text-lg text-[#a6a5ed]" />
                        {rating != null ? formatRating(rating) : '—'}
                    </p>
                </div>
            </div>

            {tier && progress != null ? (
                <div className="mt-5 border-t border-white/5 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-[#c8c5d2]">Tier progress</span>
                        <span className="text-[#4ce081] text-sm">{progress}%</span>
                    </div>
                    <div className="rt-dashboard-progress-track">
                        <div
                            className="rt-dashboard-progress-fill"
                            style={{ width: `${progress}%` }}
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Progress within current tier"
                        />
                    </div>
                    <p className="mt-2 text-sm text-[#918f9c]">
                        {tier.wallet_balance.toLocaleString()} / {tier.end_point.toLocaleString()} points to the next tier
                    </p>
                </div>
            ) : null}
        </>
    );
}

export function DashboardPage() {
    const { user: authUser } = useAuth();
    const { data: summary, isLoading: loading, isError } = useDashboardSummaryQuery();
    const [activityItems, setActivityItems] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const error = isError ? 'Could not load your dashboard. Refresh and try again.' : '';

    useEffect(() => {
        let cancelled = false;

        async function loadActivity() {
            setActivityLoading(true);
            try {
                const { data } = await fetchMyActivity({ limit: 5 });
                if (!cancelled) setActivityItems(data);
            } catch {
                if (!cancelled) setActivityItems([]);
            } finally {
                if (!cancelled) setActivityLoading(false);
            }
        }

        loadActivity();
        return () => {
            cancelled = true;
        };
    }, []);

    const user = summary?.user ?? authUser;
    const displayName = greetingFirstName(user);
    const showSkeleton = loading;
    const profileLoading = showSkeleton && !summary;
    const played = summary?.stats?.matches_played ?? 0;
    const won = summary?.stats.matches_won ?? 0;
    const lost = Math.max(0, played - won);
    const winRate = played > 0 ? Math.round((won / played) * 100) : null;
    const streakPct = Math.min(100, Math.round((played / GOAL_MATCHES) * 100));
    const rating = summary?.stats.rating;
    const sessionsActive = summary?.stats.sessions_active ?? 0;
    const primarySport = summary?.primary_sport;
    const tier = summary?.tier;

    const tierLabel = tier
        ? `Tier ${tier.tier_no} · ${tier.name}`
        : primarySport
          ? 'Unranked'
          : 'Play a match';

    const totalPointBalance = summary?.total_point_balance;

    return (
        <AppShell user={user} profileLoading={profileLoading}>
            {showSkeleton ? (
                <DashboardPageLoading />
            ) : (
                <>
            <PageHeader
                eyebrow={primarySport ? primarySport.name : 'Welcome back'}
                title={`${greetingForTime()}, ${displayName}.`}
                subtitle={dashboardSubtitle(summary)}
            />

            <section className="rt-dashboard-snapshot mb-8">
                <DashboardSnapshot
                    tierLabel={tierLabel}
                    totalPointBalance={totalPointBalance}
                    rating={rating}
                    primarySport={primarySport}
                    tier={tier}
                    sessionsActive={sessionsActive}
                />
            </section>

            {error ? (
                <div className="rt-alert-error mb-8" role="alert">
                    {error}
                </div>
            ) : null}

            <section className="mb-10">
                <h2 className="rt-section-eyebrow">Quick actions</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                    <Link to="/facilities" className="rt-dashboard-action-play group col-span-2 h-36 md:col-span-1 md:h-40">
                        <div className="absolute inset-0 opacity-15 mix-blend-overlay">
                            <img alt="" src={IMG_PLAY_BG} className="h-full w-full object-cover" decoding="async" />
                        </div>
                        <div className="relative flex h-full flex-col justify-between p-5">
                            <MaterialIcon name="sports_tennis" className="text-3xl text-[#211e6a]" filled />
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-extrabold tracking-tight text-[#211e6a]">Play</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#211e6a]/70">
                                        Find a facility
                                    </p>
                                </div>
                                <MaterialIcon
                                    name="arrow_forward"
                                    className="text-[#211e6a]/50 transition-transform group-hover:translate-x-0.5"
                                />
                            </div>
                        </div>
                    </Link>

                    <Link to="/queueing-session" className="rt-interactive-card flex h-32 flex-col justify-between p-5 md:h-40">
                        <MaterialIcon name="group_add" className="text-3xl text-[#4ce081]" />
                        <div>
                            <h3 className="text-lg font-bold text-[#e4e1e6]">Queue</h3>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#918f9c]">Sessions</p>
                        </div>
                    </Link>

                    <Link to="/ranking" className="rt-interactive-card flex h-32 flex-col justify-between bg-[#1f1f22] p-5 md:h-40">
                        <MaterialIcon name="leaderboard" className="text-3xl text-[#c2c1ff]" />
                        <div>
                            <h3 className="text-lg font-bold text-[#e4e1e6]">Rank</h3>
                            <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-widest text-[#918f9c]">
                                {tierLabel}
                            </p>
                        </div>
                    </Link>
                </div>
            </section>

            <section className="mb-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                        <p className="rt-section-eyebrow mb-1">Feed</p>
                        <h2 className="text-xl font-bold tracking-tight text-[#e4e1e6]">Recent Activity</h2>
                    </div>
                    <Link to="/activity" className="rt-btn-secondary shrink-0 px-3 py-1.5 text-[10px]">
                        View All
                    </Link>
                </div>

                <div className="rt-dashboard-activity-grid space-y-3 md:space-y-0">
                    {activityLoading ? (
                        <>
                            <div className="rt-skeleton h-[4.75rem] rounded-xl md:col-span-2 lg:col-span-3" />
                            <div className="rt-skeleton h-[4.75rem] rounded-xl md:col-span-2 lg:col-span-3" />
                        </>
                    ) : activityItems.length === 0 ? (
                        <div className="md:col-span-2 lg:col-span-3">
                            <EmptyState
                                icon="history"
                                title="No recent matches"
                                description="Play a facility match or join a queue session to see results here."
                                actionLabel="Start playing"
                                actionTo="/facilities"
                            />
                        </div>
                    ) : (
                        activityItems.map((row) => (
                            <ActivityFeedItem
                                key={row.id}
                                row={row}
                                relativeTime={row.finished_at ? formatRelativeTime(row.finished_at) : undefined}
                                compact
                            />
                        ))
                    )}
                </div>
            </section>

            <section className="rt-dashboard-performance p-5 md:p-7">
                <div className="pointer-events-none absolute -right-4 -bottom-16 opacity-[0.07]" aria-hidden>
                    <MaterialIcon name="trending_up" className="dashboard-v2-watermark-icon" />
                </div>

                <div className="relative z-10 mb-5">
                    <p className="rt-section-eyebrow mb-1">Performance</p>
                    <h3 className="text-lg font-bold text-[#e4e1e6]">{played > 0 ? 'Your season so far' : 'Start your season'}</h3>
                </div>

                <div className="relative z-10 mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
                    {[
                        { label: 'Played', value: played, tone: 'text-[#e4e1e6]' },
                        { label: 'Won', value: won, tone: 'text-[#4ce081]' },
                        { label: 'Lost', value: lost, tone: 'text-[#ffb4ab]' },
                        {
                            label: winRate != null ? 'Win rate' : 'ELO',
                            value: winRate != null ? `${winRate}%` : rating != null ? formatRating(rating) : '—',
                            tone: 'text-[#c2c1ff]',
                        },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-lg border border-white/5 bg-[#121216]/80 p-3">
                            <p className="rt-dashboard-stat-label">{stat.label}</p>
                            <p className={`mt-1 text-xl font-extrabold tabular-nums ${stat.tone}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="relative z-10">
                    <p className="mb-3 text-sm leading-relaxed text-[#c8c5d2]">
                        {played === 0
                            ? "You haven't recorded a ranked match yet. Queue up a session to begin."
                            : `You've played ${played} ranked ${played === 1 ? 'match' : 'matches'}. ${GOAL_MATCHES - played > 0 ? `${GOAL_MATCHES - played} more to hit your weekly goal.` : 'Weekly goal met — keep going.'}`}
                    </p>

                    <div className="rt-dashboard-progress-track mb-2">
                        <div
                            className="rt-dashboard-progress-fill"
                            style={{ width: `${streakPct}%` }}
                            role="progressbar"
                            aria-valuenow={streakPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Progress toward weekly match goal"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#4ce081]">
                            {streakPct}% weekly goal
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">
                            {played >= GOAL_MATCHES
                                ? 'Goal met'
                                : `${Math.max(0, GOAL_MATCHES - played)} match${GOAL_MATCHES - played === 1 ? '' : 'es'} left`}
                        </span>
                    </div>
                </div>
            </section>

            <div className="mt-10 flex justify-center pb-2">
                <LogoutButton className="rounded-full border border-[#918f9c]/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#918f9c] transition hover:border-[#c8c5d2]/40 hover:text-[#c8c5d2]" />
            </div>
                </>
            )}
        </AppShell>
    );
}
