import { Link } from 'react-router-dom';

/**
 * @param {{
 *   to?: string;
 *   label: string;
 *   icon: import('react').ComponentType<{ className?: string }>;
 *   active?: boolean;
 *   disabled?: boolean;
 * }} props
 */
export function DashboardMobileNavItem({ to, label, icon: Icon, active = false, disabled = false }) {
    const base =
        'group flex min-h-[3.25rem] min-w-[3.25rem] flex-1 cursor-pointer flex-col items-center justify-center px-1 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#c2c1ff]/60';

    const contentClass = [
        'flex flex-col items-center justify-center gap-1 px-3 py-1.5 transition-colors',
        active
            ? 'rounded-2xl bg-linear-to-br from-[#c2c1ff] to-[#8a89d9] text-[#211e6a] shadow-[0_4px_16px_-4px_rgba(194,193,255,0.45)]'
            : 'text-[#7877c6] group-hover:text-[#c2c1ff]',
        disabled ? 'opacity-40' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const labelClass = 'text-[10px] font-semibold uppercase tracking-wider';

    if (disabled || !to) {
        return (
            <div className={[base, 'cursor-not-allowed'].join(' ')} title="Coming soon">
                <span className={contentClass}>
                    <Icon className="size-6 shrink-0" />
                    <span className={labelClass}>{label}</span>
                </span>
            </div>
        );
    }

    return (
        <Link to={to} className={base} aria-current={active ? 'page' : undefined}>
            <span className={contentClass}>
                <Icon className="size-6 shrink-0" />
                <span className={labelClass}>{label}</span>
            </span>
        </Link>
    );
}
