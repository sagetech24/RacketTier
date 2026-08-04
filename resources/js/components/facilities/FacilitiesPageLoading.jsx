/**
 * Skeleton list for FacilitiesPage while the first load is in flight.
 */
export function FacilitiesPageLoading() {
    return (
        <div className="rt-facilities-loading" role="status" aria-live="polite" aria-busy="true" aria-label="Loading facilities">
            <div className="mb-8 space-y-3">
                <div className="rt-skeleton h-3 w-20 rounded-full" />
                <div className="rt-skeleton h-10 w-56 max-w-full rounded-lg" />
                <div className="rt-skeleton h-4 w-72 max-w-full rounded" />
            </div>
            <div className="rt-skeleton mb-8 h-14 w-full rounded-xl" />
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rt-facility-card rt-facility-card--skeleton overflow-hidden">
                        <div className="rt-skeleton h-40 w-full md:h-auto md:min-h-[11.5rem]" />
                        <div className="space-y-3 p-5 md:p-6">
                            <div className="rt-skeleton h-6 w-48 max-w-full rounded" />
                            <div className="rt-skeleton h-4 w-64 max-w-full rounded" />
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                <div className="rt-skeleton h-12 rounded-lg" />
                                <div className="rt-skeleton h-12 rounded-lg" />
                                <div className="rt-skeleton h-12 rounded-lg" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <div className="rt-skeleton h-11 flex-1 rounded-xl" />
                                <div className="rt-skeleton h-11 flex-1 rounded-xl" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
