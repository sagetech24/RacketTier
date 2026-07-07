import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMyActivity } from '../api/activity.js';
import { ActivityFeedItem } from '../components/app/ActivityFeedItem.jsx';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
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
        <AppShell user={user}>
            <PageHeader
                size="md"
                title="Activity"
                subtitle="Your match history from the past 7 days."
            />

            {error ? (
                <div className="rt-alert-error mb-6" role="alert">
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div className="space-y-3">
                    <div className="h-20 animate-pulse rounded-xl bg-[#1b1b1e]" />
                    <div className="h-20 animate-pulse rounded-xl bg-[#1b1b1e]" />
                    <div className="h-20 animate-pulse rounded-xl bg-[#1b1b1e]" />
                </div>
            ) : items.length === 0 ? (
                <EmptyState
                    icon="history"
                    title="No activity yet"
                    description="Play a facility match or join a queue session to see results here."
                    actionLabel="Browse facilities"
                    actionTo="/facilities"
                />
            ) : (
                <div className="space-y-3">
                    {items.map((row) => (
                        <ActivityFeedItem
                            key={row.id}
                            row={row}
                            showMatchNo
                            relativeTime={row.finished_at ? formatRelativeTime(row.finished_at) : undefined}
                        />
                    ))}

                    {hasMore ? (
                        <div ref={loadMoreRef} className="flex justify-center py-4" aria-hidden={loadingMore}>
                            {loadingMore ? (
                                <div
                                    className="h-8 w-8 animate-spin rounded-full border-2 border-[#c2c1ff]/30 border-t-[#c2c1ff]"
                                    role="status"
                                    aria-label="Loading more activity"
                                />
                            ) : (
                                <p className="text-xs text-[#918f9c]">Scroll for more</p>
                            )}
                        </div>
                    ) : null}
                </div>
            )}
        </AppShell>
    );
}
