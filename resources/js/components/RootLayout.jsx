import { Link, Outlet, useLocation } from 'react-router-dom';
import { LogoutButton } from './LogoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const V2_SHELL_PATHS = new Set(['/dashboard', '/facilities', '/ranking', '/profile', '/activity']);

function isV2DashboardShellPath(pathname) {
    if (V2_SHELL_PATHS.has(pathname)) {
        return true;
    }
    if (/^\/facility\/\d+\/(game-room|create-match)$/.test(pathname)) {
        return true;
    }
    // Queueing session flows use the same full-width shell as dashboard (no outer max-w-5xl padding).
    if (
        pathname === '/queueing-session' ||
        pathname === '/queueing-session/new' ||
        pathname === '/queueing-session/history' ||
        /^\/queueing-session\/\d+(\/(players|matches))?\/?$/.test(pathname)
    ) {
        return true;
    }
    return false;
}

export function RootLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';
    const isRegisterPage = location.pathname === '/register';
    const isHomePage = location.pathname === '/';
    const isV2Shell = isV2DashboardShellPath(location.pathname);

    return (
        <div className="flex min-h-screen flex-col">
            <main
                className={
                    isLoginPage || isRegisterPage || isHomePage
                        ? ''
                        : isV2Shell
                          ? 'flex w-full flex-1 flex-col'
                          : 'mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10'
                }
            >
                <Outlet />
            </main>
        </div>
    );
}
