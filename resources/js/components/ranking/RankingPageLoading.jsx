/**
 * Skeleton for the rankings page — podium cards + list rows.
 */
export function RankingPageLoading() {
    return (
        <div className="rt-ranking-loading" role="status" aria-live="polite" aria-busy="true" aria-label="Loading rankings">
            <div className="rt-ranking-toolbar mb-8">
                <div className="rt-skeleton h-12 w-full rounded-xl" />
                <div className="mt-4 flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="rt-skeleton h-9 w-20 shrink-0 rounded-full" />
                    ))}
                </div>
            </div>

            <div className="rt-ranking-podium mb-6">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="rt-skeleton h-36 rounded-xl md:h-44" />
                ))}
            </div>

            <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="rt-skeleton h-[4.5rem] rounded-xl" />
                ))}
            </div>
        </div>
    );
}
