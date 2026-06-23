import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchQueueingSessions, patchUpdateQueueingSession, deleteQueueingSession } from '../api/queueingSession.js';
import { QueueingSessionSkipScoresField } from '../components/queueing/QueueingSessionSkipScoresField.jsx';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { normalizedAppPath, queueingSessionNavPaths, queueingSessionTabClass } from '../lib/queueingSessionNav.js';
import { canDeleteQueueingSession } from '../lib/queueingSessionPermissions.js';
import { userIsAdmin } from '../lib/userRoles.js';

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

/**
 * @param {{
 *   row: import('../api/gameSession.js').GameSessionDetail,
 *   navPath: string,
 *   viewOnly: boolean,
 *   isAdmin?: boolean,
 *   onEdit?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   onDelete?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   deleteSubmitting?: boolean,
 * }} props
 */
function QueueingSessionCard({ row, navPath, viewOnly, isAdmin = false, onEdit, onDelete, deleteSubmitting }) {
    const paths = queueingSessionNavPaths(row.id);
    const showDelete = canDeleteQueueingSession(row, isAdmin);
    return (
        <article
            className={`h-full rounded-xl border bg-[#1b1b1e] p-4 md:p-5 ${
                viewOnly ? 'border-[#2a2a2d]' : 'border-[#3c3c3e]'
            }`}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold">
                    <SportIcon icon={row.sport?.icon} className="text-[#4ce081]" />
                    <Link to={`/queueing-session/${row.id}`}>
                    {row.queue_name?.trim()
                        ? row.queue_name.trim()
                        : `${row.sport?.name ?? 'Sport'} Queue`}
                    </Link>
                </h2>
                <QueueSessionCardBadges row={row} viewOnly={viewOnly} />
            </div>
            <p className="text-sm text-[#c8c5d2]/90 capitalize">
                {row.match_type} · Queue Master: {row.created_by?.name ?? 'Unknown'}
            </p>
            <p className="mt-1 text-xs text-[#918f9c] md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-0.5">
                <span>Started: {formatTime(row.started_at)}</span>
                <span>Ended: {formatTime(row.ended_at)}</span>
                <span>Players: {row.participant_count ?? 0}</span>
                {row.completed_matches_count != null ? (
                    <span>Matches: {row.completed_matches_count}</span>
                ) : null}
            </p>
            <div className="mt-3 flex w-full flex-wrap gap-2 md:gap-4">
                {!viewOnly && row.can_manage && onEdit ? (
                    <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className={`${queueingSessionTabClass(false)} text-center text-[#c2c1ff] border-[#c2c1ff]/50 md:flex-1`}
                    >
                        Edit
                    </button>
                ) : null}
                {showDelete && onDelete ? (
                    <button
                        type="button"
                        disabled={deleteSubmitting}
                        onClick={() => onDelete(row)}
                        className={`${queueingSessionTabClass(false)} text-center text-red-300 border-red-400/50 disabled:opacity-50 md:flex-1`}
                    >
                        {row.is_active ? 'Delete' : 'Remove'}
                    </button>
                ) : null}
                <Link
                    to={paths.dash}
                    className={`${queueingSessionTabClass(navPath === paths.dash)} text-center text-white/70 border-white/70 md:flex-1`}
                >
                    {viewOnly ? 'Summary' : 'Dashboard'}
                </Link>
                <Link
                    to={paths.players}
                    className={`${queueingSessionTabClass(navPath === paths.players)} text-center text-white/70 border-white/70 md:flex-1`}
                >
                    Players
                </Link>
                <Link
                    to={paths.matches}
                    className={`${queueingSessionTabClass(navPath === paths.matches)} text-center text-white/70 border-white/70 md:flex-1`}
                >
                    Matches
                </Link>
            </div>
        </article>
    );
}

function QueueSessionCardBadges({ row, viewOnly }) {
    return (
        <div className="flex flex-col items-end gap-1">
            <span
                className={
                    row.is_active
                        ? 'capitalize rounded-full bg-[#4ce081]/20 px-2 py-0.5 text-xs font-bold text-[#4ce081]'
                        : 'capitalize rounded-full bg-[#353438] px-2 py-0.5 text-xs font-bold text-[#c8c5d2]'
                }
            >
                {row.is_active ? row.status : 'finished'}
            </span>
        </div>
    );
}

