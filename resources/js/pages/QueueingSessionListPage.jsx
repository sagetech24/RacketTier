import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import {
    fetchQueueingSessions,
    patchUpdateQueueingSession,
    deleteQueueingSession,
    postDuplicateQueueingSession,
} from '../api/queueingSession.js';
import { QueueingSessionSkipScoresField } from '../components/queueing/QueueingSessionSkipScoresField.jsx';
import { QueueingSessionGuestOptionalFields } from '../components/queueing/QueueingSessionGuestOptionalFields.jsx';
import {
    DEFAULT_AUTO_MATCH_CRITERIA,
    QueueingSessionAutoMatchCriteriaField,
    autoMatchCriteriaHasAny,
    normalizeAutoMatchCriteria,
    parseAutoMatchCriteria,
} from '../components/queueing/QueueingSessionAutoMatchCriteriaField.jsx';
import { ConfirmActionModal } from '../components/queueing/ConfirmActionModal.jsx';
import { QueueingSessionPageLoading } from '../components/queueing/QueueingSessionPageLoading.jsx';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { ToggleField } from '../components/app/ToggleSwitch.jsx';
import { MODAL_OVERLAY_CLASS, MODAL_OVERLAY_SHEET_CLASS, ModalPortal } from '../components/app/ModalPortal.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { SportIcon } from '../components/dashboard/SportIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { normalizedAppPath, queueingSessionNavPaths, queueSessionCardActionClass } from '../lib/queueingSessionNav.js';
import { canDeleteQueueingSession } from '../lib/queueingSessionPermissions.js';
import { userIsAdmin } from '../lib/userRoles.js';

function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * @param {{
 *   row: import('../api/gameSession.js').GameSessionDetail,
 *   navPath: string,
 *   viewOnly: boolean,
 *   isAdmin?: boolean,
 *   onEdit?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   onDelete?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   onDuplicate?: (row: import('../api/gameSession.js').GameSessionDetail) => void,
 *   deleteSubmitting?: boolean,
 *   duplicateSubmitting?: boolean,
 * }} props
 */
