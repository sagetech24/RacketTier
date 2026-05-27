import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
import { postJson } from '../lib/http.js';

export function ResetPasswordPage() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [submitting, setSubmitting] = useState(false);
    const [resetDone, setResetDone] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setFieldErrors({});

        if (!token) {
            setError('Missing reset token.');
            return;
        }

        setSubmitting(true);

        try {
            const res = await postJson('/auth/password/reset', {
                token,
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

            setResetDone(true);
            setSubmitting(false);
        } catch {
            setError('Network error. Check your connection.');
            setSubmitting(false);
        }
    }

    return (
        <div className="pt-10 relative flex min-h-[max(850px,100dvh)] flex-col overflow-hidden bg-[#121216] text-[#e4e1e6]">
            <main className="flex grow items-center justify-center px-6 py-8 tab:py-12">
                <div className="w-full max-w-md space-y-12">
                    <AuthBrandHeader />

                    <div className="space-y-8 rounded-xl bg-[#1b1b1e] p-8">
                        {resetDone ? (
                            <div className="space-y-4">
                                <p className="text-center text-sm text-[#c8c5d2]">
                                    Your password has been reset.
                                </p>
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login', { replace: true })}
                                        className="rounded-xl bg-primary px-6 py-3 font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.2)] transition-all hover:opacity-90 active:scale-[0.98]"
                                    >
                                        Go to Sign In
                                    </button>
                                </div>
                                <p className="text-center text-sm text-[#c8c5d2]">
                                    <Link to="/login" className="font-bold text-[#4ce081] underline-offset-4 hover:underline">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        ) : (
                            <form className="space-y-6" onSubmit={handleSubmit} aria-busy={submitting}>
                                <div className="space-y-2">
                                    <label
                                        htmlFor="v2-reset-email"
                                        className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                    >
                                        Email Address
                                    </label>
                                    <input
                                        id="v2-reset-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        disabled={submitting}
                                        placeholder="name@example.com"
                                        className="w-full rounded-lg border-none bg-[#2a2a2d] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                    />
                                    {fieldErrors.email?.[0] ? (
                                        <p className="text-sm text-red-100">{fieldErrors.email[0]}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="v2-reset-password"
                                        className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                    >
                                        New Password
                                    </label>
                                    <input
                                        id="v2-reset-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        disabled={submitting}
                                        placeholder="••••••••"
                                        className="w-full rounded-lg border-none bg-[#2a2a2d] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                    />
                                    {fieldErrors.password?.[0] ? (
                                        <p className="text-sm text-red-100">{fieldErrors.password[0]}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="v2-reset-password-confirmation"
                                        className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                    >
                                        Confirm New Password
                                    </label>
                                    <input
                                        id="v2-reset-password-confirmation"
                                        type="password"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        disabled={submitting}
                                        placeholder="••••••••"
                                        className="w-full rounded-lg border-none bg-[#2a2a2d] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                    />
                                </div>

                                {fieldErrors.token?.[0] ? (
                                    <div className="rounded-lg bg-[#93000a]/35 px-3 py-2 text-sm text-red-100" role="alert">
                                        {fieldErrors.token[0]}
                                    </div>
                                ) : null}

                                {error ? (
                                    <div className="rounded-lg bg-[#93000a]/35 px-3 py-2 text-sm text-red-100" role="alert">
                                        {error}
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full rounded-xl bg-primary py-4 font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.2)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                                >
                                    {submitting ? 'Resetting…' : 'Reset Password'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

