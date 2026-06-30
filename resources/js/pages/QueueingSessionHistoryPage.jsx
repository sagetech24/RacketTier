import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchQueueingSessionHistory, deleteQueueingSession } from '../api/queueingSession.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { queueingSessionNavPaths, queueingSessionTabClass } from '../lib/queueingSessionNav.js';
import { canDeleteQueueingSession } from '../lib/queueingSessionPermissions.js';
import { userIsAdmin } from '../lib/userRoles.js';

const PAGE_SIZE = 15;

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

/**
 * @param {{
 *   row: import('../api/gameSession.js').GameSessionDetail,
 *   onRemove?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   removeSubmitting?: boolean,
 *   isAdmin?: boolean,
 * }} props
 */
function HistoryCard({ row, onRemove, removeSubmitting, isAdmin = false }) {
    const paths = queueingSessionNavPaths(row.id);
    const showRemove = canDeleteQueueingSession(row, isAdmin);
    return (
        <article className="h-full rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] p-4 md:p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-base font-bold md:text-lg">
                    <SportIcon icon={row.sport?.icon} className="text-[#4ce081]" />
                    <Link to={`/queueing-session/${row.id}`} className="truncate">
                        {row.queue_name?.trim()
                            ? row.queue_name.trim()
                            : `${row.sport?.name ?? 'Sport'} Queue`}
                    </Link>
                </h2>
                <span className="shrink-0 capitalize rounded-full bg-[#0f8d47] px-2 py-0.5 text-xs font-bold text-[#c8c5d2]">
                    finished
                </span>
            </div>
            <p className="flex justify-between items-center text-sm text-[#c8c5d2]/90 capitalize">
                <span className="inline-flex items-center gap-1">
                    QM: {row.created_by?.name ?? 'Unknown'} <span className="ml-2 inline-block rounded-full bg-[#c2c1ff]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c2c1ff]">{row.match_type}</span>
                </span>
                {row.is_host ? (
                    <span className="inline-block rounded-full bg-[#c2c1ff]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c2c1ff]">
                        Host
                    </span>
                ) : null}
            </p>
            <div className="mt-3 text-xs text-[#918f9c] md:grid md:grid-cols-1 md:gap-x-4 md:gap-y-0.5">
                <div className="space-y-1">
                    <div>Started: {formatTime(row.started_at)}</div>
                    <div>Ended: {formatTime(row.ended_at)}</div>
                </div>
                <div className="space-y-1">
                    <div>Players: {row.participant_count ?? 0}</div>
                    {row.completed_matches_count != null ? (
                        <div>Matches: {row.completed_matches_count}</div>
                    ) : null}
                </div>
            </div>
            <div className="mt-3 flex w-full flex-wrap gap-2 md:gap-4">
                {showRemove && onRemove ? (
                    <button
                        type="button"
                        disabled={removeSubmitting}
                        onClick={() => onRemove(row)}
                        className={`${queueingSessionTabClass(false)} text-center text-red-300 border-red-400/50 disabled:opacity-50 md:flex-1`}
                    >
                        Remove
                    </button>
                ) : null}
                <Link
                    to={paths.dash}
                    className={`${queueingSessionTabClass(false)} text-center text-white/70 border-white/70 md:flex-1`}
                >
                    Summary
                </Link>
                <Link
                    to={paths.players}
                    className={`${queueingSessionTabClass(false)} text-center text-white/70 border-white/70 md:flex-1`}
                >
                    Players
                </Link>
                <Link
                    to={paths.matches}
                    className={`${queueingSessionTabClass(false)} text-center text-white/70 border-white/70 md:flex-1`}
                >
                    Matches
                </Link>
            </div>
        </article>
    );
}

