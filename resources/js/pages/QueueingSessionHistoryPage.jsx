import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import {
    fetchQueueingSessionHistory,
    deleteQueueingSession,
    postDuplicateQueueingSession,
} from '../api/queueingSession.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { ToggleField } from '../components/app/ToggleSwitch.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { QueueingSessionPageLoading } from '../components/queueing/QueueingSessionPageLoading.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
    normalizedAppPath,
    queueingSessionNavPaths,
    queueSessionCardActionClass,
} from '../lib/queueingSessionNav.js';
import { canDeleteQueueingSession } from '../lib/queueingSessionPermissions.js';
import { userIsAdmin } from '../lib/userRoles.js';

const PAGE_SIZE = 15;

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * @param {string | null | undefined} startedAt
 * @param {string | null | undefined} endedAt
 */
function formatDuration(startedAt, endedAt) {
    if (!startedAt || !endedAt) return null;
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
    const mins = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * @param {string | null | undefined} iso
 */
function historyGroupKey(iso) {
    if (!iso) return 'unknown';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'unknown';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    if (d >= startOfToday) return 'today';
    if (d >= startOfYesterday) return 'yesterday';
    if (d >= startOfWeek) return 'week';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {string} key
 */
function historyGroupLabel(key) {
    if (key === 'today') return 'Today';
    if (key === 'yesterday') return 'Yesterday';
    if (key === 'week') return 'Earlier this week';
    if (key === 'unknown') return 'Undated';
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * @param {{
 *   row: import('../api/gameSession.js').GameSessionDetail,
 *   navPath: string,
 *   onRemove?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   onDuplicate?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   removeSubmitting?: boolean,
 *   duplicateSubmitting?: boolean,
 *   isAdmin?: boolean,
 * }} props
 */
function HistoryCard({
    row,
    navPath,
    onRemove,
    onDuplicate,
    removeSubmitting,
    duplicateSubmitting,
    isAdmin = false,
}) {
    const paths = queueingSessionNavPaths(row.id);
    const showRemove = canDeleteQueueingSession(row, isAdmin);
    const showDuplicate = Boolean(row.can_manage) && Boolean(onDuplicate);
    const duration = formatDuration(row.started_at, row.ended_at);
    const title =
        row.queue_name?.trim() || `${row.sport?.name ?? 'Sport'} Queue`;

    return (
        <article className="rt-queue-card rt-interactive-card flex h-full flex-col border-[#2a2a2d] p-4 md:p-5">
            <div className="rt-queue-card-body min-h-0 flex-1">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="min-w-0 flex-1 text-base font-bold">
                        <Link
                            to={`/queueing-session/${row.id}`}
                            className="rt-queue-card-title-link inline-flex max-w-full items-center gap-2"
                        >
                            <SportIcon icon={row.sport?.icon} className="shrink-0 text-[#4ce081]" />
                            <span className="truncate text-md font-bold capitalize md:text-2xl">
                                {title}
                            </span>
                        </Link>
                    </h2>
                    {showDuplicate || (showRemove && onRemove) ? (
                        <div className="rt-queue-card-manage">
                            {showDuplicate ? (
                                <button
                                    type="button"
                                    disabled={duplicateSubmitting}
                                    onClick={() => onDuplicate(row)}
                                    className={queueSessionCardActionClass('edit', { iconOnly: true })}
                                    aria-label={`Recreate ${title}`}
                                >
                                    <MaterialIcon name="content_copy" className="rt-queue-card-btn__icon" />
                                </button>
                            ) : null}
                            {showRemove && onRemove ? (
                                <button
                                    type="button"
                                    disabled={removeSubmitting}
                                    onClick={() => onRemove(row)}
                                    className={queueSessionCardActionClass('danger', { iconOnly: true })}
                                    aria-label={`Remove ${title}`}
                                >
                                    <MaterialIcon name="delete_outline" className="rt-queue-card-btn__icon" />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <p className="flex flex-wrap items-center gap-2 text-sm text-[#c8c5d2]/90">
                    <span className="text-sm text-[#918f9c] md:text-xl">
                        QM {row.created_by?.name ?? 'Unknown'}
                    </span>
                    <span className="inline-block rounded-full bg-[#c2c1ff]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] md:text-[12px]">
                        {row.match_type}
                    </span>
                    {row.is_host ? (
                        <span className="inline-block rounded-full border border-[#c2c1ff]/25 bg-[#c2c1ff]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] md:text-[12px]">
                            Host
                        </span>
                    ) : null}
                </p>

                <div className="rt-queue-meta-grid mt-3 text-xs md:text-lg">
                    <div className="flex items-center gap-1.5">
                        <MaterialIcon name="schedule" className="text-sm! text-[#7877c6] md:text-lg!" />
                        <span>Started {formatTime(row.started_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MaterialIcon name="flag" className="text-sm! text-[#7877c6] md:text-lg!" />
                        <span>Ended {formatTime(row.ended_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MaterialIcon name="groups" className="text-sm! text-[#7877c6] md:text-lg!" />
                        <span>{row.participant_count ?? 0} players</span>
                    </div>
                    {row.completed_matches_count != null ? (
                        <div className="flex items-center gap-1.5">
                            <MaterialIcon name="sports_score" className="text-sm! text-[#7877c6] md:text-lg!" />
                            <span>{row.completed_matches_count} matches</span>
                        </div>
                    ) : null}
                    {duration ? (
                        <div className="flex items-center gap-1.5">
                            <MaterialIcon name="timelapse" className="text-sm! text-[#7877c6] md:text-lg!" />
                            <span>{duration} session</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <footer className="rt-queue-card-footer">
                <Link
                    to={paths.dash}
                    className={queueSessionCardActionClass('nav', { active: navPath === paths.dash })}
                >
                    <MaterialIcon name="summarize" className="rt-queue-card-btn__icon" />
                    Summary
                </Link>
                <Link
                    to={paths.players}
                    className={queueSessionCardActionClass('nav', { active: navPath === paths.players })}
                >
                    <MaterialIcon name="groups" className="rt-queue-card-btn__icon" />
                    Players ({row.participant_count ?? 0})
                </Link>
                <Link
                    to={paths.matches}
                    className={queueSessionCardActionClass('nav', { active: navPath === paths.matches })}
                >
                    <MaterialIcon name="sports_score" className="rt-queue-card-btn__icon" />
                    Matches ({row.completed_matches_count ?? 0})
                </Link>
            </footer>
        </article>
    );
}

export function QueueingSessionHistoryPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const navPath = normalizedAppPath(location.pathname);
    const isAdmin = userIsAdmin(user);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [q, setQ] = useState('');
    const debouncedQ = useDebouncedValue(q, 250);
    const [mineOnly, setMineOnly] = useState(false);
    /** @type {import('../api/gameSession.js').GameSessionDetail | null} */
    const [removeRow, setRemoveRow] = useState(null);
    const [removeSubmitting, setRemoveSubmitting] = useState(false);
    const [removeError, setRemoveError] = useState('');
    /** @type {import('../api/gameSession.js').GameSessionDetail | null} */
    const [duplicateRow, setDuplicateRow] = useState(null);
    const [duplicateSubmitting, setDuplicateSubmitting] = useState(false);
    const [duplicateError, setDuplicateError] = useState('');
    const cursorRef = useRef(null);
    const loadMoreRef = useRef(null);
    const loadingMoreRef = useRef(false);

    const loadPage = useCallback(async (cursor, append, filters) => {
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
    }, []);

    useEffect(() => {
        cursorRef.current = null;
        void loadPage(null, false, { q: debouncedQ, mineOnly });
    }, [loadPage, debouncedQ, mineOnly]);

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
                void loadPage(cursorRef.current, true, { q: debouncedQ, mineOnly });
            },
            { rootMargin: '120px' },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, loadPage, items.length, debouncedQ, mineOnly]);

    const grouped = useMemo(() => {
        /** @type {Map<string, typeof items>} */
        const map = new Map();
        for (const row of items) {
            const key = historyGroupKey(row.ended_at || row.started_at);
            const list = map.get(key);
            if (list) {
                list.push(row);
            } else {
                map.set(key, [row]);
            }
        }
        return [...map.entries()];
    }, [items]);

    const hasFilters = Boolean(debouncedQ.trim()) || mineOnly;
    const showInitialSkeleton = loading && items.length === 0 && !error;
    const isRefreshing = loading && items.length > 0;

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

    function openDuplicateConfirm(row) {
        setDuplicateRow(row);
        setDuplicateError('');
    }

    function closeDuplicateConfirm() {
        setDuplicateRow(null);
        setDuplicateError('');
    }

    async function onConfirmDuplicate() {
        if (!duplicateRow) return;
        setDuplicateSubmitting(true);
        setDuplicateError('');
        try {
            const created = await postDuplicateQueueingSession(duplicateRow.id);
            closeDuplicateConfirm();
            navigate(`/queueing-session/${created.id}/players`);
        } catch (e) {
            setDuplicateError(e instanceof Error ? e.message : 'Could not duplicate session.');
        } finally {
            setDuplicateSubmitting(false);
        }
    }

    function clearFilters() {
        setQ('');
        setMineOnly(false);
    }

    const subtitle = isAdmin
        ? 'All finished queueing sessions across the platform.'
        : 'Every queueing session you hosted or joined.';

    return (
        <AppShell user={user}>
            {showInitialSkeleton ? (
                <QueueingSessionPageLoading />
            ) : (
                <>
                    <PageHeader
                        eyebrow="Archive"
                        title="Session History"
                        subtitle={subtitle}
                        action={
                            <Link to="/queueing-session" className="rt-btn-secondary inline-flex items-center gap-1.5">
                                <MaterialIcon name="arrow_back" className="text-base!" />
                                <span className="hidden sm:inline">Active queues</span>
                                <span className="sm:hidden">Queues</span>
                            </Link>
                        }
                    />

                    {isAdmin ? (
                        <p className="-mt-4 mb-6 text-sm text-[#c8c5d2]/80 md:-mt-6 md:mb-8">
                            <span className="mr-2 inline-block rounded-full bg-[#c2c1ff]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c2c1ff]">
                                Admin
                            </span>
                            Showing finished sessions for every member.
                        </p>
                    ) : null}

                    <section className="rt-queue-toolbar rt-surface-card mb-6 p-4 md:p-5">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-3.5 z-10 flex items-center text-[#918f9c]">
                                <MaterialIcon name="search" className="text-xl!" />
                            </div>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search queue, sport, or queue master"
                                aria-label="Search session history"
                                className="rt-input py-3.5 pl-11 pr-11"
                            />
                            {q ? (
                                <button
                                    type="button"
                                    onClick={() => setQ('')}
                                    className="absolute inset-y-0 right-2 z-10 my-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#918f9c] transition-colors duration-200 hover:bg-white/5 hover:text-[#e4e1e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/65"
                                    aria-label="Clear search"
                                >
                                    <MaterialIcon name="close" className="text-lg!" />
                                </button>
                            ) : null}
                        </div>
                        <ToggleField
                            checked={mineOnly}
                            onChange={setMineOnly}
                            layout="inline"
                            className="mt-3 border-t border-white/5 px-1 pt-3"
                            label="My queues only"
                        />
                    </section>

                    <div
                        className={[
                            'rt-queue-list-content flex flex-col gap-3',
                            isRefreshing ? 'rt-queue-list-content--refreshing' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        aria-busy={loading || loadingMore}
                    >
                        {error ? (
                            <div className="rt-alert-error" role="alert">
                                {error}
                            </div>
                        ) : null}

                        {!loading && items.length === 0 ? (
                            <EmptyState
                                icon={hasFilters ? 'search_off' : 'history'}
                                title={hasFilters ? 'No matches' : 'No session history yet'}
                                description={
                                    hasFilters
                                        ? 'Try a different search or clear your filters.'
                                        : 'Finish a queueing session and it will show up here with summary, players, and matches.'
                                }
                                actionLabel={hasFilters ? undefined : 'Browse active queues'}
                                actionTo={hasFilters ? undefined : '/queueing-session'}
                            />
                        ) : null}

                        {!loading && items.length === 0 && hasFilters ? (
                            <div className="-mt-2 flex justify-center">
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="rt-btn-secondary cursor-pointer"
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : null}

                        {items.length > 0 ? (
                            <>
                                <p className="sr-only" aria-live="polite">
                                    {items.length} session{items.length === 1 ? '' : 's'} loaded
                                    {hasMore ? ', scroll for more' : ''}
                                </p>

                                {grouped.map(([groupKey, rows]) => (
                                    <section key={groupKey} className="mb-2">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <h2 className="rt-queue-section-heading">
                                                {historyGroupLabel(groupKey)}
                                            </h2>
                                            <span className="text-xs font-semibold tabular-nums text-[#918f9c]">
                                                {rows.length}
                                            </span>
                                        </div>
                                        <div className="rt-queue-list grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-1">
                                            {rows.map((row) => (
                                                <HistoryCard
                                                    key={row.id}
                                                    row={row}
                                                    navPath={navPath}
                                                    isAdmin={isAdmin}
                                                    onRemove={openRemoveConfirm}
                                                    onDuplicate={openDuplicateConfirm}
                                                    removeSubmitting={removeSubmitting}
                                                    duplicateSubmitting={duplicateSubmitting}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ))}

                                {hasMore ? (
                                    <div
                                        ref={loadMoreRef}
                                        className="flex justify-center py-6"
                                        aria-hidden={loadingMore ? undefined : true}
                                    >
                                        {loadingMore ? (
                                            <div
                                                className="flex items-center gap-2 text-xs text-[#918f9c]"
                                                role="status"
                                                aria-live="polite"
                                            >
                                                <div
                                                    className="size-5 animate-spin rounded-full border-2 border-[#c2c1ff]/30 border-t-[#c2c1ff]"
                                                    aria-hidden
                                                />
                                                Loading more…
                                            </div>
                                        ) : (
                                            <p className="text-xs text-[#c8c5d2]/50">Scroll for more</p>
                                        )}
                                    </div>
                                ) : items.length >= PAGE_SIZE ? (
                                    <p className="pb-2 text-center text-xs text-[#918f9c]">
                                        End of history
                                    </p>
                                ) : null}
                            </>
                        ) : null}
                    </div>
                </>
            )}

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

            <ConfirmActionModal
                open={Boolean(duplicateRow)}
                title="Duplicate this queue?"
                description={
                    duplicateRow
                        ? `Creates a new active queue with the same settings and players from ${duplicateRow.queue_name?.trim() || `session #${duplicateRow.id}`}. Matches are not copied — you can edit the roster afterward.`
                        : undefined
                }
                busy={duplicateSubmitting}
                confirmLabel="Duplicate queue"
                confirmBusyLabel="Duplicating…"
                confirmClassName="flex-1 rounded-lg bg-[#0f8d47] py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                onCancel={() => closeDuplicateConfirm()}
                onConfirm={() => onConfirmDuplicate()}
            >
                {duplicateError ? (
                    <p className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                        {duplicateError}
                    </p>
                ) : null}
            </ConfirmActionModal>
        </AppShell>
    );
}
