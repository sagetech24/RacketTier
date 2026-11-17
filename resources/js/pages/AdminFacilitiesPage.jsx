import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { patchFacility, postFacility } from '../api/facilities.js';
import { AdminMembersForbiddenError } from '../api/adminMembers.js';
import { deleteFacility, fetchAdminFacilities, restoreFacility } from '../api/adminDashboard.js';
import { AdminPanel, AdminPanelRow, AdminPanelSkeleton } from '../components/admin/AdminPanel.jsx';
import { AdminSearchField } from '../components/admin/AdminSearchField.jsx';
import { AdminShell } from '../components/admin/AdminShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { FacilityFormModal } from '../components/facilities/FacilityFormModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminFacilitiesPage() {
    const { user } = useAuth();
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [includeArchived, setIncludeArchived] = useState(false);
    const [facilities, setFacilities] = useState(/** @type {any[]} */ ([]));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);

    const [addOpen, setAddOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [newCoverPhoto, setNewCoverPhoto] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [addError, setAddError] = useState('');
    const [addFieldErrors, setAddFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));

    const [editOpen, setEditOpen] = useState(false);
    const [editingFacilityId, setEditingFacilityId] = useState(/** @type {number | null} */ (null));
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editCoverPhoto, setEditCoverPhoto] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');
    const [editFieldErrors, setEditFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [busyId, setBusyId] = useState(/** @type {number | null} */ (null));

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    const reload = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const rows = await fetchAdminFacilities({
                q: debouncedSearch,
                include_archived: includeArchived,
            });
            setFacilities(rows);
        } catch (err) {
            if (err instanceof AdminMembersForbiddenError) {
                setForbidden(true);
                return;
            }
            setError('Could not load facilities.');
            setFacilities([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, includeArchived]);

    useEffect(() => {
        void reload();
    }, [reload]);

    async function handleAdd(e) {
        e.preventDefault();
        setAddSubmitting(true);
        setAddError('');
        setAddFieldErrors({});
        try {
            await postFacility({
                name: newName.trim(),
                address: newAddress.trim(),
                cover_photo: newCoverPhoto.trim() || null,
            });
            setAddOpen(false);
            setNewName('');
            setNewAddress('');
            setNewCoverPhoto('');
            await reload();
        } catch (err) {
            if (err && typeof err === 'object' && 'errors' in err && err.errors) {
                setAddFieldErrors(/** @type {Record<string, string[]>} */ (err.errors));
            }
            setAddError(err instanceof Error ? err.message : 'Could not add facility.');
        } finally {
            setAddSubmitting(false);
        }
    }

    async function handleEdit(e) {
        e.preventDefault();
        if (!editingFacilityId) return;
        setEditSubmitting(true);
        setEditError('');
        setEditFieldErrors({});
        try {
            await patchFacility(editingFacilityId, {
                name: editName.trim(),
                address: editAddress.trim(),
                cover_photo: editCoverPhoto.trim() || null,
            });
            setEditOpen(false);
            await reload();
        } catch (err) {
            if (err && typeof err === 'object' && 'errors' in err && err.errors) {
                setEditFieldErrors(/** @type {Record<string, string[]>} */ (err.errors));
            }
            setEditError(err instanceof Error ? err.message : 'Could not update facility.');
        } finally {
            setEditSubmitting(false);
        }
    }

    async function handleArchive(id) {
        if (!window.confirm('Archive this facility? It will hide from the member browse list.')) return;
        setBusyId(id);
        try {
            await deleteFacility(id);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not archive.');
        } finally {
            setBusyId(null);
        }
    }

    async function handleRestore(id) {
        setBusyId(id);
        try {
            await restoreFacility(id);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not restore.');
        } finally {
            setBusyId(null);
        }
    }

    if (forbidden) {
        return <Navigate to="/profile" replace />;
    }

    const total = facilities.length;
    const subtitle = debouncedSearch
        ? `${total} matching facilit${total === 1 ? 'y' : 'ies'} for “${debouncedSearch}”.`
        : `${total} facilit${total === 1 ? 'y' : 'ies'}${includeArchived ? ' (including archived)' : ''}.`;

    const showSkeleton = loading && facilities.length === 0 && !error;
    const empty = !loading && !error && facilities.length === 0;

    return (
        <AdminShell user={user}>
            <PageHeader
                size="md"
                eyebrow="Admin"
                title="Facilities"
                subtitle={loading && facilities.length === 0 ? 'Create, edit, and archive partner venues.' : subtitle}
                action={
                    <button
                        type="button"
                        className="rt-facility-btn rt-facility-btn-lavender inline-flex min-h-11 items-center px-4"
                        onClick={() => {
                            setAddOpen(true);
                            setAddError('');
                            setAddFieldErrors({});
                        }}
                    >
                        Add facility
                    </button>
                }
            />

            <AdminSearchField
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search by name or address…"
                label="Search facilities"
                loadingHint={loading && facilities.length > 0}
                trailing={
                    <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#45454a] bg-[#1b1b1e] px-3 text-sm text-[#c8c5d2]">
                        <input
                            type="checkbox"
                            checked={includeArchived}
                            onChange={(e) => setIncludeArchived(e.target.checked)}
                            className="size-4 rounded border-white/20 bg-[#1b1b1e]"
                        />
                        Show archived
                    </label>
                }
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

            {showSkeleton ? <AdminPanelSkeleton label="Loading facilities" /> : null}

            {empty ? (
                <EmptyState
                    icon={debouncedSearch ? 'search_off' : 'stadium'}
                    title={debouncedSearch ? 'No matching facilities' : 'No facilities'}
                    description={
                        debouncedSearch
                            ? `Nothing matched “${debouncedSearch}”. Try another name or address.`
                            : 'Add a venue to host facility matches.'
                    }
                />
            ) : null}

            {facilities.length > 0 ? (
                <AdminPanel>
                    <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_9rem] gap-4 border-b border-[#45454a] px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#918f9c] md:grid">
                        <div>Name</div>
                        <div>Address</div>
                        <div>Activity</div>
                        <div>Actions</div>
                    </div>
                    {facilities.map((facility) => (
                        <AdminPanelRow key={facility.id} as="article">
                            <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_9rem] md:items-center md:gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="truncate text-base font-bold text-[#e4e1e6] md:text-sm md:font-semibold">
                                            {facility.name}
                                        </h3>
                                        {facility.archived ? (
                                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">
                                                Archived
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-[#918f9c] md:hidden">
                                        {facility.address || 'No address'}
                                    </p>
                                </div>
                                <p className="hidden truncate text-sm text-[#c8c5d2] md:block">
                                    {facility.address || 'No address'}
                                </p>
                                <p className="text-xs tabular-nums text-[#918f9c] md:text-sm md:text-[#c8c5d2]">
                                    {facility.game_sessions_count ?? 0} sessions · today{' '}
                                    {facility.today_matches_count ?? 0}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {!facility.archived ? (
                                        <>
                                            <button
                                                type="button"
                                                className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-[#c8c5d2]"
                                                onClick={() => {
                                                    setEditingFacilityId(facility.id);
                                                    setEditName(facility.name ?? '');
                                                    setEditAddress(facility.address ?? '');
                                                    setEditCoverPhoto(facility.cover_photo ?? '');
                                                    setEditError('');
                                                    setEditFieldErrors({});
                                                    setEditOpen(true);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busyId === facility.id}
                                                className="min-h-10 rounded-lg border border-[#ffb4ab]/40 px-3 text-xs font-bold text-[#ffb4ab]"
                                                onClick={() => void handleArchive(facility.id)}
                                            >
                                                Archive
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={busyId === facility.id}
                                            className="min-h-10 rounded-lg border border-[#4ce081]/40 px-3 text-xs font-bold text-[#4ce081]"
                                            onClick={() => void handleRestore(facility.id)}
                                        >
                                            Restore
                                        </button>
                                    )}
                                </div>
                            </div>
                        </AdminPanelRow>
                    ))}
                </AdminPanel>
            ) : null}

            <FacilityFormModal
                open={addOpen}
                mode="add"
                name={newName}
                address={newAddress}
                coverPhoto={newCoverPhoto}
                submitting={addSubmitting}
                error={addError}
                fieldErrors={addFieldErrors}
                onNameChange={setNewName}
                onAddressChange={setNewAddress}
                onCoverPhotoChange={setNewCoverPhoto}
                onClose={() => {
                    if (!addSubmitting) setAddOpen(false);
                }}
                onSubmit={handleAdd}
            />

            <FacilityFormModal
                open={editOpen}
                mode="edit"
                name={editName}
                address={editAddress}
                coverPhoto={editCoverPhoto}
                submitting={editSubmitting}
                error={editError}
                fieldErrors={editFieldErrors}
                onNameChange={setEditName}
                onAddressChange={setEditAddress}
                onCoverPhotoChange={setEditCoverPhoto}
                onClose={() => {
                    if (!editSubmitting) setEditOpen(false);
                }}
                onSubmit={handleEdit}
            />
        </AdminShell>
    );
}
