/**
 * Unified admin list surface — same borders as /admin/members table.
 *
 * @param {{
 *   children: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export function AdminPanel({ children, className = '' }) {
    return (
        <div
            className={['overflow-hidden rounded-xl border border-[#45454a] bg-[#1b1b1e]', className]
                .filter(Boolean)
                .join(' ')}
        >
            {children}
        </div>
    );
}

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   className?: string,
 *   as?: 'div' | 'article' | 'li',
 * }} props
 */
export function AdminPanelRow({ children, className = '', as: Tag = 'div' }) {
    return (
        <Tag
            className={[
                'rt-admin-members-row border-b border-[#2a2a2d] px-4 py-4 last:border-b-0 md:py-3',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {children}
        </Tag>
    );
}

/**
 * Desktop column header row for admin tables.
 *
 * @param {{ columns: string[] }} props
 */
export function AdminPanelHead({ columns }) {
    return (
        <div className="hidden border-b border-[#45454a] text-[11px] font-bold uppercase tracking-wide text-[#918f9c] md:grid md:grid-cols-[minmax(0,1.4fr)_repeat(auto-fit,minmax(5rem,1fr))] md:gap-4 md:px-4 md:py-3">
            {columns.map((label) => (
                <div key={label}>{label}</div>
            ))}
        </div>
    );
}

/**
 * Filter / status chips matching admin shell active styles.
 *
 * @param {{
 *   options: { value: string, label: string }[],
 *   value: string,
 *   onChange: (value: string) => void,
 * }} props
 */
export function AdminFilterChips({ options, value, onChange }) {
    return (
        <div className="mb-6 flex flex-wrap gap-2">
            {options.map((opt) => (
                <button
                    key={opt.value || 'all'}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={[
                        'inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                        value === opt.value
                            ? 'bg-[#c2c1ff]/15 text-[#c2c1ff]'
                            : 'bg-[#1b1b1e] text-[#918f9c] hover:bg-white/5 hover:text-[#e4e1e6]',
                    ].join(' ')}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/**
 * @param {{ rows?: number, label?: string }} props
 */
export function AdminPanelSkeleton({ rows = 6, label = 'Loading' }) {
    return (
        <div className="space-y-3" aria-busy="true" aria-label={label}>
            <div className="divide-y divide-white/5 rounded-xl border border-[#45454a] bg-[#1b1b1e] md:hidden">
                {Array.from({ length: Math.min(rows, 6) }).map((_, index) => (
                    <div key={index} className="space-y-2 px-4 py-4">
                        <div className="h-4 w-2/5 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-3/5 animate-pulse rounded bg-white/8" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-white/8" />
                    </div>
                ))}
            </div>
            <div className="hidden overflow-hidden rounded-xl border border-[#45454a] bg-[#1b1b1e] md:block">
                {Array.from({ length: rows }).map((_, index) => (
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