function QueueingSessionCard({
    row,
    navPath,
    viewOnly,
    isAdmin = false,
    onEdit,
    onDelete,
    onDuplicate,
    deleteSubmitting,
    duplicateSubmitting,
}) {
    const paths = queueingSessionNavPaths(row.id);
    const showDelete = canDeleteQueueingSession(row, isAdmin);
    const showDuplicate = Boolean(row.can_manage) && !row.is_active && Boolean(onDuplicate);
    const isActive = row.is_active && !viewOnly;

    return (
        <article
            className={[
                'rt-queue-card rt-interactive-card flex h-full flex-col p-4 md:p-5',
                isActive ? 'rt-queue-card--active border-[#3c3c3e]' : 'border-[#2a2a2d]',
                viewOnly ? 'opacity-90' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div className="rt-queue-card-body min-h-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="min-w-0 flex-1 text-base font-bold">
                    <Link to={`/queueing-session/${row.id}`} className="rt-queue-card-title-link inline-flex items-center gap-2">
                        <SportIcon icon={row.sport?.icon} className="shrink-0 text-[#4ce081]" />
                        <span className="truncate md:text-2xl text-md font-bold capitalize">
                            {row.queue_name?.trim()
                                ? row.queue_name.trim()
                                : `${row.sport?.name ?? 'Sport'} Queue`}
                        </span>
                    </Link>
                </h2>
                {!viewOnly && row.can_manage && onEdit ? (
                    <div className="rt-queue-card-manage">
                        {showDuplicate ? (
                            <button
                                type="button"
                                disabled={duplicateSubmitting}
                                onClick={() => onDuplicate(row)}
                                className={queueSessionCardActionClass('edit', { iconOnly: true })}
                                aria-label="Duplicate queue"
                            >
                                <MaterialIcon name="content_copy" className="rt-queue-card-btn__icon" />
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className={queueSessionCardActionClass('edit', { iconOnly: true })}
                            aria-label="Edit queue"
                        >
                            <MaterialIcon name="edit" className="rt-queue-card-btn__icon" />
                        </button>
                        {showDelete && onDelete ? (
                            <button
                                type="button"
                                disabled={deleteSubmitting}
                                onClick={() => onDelete(row)}
                                className={queueSessionCardActionClass('danger', { iconOnly: true })}
                                aria-label={row.is_active ? 'Delete queue' : 'Remove queue'}
                            >
                                <MaterialIcon name="delete_outline" className="rt-queue-card-btn__icon" />
                            </button>
                        ) : null}
                    </div>
                ) : showDuplicate || (showDelete && onDelete) ? (
                    <div className="rt-queue-card-manage">
                        {showDuplicate ? (
                            <button
                                type="button"
                                disabled={duplicateSubmitting}
                                onClick={() => onDuplicate(row)}
                                className={queueSessionCardActionClass('edit', { iconOnly: true })}
                                aria-label="Duplicate queue"
                            >
                                <MaterialIcon name="content_copy" className="rt-queue-card-btn__icon" />
                            </button>
                        ) : null}
                        {showDelete && onDelete ? (
                            <button
                                type="button"
                                disabled={deleteSubmitting}
                                onClick={() => onDelete(row)}
                                className={queueSessionCardActionClass('danger', { iconOnly: true })}
                                aria-label={row.is_active ? 'Delete queue' : 'Remove queue'}
                            >
                                <MaterialIcon name="delete_outline" className="rt-queue-card-btn__icon" />
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <p className="text-sm text-[#c8c5d2]/90">
                <span className="text-[#918f9c] text-sm md:text-xl">QM {row.created_by?.name ?? 'Unknown'}</span>
                <span className="ml-2 inline-block rounded-full bg-[#c2c1ff]/15 px-2 py-0.5 text-[10px] md:text-[12px] font-bold uppercase tracking-widest text-[#c2c1ff]">
                    {row.match_type}
                </span>
            </p>

            <div className="mt-3 text-[#918f9c] text-xs md:text-lg">
                <div className="flex items-center gap-1.5">
                    <MaterialIcon name="schedule" className="text-sm! md:text-lg! text-[#7877c6]" />
                    <span>Started {formatTime(row.started_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MaterialIcon name="groups" className="text-sm! md:text-lg! text-[#7877c6]" />
                    <span>{row.participant_count ?? 0} players</span>
                </div>
                {row.ended_at ? (
                    <div className="flex items-center gap-1.5">
                        <MaterialIcon name="flag" className="text-sm! md:text-lg! text-[#7877c6]" />
                        <span>Ended {formatTime(row.ended_at)}</span>
                    </div>
                ) : null}
                {row.completed_matches_count != null ? (
                    <div className="flex items-center gap-1.5">
                        <MaterialIcon name="sports_score" className="text-sm! md:text-lg! text-[#7877c6]" />
                        <span>{row.completed_matches_count} matches</span>
                    </div>
                ) : null}
            </div>

            </div>

            <footer className="rt-queue-card-footer">
                <Link
                    to={paths.dash}
                    className={queueSessionCardActionClass('nav', { active: navPath === paths.dash })}
                >
                    <MaterialIcon name="space_dashboard" className="rt-queue-card-btn__icon" />
                    {viewOnly ? 'Summary' : 'Dashboard'}
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

export function QueueingSessionListPage() {
    const { user } = useAuth();
    const isAdmin = userIsAdmin(user);
    const location = useLocation();
    const navigate = useNavigate();
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
    const [editOptionalGuestSkill, setEditOptionalGuestSkill] = useState(true);
    const [editOptionalGuestGender, setEditOptionalGuestGender] = useState(true);
    const [editAutoMatchCriteria, setEditAutoMatchCriteria] = useState(DEFAULT_AUTO_MATCH_CRITERIA);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');
    /** @type {import('../api/gameSession.js').GameSessionDetail | null} */
    const [deleteRow, setDeleteRow] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    /** @type {import('../api/gameSession.js').GameSessionDetail | null} */
    const [duplicateRow, setDuplicateRow] = useState(null);
    const [duplicateSubmitting, setDuplicateSubmitting] = useState(false);
    const [duplicateError, setDuplicateError] = useState('');

    function openEditModal(row) {
        setEditRow(row);
        setEditQueueName(row.queue_name?.trim() ?? '');
        setEditWinPoints(String(row.win_points ?? 30));
        setEditLossPoints(String(row.loss_points ?? 8));
        setEditSkipScores(Boolean(row.skip_scores));
        setEditOptionalGuestSkill(row.optional_guest_skill !== false);
        setEditOptionalGuestGender(row.optional_guest_gender !== false);
        setEditAutoMatchCriteria(parseAutoMatchCriteria(row.auto_match_criteria));
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
        if (!autoMatchCriteriaHasAny(editAutoMatchCriteria)) {
            setEditError('Select at least one auto-match criterion.');
            return;
        }
        setEditSubmitting(true);
        setEditError('');
        try {
            const normalizedCriteria = normalizeAutoMatchCriteria(editAutoMatchCriteria);
            const updated = await patchUpdateQueueingSession(editRow.id, {
                queue_name: name,
                win_points: w,
                loss_points: l,
                skip_scores: editSkipScores,
                optional_guest_skill: editOptionalGuestSkill,
                optional_guest_gender: editOptionalGuestGender,
                ...normalizedCriteria,
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

    const showActiveSection = status !== 'finished';
    const showFinishedSection = status !== 'active';

    const showInitialSkeleton = loading && rows.length === 0 && !error;
    const isRefreshing = loading && rows.length > 0 && !showInitialSkeleton;
    const contentKey = `${debouncedQ}-${status}-${mineOnly}-${sort}`;

    const activeCount = activeRows.length;
    const subtitle = isAdmin
        ? 'Admin view — all queueing sessions across the platform.'
        : 'Browse active queues and review today\u2019s finished sessions.';

    return (
        <AppShell user={user}>
            {showInitialSkeleton ? (
                <QueueingSessionPageLoading />
            ) : (
                <>
                    <PageHeader
                        eyebrow="Queue Master"
                        title="Queueing Sessions"
                        subtitle={subtitle}
                        action={
                            <Link to="/queueing-session/new" className="rt-queue-new-btn">
                                <MaterialIcon name="add" className="text-base!" />
                                New queue
                            </Link>
                        }
                    />

                    <p className="-mt-4 mb-6 text-sm text-[#c8c5d2]/80 md:-mt-6 md:mb-8">
                        {isAdmin ? (
                            <span className="mr-2 inline-block rounded-full bg-[#c2c1ff]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#c2c1ff]">
                                Admin
                            </span>
                        ) : null}
                        <Link to="/queueing-session/history" className="font-medium text-[#4ce081] transition hover:text-[#6ae896]">
                            {isAdmin ? 'View all session history' : 'View my session history'}
                        </Link>
                    </p>

                    <section className="rt-queue-toolbar rt-surface-card mb-6 p-4 md:p-5">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="relative col-span-2 md:col-span-2">
                                <div className="pointer-events-none absolute inset-y-0 left-3.5 z-10 flex items-center text-[#918f9c]">
                                    <MaterialIcon name="search" className="text-xl!" />
                                </div>
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search queue, sport, QM, or ID"
                                    aria-label="Search queueing sessions"
                                    className="rt-input py-3.5 pl-11"
                                />
                            </div>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                aria-label="Sort sessions"
                                className="rt-queue-filter-select col-span-1"
                            >
                                <option value="updated_desc">Recently Updated</option>
                                <option value="updated_asc">Least Recently Updated</option>
                                <option value="created_desc">Newest</option>
                                <option value="created_asc">Oldest</option>
                            </select>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                aria-label="Filter by status"
                                className="rt-queue-filter-select col-span-1"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="finished">Finished Today</option>
                            </select>
                        </div>
                        <ToggleField
                            checked={mineOnly}
                            onChange={setMineOnly}
                            layout="inline"
                            className="mt-3 border-t border-white/5 px-1 pt-3"
                            label="My Queues Only"
                        />
                    </section>

                    <div
                        key={contentKey}
                        className={['rt-queue-list-content flex flex-col gap-3', isRefreshing ? 'rt-queue-list-content--refreshing' : '']
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {error ? (
                            <div className="rt-alert-error" role="alert">
                                {error}
                            </div>
                        ) : null}

                        {!loading && rows.length === 0 ? (
                            <EmptyState
                                icon="groups"
                                title={q.trim() ? 'No matches' : 'No queueing sessions yet'}
                                description={
                                    q.trim()
                                        ? 'Try a different search or clear your filters.'
                                        : 'Create a queue to organize players and run matches.'
                                }
                                actionLabel={q.trim() ? undefined : 'New queue'}
                                actionTo={q.trim() ? undefined : '/queueing-session/new'}
                            />
                        ) : null}

                        {showActiveSection && activeRows.length > 0 ? (
                            <section className="mb-2">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h2 className="rt-queue-section-heading">Active</h2>
                                    <span className="text-xs font-semibold tabular-nums text-[#4ce081]">
                                        {activeCount} live
                                    </span>
                                </div>
                                <div className="rt-queue-list grid grid-cols-1 gap-3 md:grid-cols-1 md:gap-4">
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
                                <h2 className="rt-queue-section-heading mb-1">Finished today</h2>
                                <p className="mb-3 text-xs text-[#918f9c]">
                                    {isAdmin
                                        ? 'Manage or open summary for finished sessions from today.'
                                        : 'View only — open summary for leaderboard and session stats.'}
                                </p>
                                <div className="rt-queue-list grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                                    {finishedTodayRows.map((row) => (
                                        <QueueingSessionCard
                                            key={row.id}
                                            row={row}
                                            navPath={navPath}
                                            viewOnly={!row.can_manage && !canDeleteQueueingSession(row, isAdmin)}
                                            isAdmin={isAdmin}
                                            onEdit={row.can_manage ? openEditModal : undefined}
                                            onDelete={openDeleteConfirm}
                                            onDuplicate={row.can_manage ? openDuplicateConfirm : undefined}
                                            deleteSubmitting={deleteSubmitting}
                                            duplicateSubmitting={duplicateSubmitting}
                                        />
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </div>
                </>
            )}

            {editRow ? (
                <ModalPortal open={Boolean(editRow)}>
                    <div className={MODAL_OVERLAY_SHEET_CLASS} role="presentation">
                        <div
                            className="rt-end-match-modal-sheet relative flex max-h-[min(90dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:rounded-2xl md:max-w-lg"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="edit-queue-title"
                        >
                            <div className="shrink-0 border-b border-white/5 px-5 pb-3 pt-5">
                                <h2 id="edit-queue-title" className="text-lg font-bold tracking-tight text-[#e4e1e6]">
                                    Edit queue
                                </h2>
                                <p className="mt-1 text-xs text-[#918f9c]">
                                    Update settings for {editRow.queue_name?.trim() || `session #${editRow.id}`}.
                                </p>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                                <div className="space-y-4">
                                    <div>
                                        <label
                                            htmlFor="edit-queue-name"
                                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]"
                                        >
                                            Name of the queue
                                        </label>
                                        <input
                                            id="edit-queue-name"
                                            type="text"
                                            value={editQueueName}
                                            onChange={(e) => setEditQueueName(e.target.value)}
                                            maxLength={120}
                                            autoComplete="off"
                                            className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm text-[#e4e1e6]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                                Win points
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={9999}
                                                value={editWinPoints}
                                                onChange={(e) => setEditWinPoints(e.target.value)}
                                                className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm text-[#e4e1e6]"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                                Loss points
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={9999}
                                                value={editLossPoints}
                                                onChange={(e) => setEditLossPoints(e.target.value)}
                                                className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm text-[#e4e1e6]"
                                            />
                                        </div>
                                    </div>
                                    <QueueingSessionSkipScoresField
                                        checked={editSkipScores}
                                        onChange={setEditSkipScores}
                                        disabled={editSubmitting}
                                    />
                                    <QueueingSessionGuestOptionalFields
                                        optionalGuestSkill={editOptionalGuestSkill}
                                        optionalGuestGender={editOptionalGuestGender}
                                        onOptionalGuestSkillChange={setEditOptionalGuestSkill}
                                        onOptionalGuestGenderChange={setEditOptionalGuestGender}
                                        disabled={editSubmitting}
                                    />
                                    <QueueingSessionAutoMatchCriteriaField
                                        value={editAutoMatchCriteria}
                                        onChange={setEditAutoMatchCriteria}
                                        disabled={editSubmitting}
                                    />
                                    {editError ? (
                                        <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                                            {editError}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex shrink-0 gap-2 border-t border-[#2a2a2d] p-5 pt-4">
                                <button
                                    type="button"
                                    disabled={editSubmitting}
                                    onClick={() => closeEditModal()}
                                    className="min-h-11 flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={editSubmitting}
                                    onClick={() => onSaveEdit()}
                                    className="min-h-11 flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:opacity-50"
                                >
                                    {editSubmitting ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            ) : null}

            {deleteRow ? (
                <ModalPortal open={Boolean(deleteRow)}>
                    <div className={MODAL_OVERLAY_CLASS}>
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
                </ModalPortal>
            ) : null}

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
