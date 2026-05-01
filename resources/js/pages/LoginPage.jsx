import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { postForm } from '../lib/http.js';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [submitting, setSubmitting] = useState(false);

    const from = location.state?.from ?? '/dashboard';

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setSubmitting(true);

        try {
            const res = await postForm('/login', {
                email,
                password,
                remember: remember ? '1' : '0',
            });

            if (res.status === 422) {
                const data = await res.json();
                setFieldErrors(data.errors ?? {});
                setSubmitting(false);
                return;
            }

            if (!res.ok) {
                setError('Something went wrong. Try again.');
                setSubmitting(false);
                return;
            }

            const userRes = await fetch('/auth/user', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const { user: nextUser } = await userRes.json();
            setUser(nextUser);
            navigate(from, { replace: true });
        } catch {
            setError('Network error. Check your connection.');
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Log in</h1>
            <p className="mt-1 text-sm text-zinc-600">Use your email and password to continue.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {error}
                    </p>
                ) : null}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-zinc-400 transition focus:border-zinc-500 focus:ring-2"
                    />
                    {fieldErrors.email?.[0] ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.email[0]}</p>
                    ) : null}
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-zinc-400 transition focus:border-zinc-500 focus:ring-2"
                    />
                    {fieldErrors.password?.[0] ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.password[0]}</p>
                    ) : null}
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-600">
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                    />
                    Remember me
                </label>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? 'Signing in…' : 'Log in'}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-600">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-medium text-zinc-900 underline underline-offset-2">
                    Register
                </Link>
            </p>
        </div>
    );
}