export function QueueingSessionListPage() {
    const { user } = useAuth();
    const isAdmin = userIsAdmin(user);
    const location = useLocation();
    const navPath = normalizedAppPath(location.pathname);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');
    const debouncedQ = useDebouncedValue(q, 350);
    const [status, setStatus] = useState('all');
    const [mineOnly, setMineOnly] = useState(false);
    const [sort, setSort] = useState('updated_desc');
    /** @type {import('../api/gameSession.js').GameSessionDetail | null} */
    const [editRow, setEditRow] = useState(null);
    const [editQueueName, setEditQueueName] = useState('');
    const [editWinPoints, setEditWinPoints] = useState('30');
    const [editLossPoints, setEditLossPoints] = useState('8');
    const [editSkipScores, setEditSkipScores] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');
    /** @type {import('../api/gameSession.js').GameSessionDetail | null} */
    const [deleteRow, setDeleteRow] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    function openEditModal(row) {
        setEditRow(row);
        setEditQueueName(row.queue_name?.trim() ?? '');
        setEditWinPoints(String(row.win_points ?? 30));
        setEditLossPoints(String(row.loss_points ?? 8));
        setEditSkipScores(Boolean(row.skip_scores));
        setEditError('');
    }

    function closeEditModal() {
        setEditRow(null);
        setEditError('');
    }

    async function onSaveEdit() {
        if (!editRow) return;
        const w = Number.parseInt(editWinPoints, 10);
        const l = Number.parseInt(editLossPoints, 10);
        const name = editQueueName.trim();
        if (!name) {
            setEditError('Enter a name for this queue.');
            return;
        }
        if (!Number.isFinite(w) || w < 0 || !Number.isFinite(l) || l < 0) {
            setEditError('Enter valid point numbers.');
            return;
        }
        setEditSubmitting(true);
        setEditError('');
        try {
            const updated = await patchUpdateQueueingSession(editRow.id, {
                queue_name: name,
                win_points: w,
                loss_points: l,
                skip_scores: editSkipScores,
            });
            setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
            closeEditModal();
        } catch (e) {
            setEditError(e instanceof Error ? e.message : 'Could not update session.');
        } finally {
            setEditSubmitting(false);
        }
    }

    function openDeleteConfirm(row) {
        setDeleteRow(row);
        setDeleteError('');
    }

    function closeDeleteConfirm() {
        setDeleteRow(null);
        setDeleteError('');
    }

    async function onConfirmDelete() {
        if (!deleteRow) return;
        setDeleteSubmitting(true);
        setDeleteError('');
        try {
            await deleteQueueingSession(deleteRow.id);
            setRows((prev) => prev.filter((r) => r.id !== deleteRow.id));
            closeDeleteConfirm();
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : 'Could not delete session.');
        } finally {
            setDeleteSubmitting(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await fetchQueueingSessions({ q: debouncedQ, status, mineOnly, sort });
                if (!cancelled) setRows(data);
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Could not load queueing sessions.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [debouncedQ, status, mineOnly, sort]);

    const { activeRows, finishedTodayRows } = useMemo(() => {
        const active = rows.filter((row) => row.is_active);
        const finishedToday = rows.filter((row) => !row.is_active);
        return { activeRows: active, finishedTodayRows: finishedToday };
    }, [rows]);

    const emptyMessage = useMemo(() => {
        if (loading) return '';
        if (q.trim()) return 'No sessions match your filters.';
        return 'No queueing sessions yet.';
    }, [loading, q]);

    const showActiveSection = status !== 'finished';
    const showFinishedSection = status !== 'active';

    return (
        <div className="dashboard-v2-shell bg-[#131316] font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />
            <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-36 md:max-w-3xl md:px-8 md:pb-20 md:pt-32 lg:max-w-5xl">
                <div className="mb-4 flex items-start justify-between gap-3 md:mb-6">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                            Queueing <span className="text-[#c2c1ff]">Sessions</span>
                        </h1>
                        <p className="text-sm text-[#c8c5d2]/80 mt-2">
                            {isAdmin
                                ? 'Admin view — all queueing sessions across the platform.'
                                : 'Browse active queues and review today\u2019s finished sessions.'}{' '}
                            <Link
                                to="/queueing-session/history"
                                className="text-[#4ce081]"
                            >
                                {isAdmin ? 'View all session history' : 'View my session history'}
                            </Link>
                        </p>
                        {isAdmin ? (
                            <span className="mt-2 inline-block rounded-full bg-[#c2c1ff]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c2c1ff]">
                                Admin
                            </span>
                        ) : null}
                    </div>
                    <Link
                        to="/queueing-session/new"
                        className="flex shrink-0 items-center rounded-xl bg-[#4ce081] px-2.5 py-2 text-sm font-semibold text-[#003919] transition hover:brightness-105 md:px-4 md:py-2.5"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="size-4"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Queue
                    </Link>
                </div>

                <section className="mb-4 rounded-xl border border-[#3c3c3e] bg-[#1b1b1e] p-4 md:mb-6 md:p-5">
                    <div className="grid grid-cols-4 gap-3 md:grid-cols-2">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by queue name, sport, queue master, or queue ID"
                            className="col-span-4 rounded-lg border border-[#3c3c3e] bg-[#131316] px-3 py-3 text-sm md:col-span-2"
                        />
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="col-span-2 rounded-lg border border-[#3c3c3e] bg-[#131316] px-3 py-3 text-sm md:col-span-1"
                        >
                            <option value="updated_desc">Recently Updated</option>
                            <option value="updated_asc">Least Recently Updated</option>
                            <option value="created_desc">Newest</option>
                            <option value="created_asc">Oldest</option>
                        </select>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="col-span-2 rounded-lg border border-[#3c3c3e] bg-[#131316] px-3 py-3 text-sm md:col-span-1"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="finished">Finished Today</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 mt-1 px-3 py-3 text-sm checked:bg-[#4ce081]/20">
                        <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                        My Queues Only
                    </label>
                </section>

                {error ? (
                    <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </p>
                ) : null}

                {loading ? <div className="h-40 animate-pulse rounded-xl bg-[#2a2a2d]" /> : null}

                {!loading && rows.length === 0 ? (
                    <p className="rounded-xl border border-[#2a2a2d] bg-[#1b1b1e] px-4 py-5 text-sm text-[#918f9c]">
                        {emptyMessage}
                    </p>
                ) : null}

                {showActiveSection && activeRows.length > 0 ? (
                    <section className="mb-6">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#918f9c]">Active</h2>
                        <div className="rt-queue-session-cards-grid space-y-3 md:space-y-0">
                            {activeRows.map((row) => (
                                <QueueingSessionCard
                                    key={row.id}
                                    row={row}
                                    navPath={navPath}
                                    viewOnly={false}
                                    isAdmin={isAdmin}
                                    onEdit={openEditModal}
                                    onDelete={openDeleteConfirm}
                                    deleteSubmitting={deleteSubmitting}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}

                {showFinishedSection && finishedTodayRows.length > 0 ? (
                    <section>
                        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[#918f9c]">
                            Finished today
                        </h2>
                        <p className="mb-3 text-xs text-[#918f9c]">
                            {isAdmin
                                ? 'Manage or open summary for finished sessions from today.'
                                : 'View only — open summary for leaderboard and session stats.'}
                        </p>
                        <div className="rt-queue-session-cards-grid space-y-3 md:space-y-0">
                            {finishedTodayRows.map((row) => (
                                <QueueingSessionCard
                                    key={row.id}
                                    row={row}
                                    navPath={navPath}
                                    viewOnly={!row.can_manage && !canDeleteQueueingSession(row, isAdmin)}
                                    isAdmin={isAdmin}
                                    onEdit={row.can_manage ? openEditModal : undefined}
                                    onDelete={openDeleteConfirm}
                                    deleteSubmitting={deleteSubmitting}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}
            </main>

            {editRow ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center p-4 sm:items-center md:p-6">
                    <div className="rt-end-match-modal-sheet w-full max-w-md rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl md:max-w-lg md:rounded-2xl">
                        <h2 className="mb-1 text-lg font-bold">Edit queue</h2>
                        <p className="mb-4 text-xs text-[#918f9c]">
                            Update settings for {editRow.queue_name?.trim() || `session #${editRow.id}`}.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="edit-queue-name" className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                    Name of the queue
                                </label>
                                <input
                                    id="edit-queue-name"
                                    type="text"
                                    value={editQueueName}
                                    onChange={(e) => setEditQueueName(e.target.value)}
                                    maxLength={120}
                                    className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">Win points</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={9999}
                                        value={editWinPoints}
                                        onChange={(e) => setEditWinPoints(e.target.value)}
                                        className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">Loss points</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={9999}
                                        value={editLossPoints}
                                        onChange={(e) => setEditLossPoints(e.target.value)}
                                        className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm"
                                    />
                                </div>
                            </div>
                            <QueueingSessionSkipScoresField
                                checked={editSkipScores}
                                onChange={setEditSkipScores}
                                disabled={editSubmitting}
                            />
                            {editError ? (
                                <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">{editError}</p>
                            ) : null}
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                disabled={editSubmitting}
                                onClick={() => closeEditModal()}
                                className="flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={editSubmitting}
                                onClick={() => onSaveEdit()}
                                className="flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:opacity-50"
                            >
                                {editSubmitting ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {deleteRow ? (
                <div className="rt-end-match-modal-overlay fixed inset-0 z-[99] flex items-end justify-center p-4 sm:items-center md:p-6">
                    <div className="rt-end-match-modal-sheet w-full max-w-md rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl md:max-w-lg md:rounded-2xl">
                        <h2 className="mb-1 text-lg font-bold text-red-200">
                            {deleteRow.is_active ? 'Delete queue?' : 'Remove finished queue?'}
                        </h2>
                        <p className="mb-4 text-xs text-[#918f9c]">
                            This permanently removes{' '}
                            {deleteRow.queue_name?.trim() || `session #${deleteRow.id}`} and all
                            related players and matches. This cannot be undone.
                        </p>
                        {deleteError ? (
                            <p className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                                {deleteError}
                            </p>
                        ) : null}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={deleteSubmitting}
                                onClick={() => closeDeleteConfirm()}
                                className="flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleteSubmitting}
                                onClick={() => onConfirmDelete()}
                                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {deleteSubmitting
                                    ? deleteRow.is_active
                                        ? 'Deleting…'
                                        : 'Removing…'
                                    : deleteRow.is_active
                                      ? 'Delete session'
                                      : 'Remove session'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <DashboardMobileNav />
        </div>
    );
}
