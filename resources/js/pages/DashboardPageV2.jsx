import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyActivity } from '../api/activity.js';
import { ActivityFeedItem } from '../components/app/ActivityFeedItem.jsx';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { DashboardPageV2Loading } from '../components/dashboard/DashboardPageV2Loading.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatRating } from '../components/ranking/rankingUtils.js';
import { useDashboardSummaryQuery } from '../hooks/queries/useDashboardSummaryQuery.js';
import { useDefaultGameRoomHref } from '../hooks/useDefaultGameRoomHref.js';

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

export function DashboardPageV2() {
    const { user: authUser } = useAuth();
    const playHref = useDefaultGameRoomHref();
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
    const won = summary?.stats?.matches_won ?? 0;
    const lost = Math.max(0, played - won);
    const winRate = played > 0 ? Math.round((won / played) * 100) : null;
    const streakPct = Math.min(100, Math.round((played / GOAL_MATCHES) * 100));
    const rating = summary?.stats?.rating;
    const sessionsActive = summary?.stats?.sessions_active ?? 0;
    const primarySport = summary?.primary_sport;
    const tier = summary?.tier;
    const progress = tierProgressPct(tier);
    const ptsRemaining = tier ? Math.max(0, tier.end_point - tier.wallet_balance) : null;

    const tierLabel = tier
        ? `Tier ${tier.tier_no} · ${tier.name}`
        : primarySport
          ? 'Unranked'
          : 'Play a match';

    const totalPointBalance = summary?.total_point_balance;

    return (
        <AppShell user={user} profileLoading={profileLoading}>
            {showSkeleton ? (
                <DashboardPageV2Loading />
            ) : (
                <div className="rt-dashboard-v2">
                    <header className="rt-dashboard-v2-hero mb-6 md:mb-8">
                        <div className="flex flex-wrap items-center gap-2">
                            {primarySport ? (
                                <span className="rt-dashboard-v2-chip">{primarySport.name}</span>
                            ) : (
                                <span className="rt-dashboard-v2-chip rt-dashboard-v2-chip-muted">Welcome back</span>
                            )}
                            {sessionsActive > 0 ? (
                                <span className="rt-dashboard-v2-live" aria-live="polite">
                                    <span className="rt-dashboard-v2-live-dot" aria-hidden />
                                    {sessionsActive} live
                                </span>
                            ) : null}
                        </div>
                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance text-[#e4e1e6] md:text-4xl">
                            {greetingForTime()}, {displayName}.
                        </h1>
                        <p className="mt-2 max-w-prose text-sm font-medium leading-relaxed text-[#c8c5d2] md:text-base">
                            {dashboardSubtitle(summary)}
                        </p>
                    </header>

                    {error ? (
                        <div className="rt-alert-error mb-6" role="alert">
                            {error}
                        </div>
                    ) : null}

                    {sessionsActive > 0 ? (
                        <Link
                            to="/queueing-session"
                            className="rt-dashboard-v2-resume group mb-6 flex items-center justify-between gap-4 md:mb-8"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="rt-dashboard-v2-resume-icon" aria-hidden>
                                    <MaterialIcon name="play_circle" className="text-2xl" filled />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#003919]/80">
                                        Active queue
                                    </p>
                                    <p className="truncate text-base font-bold text-[#003919]">
                                        Resume {sessionsActive === 1 ? 'your session' : `${sessionsActive} sessions`}
                                    </p>
                                </div>
                            </div>
                            <MaterialIcon
                                name="arrow_forward"
                                className="shrink-0 text-[#003919]/70 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                            />
                        </Link>
                    ) : null}

                    <div className="rt-dashboard-v2-layout">
                        <section className="rt-dashboard-v2-progress" aria-labelledby="dashboard-progress-heading">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="rt-section-eyebrow mb-1">Progress</p>
                                    <h2 id="dashboard-progress-heading" className="text-lg font-bold tracking-tight text-[#e4e1e6]">
                                        {tier ? tier.name : 'Your tier'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-[#918f9c]">
                                        {tier ? `Tier ${tier.tier_no}` : tierLabel}
                                        {primarySport ? ` · ${primarySport.name}` : ''}
                                    </p>
                                </div>
                                <Link
                                    to="/ranking"
                                    className="rt-btn-secondary shrink-0 px-3 py-1.5 text-[10px]"
                                >
                                    Rankings
                                </Link>
                            </div>

                            <div className="rt-dashboard-v2-metrics mt-5">
                                <div>
                                    <p className="rt-dashboard-stat-label">Points</p>
                                    <p className="rt-dashboard-stat-value mt-1 flex items-center gap-1.5">
                                        <MaterialIcon name="database" className="text-lg text-[#4ce081]" />
                                        {totalPointBalance != null ? totalPointBalance.toLocaleString() : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="rt-dashboard-stat-label">Rating</p>
                                    <p className="rt-dashboard-stat-value mt-1 flex items-center gap-1.5">
                                        <MaterialIcon name="trending_up" className="text-lg text-[#a6a5ed]" />
                                        {rating != null ? formatRating(rating) : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="rt-dashboard-stat-label">Win rate</p>
                                    <p className="rt-dashboard-stat-value mt-1 flex items-center gap-1.5">
                                        <MaterialIcon name="military_tech" className="text-lg text-[#c2c1ff]" />
                                        {winRate != null ? `${winRate}%` : '—'}
                                    </p>
                                </div>
                            </div>

                            {tier && progress != null ? (
                                <div className="mt-5">
                                    <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-[#c8c5d2]">Tier progress</span>
                                        <span className="tabular-nums text-[#4ce081]">{progress}%</span>
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
                                        {tier.wallet_balance.toLocaleString()} / {tier.end_point.toLocaleString()}
                                        {ptsRemaining != null && ptsRemaining > 0
                                            ? ` · ${ptsRemaining.toLocaleString()} to next`
                                            : ' · Tier ceiling'}
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-5 text-sm text-[#918f9c]">
                                    Play a ranked match to unlock your sport tier and wallet progress.
                                </p>
                            )}
                        </section>

                        <section aria-labelledby="dashboard-actions-heading">
                            <h2 id="dashboard-actions-heading" className="rt-section-eyebrow">
                                Quick actions
                            </h2>
                            <div className="rt-dashboard-v2-actions">
                                <Link to={playHref} className="rt-dashboard-v2-action-play group">
                                    <MaterialIcon name="sports_tennis" className="text-3xl text-[#211e6a]" filled />
                                    <div className="mt-auto flex items-end justify-between gap-2">
                                        <div>
                                            <h3 className="text-lg font-extrabold tracking-tight text-[#211e6a]">Play</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#211e6a]/70">
                                                Facility match
                                            </p>
                                        </div>
                                        <MaterialIcon
                                            name="arrow_forward"
                                            className="text-[#211e6a]/50 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                                        />
                                    </div>
                                </Link>

                                <Link to="/queueing-session" className="rt-dashboard-v2-action-card">
                                    <MaterialIcon name="group_add" className="text-2xl text-[#4ce081]" />
                                    <div className="mt-auto">
                                        <h3 className="text-base font-bold text-[#e4e1e6]">Queue</h3>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#918f9c]">
                                            Sessions
                                        </p>
                                    </div>
                                </Link>

                                <Link to="/ranking" className="rt-dashboard-v2-action-card">
                                    <MaterialIcon name="leaderboard" className="text-2xl text-[#c2c1ff]" />
                                    <div className="mt-auto">
                                        <h3 className="text-base font-bold text-[#e4e1e6]">Rank</h3>
                                        <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-widest text-[#918f9c]">
                                            {tierLabel}
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        </section>

                        <section className="rt-dashboard-v2-season" aria-labelledby="dashboard-season-heading">
                            <div className="mb-4 flex items-end justify-between gap-3">
                                <div>
                                    <h2 id="dashboard-season-heading" className="text-lg font-bold tracking-tight text-[#e4e1e6]">
                                        {played > 0 ? 'Your Performance' : 'Start Your Season'}
                                    </h2>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">
                                    Goal {GOAL_MATCHES}
                                </span>
                            </div>

                            <div className="rt-dashboard-v2-season-stats" role="list">
                                {[
                                    { label: 'Played', value: played, tone: 'text-[#e4e1e6]' },
                                    { label: 'Won', value: won, tone: 'text-[#4ce081]' },
                                    { label: 'Lost', value: lost, tone: 'text-[#ffb4ab]' },
                                    {
                                        label: winRate != null ? 'Win %' : 'ELO',
                                        value: winRate != null ? `${winRate}%` : rating != null ? formatRating(rating) : '—',
                                        tone: 'text-[#c2c1ff]',
                                    },
                                ].map((stat) => (
                                    <div key={stat.label} className="rt-dashboard-v2-season-stat" role="listitem">
                                        <p className="rt-dashboard-stat-label">{stat.label}</p>
                                        <p className={`mt-1 text-xl font-extrabold tabular-nums ${stat.tone}`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5">
                                <p className="mb-3 text-sm leading-relaxed text-[#c8c5d2]">
                                    {played === 0
                                        ? "No ranked matches yet. Queue a session or hit a facility court to start."
                                        : `You've played ${played} ranked ${played === 1 ? 'match' : 'matches'}. ${
                                              GOAL_MATCHES - played > 0
                                                  ? `${GOAL_MATCHES - played} more to hit your weekly goal.`
                                                  : 'Weekly goal met — keep going.'
                                          }`}
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
                                            : `${Math.max(0, GOAL_MATCHES - played)} left`}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section className="rt-dashboard-v2-feed" aria-labelledby="dashboard-feed-heading">
                            <div className="mb-4 flex items-end justify-between gap-3">
                                <div>
                                    <h2 id="dashboard-feed-heading" className="text-lg font-bold tracking-tight text-[#e4e1e6]">
                                        Recent Activity
                                    </h2>
                                </div>
                                <Link to="/activity" className="rt-btn-secondary shrink-0 px-3 py-1.5 text-[10px]">
                                    View all
                                </Link>
                            </div>

                            <div className="space-y-3" aria-live="polite">
                                {activityLoading ? (
                                    <>
                                        <div className="rt-skeleton h-[4.75rem] rounded-xl" />
                                        <div className="rt-skeleton h-[4.75rem] rounded-xl" />
                                    </>
                                ) : activityItems.length === 0 ? (
                                    <EmptyState
                                        icon="history"
                                        title="No recent matches"
                                        description="Play a facility match or join a queue session to see results here."
                                        actionLabel="Start playing"
                                        actionTo="/facilities"
                                    />
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
                    </div>
                </div>
            )}
        </AppShell>
    );
}
