const PODIUM_SKELETON_HEIGHTS = ['md:h-48', 'md:h-40', 'md:h-36'];
const PODIUM_SKELETON_ORDER = ['md:order-2', 'md:order-1', 'md:order-3'];

/**
 * Skeleton for a single queueing session dashboard — mirrors header, tabs, podium, and list.
 */
export function QueueingSessionDashboardLoading() {
    return (
        <div
            className="rt-qs-dash-loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading session dashboard"
        >
            <section className="rt-qs-dash-loading-block rt-qs-dash-loading-block--1 mb-8">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="rt-skeleton size-8 shrink-0 rounded-lg" />
                        <div className="rt-skeleton h-9 w-48 max-w-[70%] rounded-lg md:h-10 md:w-64" />
                    </div>
                    <div className="rt-skeleton h-6 w-16 shrink-0 rounded-full" />
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <div className="rt-skeleton h-3.5 w-36 rounded" />
                        <div className="rt-skeleton h-3.5 w-44 rounded" />
                        <div className="rt-skeleton h-3.5 w-40 rounded" />
                    </div>
                    <div className="space-y-2">
                        <div className="rt-skeleton h-3.5 w-48 rounded" />
                        <div className="rt-skeleton h-3.5 w-32 rounded" />
                        <div className="rt-skeleton h-3.5 w-36 rounded" />
                    </div>
                </div>
            </section>

            <section className="rt-qs-dash-loading-block rt-qs-dash-loading-block--2 mb-8">
                <div className="rt-qs-session-nav__tabs">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="rt-skeleton min-h-11 flex-1 rounded-lg md:min-h-12" />
                    ))}
                </div>
            </section>

            <div className="rt-qs-dash-loading-block rt-qs-dash-loading-block--3 mb-2">
                <div className="rt-skeleton h-8 w-56 max-w-full rounded-lg md:h-10" />
                <div className="rt-skeleton mt-2 h-3 w-44 max-w-full rounded" />
            </div>

            <div className="rt-qs-dash-loading-block rt-qs-dash-loading-block--4 mb-2">
                <div className="rt-skeleton h-3 w-14 rounded-full" />
            </div>

            <div className="rt-ranking-podium mb-6">
                {[0, 1, 2].map((idx) => (
                    <div
                        key={idx}
                        className={[
                            `rt-qs-dash-loading-block rt-qs-dash-loading-block--${idx + 5}`,
                            'rt-ranking-podium-skeleton',
                            PODIUM_SKELETON_ORDER[idx],
                        ].join(' ')}
                    >
                        <div className={`rt-skeleton h-36 w-full rounded-xl ${PODIUM_SKELETON_HEIGHTS[idx]}`} />
                    </div>
                ))}
            </div>

            <div className="rt-qs-dash-loading-block rt-qs-dash-loading-block--8 mb-3">
                <div className="rt-skeleton h-3 w-20 rounded-full" />
            </div>

            <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                    <div
                        key={n}
                        className={`rt-qs-dash-loading-block rt-qs-dash-loading-block--${n + 8} flex items-center gap-3 rounded-xl border border-white/5 bg-[#1b1b1e]/60 p-4`}
                    >
                        <div className="rt-skeleton h-7 w-7 shrink-0 rounded" />
                        <div className="rt-skeleton size-10 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="rt-skeleton h-4 w-32 max-w-[60%] rounded" />
                            <div className="rt-skeleton h-3 w-40 max-w-[80%] rounded" />
                        </div>
                        <div className="shrink-0 space-y-1.5 text-right">
                            <div className="rt-skeleton ml-auto h-2.5 w-10 rounded" />
                            <div className="rt-skeleton ml-auto h-6 w-14 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
