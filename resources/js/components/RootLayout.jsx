import { Link, Outlet, useLocation } from 'react-router-dom';
import { LogoutButton } from './LogoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function RootLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';
    const isRegisterPage = location.pathname === '/register';

    return (
        <div className="flex min-h-screen flex-col">
            
            {!isLoginPage && !isRegisterPage ? (
                <header className="border-b border-zinc-200 bg-gray-700 text-white px-6 py-4 shadow-sm">
                    <div className="mx-auto flex max-w-5xl items-center justify-between">
                        <Link to="/" className="text-lg font-semibold tracking-tight text-zinc-900">
                            {typeof window !== 'undefined' && window.__RT_APP_NAME__
                                ? window.__RT_APP_NAME__
                                : 'App'}
                        </Link>
                        <nav className="flex items-center gap-4 text-sm font-medium">
                            {user ? (
                                <>
                                    <Link
                                        to="/dashboard"
                                        className="text-zinc-600 transition hover:text-zinc-900"
                                    >
                                        Dashboard
                                    </Link>
                                    <LogoutButton className="text-sm text-zinc-600 underline decoration-zinc-400 underline-offset-2 transition hover:text-zinc-900" />
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-zinc-600 transition hover:text-zinc-900"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="rounded-lg bg-zinc-900 px-3 py-2 text-white transition hover:bg-zinc-800"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>
            ) : null}
            <main className={`${isLoginPage || isRegisterPage ? '' : 'mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10'}`}>
                <Outlet />
            </main>
        </div>
    );
}
