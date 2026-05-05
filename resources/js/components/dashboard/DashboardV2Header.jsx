import { Link, useNavigate } from 'react-router-dom';
import { useDefaultGameRoomHref } from '../../hooks/useDefaultGameRoomHref.js';
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

/**
 * @param {{
 *   user: { name?: string; email?: string } | null;
 *   profileLoading?: boolean;
 * }} props
 */
export function DashboardV2Header({ user, profileLoading = false }) {
    const gameRoomHref = useDefaultGameRoomHref();
    const navigate = useNavigate();
    const label = user?.name?.trim() || user?.email?.trim() || 'User';

    return (
        <nav className="fixed top-0 z-50 w-full bg-[#131316]/70 backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <RacketTierWordmark textSize="text-3xl" />
                </div>
                <div className="hidden items-center gap-8 md:flex">
                    <Link
                        to="/dashboard"
                        className="text-sm font-medium uppercase tracking-wider text-[#c2c1ff] transition-opacity hover:opacity-80"
                    >
                        Home
                    </Link>
                    <Link
                        to="/ranking"
                        className="text-sm font-medium uppercase tracking-wider text-[#c2c1ff] transition-opacity hover:opacity-80"
                    >
                        Rankings
                    </Link>
                    <Link
                        to="/facilities"
                        className="text-sm font-medium uppercase tracking-wider text-[#c2c1ff] transition-opacity hover:opacity-80"
                    >
                        Facilities
                    </Link>
                    <Link
                        to={gameRoomHref}
                        className="text-sm font-medium uppercase tracking-wider text-[#c2c1ff] transition-opacity hover:opacity-80"
                    >
                        Play
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    {!user ? (
                        <Link
                            to="/login"
                            className="hidden px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#e4e1e6] transition-opacity hover:opacity-70 md:block"
                        >
                            Sign In
                        </Link>
                    ) : null}
                    {profileLoading ? (
                        <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#353438]"
                            aria-busy="true"
                            aria-label="Loading profile"
                        >
                            <Spinner />
                        </div>
                    ) : user ? (
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#353438] text-[#c2c1ff] transition-opacity hover:opacity-80"
                            aria-label="Go back"
                            title={`Back from ${label}`}
                        >
                            <span className="text-base leading-none" aria-hidden>
                                ←
                            </span>
                        </button>
                    ) : (
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#353438]">
                            <img
                                src={IMG_AVATAR_FALLBACK}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
