import { NavLink } from 'react-router-dom';
import { AppShell } from '../app/AppShell.jsx';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

const NAV = [
    { to: '/admin', label: 'Overview', icon: 'dashboard', end: true },
    { to: '/admin/members', label: 'Members', icon: 'group', end: false },
    { to: '/admin/facilities', label: 'Facilities', icon: 'stadium', end: false },
    { to: '/admin/sessions', label: 'Sessions', icon: 'sports_tennis', end: false },
    { to: '/admin/tiers', label: 'Tiers', icon: 'military_tech', end: false },
];

/**
 * @param {{
 *   user: import('../../context/AuthContext.jsx').User | null,
 *   children: import('react').ReactNode,
 *   mainClassName?: string,
 * }} props
 */
export function AdminShell({ user, children, mainClassName = '' }) {
    return (
        <AppShell user={user} mainClassName={['rt-admin-main', mainClassName].filter(Boolean).join(' ')}>
            <nav
                className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#45454a] bg-[#1b1b1e] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Admin sections"
            >
                {NAV.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            [
                                'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                                isActive
                                    ? 'bg-[#c2c1ff]/15 text-[#c2c1ff]'
                                    : 'text-[#918f9c] hover:bg-white/5 hover:text-[#e4e1e6]',
                            ].join(' ')
                        }
                    >
                        <MaterialIcon name={item.icon} className="text-lg" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
            {children}
        </AppShell>
    );
}
