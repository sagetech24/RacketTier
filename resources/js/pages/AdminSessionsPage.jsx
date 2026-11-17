import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AdminMembersForbiddenError } from '../api/adminMembers.js';
import { fetchAdminSessions } from '../api/adminDashboard.js';
import { deleteQueueingSession, postEndQueueingSession } from '../api/queueingSession.js';
import {
    AdminFilterChips,
    AdminPanel,
    AdminPanelRow,
    AdminPanelSkeleton,
} from '../components/admin/AdminPanel.jsx';
import { AdminSearchField } from '../components/admin/AdminSearchField.jsx';
import { AdminShell } from '../components/admin/AdminShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const PER_PAGE = 20;

export function AdminSessionsPage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const statusParam = searchParams.get('status') ?? '';
    const qParam = (searchParams.get('q') ?? '').trim();

    const [searchInput, setSearchInput] = useState(qParam);
    const [sessions, setSessions] = useState(/** @type {any[]} */ ([]));
    const [meta, setMeta] = useState(/** @type {any} */ (null));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);
    const [actionId, setActionId] = useState(/** @type {number | null} */ (null));

    useEffect(() => {
        const handle = window.setTimeout(() => {
            const next = searchInput.trim();
            if (next === qParam) return;
            const params = new URLSearchParams(searchParams);
            if (next) params.set('q', next);
            else params.delete('q');
            setSearchParams(params);
        }, 350);
        return () => window.clearTimeout(handle);
    }, [searchInput, qParam, searchParams, setSearchParams]);

    const reload = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const payload = await fetchAdminSessions({
                page: 1,
                per_page: PER_PAGE,
                status: statusParam || undefined,
                q: qParam || undefined,
            });
            setSessions(payload.data);
            setMeta(payload.meta);
        } catch (err) {
            if (err instanceof AdminMembersForbiddenError) {
                setForbidden(true);
                return;
            }
            setError('Could not load sessions.');
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, [statusParam, qParam]);

    useEffect(() => {
        void reload();
    }, [reload]);

    async function handleForceEnd(sessionId) {
        if (!window.confirm('Force-end this session? Ongoing matches will close without results.')) {
            return;
        }
        setActionId(sessionId);
        try {
            await postEndQueueingSession(sessionId);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not end session.');
        } finally {
            setActionId(null);
        }
    }

    async function handleDelete(sessionId) {
        if (!window.confirm('Delete this session permanently?')) {
            return;
        }
        setActionId(sessionId);
        try {
            await deleteQueueingSession(sessionId);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete session.');
        } finally {
            setActionId(null);
        }
    }

    if (forbidden) {
        return <Navigate to="/profile" replace />;
    }

    function setStatus(next) {
        const params = new URLSearchParams(searchParams);
        if (next) params.set('status', next);
        else params.delete('status');
        setSearchParams(params);
    }

    const total = meta?.total ?? 0;
    const subtitle = !meta
        ? 'Oversee any queueing session — open, force-end, or delete.'
        : qParam || statusParam
          ? `${total} matching session${total === 1 ? '' : 's'}.`
          : `${total} queueing session${total === 1 ? '' : 's'}.`;

    const showSkeleton = loading && sessions.length === 0 && !error;
    const empty = !loading && !error && sessions.length === 0;

    return (
        <AdminShell user={user}>
            <PageHeader size="md" eyebrow="Admin" title="Sessions" subtitle={subtitle} />

            <AdminFilterChips
                value={statusParam}
                onChange={setStatus}
                options={[
                    { value: '', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'ended', label: 'Ended' },
                ]}
            />

            <AdminSearchField
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search queue name or QM…"
                label="Search sessions"
                loadingHint={loading && sessions.length > 0}
            />

            {error ? (
                <div className="rt-alert-error mb-6" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-2"
                        onClick={() => void reload()}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {showSkeleton ? <AdminPanelSkeleton label="Loading sessions" /> : null}

            {empty ? (
                <EmptyState
                    icon="sports_tennis"
                    title="No sessions"
                    description="No queueing sessions match these filters."
                />
            ) : null}

            {sessions.length > 0 ? (
                <AdminPanel>
                    <div className="hidden grid-cols-[minmax(0,1.5fr)_7rem_8rem_9rem] gap-4 border-b border-[#45454a] px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#918f9c] md:grid">
                        <div>Session</div>
                        <div>Status</div>
                        <div>Players</div>
                        <div>Actions</div>
                    </div>
                    {sessions.map((session) => (
                        <AdminPanelRow key={session.id} as="article">
                            <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.5fr)_7rem_8rem_9rem] md:items-center md:gap-4">
                                <div className="min-w-0">
                                    <h3 className="truncate text-base font-bold text-[#e4e1e6] md:text-sm md:font-semibold">
                                        {session.queue_name || `Session #${session.id}`}
                                    </h3>
                                    <p className="mt-0.5 truncate text-xs text-[#918f9c]">
                                        {session.sport?.name ?? 'Sport'} · QM {session.created_by?.name ?? '—'}
                                    </p>
                                </div>
                                <div>
                                    <span
                                        className={[
                                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                                            session.is_active
                                                ? 'bg-[#4ce081]/15 text-[#4ce081]'
                                                : 'bg-white/5 text-[#918f9c]',
                                        ].join(' ')}
                                    >
                                        {session.is_active ? 'Active' : 'Ended'}
                                    </span>
                                </div>
                                <div className="text-sm tabular-nums text-[#c8c5d2]">
                                    {session.participant_count ?? 0} players · {session.queueing_matches_count ?? 0}{' '}
                                    matches
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        to={`/queueing-session/${session.id}`}
                                        className="rt-facility-btn rt-facility-btn-lavender inline-flex min-h-10 items-center px-3 text-xs"
                                    >
                                        Open
                                    </Link>
                                    {session.is_active && session.can_manage ? (
                                        <button
                                            type="button"
                                            disabled={actionId === session.id}
                                            onClick={() => void handleForceEnd(session.id)}
                                            className="min-h-10 rounded-lg border border-[#ffb4ab]/40 px-3 text-xs font-bold text-[#ffb4ab]"
                                        >
                                            Force end
                                        </button>
                                    ) : null}
                                    {session.can_delete ? (
                                        <button
                                            type="button"
                                            disabled={actionId === session.id}
                                            onClick={() => void handleDelete(session.id)}
                                            className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-[#918f9c]"
                                        >
                                            Delete
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </AdminPanelRow>
                    ))}
                </AdminPanel>
            ) : null}

            {meta && sessions.length > 0 ? (
                <p className="mt-4 text-xs text-[#918f9c]">
                    Showing {sessions.length} of {meta.total} sessions
                </p>
            ) : null}
        </AdminShell>
    );
}
