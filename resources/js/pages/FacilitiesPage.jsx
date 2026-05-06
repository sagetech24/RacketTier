import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../css/dashboard-v2.css';
import { fetchFacilities, patchFacility, postFacility } from '../api/facilities.js';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * @param {number} id
 */
function cardGradientHue(id) {
    return (id * 47) % 360;
}

/**
 * @param {string} name
 */
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function FacilitiesPage() {
    const { user } = useAuth();
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [facilities, setFacilities] = useState(/** @type {import('../api/facilities.js').FacilityRow[]} */ ([]));
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [addOpen, setAddOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [addError, setAddError] = useState('');
    const [addFieldErrors, setAddFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [editOpen, setEditOpen] = useState(false);
    const [editingFacilityId, setEditingFacilityId] = useState(/** @type {number | null} */ (null));
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');
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
        () => !loading && facilities.length === 0 && debouncedSearch.length === 0,
        [loading, facilities.length, debouncedSearch],
    );

    async function handleAddFacility(e) {
        e.preventDefault();
        setAddError('');
        setAddFieldErrors({});
        setAddSubmitting(true);
        try {
            const created = await postFacility({
                name: newName.trim(),
                address: newAddress.trim(),
            });
            setFacilities((prev) => {
                const rest = prev.filter((f) => f.id !== created.id);
                return [{
                    ...created,
                    game_sessions_count: created.game_sessions_count ?? 0,
                    today_matches_count: created.today_matches_count ?? 0,
                    today_checked_in_players_count: created.today_checked_in_players_count ?? 0,
                }, ...rest];
            });
            setAddOpen(false);
            setNewName('');
            setNewAddress('');
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
            });

            setFacilities((prev) => prev.map((f) => (f.id === editingFacilityId
                ? {
                    ...f,
                    ...updated,
                    game_sessions_count: updated.game_sessions_count ?? f.game_sessions_count ?? 0,
                    today_matches_count: updated.today_matches_count ?? f.today_matches_count ?? 0,
                    today_checked_in_players_count:
                        updated.today_checked_in_players_count ?? f.today_checked_in_players_count ?? 0,
                }
                : f)));

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
        <div className="min-h-[max(884px,100dvh)] bg-[#131316] pb-24 text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />

            <main className="mx-auto max-w-5xl px-6 py-20">
                <div className="mb-10 mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="mb-4 text-4xl font-extrabold leading-none tracking-tighter md:text-6xl">
                            Partner <span className="text-[#c2c1ff]">Facilities</span>
                        </h1>
                        <p className="max-w-md font-medium text-[#c8c5d2]">
                            RacketTier partner facilities. Open a game room or start a new match for any facility.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setAddOpen(true);
                            setAddError('');
                            setAddFieldErrors({});
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#4ce081] px-5 py-3 text-sm font-bold text-[#003919] transition-transform active:scale-[0.98] md:self-auto"
                    >
                        <MaterialIcon name="add" className="text-lg" />
                        Add facility
                    </button>
                </div>

                <div className="mb-8">
                    <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="size-6"
                            aria-hidden
                        >
                            <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    <input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by name or address…"
                        className="font-body w-full rounded-xl border border-[#353438] bg-[#0e0e11] py-4 pl-12 pr-4 text-sm text-[#e4e1e6] transition-all placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                        aria-label="Search facilities"
                    />
                    </div>
                    {loading && facilities.length > 0 ? (
                        <p className="mt-2 text-xs font-medium text-[#918f9c]" aria-live="polite">
                            Updating results…
                        </p>
                    ) : null}
                </div>

                {loadError ? (
                    <div
                        className="mb-8 rounded-xl border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]"
                        role="alert"
                    >
                        <p>{loadError}</p>
                        <button
                            type="button"
                            onClick={() => void reload()}
                            className="mt-2 text-xs font-bold uppercase tracking-wider text-[#ffb4ab] underline underline-offset-2"
                        >
                            Retry
                        </button>
                    </div>
                ) : null}

                {loading && facilities.length === 0 && !loadError ? (
                    <div className="space-y-6" aria-busy="true" aria-label="Loading facilities">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-40 animate-pulse rounded-xl bg-[#1f1f22]" />
                        ))}
                    </div>
                ) : null}

                {!loading && emptyNoFacilities ? (
                    <div className="rounded-xl border border-[#353438] bg-[#1f1f22] px-6 py-12 text-center">
                        <p className="mb-2 text-lg font-bold text-[#e4e1e6]">No facilities yet</p>
                        <p className="mb-6 text-sm text-[#918f9c]">
                            Add your first venue to use the game room and create matches.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setAddOpen(true);
                                setAddError('');
                                setAddFieldErrors({});
                            }}
                            className="rounded-xl bg-[#c2c1ff] px-5 py-3 text-sm font-bold text-[#282671]"
                        >
                            Add your first facility
                        </button>
                    </div>
                ) : null}

                {!loading && emptyAfterSearch ? (
                    <p className="rounded-xl bg-[#1f1f22] px-6 py-8 text-center text-sm text-[#918f9c]">
                        No facilities match &ldquo;{debouncedSearch}&rdquo;. Try another search or{' '}
                        <button
                            type="button"
                            className="font-semibold text-[#c2c1ff] underline-offset-2 hover:underline"
                            onClick={() => setSearchInput('')}
                        >
                            clear filters
                        </button>
                        .
                    </p>
                ) : null}

                <div className="space-y-6">
                    {facilities.map((f) => {
                        const hue = cardGradientHue(f.id);
                        const checkedInTodayCount = f.today_checked_in_players_count ?? 0;
                        return (
                            <div
                                key={f.id}
                                className="group relative overflow-hidden rounded-xl bg-[#1f1f22] transition-all duration-300 hover:bg-[#2a2a2d]"
                            >
                                <div className="flex h-full flex-col md:flex-row">
                                    <div
                                        className="relative flex h-38 shrink-0 items-center justify-center overflow-hidden md:h-auto md:w-1/3 md:min-h-[200px]"
                                        style={{
                                            background: `linear-gradient(145deg, hsl(${hue}, 42%, 22%), hsl(${(hue + 55) % 360}, 38%, 14%))`,
                                        }}
                                    >
                                        <div
                                            className="flex h-48 w-48 items-center justify-center text-4xl font-black text-zinc-400/60"
                                            aria-hidden
                                        >
                                            {initialsFromName(f.name)}
                                        </div>
                                    </div>

                                    <div className="flex min-w-0 grow flex-col justify-between p-6 md:p-8">
                                        <div>
                                            <h3 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">{f.name}</h3>
                                            <div className="flex flex-wrap items-start gap-4 text-sm font-medium text-[#c8c5d2]">
                                                <div className="flex min-w-0 items-start gap-2">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={1.5}
                                                        stroke="currentColor"
                                                        className="mt-0.5 size-4 shrink-0"
                                                        aria-hidden
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                                        />
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                                                        />
                                                    </svg>
                                                    <span className="min-w-0 wrap-break-word">{f.address?.trim() || '—'}</span>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                                {checkedInTodayCount} checked in player{checkedInTodayCount === 1 ? '' : 's'}
                                            </p>
                                        </div>

                                        <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(f)}
                                                    className="rounded-xl border border-gray-500/30 bg-gray-500/20 px-3.5 py-2 text-xs font-bold tracking-tight text-gray-200 transition-colors hover:border-gray-400/40 hover:text-gray-100"
                                                >
                                                    Edit
                                                </button>
                                                <Link
                                                    to={`/facility/${f.id}/create-match`}
                                                    className="rounded-xl bg-linear-to-br from-[#c2c1ff] to-[#8a89d9] px-3.5 py-2 text-xs font-bold tracking-tight text-[#131316] transition-transform active:scale-95"
                                                >
                                                    New match
                                                </Link>
                                                <Link
                                                    to={`/facility/${f.id}/game-room`}
                                                    className="rounded-xl bg-linear-to-br from-[#4ce081] to-[#4ce081] px-3.5 py-2 text-xs font-bold tracking-tight text-[#131316] transition-transform active:scale-95"
                                                >
                                                    Game room
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <DashboardMobileNav />

            {addOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-facilities-add-title"
                >
                    <div className="w-full max-w-md rounded-2xl border border-[#474651]/40 bg-[#1b1b1e] p-6 shadow-2xl">
                        <h2 id="rt-facilities-add-title" className="mb-1 text-lg font-bold text-[#e4e1e6]">
                            Add facility
                        </h2>
                        <p className="mb-6 text-xs text-[#918f9c]">
                            Name and address are required. You can search and reuse this venue from this page later.
                        </p>
                        {addError ? (
                            <p className="mb-4 rounded-lg bg-[#ffb4ab]/10 px-3 py-2 text-sm text-[#ffb4ab]" role="alert">
                                {addError}
                            </p>
                        ) : null}
                        <form className="space-y-4" onSubmit={(e) => void handleAddFacility(e)}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Venue name
                                </label>
                                <input
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                    placeholder="e.g. Riverside Sports Center"
                                    autoComplete="organization"
                                />
                                {addFieldErrors.name?.[0] ? (
                                    <p className="text-xs text-[#ffb4ab]">{addFieldErrors.name[0]}</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Address
                                </label>
                                <textarea
                                    required
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                    placeholder="Street, city, region, postal code"
                                    autoComplete="street-address"
                                />
                                {addFieldErrors.address?.[0] ? (
                                    <p className="text-xs text-[#ffb4ab]">{addFieldErrors.address[0]}</p>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddOpen(false);
                                        setAddError('');
                                        setAddFieldErrors({});
                                    }}
                                    className="rounded-lg px-4 py-2 text-sm font-semibold text-[#c8c5d2] hover:bg-[#353438]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addSubmitting}
                                    className="rounded-lg bg-[#4ce081] px-5 py-2 text-sm font-bold text-[#003919] disabled:opacity-50"
                                >
                                    {addSubmitting ? 'Saving…' : 'Save facility'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {editOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-facilities-edit-title"
                >
                    <div className="w-full max-w-md rounded-2xl border border-[#474651]/40 bg-[#1b1b1e] p-6 shadow-2xl">
                        <h2 id="rt-facilities-edit-title" className="mb-1 text-lg font-bold text-[#e4e1e6]">
                            Edit facility
                        </h2>
                        <p className="mb-6 text-xs text-[#918f9c]">
                            Update the facility details used for search and game room setup.
                        </p>
                        {editError ? (
                            <p className="mb-4 rounded-lg bg-[#ffb4ab]/10 px-3 py-2 text-sm text-[#ffb4ab]" role="alert">
                                {editError}
                            </p>
                        ) : null}
                        <form className="space-y-4" onSubmit={(e) => void handleEditFacility(e)}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Venue name
                                </label>
                                <input
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                    placeholder="e.g. Riverside Sports Center"
                                    autoComplete="organization"
                                />
                                {editFieldErrors.name?.[0] ? (
                                    <p className="text-xs text-[#ffb4ab]">{editFieldErrors.name[0]}</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]">
                                    Address
                                </label>
                                <textarea
                                    required
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                                    placeholder="Street, city, region, postal code"
                                    autoComplete="street-address"
                                />
                                {editFieldErrors.address?.[0] ? (
                                    <p className="text-xs text-[#ffb4ab]">{editFieldErrors.address[0]}</p>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="rounded-lg px-4 py-2 text-sm font-semibold text-[#c8c5d2] hover:bg-[#353438]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="rounded-lg bg-[#c2c1ff] px-5 py-2 text-sm font-bold text-[#282671] disabled:opacity-50"
                                >
                                    {editSubmitting ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
