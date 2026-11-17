import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFacilities } from '../api/facilities.js';
import { AppShell } from '../components/app/AppShell.jsx';
import { EmptyState } from '../components/app/EmptyState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { FacilityCard } from '../components/facilities/FacilityCard.jsx';
import { FacilitiesPageLoading } from '../components/facilities/FacilitiesPageLoading.jsx';
import { MaterialIcon } from '../components/dashboard/MaterialIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { userIsAdmin } from '../lib/userRoles.js';

export function FacilitiesPage() {
    const { user } = useAuth();
    const isAdmin = userIsAdmin(user);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [facilities, setFacilities] = useState(/** @type {import('../api/facilities.js').FacilityRow[]} */ ([]));
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

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
                            isAdmin ? (
                                <Link
                                    to="/admin/facilities"
                                    className="rt-facility-btn rt-facility-btn-lavender inline-flex min-h-11 items-center px-4"
                                >
                                    Manage in Admin
                                </Link>
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
                                {isAdmin
                                    ? 'Add venues from the Admin Facilities console.'
                                    : 'Facilities will appear here once an administrator adds a venue.'}
                            </p>
                            {isAdmin ? (
                                <Link
                                    to="/admin/facilities"
                                    className="rt-facility-btn rt-facility-btn-lavender mt-4 inline-flex min-h-11 items-center px-5"
                                >
                                    Open Admin Facilities
                                </Link>
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
                                <FacilityCard key={f.id} facility={f} canManage={false} />
                            ))}
                        </div>
                    ) : null}
                </>
            )}
        </AppShell>
    );
}
