import { useLocation } from 'react-router-dom';
import { DashboardMobileNavItem } from './DashboardMobileNavItem.jsx';

function IconHome({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconTrophy({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 9H4.5a2 2 0 00-2 2v1c0 4 3 7 7 7s7-3 7-7v-1a2 2 0 00-2-2H6z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 21h8M12 17v4M9 3h6l1 3H8l1-3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconQueue({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="7" r="1" fill="currentColor" stroke="none" />
            <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="6" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

function IconBuilding({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v0M9 12v0M9 15v0M9 18v0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconUser({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function DashboardMobileNav() {
    const { pathname } = useLocation();
    const homeActive = pathname === '/dashboard' || pathname === '/dashboard/v1' || pathname === '/dashboard/v2';
    const rankingActive = pathname === '/ranking';
    const queueActive =
        pathname === '/queueing-session' ||
        pathname === '/queueing-session/new' ||
        pathname === '/queueing-session/history' ||
        /^\/queueing-session\/\d+(\/(players|matches))?\/?$/.test(pathname);
    const facilitiesActive = pathname === '/facility' || pathname === '/facilities' || pathname.startsWith('/facility/');
    const profileActive = pathname === '/profile';

    return (
        <nav className="rt-mobile-nav md:hidden" aria-label="Primary">
            <div className="flex items-stretch justify-around shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.45)]">
                <DashboardMobileNavItem to="/dashboard" label="Home" icon={IconHome} active={homeActive} />
                <DashboardMobileNavItem
                    to="/ranking"
                    label="Rankings"
                    icon={IconTrophy}
                    active={rankingActive}
                />
                <DashboardMobileNavItem to="/queueing-session" label="Queue" icon={IconQueue} active={queueActive} data-tour="nav-queue" />
                <DashboardMobileNavItem
                    to="/facilities"
                    label="Facilities"
                    icon={IconBuilding}
                    active={facilitiesActive}
                />
                <DashboardMobileNavItem to="/profile" label="Profile" icon={IconUser} active={profileActive} />
            </div>
        </nav>
    );
}
