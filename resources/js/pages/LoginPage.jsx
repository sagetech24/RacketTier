import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
import { AuthField } from '../components/auth/AuthField.jsx';
import { AuthPageShell } from '../components/auth/AuthPageShell.jsx';
import { AuthPasswordField } from '../components/auth/AuthPasswordField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizeAuthUser } from '../lib/userRoles.js';
import { postForm } from '../lib/http.js';

function AuthSpinner() {
    return (
        <svg
            className="rt-auth-btn__spinner"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
            />
        </svg>
    );
}

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                remember: '0',
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
            const { user: nextUserRaw } = await userRes.json();
            setUser(normalizeAuthUser(nextUserRaw));
            navigate(from, { replace: true });
        } catch {
            setError('Network error. Check your connection.');
            setSubmitting(false);
        }
    }

    return (
        <AuthPageShell>
            <div className="w-full max-w-md space-y-8 tab:space-y-10">
                <div className="rt-auth-enter rt-auth-enter--1">
                    <AuthBrandHeader
                        eyebrow="Welcome back"
                        tagline="Sign in to track matches, climb tiers, and run queueing sessions."
                    />
                </div>

                <div className="rt-auth-card rt-auth-enter rt-auth-enter--2 space-y-6 rounded-2xl p-7 tab:p-8">
                    <div className="space-y-1 border-b border-white/6 pb-5">
                        <h2 className="text-lg font-bold tracking-tight text-[#e4e1e6]">Sign in</h2>
                        <p className="text-sm text-[#918f9c]">Use the email and password for your RacketTier account.</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
                        <AuthField
                            id="v2-login-email"
                            label="Email address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={fieldErrors.email?.[0]}
                            disabled={submitting}
                            autoComplete="email"
                            autoFocus
                            placeholder="name@example.com"
                            inputMode="email"
                        />

                        <AuthPasswordField
                            id="v2-login-password"
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={fieldErrors.password?.[0]}
                            disabled={submitting}
                            labelAction={
                                <Link
                                    to="/forgot-password"
                                    className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2c1ff] transition-opacity hover:opacity-80"
                                >
                                    Forgot?
                                </Link>
                            }
                        />

                        {error ? (
                            <div className="rt-auth-alert rounded-xl px-3.5 py-2.5 text-sm text-[#ffb4ab]" role="alert">
                                {error}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="rt-auth-btn flex w-full items-center justify-center gap-2.5 rounded-xl py-4 font-bold text-[#211e6a]"
                        >
                            {submitting ? (
                                <>
                                    <AuthSpinner />
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                </div>

                <p className="rt-auth-enter rt-auth-enter--3 text-center text-sm text-[#c8c5d2]">
                    Don&apos;t have an account?{' '}
                    <Link
                        to="/register"
                        className="font-bold text-[#4ce081] underline-offset-4 transition-colors hover:underline"
                    >
                        Create account
                    </Link>
                </p>
            </div>
        </AuthPageShell>
    );
}
