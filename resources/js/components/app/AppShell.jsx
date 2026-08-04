import '../../../css/dashboard-v2.css';
import { DashboardMobileNav } from '../dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../dashboard/DashboardV2Header.jsx';

/**
 * @param {{
 *   user: { name?: string; email?: string } | null;
 *   profileLoading?: boolean;
 *   children: import('react').ReactNode;
 *   mainClassName?: string;
 * }} props
 */
export function AppShell({ user, profileLoading = false, children, mainClassName = '' }) {
    return (
        <div className="dashboard-v2-shell rt-app-shell font-sans text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <div className="rt-app-shell-orb rt-app-shell-orb--lavender" aria-hidden />
            <div className="rt-app-shell-orb rt-app-shell-orb--green" aria-hidden />
            <DashboardV2Header user={user} profileLoading={profileLoading} />
            <main className={['rt-page-main', mainClassName].filter(Boolean).join(' ')}>{children}</main>
            <DashboardMobileNav />
        </div>
    );
}
