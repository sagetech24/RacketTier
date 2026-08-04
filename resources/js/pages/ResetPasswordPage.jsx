import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
import { AuthField } from '../components/auth/AuthField.jsx';
import { AuthPageShell } from '../components/auth/AuthPageShell.jsx';
import { AuthPasswordField } from '../components/auth/AuthPasswordField.jsx';
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton.jsx';
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
        <AuthPageShell navAction={{ to: '/login', label: 'Sign in' }}>
            <div className="w-full max-w-md space-y-8 tab:space-y-10">
                <div className="rt-auth-enter rt-auth-enter--1">
                    <AuthBrandHeader
                        eyebrow="New password"
                        tagline="Choose a strong password so you can get back on court."
                    />
                </div>

                <div className="rt-auth-card rt-auth-enter rt-auth-enter--2 space-y-6 rounded-2xl p-6 tab:p-8">
                    {resetDone ? (
                        <div className="space-y-5">
                            <div className="rt-auth-alert rt-auth-alert--success rounded-xl px-3.5 py-2.5 text-sm" role="status">
                                Your password has been reset.
                            </div>
                            <AuthSubmitButton type="button" onClick={() => navigate('/login', { replace: true })}>
                                Go to sign in
                            </AuthSubmitButton>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1 border-b border-white/6 pb-5">
                                <h2 className="rt-display text-lg font-bold tracking-tight text-[#e4e1e6]">
                                    Reset password
                                </h2>
                                <p className="text-sm text-[#918f9c]">Enter your email and a new password.</p>
                            </div>

                            <form className="space-y-5" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
                                <AuthField
                                    id="v2-reset-email"
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
                                    id="v2-reset-password"
                                    label="New password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={fieldErrors.password?.[0]}
                                    disabled={submitting}
                                    autoComplete="new-password"
                                />

                                <AuthPasswordField
                                    id="v2-reset-password-confirmation"
                                    label="Confirm new password"
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    disabled={submitting}
                                    autoComplete="new-password"
                                />

                                {fieldErrors.token?.[0] ? (
                                    <div className="rt-auth-alert rounded-xl px-3.5 py-2.5 text-sm text-[#ffb4ab]" role="alert">
                                        {fieldErrors.token[0]}
                                    </div>
                                ) : null}

                                {error ? (
                                    <div className="rt-auth-alert rounded-xl px-3.5 py-2.5 text-sm text-[#ffb4ab]" role="alert">
                                        {error}
                                    </div>
                                ) : null}

                                <AuthSubmitButton submitting={submitting} submittingLabel="Resetting…">
                                    Reset password
                                </AuthSubmitButton>
                            </form>
                        </>
                    )}
                </div>

                {!resetDone ? (
                    <p className="rt-auth-enter rt-auth-enter--3 text-center text-sm text-[#c8c5d2]">
                        <Link
                            to="/login"
                            className="cursor-pointer font-bold text-[#4ce081] underline-offset-4 transition-colors hover:underline"
                        >
                            Back to sign in
                        </Link>
                    </p>
                ) : null}
            </div>
        </AuthPageShell>
    );
}
