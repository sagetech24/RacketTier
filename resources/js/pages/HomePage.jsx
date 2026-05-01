import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function HomePage() {
    const { user } = useAuth();

    return (
        <div className="mx-auto max-w-xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                {user ? `Welcome back, ${user.name}` : 'Welcome'}
            </h1>
            <p className="mt-3 text-zinc-600">
                {user
                    ? 'Open your dashboard to continue.'
                    : 'Sign in or create an account to get started.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {user ? (
                    <Link
                        to="/dashboard"
                        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                    >
                        Go to dashboard
                    </Link>
                ) : (
                    <>
                        <Link
                            to="/login"
                            className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                        >
                            Log in
                        </Link>
                        <Link
                            to="/register"
                            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                        >
                            Register
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
