/**
 * Full-page skeleton shown while dashboard summary data is loading.
 */
export function DashboardPageLoading() {
    return (
        <div className="rt-dashboard-loading" role="status" aria-live="polite" aria-busy="true" aria-label="Loading dashboard">
            <section className="mb-8 md:mb-10">
                <div className="rt-skeleton h-3 w-20 rounded-full" />
                <div className="rt-skeleton mt-3 h-9 w-64 max-w-full rounded-lg" />
                <div className="rt-skeleton mt-3 h-4 w-48 max-w-full rounded" />
            </section>

            <section className="rt-dashboard-snapshot mb-8">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="rt-skeleton h-6 w-24 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="space-y-2">
                            <div className="rt-skeleton h-3 w-12 rounded" />
                            <div className="rt-skeleton h-7 w-full rounded" />
                        </div>
                    ))}
                </div>
                <div className="mt-5 border-t border-white/5 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="rt-skeleton h-3 w-24 rounded" />
                        <div className="rt-skeleton h-3 w-8 rounded" />
                    </div>
                    <div className="rt-skeleton h-1 w-full rounded-full" />
                    <div className="rt-skeleton mt-2 h-3 w-40 rounded" />
                </div>
            </section>

            <section className="mb-10">
                <div className="rt-skeleton mb-4 h-3 w-24 rounded" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                    <div className="rt-skeleton col-span-2 h-36 rounded-xl md:col-span-1 md:h-40" />
                    <div className="rt-skeleton h-32 rounded-xl md:h-40" />
                    <div className="rt-skeleton h-32 rounded-xl md:h-40" />
                </div>
            </section>

            <section className="mb-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                        <div className="rt-skeleton mb-2 h-3 w-12 rounded" />
                        <div className="rt-skeleton h-6 w-36 rounded" />
                    </div>
                    <div className="rt-skeleton h-7 w-16 rounded-full" />
                </div>
                <div className="rt-dashboard-activity-grid space-y-3 md:space-y-0">
                    <div className="rt-skeleton h-[4.75rem] rounded-xl md:col-span-2 lg:col-span-3" />
                    <div className="rt-skeleton h-[4.75rem] rounded-xl md:col-span-2 lg:col-span-3" />
                    <div className="rt-skeleton hidden h-[4.75rem] rounded-xl md:block lg:col-span-3" />
                </div>
            </section>

            <section className="rt-dashboard-performance p-5 md:p-7">
                <div className="mb-5">
                    <div className="rt-skeleton mb-2 h-3 w-24 rounded" />
                    <div className="rt-skeleton h-5 w-40 rounded" />
                </div>
                <div className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="rounded-lg border border-white/5 bg-[#121216]/80 p-3">
                            <div className="rt-skeleton h-3 w-10 rounded" />
                            <div className="rt-skeleton mt-2 h-7 w-12 rounded" />
                        </div>
                    ))}
                </div>
                <div className="rt-skeleton mb-3 h-4 w-full max-w-md rounded" />
                <div className="rt-skeleton h-1 w-full rounded-full" />
                <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="rt-skeleton h-3 w-24 rounded" />
                    <div className="rt-skeleton h-3 w-20 rounded" />
                </div>
            </section>
        </div>
    );
}
