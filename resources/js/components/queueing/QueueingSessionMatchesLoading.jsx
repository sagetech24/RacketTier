function MatchCardSkeleton({ delayClass = '' }) {
    return (
        <div className={['rt-match-card-skeleton', delayClass].filter(Boolean).join(' ')} />
    );
}

/**
 * Full-page skeleton for the queueing session matches view.
 */
export function QueueingSessionMatchesLoading() {
    return (
        <div
            className="rt-queue-list-loading rt-matches-loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading matches"
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
                </div>
            </section>

            <section className="rt-queue-list-loading-block rt-queue-list-loading-block--2 mt-8">
                <div className="rt-skeleton h-9 w-56 max-w-full rounded-lg md:h-11 md:w-72" />
                <div className="rt-skeleton mt-4 h-11 w-full rounded-xl" />
            </section>

            <div className="rt-queue-list-loading-block rt-queue-list-loading-block--3 rt-match-cards-grid mt-5 space-y-3 md:space-y-0">
                {Array.from({ length: 4 }).map((_, index) => (
                    <MatchCardSkeleton
                        key={index}
                        delayClass={`rt-queue-list-loading-block rt-queue-list-loading-block--${Math.min(index + 4, 10)}`}
                    />
                ))}
            </div>
        </div>
    );
}
