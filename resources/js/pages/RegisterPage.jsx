import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { postForm } from '../lib/http.js';

export function RegisterPage() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setSubmitting(true);

        try {
            const res = await postForm('/register', {
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
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
            navigate('/dashboard', { replace: true });
        } catch {
            setError('Network error. Check your connection.');
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create account</h1>
            <p className="mt-1 text-sm text-zinc-600">Fill in the fields below to register.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {error}
                    </p>
                ) : null}

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
                        Name
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-zinc-400 transition focus:border-zinc-500 focus:ring-2"
                    />
                    {fieldErrors.name?.[0] ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.name[0]}</p>
                    ) : null}
                </div>

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
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-zinc-400 transition focus:border-zinc-500 focus:ring-2"
                    />
                    {fieldErrors.password?.[0] ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.password[0]}</p>
                    ) : null}
                </div>

                <div>
                    <label
                        htmlFor="password_confirmation"
                        className="block text-sm font-medium text-zinc-700"
                    >
                        Confirm password
                    </label>
                    <input
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-zinc-400 transition focus:border-zinc-500 focus:ring-2"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? 'Creating account…' : 'Register'}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-zinc-900 underline underline-offset-2">
                    Log in
                </Link>
            </p>
        </div>
    );
}
