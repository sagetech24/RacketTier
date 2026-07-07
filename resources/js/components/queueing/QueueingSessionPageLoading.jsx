function QueueSessionCardSkeleton({ delayClass }) {
    return (
        <div
            className={`${delayClass} rounded-xl border border-white/5 bg-[#1b1b1e]/80 p-4 md:p-5`}
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="rt-skeleton size-5 shrink-0 rounded" />
                    <div className="rt-skeleton h-5 w-36 max-w-[70%] rounded" />
                </div>
                <div className="flex shrink-0 gap-1.5">
                    <div className="rt-skeleton size-8 rounded-[0.625rem]" />
                    <div className="rt-skeleton size-8 rounded-[0.625rem]" />
                </div>
            </div>
            <div className="rt-skeleton h-4 w-48 max-w-full rounded" />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rt-skeleton h-3 w-32 rounded" />
                <div className="rt-skeleton h-3 w-24 rounded" />
                <div className="rt-skeleton h-3 w-28 rounded" />
                <div className="rt-skeleton h-3 w-20 rounded" />
            </div>
            <div className="mt-4 flex gap-2">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="rt-skeleton h-10 min-w-0 flex-1 rounded-[0.625rem]" />
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton for the queueing sessions list — mirrors header, filters, and card grid.
 */
export function QueueingSessionPageLoading() {
    return (
        <div
            className="rt-queue-list-loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading queueing sessions"
        >
            <section className="rt-queue-list-loading-block rt-queue-list-loading-block--1 mb-8 md:mb-10">
                <div className="rt-skeleton h-3 w-24 rounded-full" />
                <div className="rt-skeleton mt-3 h-10 w-64 max-w-full rounded-lg md:h-12" />
                <div className="rt-skeleton mt-3 h-4 w-72 max-w-full rounded" />
            </section>

            <section className="rt-queue-list-loading-block rt-queue-list-loading-block--2 rt-surface-card mb-6 p-4 md:p-5">
                <div className="rt-skeleton h-12 w-full rounded-xl" />
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rt-skeleton h-12 rounded-lg" />
                    <div className="rt-skeleton h-12 rounded-lg" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <div className="rt-skeleton h-4 w-28 rounded" />
                    <div className="rt-skeleton h-6 w-11 rounded-full" />
                </div>
            </section>

            <div className="rt-queue-list-loading-block rt-queue-list-loading-block--3 mb-3">
                <div className="rt-skeleton h-3 w-14 rounded-full" />
            </div>

            <div className="rt-queue-list-loading-block rt-queue-list-loading-block--4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <QueueSessionCardSkeleton delayClass="rt-queue-list-loading-block rt-queue-list-loading-block--5" />
                <QueueSessionCardSkeleton delayClass="rt-queue-list-loading-block rt-queue-list-loading-block--6" />
            </div>

            <div className="rt-queue-list-loading-block rt-queue-list-loading-block--7 mb-3 mt-8">
                <div className="rt-skeleton h-3 w-28 rounded-full" />
                <div className="rt-skeleton mt-2 h-3 w-56 max-w-full rounded" />
            </div>

            <div className="rt-queue-list-loading-block rt-queue-list-loading-block--8 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <QueueSessionCardSkeleton delayClass="rt-queue-list-loading-block rt-queue-list-loading-block--9" />
                <QueueSessionCardSkeleton delayClass="rt-queue-list-loading-block rt-queue-list-loading-block--10" />
            </div>
        </div>
    );
}
