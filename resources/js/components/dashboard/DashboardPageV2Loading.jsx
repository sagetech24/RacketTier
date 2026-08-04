/**
 * Skeleton for DashboardPageV2 layout while summary data loads.
 */
export function DashboardPageV2Loading() {
    return (
        <div
            className="rt-dashboard-loading rt-dashboard-v2"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading dashboard"
        >
            <section className="mb-6 md:mb-8">
                <div className="flex gap-2">
                    <div className="rt-skeleton h-6 w-24 rounded-full" />
                    <div className="rt-skeleton h-6 w-14 rounded-full" />
                </div>
                <div className="rt-skeleton mt-3 h-9 w-64 max-w-full rounded-lg" />
                <div className="rt-skeleton mt-3 h-4 w-52 max-w-full rounded" />
            </section>

            <div className="rt-dashboard-v2-layout">
                <section className="rt-dashboard-v2-progress">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="rt-skeleton mb-2 h-3 w-16 rounded" />
                            <div className="rt-skeleton h-5 w-28 rounded" />
                            <div className="rt-skeleton mt-2 h-3 w-36 rounded" />
                        </div>
                        <div className="rt-skeleton h-7 w-16 rounded-full" />
                    </div>
                    <div className="rt-dashboard-v2-metrics mt-5">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="space-y-2">
                                <div className="rt-skeleton h-3 w-12 rounded" />
                                <div className="rt-skeleton h-7 w-full rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-5">
                        <div className="mb-2 flex justify-between">
                            <div className="rt-skeleton h-3 w-24 rounded" />
                            <div className="rt-skeleton h-3 w-8 rounded" />
                        </div>
                        <div className="rt-skeleton h-3.5 w-full rounded-full" />
                        <div className="rt-skeleton mt-2 h-3 w-40 rounded" />
                    </div>
                </section>

                <section>
                    <div className="rt-skeleton mb-4 h-3 w-24 rounded" />
                    <div className="rt-dashboard-v2-actions">
                        <div className="rt-skeleton min-h-[7.5rem] rounded-xl" />
                        <div className="rt-skeleton min-h-[7.5rem] rounded-xl" />
                        <div className="rt-skeleton min-h-[7.5rem] rounded-xl" />
                        <div className="rt-skeleton min-h-[7.5rem] rounded-xl" />
                    </div>
                </section>

                <section className="rt-dashboard-v2-season">
                    <div className="mb-4 flex justify-between">
                        <div>
                            <div className="rt-skeleton mb-2 h-3 w-14 rounded" />
                            <div className="rt-skeleton h-5 w-28 rounded" />
                        </div>
                        <div className="rt-skeleton h-3 w-12 rounded" />
                    </div>
                    <div className="rt-dashboard-v2-season-stats">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="rt-dashboard-v2-season-stat">
                                <div className="rt-skeleton h-3 w-10 rounded" />
                                <div className="rt-skeleton mt-2 h-7 w-12 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="rt-skeleton mt-5 h-4 w-full max-w-md rounded" />
                    <div className="rt-skeleton mt-3 h-3.5 w-full rounded-full" />
                </section>

                <section className="rt-dashboard-v2-feed">
                    <div className="mb-4 flex justify-between">
                        <div>
                            <div className="rt-skeleton mb-2 h-3 w-10 rounded" />
                            <div className="rt-skeleton h-5 w-32 rounded" />
                        </div>
                        <div className="rt-skeleton h-7 w-16 rounded-full" />
                    </div>
                    <div className="space-y-3">
                        <div className="rt-skeleton h-[4.75rem] rounded-xl" />
                        <div className="rt-skeleton h-[4.75rem] rounded-xl" />
                    </div>
                </section>
            </div>
        </div>
    );
}