export function QueueingSessionHistoryPage() {
    const { user } = useAuth();
    const isAdmin = userIsAdmin(user);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [q, setQ] = useState('');
    const [mineOnly, setMineOnly] = useState(false);
    /** @type {import('../api/gameSession.js').GameSessionDetail | null} */
    const [removeRow, setRemoveRow] = useState(null);
    const [removeSubmitting, setRemoveSubmitting] = useState(false);
    const [removeError, setRemoveError] = useState('');
    const cursorRef = useRef(null);
    const loadMoreRef = useRef(null);
    const loadingMoreRef = useRef(false);

    const loadPage = useCallback(
        async (cursor, append, filters) => {
            const isInitial = !append;
            if (isInitial) {
                setLoading(true);
            } else {
                setLoadingMore(true);
                loadingMoreRef.current = true;
            }
            setError('');

            try {
                const { data, meta } = await fetchQueueingSessionHistory({
                    limit: PAGE_SIZE,
                    cursor: cursor ?? undefined,
                    q: filters.q,
                    mineOnly: filters.mineOnly,
                });
                setItems((prev) => (append ? [...prev, ...data] : data));
                cursorRef.current = meta.next_cursor;
                setHasMore(meta.has_more);
            } catch (e) {
                setError(
                    isInitial
                        ? e instanceof Error
                            ? e.message
                            : 'Could not load your session history.'
                        : 'Could not load more history.',
                );
            } finally {
                if (isInitial) {
                    setLoading(false);
                } else {
                    setLoadingMore(false);
                    loadingMoreRef.current = false;
                }
            }
        },
        [],
    );

    useEffect(() => {
        cursorRef.current = null;
        const handle = setTimeout(() => {
            void loadPage(null, false, { q, mineOnly });
        }, q.trim() ? 250 : 0);
        return () => clearTimeout(handle);
    }, [loadPage, q, mineOnly]);

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
                void loadPage(cursorRef.current, true, { q, mineOnly });
            },
            { rootMargin: '120px' },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, loadPage, items.length, q, mineOnly]);

    function openRemoveConfirm(row) {
        setRemoveRow(row);
        setRemoveError('');
    }

    function closeRemoveConfirm() {
        setRemoveRow(null);
        setRemoveError('');
    }

    async function onConfirmRemove() {
        if (!removeRow) return;
        setRemoveSubmitting(true);
        setRemoveError('');
        try {
            await deleteQueueingSession(removeRow.id);
            setItems((prev) => prev.filter((row) => row.id !== removeRow.id));
            closeRemoveConfirm();
        } catch (e) {
            setRemoveError(e instanceof Error ? e.message : 'Could not remove session.');
        } finally {
            setRemoveSubmitting(false);
        }
    }

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36 md:max-w-3xl md:px-8 md:pb-20 md:pt-32 lg:max-w-5xl">
                <div className="mb-4 md:mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                        {isAdmin ? (
                            <>Session <span className="text-[#c2c1ff]">History</span></>
                        ) : (
                            <>My Session <span className="text-[#c2c1ff]">History</span></>
                        )}
                    </h1>
                    <p className="mt-2 text-sm text-[#c8c5d2]/80 md:max-w-2xl md:text-base">
                        {isAdmin
                            ? 'All finished queueing sessions across the platform.'
                            : 'Every queueing session you hosted or joined.'}
                    </p>
                </div>

                <section className="mb-4 rounded-xl border border-[#3c3c3e] bg-[#1b1b1e] p-4 md:mb-6 md:p-5">
                    <div className="md:flex md:items-center md:gap-4">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by queue name, sport, or queue master"
                            className="w-full rounded-lg border border-[#3c3c3e] bg-[#131316] px-3 py-3 text-sm md:flex-1"
                        />
                        <label className="mt-1 flex shrink-0 items-center gap-2 px-3 py-3 text-sm md:mt-0">
                            <input
                                type="checkbox"
                                checked={mineOnly}
                                onChange={(e) => setMineOnly(e.target.checked)}
                            />
                            My queues only
                        </label>
                    </div>
                </section>

                {error ? (
                    <p
                        role="alert"
                        className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200"
                    >
                        {error}
                    </p>
                ) : null}

                {loading ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <div className="h-32 animate-pulse rounded-xl bg-[#1b1b1e]" />
                        <div className="h-32 animate-pulse rounded-xl bg-[#1b1b1e]" />
                        <div className="h-32 animate-pulse rounded-xl bg-[#1b1b1e]" />
                    </div>
                ) : items.length === 0 ? (
                    <p className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] px-4 py-5 text-sm text-[#918f9c]">
                        {q.trim() || mineOnly
                            ? 'No past sessions match your filters.'
                            : "You haven't joined a queueing session yet."}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        {items.map((row) => (
                            <HistoryCard
                                key={row.id}
                                row={row}
                                isAdmin={isAdmin}
                                onRemove={openRemoveConfirm}
                                removeSubmitting={removeSubmitting}
                            />
                        ))}

                        {hasMore ? (
                            <div
                                ref={loadMoreRef}
                                className="col-span-full flex justify-center py-4"
                                aria-hidden={loadingMore}
                            >
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

            <ConfirmActionModal
                open={Boolean(removeRow)}
                title="Remove finished queue?"
                description={
                    removeRow
                        ? `This permanently removes ${removeRow.queue_name?.trim() || `session #${removeRow.id}`} and all related players and matches. This cannot be undone.`
                        : undefined
                }
                busy={removeSubmitting}
                confirmLabel="Remove session"
                confirmBusyLabel="Removing…"
                onCancel={() => closeRemoveConfirm()}
                onConfirm={() => onConfirmRemove()}
            >
                {removeError ? (
                    <p className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                        {removeError}
                    </p>
                ) : null}
            </ConfirmActionModal>

            <DashboardMobileNav />
        </div>
    );
}
