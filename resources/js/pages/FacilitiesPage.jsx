import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFacilities, patchFacility, postFacility } from '../api/facilities.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { FacilityCard } from '../components/facilities/FacilityCard.jsx';
import { FacilityFormModal } from '../components/facilities/FacilityFormModal.jsx';
import { FacilitiesPageLoading } from '../components/facilities/FacilitiesPageLoading.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function FacilitiesPage() {
    const { user } = useAuth();
    const canManageFacilities = Boolean(user?.is_admin);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [facilities, setFacilities] = useState(/** @type {import('../api/facilities.js').FacilityRow[]} */ ([]));
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

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

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    const reload = useCallback(async () => {
        setLoadError('');
        setLoading(true);
        try {
            const rows = await fetchFacilities(debouncedSearch);
            setFacilities(rows);
        } catch {
            setLoadError('Could not load facilities. Check your connection and try again.');
            setFacilities([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const emptyAfterSearch = useMemo(
        () => !loading && facilities.length === 0 && debouncedSearch.length > 0,
        [loading, facilities.length, debouncedSearch],
    );

    const emptyNoFacilities = useMemo(
        () => !loading && facilities.length === 0 && debouncedSearch.length === 0 && !loadError,
        [loading, facilities.length, debouncedSearch, loadError],
    );

    const showInitialSkeleton = loading && facilities.length === 0 && !loadError;

    function openAddModal() {
        setAddOpen(true);
        setAddError('');
        setAddFieldErrors({});
    }

    function closeAddModal() {
        if (addSubmitting) return;
        setAddOpen(false);
        setAddError('');
        setAddFieldErrors({});
    }

    async function handleAddFacility(e) {
        e.preventDefault();
        setAddError('');
        setAddFieldErrors({});
        setAddSubmitting(true);
        try {
            const created = await postFacility({
                name: newName.trim(),
                address: newAddress.trim(),
                cover_photo: newCoverPhoto.trim() || null,
            });
            setFacilities((prev) => {
                const rest = prev.filter((f) => f.id !== created.id);
                return [
                    {
                        ...created,
                        game_sessions_count: created.game_sessions_count ?? 0,
                        today_matches_count: created.today_matches_count ?? 0,
                        today_checked_in_players_count: created.today_checked_in_players_count ?? 0,
                    },
                    ...rest,
                ];
            });
            setAddOpen(false);
            setNewName('');
            setNewAddress('');
            setNewCoverPhoto('');
        } catch (err) {
            if (err && typeof err === 'object' && 'errors' in err && err.errors) {
                setAddFieldErrors(/** @type {Record<string, string[]>} */ (err.errors));
            }
            setAddError(err instanceof Error ? err.message : 'Could not add facility.');
        } finally {
            setAddSubmitting(false);
        }
    }

    /**
     * @param {import('../api/facilities.js').FacilityRow} facility
     */
    function openEditModal(facility) {
        setEditingFacilityId(facility.id);
        setEditName(facility.name ?? '');
        setEditAddress(facility.address ?? '');
        setEditCoverPhoto(facility.cover_photo ?? '');
        setEditError('');
        setEditFieldErrors({});
        setEditOpen(true);
    }

    function closeEditModal() {
        if (editSubmitting) return;
        setEditOpen(false);
        setEditingFacilityId(null);
        setEditName('');
        setEditAddress('');
        setEditCoverPhoto('');
        setEditError('');
        setEditFieldErrors({});
    }

    async function handleEditFacility(e) {
        e.preventDefault();
        if (!editingFacilityId) return;

        setEditError('');
        setEditFieldErrors({});
        setEditSubmitting(true);

        try {
            const updated = await patchFacility(editingFacilityId, {
                name: editName.trim(),
                address: editAddress.trim(),
                cover_photo: editCoverPhoto.trim() || null,
            });

            setFacilities((prev) =>
                prev.map((f) =>
                    f.id === editingFacilityId
                        ? {
                              ...f,
                              ...updated,
                              game_sessions_count: updated.game_sessions_count ?? f.game_sessions_count ?? 0,
                              today_matches_count: updated.today_matches_count ?? f.today_matches_count ?? 0,
                              today_checked_in_players_count:
                                  updated.today_checked_in_players_count ?? f.today_checked_in_players_count ?? 0,
                          }
                        : f,
                ),
            );

            closeEditModal();
        } catch (err) {
            if (err && typeof err === 'object' && 'errors' in err && err.errors) {
                setEditFieldErrors(/** @type {Record<string, string[]>} */ (err.errors));
            }
            setEditError(err instanceof Error ? err.message : 'Could not update facility.');
        } finally {
            setEditSubmitting(false);
        }
    }

    return (
        <AppShell user={user}>
            {showInitialSkeleton ? (
                <FacilitiesPageLoading />
            ) : (
                <>
                    <PageHeader
                        eyebrow="Venues"
                        title="Facilities"
                        subtitle="Open a game room or start a facility match. Search by name or address."
                        action={
                            canManageFacilities ? (
                                <button type="button" onClick={openAddModal} className="rt-facility-btn rt-facility-btn-primary min-h-11 px-4">
                                    <MaterialIcon name="add" className="text-lg" />
                                    Add facility
                                </button>
                            ) : null
                        }
                    />

                    <div className="mb-8">
                        <div className="rt-facility-search group relative">
                            <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                                <MaterialIcon name="search" className="text-xl" />
                            </div>
                            <input
                                type="search"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search by name or address…"
                                className="rt-facility-search-input"
                                aria-label="Search facilities"
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
                        <div className="mt-2 flex min-h-5 items-center justify-between gap-3" aria-live="polite">
                            {loading && facilities.length > 0 ? (
                                <p className="text-xs font-medium text-[#918f9c]">Updating results…</p>
                            ) : !loading && facilities.length > 0 ? (
                                <p className="text-xs font-medium text-[#918f9c]">
                                    {facilities.length} venue{facilities.length === 1 ? '' : 's'}
                                    {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
                                </p>
                            ) : (
                                <span />
                            )}
                        </div>
                    </div>

                    {loadError ? (
                        <div className="rt-alert-error mb-8" role="alert">
                            <p>{loadError}</p>
                            <button
                                type="button"
                                onClick={() => void reload()}
                                className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-2"
                            >
                                Retry
                            </button>
                        </div>
                    ) : null}

                    {emptyNoFacilities ? (
                        <div className="rt-empty-state flex flex-col items-center justify-center">
                            <div className="rt-empty-state-icon" aria-hidden>
                                <MaterialIcon name="stadium" className="text-3xl text-[#c2c1ff]" />
                            </div>
                            <h3 className="text-base font-bold text-[#e4e1e6]">No facilities yet</h3>
                            <p className="mt-1.5 max-w-sm text-center text-sm leading-relaxed text-[#c8c5d2]">
                                {canManageFacilities
                                    ? 'Add your first venue to open a game room and create facility matches.'
                                    : 'Facilities will appear here once an administrator adds a venue.'}
                            </p>
                            {canManageFacilities ? (
                                <button type="button" onClick={openAddModal} className="rt-facility-btn rt-facility-btn-lavender mt-4 min-h-11 px-5">
                                    Add your first facility
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    {emptyAfterSearch ? (
                        <div className="space-y-4">
                            <EmptyState
                                icon="search_off"
                                title="No matching venues"
                                description={`Nothing matched “${debouncedSearch}”. Try another name or address.`}
                            />
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setSearchInput('')}
                                    className="rt-btn-secondary inline-flex min-h-11 cursor-pointer"
                                >
                                    Clear search
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {facilities.length > 0 ? (
                        <div className="rt-facilities-list">
                            {facilities.map((f) => (
                                <FacilityCard
                                    key={f.id}
                                    facility={f}
                                    canManage={canManageFacilities}
                                    onEdit={openEditModal}
                                />
                            ))}
                        </div>
                    ) : null}
                </>
            )}

            <FacilityFormModal
                mode="add"
                open={addOpen}
                name={newName}
                address={newAddress}
                coverPhoto={newCoverPhoto}
                submitting={addSubmitting}
                error={addError}
                fieldErrors={addFieldErrors}
                onNameChange={setNewName}
                onAddressChange={setNewAddress}
                onCoverPhotoChange={setNewCoverPhoto}
                onClose={closeAddModal}
                onSubmit={(e) => void handleAddFacility(e)}
            />

            <FacilityFormModal
                mode="edit"
                open={editOpen}
                name={editName}
                address={editAddress}
                coverPhoto={editCoverPhoto}
                submitting={editSubmitting}
                error={editError}
                fieldErrors={editFieldErrors}
                onNameChange={setEditName}
                onAddressChange={setEditAddress}
                onCoverPhotoChange={setEditCoverPhoto}
                onClose={closeEditModal}
                onSubmit={(e) => void handleEditFacility(e)}
            />
        </AppShell>
    );
}
