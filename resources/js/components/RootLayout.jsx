import { Link, Outlet, useLocation } from 'react-router-dom';
import { LogoutButton } from './LogoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const V2_SHELL_PATHS = new Set(['/dashboard', '/facilities', '/create-match', '/ranking', '/game-room']);

export function RootLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';
    const isRegisterPage = location.pathname === '/register';
    const isV2Shell = V2_SHELL_PATHS.has(location.pathname);

    return (
        <div className="flex min-h-screen flex-col">
            {!isLoginPage && !isRegisterPage && !isV2Shell ? (
                <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 shadow-sm">
                    <div className="mx-auto flex max-w-5xl items-center justify-between">
                        <Link to="/" className="text-lg font-semibold tracking-tight text-white">
                            {typeof window !== 'undefined' && window.__RT_APP_NAME__
                                ? window.__RT_APP_NAME__
                                : 'App'}
                        </Link>
                        <nav className="flex items-center gap-4 text-sm font-medium">
                            {user ? (
                                <>
                                    <Link
                                        to="/dashboard"
                                        className="text-zinc-400 transition hover:text-white"
                                    >
                                        Dashboard
                                    </Link>
                                    <LogoutButton className="text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-white" />
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-zinc-400 transition hover:text-white"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="rounded-lg bg-primary px-3 py-2 text-white transition hover:brightness-110"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>
            ) : null}
            <main
                className={
                    isLoginPage || isRegisterPage
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
