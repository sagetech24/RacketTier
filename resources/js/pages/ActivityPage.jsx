import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyActivity } from '../api/activity.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const PAGE_SIZE = 15;

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

function activityIcon(kind) {
    if (kind === 'queueing_match') {
        return { name: 'groups', wrap: 'bg-[#c2c1ff]/10', color: 'text-[#c2c1ff]' };
    }
    return { name: 'history', wrap: 'bg-[#4ce081]/10', color: 'text-[#4ce081]' };
}

/** @param {import('../api/activity.js').UserActivityItem} row */
function ActivityItemMeta({ row }) {
    const score =
        row.team1_score != null && row.team2_score != null ? `${row.team1_score}-${row.team2_score}` : null;

    const details = [
        row.match_no != null ? { label: 'Match', value: `#${row.match_no}` } : null,
        score ? { label: 'Score', value: score } : null,
        row.session_points_earned != null
            ? { label: 'Points', value: `+${row.session_points_earned}`, accent: 'points' }
            : null,
        row.rating_change != null
            ? {
                  label: 'Rating %',
                  value: `${row.rating_change >= 0 ? '+' : ''}${row.rating_change}`,
                  accent: row.rating_change >= 0 ? 'elo-up' : 'elo-down',
              }
            : null,
    ].filter(Boolean);

    if (details.length === 0) {
        return null;
    }

    return (
        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
            {details.map((item) => (
                <div key={item.label} className="flex min-w-0 items-baseline gap-1.5">
                    <dt className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[#c8c5d2]/55">
                        {item.label}
                    </dt>
                    <dd
                        className={[
                            'truncate text-xs font-semibold leading-tight',
                            item.accent === 'points'
                                ? 'text-[#4ce081]'
                                : item.accent === 'elo-up'
                                  ? 'text-[#c2c1ff]'
                                  : item.accent === 'elo-down'
                                    ? 'text-red-300/90'
                                    : 'text-[#e4e1e6]',
                        ].join(' ')}
                    >
                        {item.value}
                    </dd>
                </div>
            ))}
            {row.won != null ? (
                <div className="col-span-2 flex items-center gap-1.5">
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-[#c8c5d2]/55">Result</dt>
                    <dd>
                        <span
                            className={[
                                'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none',
                                row.won ? 'bg-[#4ce081]/15 text-[#4ce081]' : 'bg-red-400/15 text-red-300/90',
                            ].join(' ')}
                        >
                            {row.won ? 'Win' : 'Loss'}
                        </span>
                    </dd>
                </div>
            ) : null}
        </dl>
    );
}

export function ActivityPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const cursorRef = useRef(null);
    const loadMoreRef = useRef(null);
    const loadingMoreRef = useRef(false);

    const loadPage = useCallback(async (cursor, append) => {
        const isInitial = !append;
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
            loadingMoreRef.current = true;
        }
        setError('');

        try {
            const { data, meta } = await fetchMyActivity({
                limit: PAGE_SIZE,
                cursor: cursor ?? undefined,
            });
            setItems((prev) => (append ? [...prev, ...data] : data));
            cursorRef.current = meta.next_cursor;
            setHasMore(meta.has_more);
        } catch {
            setError(
                isInitial
                    ? 'Could not load your activity. Refresh and try again.'
                    : 'Could not load more activity.',
            );
        } finally {
            if (isInitial) {
                setLoading(false);
            } else {
                setLoadingMore(false);
                loadingMoreRef.current = false;
            }
        }
    }, []);

    useEffect(() => {
        cursorRef.current = null;
        void loadPage(null, false);
    }, [loadPage]);

    useEffect(() => {
        const node = loadMoreRef.current;
        if (!node || !hasMore || loading || loadingMore) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (
                    !entry?.isIntersecting ||
                    !hasMore ||
                    loadingMoreRef.current ||
                    cursorRef.current == null
                ) {
                    return;
                }
                void loadPage(cursorRef.current, true);
            },
            { rootMargin: '120px' },
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, loadPage, items.length]);

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} />

            <main className="mx-auto min-h-screen max-w-md px-6 pb-32 pt-28">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#e4e1e6]">Activity</h2>
                    <p className="text-xs font-medium text-[#c8c5d2]/60">Past 7 days</p>
                </div>

                {error ? (
                    <div
                        className="mb-6 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200"
                        role="alert"
                    >
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
                        No activity in the last 7 days. Play a facility match or join a queue session to see results
                        here.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((row) => {
                            const icon = activityIcon(row.kind);
                            return (
                                <Link
                                    key={row.id}
                                    to={row.href}
                                    className="flex items-start gap-4 rounded-xl bg-[#1b1b1e] p-4 transition-colors hover:bg-[#1f1f22]"
                                >
                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${icon.wrap}`}
                                    >
                                        <MaterialIcon name={icon.name} className={icon.color} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-lg font-semibold leading-tight text-[#e4e1e6]">{row.title}</h4>
                                        <ActivityItemMeta className="mt-1.5" row={row} />
                                    </div>
                                    {row.finished_at ? (
                                        <div className="shrink-0 text-right">
                                            <p className="text-[10px] font-medium text-[#c8c5d2]/60">
                                                {formatRelativeTime(row.finished_at)}
                                            </p>
                                        </div>
                                    ) : null}
                                </Link>
                            );
                        })}

                        {hasMore ? (
                            <div ref={loadMoreRef} className="flex justify-center py-4" aria-hidden={loadingMore}>
                                {loadingMore ? (
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c2c1ff]/30 border-t-[#c2c1ff]" />
                                ) : (
                                    <p className="text-xs text-[#c8c5d2]/50">Scroll for more</p>
                                )}
                            </div>
                        ) : null}
                    </div>
                )}
            </main>

            <DashboardMobileNav />
        </div>
    );
}
