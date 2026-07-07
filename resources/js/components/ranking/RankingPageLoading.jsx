const PODIUM_SKELETON_HEIGHTS = ['md:h-48', 'md:h-40', 'md:h-36'];
const PODIUM_SKELETON_ORDER = ['md:order-2', 'md:order-1', 'md:order-3'];

/**
 * Skeleton for the rankings page — mirrors podium + list layout.
 */
export function RankingPageLoading() {
    return (
        <div className="rt-ranking-loading" role="status" aria-live="polite" aria-busy="true" aria-label="Loading rankings">
            <div className="rt-ranking-toolbar mb-8 md:mb-6">
                <div className="rt-ranking-loading-block rt-ranking-loading-block--1">
                    <div className="rt-skeleton h-12 w-full rounded-xl" />
                </div>
                <div className="mt-4 flex gap-2 overflow-hidden">
                    {[1, 2, 3, 4].map((n) => (
                        <div
                            key={n}
                            className={`rt-ranking-loading-block rt-ranking-loading-block--${n + 1} rt-skeleton h-9 w-20 shrink-0 rounded-full`}
                        />
                    ))}
                </div>
            </div>

            <div className="rt-ranking-loading-block rt-ranking-loading-block--6 mb-2">
                <div className="rt-skeleton h-3 w-14 rounded-full" />
            </div>

            <div className="rt-ranking-podium mb-6">
                {[0, 1, 2].map((idx) => (
                    <div
                        key={idx}
                        className={[
                            `rt-ranking-loading-block rt-ranking-loading-block--${idx + 7}`,
                            'rt-ranking-podium-skeleton',
                            PODIUM_SKELETON_ORDER[idx],
                        ].join(' ')}
                    >
                        <div className={`rt-skeleton h-32 w-full rounded-xl ${PODIUM_SKELETON_HEIGHTS[idx]}`} />
                    </div>
                ))}
            </div>

            <div className="rt-ranking-loading-block rt-ranking-loading-block--10 mb-3">
                <div className="rt-skeleton h-3 w-20 rounded-full" />
            </div>

            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                    <div
                        key={n}
                        className={`rt-ranking-loading-block rt-ranking-loading-block--${n + 10} flex items-center gap-3 rounded-xl border border-white/5 bg-[#1b1b1e]/60 p-4`}
                    >
                        <div className="rt-skeleton h-7 w-7 shrink-0 rounded" />
                        <div className="rt-skeleton size-10 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="rt-skeleton h-4 w-32 max-w-[60%] rounded" />
                            <div className="rt-skeleton h-5 w-24 rounded-full" />
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
