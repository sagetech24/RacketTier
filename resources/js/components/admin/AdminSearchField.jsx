import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/**
 * Search field matching /admin/members.
 *
 * @param {{
 *   value: string,
 *   onChange: (value: string) => void,
 *   placeholder?: string,
 *   label?: string,
 *   loadingHint?: boolean,
 *   trailing?: import('react').ReactNode,
 * }} props
 */
export function AdminSearchField({
    value,
    onChange,
    placeholder = 'Search…',
    label = 'Search',
    loadingHint = false,
    trailing = null,
}) {
    return (
        <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="rt-facility-search group relative min-w-[12rem] flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                        <MaterialIcon name="search" className="text-xl" />
                    </div>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="rt-facility-search-input"
                        aria-label={label}
                    />
                    {value ? (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="rt-facility-search-clear"
                            aria-label="Clear search"
                        >
                            <MaterialIcon name="close" className="text-lg" />
                        </button>
                    ) : null}
                </div>
                {trailing}
            </div>
            <div className="mt-2 min-h-5" aria-live="polite">
                {loadingHint ? <p className="text-xs font-medium text-[#918f9c]">Updating results…</p> : null}
            </div>
        </div>
    );
}
