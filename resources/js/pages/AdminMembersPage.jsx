import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { AdminMembersForbiddenError, fetchAdminMembers } from '../api/adminMembers.js';
import { AdminMembersLoadMore } from '../components/admin/AdminMembersLoadMore.jsx';
import { AdminMembersTable } from '../components/admin/AdminMembersTable.jsx';
import { AdminMembersTableSkeleton } from '../components/admin/AdminMembersTableSkeleton.jsx';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const PER_PAGE = 10;

export function AdminMembersPage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const qParam = (searchParams.get('q') ?? '').trim();
    const requestIdRef = useRef(0);

    const [searchInput, setSearchInput] = useState(qParam);
    const [page, setPage] = useState(1);
    const [members, setMembers] = useState(/** @type {import('../api/adminMembers.js').AdminMemberRow[]} */ ([]));
    const [meta, setMeta] = useState(/** @type {import('../api/adminMembers.js').AdminMembersMeta | null} */ (null));
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            const next = searchInput.trim();
            if (next === qParam) {
                return;
            }
            const params = {};
            if (next) {
                params.q = next;
            }
            setSearchParams(params);
        }, 350);
        return () => window.clearTimeout(handle);
    }, [qParam, searchInput, setSearchParams]);

    useEffect(() => {
        const requestId = ++requestIdRef.current;
        let cancelled = false;

        async function loadFirstPage() {
            setError('');
            setLoading(true);
            setLoadingMore(false);
            setPage(1);
            try {
                const payload = await fetchAdminMembers(1, PER_PAGE, qParam);
                if (cancelled || requestId !== requestIdRef.current) {
                    return;
                }
                setMembers(payload.data);
                setMeta(payload.meta);
            } catch (err) {
                if (cancelled || requestId !== requestIdRef.current) {
                    return;
                }
                if (err instanceof AdminMembersForbiddenError) {
                    setForbidden(true);
                    return;
                }
                setMembers([]);
                setMeta(null);
                setError('Could not load members. Check your connection and try again.');
            } finally {
                if (!cancelled && requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        }

        void loadFirstPage();
        return () => {
            cancelled = true;
        };
    }, [qParam, reloadKey]);

    const loadMore = useCallback(async () => {
        if (loadingMore || loading) {
            return;
        }
        const nextPage = page + 1;
        const lastPage = meta?.last_page ?? 1;
        if (nextPage > lastPage) {
            return;
        }

        const requestId = requestIdRef.current;
        setError('');
        setLoadingMore(true);
        try {
            const payload = await fetchAdminMembers(nextPage, PER_PAGE, qParam);
            if (requestId !== requestIdRef.current) {
                return;
            }
            setMembers((prev) => {
                const seen = new Set(prev.map((row) => row.id));
                return [...prev, ...payload.data.filter((row) => !seen.has(row.id))];
            });
            setMeta(payload.meta);
            setPage(nextPage);
        } catch (err) {
            if (requestId !== requestIdRef.current) {
                return;
            }
            if (err instanceof AdminMembersForbiddenError) {
                setForbidden(true);
                return;
            }
            setError('Could not load more members. Check your connection and try again.');
        } finally {
            if (requestId === requestIdRef.current) {
                setLoadingMore(false);
            }
        }
    }, [loading, loadingMore, meta, page, qParam]);

    if (forbidden) {
        return <Navigate to="/profile" replace />;
    }

    const total = meta?.total ?? 0;
    const hasMore = members.length < total && (meta?.current_page ?? page) < (meta?.last_page ?? 1);
    const showInitialSkeleton = loading && members.length === 0 && !error;
    const emptyAfterSearch = !loading && !error && members.length === 0 && qParam.length > 0;
    const emptyNoMembers = !loading && !error && members.length === 0 && qParam.length === 0 && total === 0;

    const subtitle = !meta
        ? 'Registered members, newest first.'
        : qParam
          ? `${total} matching member${total === 1 ? '' : 's'} for “${qParam}”.`
          : `${total} registered member${total === 1 ? '' : 's'}, newest first.`;

    return (
        <AppShell user={user}>
            <PageHeader size="md" title="Member Management" subtitle={subtitle} />

            <div className="mb-6">
                <div className="rt-facility-search group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                        <MaterialIcon name="search" className="text-xl" />
                    </div>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by name or email…"
                        className="rt-facility-search-input"
                        aria-label="Search members"
                    />
                    {searchInput ? (
                        <button
                            type="button"
                            onClick={() => setSearchInput('')}
                            className="rt-facility-search-clear"
                            aria-label="Clear search"
                        >
                            <MaterialIcon name="close" className="text-lg" />
                        </button>
                    ) : null}
                </div>
                <div className="mt-2 min-h-5" aria-live="polite">
                    {loading && members.length > 0 ? (
                        <p className="text-xs font-medium text-[#918f9c]">Updating results…</p>
                    ) : null}
                </div>
            </div>

            {error ? (
                <div className="rt-alert-error mb-6" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-2"
                        onClick={() => {
                            if (members.length > 0 && (meta?.current_page ?? page) < (meta?.last_page ?? 1)) {
                                void loadMore();
                                return;
                            }
                            setReloadKey((key) => key + 1);
                        }}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {showInitialSkeleton ? <AdminMembersTableSkeleton /> : null}

            {emptyNoMembers ? (
                <EmptyState
                    icon="group"
                    title="No members yet"
                    description="Registered members will appear here once accounts are created."
                />
            ) : null}

            {emptyAfterSearch ? (
                <EmptyState
                    icon="search_off"
                    title="No matching members"
                    description={`Nothing matched “${qParam}”. Try another name or email.`}
                />
            ) : null}

            {!emptyNoMembers && !emptyAfterSearch && members.length > 0 ? (
                <>
                    <AdminMembersTable members={members} />
                    <AdminMembersLoadMore
                        hasMore={hasMore}
                        loading={loadingMore}
                        loadedCount={members.length}
                        total={total}
                        onLoadMore={() => void loadMore()}
                    />
                </>
            ) : null}
        </AppShell>
    );
}
