function RosterPlayerCardSkeleton({ delayClass = '' }) {
    return (
        <div className={['rt-roster-player-skeleton', delayClass].filter(Boolean).join(' ')} />
    );
}

/**
 * Full-page skeleton for the queueing session players roster.
 */
export function QueueingSessionPlayersLoading() {
    return (
        <div
            className="rt-queue-list-loading rt-roster-loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading players"
        >
            <section className="rt-queue-list-loading-block rt-queue-list-loading-block--1">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="rt-skeleton size-8 shrink-0 rounded-lg" />
                        <div className="rt-skeleton h-9 w-48 max-w-[70%] rounded-lg md:h-10 md:w-64" />
                    </div>
                    <div className="rt-skeleton h-6 w-16 shrink-0 rounded-full" />
                </div>
                <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                    <div className="rt-skeleton h-3.5 w-40 rounded" />
                    <div className="rt-skeleton h-3.5 w-44 rounded" />
                    <div className="rt-skeleton h-3.5 w-36 rounded" />
                    <div className="rt-skeleton h-3.5 w-32 rounded" />
                </div>
                <div className="mt-6 flex gap-2">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="rt-skeleton h-10 min-w-0 flex-1 rounded-[0.625rem]" />
                    ))}
                </div>
            </section>

            <section className="rt-queue-list-loading-block rt-queue-list-loading-block--2 mt-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="rt-skeleton h-9 w-56 max-w-full rounded-lg md:h-11 md:w-72" />
                        <div className="rt-skeleton mt-3 h-4 w-full max-w-md rounded" />
                    </div>
                    <div className="rt-skeleton h-8 w-24 shrink-0 rounded-full" />
                </div>

                <div className="mt-5 space-y-3">
                    <div className="rt-skeleton h-12 w-full rounded-xl" />
                    <div className="flex gap-2 overflow-hidden">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="rt-skeleton h-9 w-24 shrink-0 rounded-full" />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <div className="rt-skeleton h-10 min-w-0 flex-1 rounded-lg" />
                        <div className="rt-skeleton size-10 shrink-0 rounded-lg" />
                    </div>
                </div>
            </section>

            <div className="rt-queue-list-loading-block rt-queue-list-loading-block--3 rt-roster-player-cards-grid mt-5">
                {Array.from({ length: 6 }).map((_, index) => (
                    <RosterPlayerCardSkeleton
                        key={index}
                        delayClass={`rt-queue-list-loading-block rt-queue-list-loading-block--${Math.min(index + 4, 10)}`}
                    />
                ))}
            </div>
        </div>
    );
}
