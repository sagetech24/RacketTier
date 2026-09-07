/**
 * @param {{
 *   hasMore: boolean,
 *   loading: boolean,
 *   loadedCount: number,
 *   total: number,
 *   onLoadMore: () => void,
 * }} props
 */
export function AdminMembersLoadMore({ hasMore, loading, loadedCount, total, onLoadMore }) {
    if (!hasMore && loadedCount === 0) {
        return null;
    }

    const remaining = Math.max(0, total - loadedCount);

    return (
        <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs font-medium tabular-nums text-[#918f9c]" aria-live="polite">
                Showing {loadedCount} of {total}
            </p>
            {hasMore ? (
                <button
                    type="button"
                    className="rt-facility-btn rt-facility-btn-secondary min-h-11 w-full cursor-pointer disabled:cursor-not-allowed"
                    disabled={loading}
                    onClick={onLoadMore}
                >
                    {loading ? 'Loading…' : remaining > 0 ? `Load more (${remaining} left)` : 'Load more'}
                </button>
            ) : null}
        </div>
    );
}
