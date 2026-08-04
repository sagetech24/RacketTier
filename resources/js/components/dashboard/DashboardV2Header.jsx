import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RacketTierWordmark } from './RacketTierWordmark.jsx';

const IMG_AVATAR_FALLBACK =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDxwZyqJ4H7aFw43xc9BztWapcArXLZlPr2UzBqxiPU4DFzB26LXCyNHadLMvi8d2ls8Pc0Pi3898xIaXW_wI9qgOX2bGN90uZujjB8JmowFjO2hOhPDvazOC83gNtVENMN6ka4pSTY7ftUVyzJblYozGMzJ7hfPNUnbIGz6e6ef3nWUGNIrQsS-k83lvB7v5A4JQ3nuXp0O347uw0upZ-glH-dUnAj2HZhco8-Zh5YKoWM_eM7dJEgwpq_NV6nWwIJpILvo6zu60w';

function Spinner() {
    return (
        <svg
            className="h-4 w-4 animate-spin text-[#c2c1ff]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

function userInitials(user) {
    const name = user?.name?.trim();
    if (name) {
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    }
    const local = user?.email?.split('@')[0]?.trim();
    if (local) return local.slice(0, 2).toUpperCase();
    return 'RT';
}

/**
 * @param {{ active: boolean; to: string; children: import('react').ReactNode }} props
 */
function DesktopNavLink({ active, to, children }) {
    return (
        <Link
            to={to}
            className={['rt-nav-link', active ? 'rt-nav-link-active font-semibold' : 'rt-nav-link-idle'].join(' ')}
            aria-current={active ? 'page' : undefined}
        >
            {children}
        </Link>
    );
}

/**
 * @param {{
 *   user: { name?: string; email?: string } | null;
 *   profileLoading?: boolean;
 * }} props
 */
export function DashboardV2Header({ user, profileLoading = false }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const label = user?.name?.trim() || user?.email?.trim() || 'User';

    const homeActive = pathname === '/dashboard' || pathname === '/dashboard/v1' || pathname === '/dashboard/v2';
    const rankingActive = pathname === '/ranking';
    const queueActive =
        pathname === '/queueing-session' ||
        pathname === '/queueing-session/new' ||
        pathname === '/queueing-session/history' ||
        /^\/queueing-session\/\d+(\/(players|matches))?\/?$/.test(pathname);
    const facilitiesActive = pathname === '/facility' || pathname === '/facilities' || pathname.startsWith('/facility/');
    const activityActive = pathname === '/activity';
    const profileActive = pathname === '/profile';

    return (
        <nav className="rt-app-header fixed top-0 z-50 w-full border-b border-white/5 bg-[#121216]/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl md:static md:border-b-0 md:bg-transparent md:backdrop-blur-none">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/60">
                        <RacketTierWordmark textSize="text-3xl" />
                    </Link>
                </div>
                <div className="hidden items-center gap-8 md:flex">
                    <DesktopNavLink active={homeActive} to="/dashboard">
                        Home
                    </DesktopNavLink>
                    <DesktopNavLink active={rankingActive} to="/ranking">
                        Rankings
                    </DesktopNavLink>
                    <DesktopNavLink active={queueActive} to="/queueing-session">
                        Queue
                    </DesktopNavLink>
                    <DesktopNavLink active={facilitiesActive} to="/facilities">
                        Facilities
                    </DesktopNavLink>
                    <DesktopNavLink active={activityActive} to="/activity">
                        Activity
                    </DesktopNavLink>
                </div>
                <div className="flex items-center gap-3">
                    {!user ? (
                        <Link
                            to="/login"
                            className="hidden rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#e4e1e6] transition-colors hover:border-white/20 hover:bg-white/5 md:block"
                        >
                            Sign In
                        </Link>
                    ) : null}
                    {profileLoading ? (
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#353438]"
                            aria-busy="true"
                            aria-label="Loading profile"
                        >
                            <Spinner />
                        </div>
                    ) : user ? (
                        <Link
                            to="/profile"
                            className={[
                                'relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/60',
                                profileActive ? 'bg-[#c2c1ff] text-[#211e6a]' : 'bg-[#353438] text-[#c2c1ff]',
                            ].join(' ')}
                            aria-label={`Profile for ${label}`}
                            aria-current={profileActive ? 'page' : undefined}
                        >
                            {userInitials(user)}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#353438]"
                            aria-label="Sign in"
                        >
                            <img src={IMG_AVATAR_FALLBACK} alt="" className="h-full w-full object-cover" />
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
