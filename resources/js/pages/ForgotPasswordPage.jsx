import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
import { AuthField } from '../components/auth/AuthField.jsx';
import { AuthPageShell } from '../components/auth/AuthPageShell.jsx';
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton.jsx';
import { postJson } from '../lib/http.js';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setSubmitting(true);

        try {
            const res = await postJson('/auth/password/forgot', { email });
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

            setSent(true);
            setSubmitting(false);
        } catch {
            setError('Network error. Check your connection.');
            setSubmitting(false);
        }
    }

    return (
        <AuthPageShell navAction={{ to: '/login', label: 'Sign in' }}>
            <div className="w-full max-w-md space-y-8 tab:space-y-10">
                <div className="rt-auth-enter rt-auth-enter--1">
                    <AuthBrandHeader
                        eyebrow="Reset access"
                        tagline="Enter your email and we’ll send a link to reset your password."
                    />
                </div>

                <div className="rt-auth-card rt-auth-enter rt-auth-enter--2 space-y-6 rounded-2xl p-6 tab:p-8">
                    {sent ? (
                        <div className="space-y-5">
                            <div className="rt-auth-alert rt-auth-alert--success rounded-xl px-3.5 py-2.5 text-sm" role="status">
                                If your email exists, we sent a password reset link.
                            </div>
                            <Link
                                to="/login"
                                className="rt-auth-btn flex w-full min-h-12 cursor-pointer items-center justify-center rounded-xl py-4 font-bold text-[#211e6a]"
                            >
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1 border-b border-white/6 pb-5">
                                <h2 className="rt-display text-lg font-bold tracking-tight text-[#e4e1e6]">
                                    Forgot password
                                </h2>
                                <p className="text-sm text-[#918f9c]">We’ll email you a secure reset link.</p>
                            </div>

                            <form className="space-y-5" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
                                <AuthField
                                    id="v2-forgot-email"
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

                                {error ? (
                                    <div className="rt-auth-alert rounded-xl px-3.5 py-2.5 text-sm text-[#ffb4ab]" role="alert">
                                        {error}
                                    </div>
                                ) : null}

                                <AuthSubmitButton submitting={submitting} submittingLabel="Sending…">
                                    Send reset link
                                </AuthSubmitButton>
                            </form>
                        </>
                    )}
                </div>

                {!sent ? (
                    <p className="rt-auth-enter rt-auth-enter--3 text-center text-sm text-[#c8c5d2]">
                        Remembered your password?{' '}
                        <Link
                            to="/login"
                            className="cursor-pointer font-bold text-[#4ce081] underline-offset-4 transition-colors hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                ) : null}
            </div>
        </AuthPageShell>
    );
}
