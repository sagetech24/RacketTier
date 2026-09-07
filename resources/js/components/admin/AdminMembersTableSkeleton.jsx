export function AdminMembersTableSkeleton() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading members">
            <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-[#1b1b1e] md:hidden">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-2 px-4 py-4">
                        <div className="h-4 w-2/5 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-3/5 animate-pulse rounded bg-white/8" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-white/8" />
                    </div>
                ))}
            </div>
            <div className="hidden overflow-hidden rounded-xl border border-[#45454a] bg-[#1b1b1e] md:block">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex gap-4 border-b border-[#2a2a2d] px-4 py-3 last:border-b-0">
                        <div className="h-4 w-1/5 animate-pulse rounded bg-white/10" />
                        <div className="h-4 w-1/4 animate-pulse rounded bg-white/8" />
                        <div className="h-4 w-1/6 animate-pulse rounded bg-white/8" />
                        <div className="h-4 w-16 animate-pulse rounded bg-white/8" />
                    </div>
                ))}
            </div>
        </div>
    );
}
