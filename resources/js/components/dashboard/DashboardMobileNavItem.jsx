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
        'flex cursor-pointer flex-col items-center justify-center px-4 py-3 transition-colors';
    const activeCls =
        'scale-90 rounded-none bg-linear-to-br from-[#c2c1ff] to-[#8a89d9] text-[#131316] duration-200 active:transition-transform';
    const idleCls = 'text-[#8a89d9] hover:text-[#c2c1ff]';
    const disabledCls = 'cursor-not-allowed opacity-40';

    if (disabled || !to) {
        return (
            <div className={[base, idleCls, disabledCls].join(' ')} title="Coming soon">
                <Icon className="size-6 shrink-0" />
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider">{label}</span>
            </div>
        );
    }

    return (
        <Link
            to={to}
            className={[base, active ? activeCls : idleCls].join(' ')}
            aria-current={active ? 'page' : undefined}
        >
            <Icon className="size-6 shrink-0" />
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider">{label}</span>
        </Link>
    );
}
