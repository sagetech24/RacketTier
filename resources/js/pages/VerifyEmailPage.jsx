import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
import { AuthPageShell } from '../components/auth/AuthPageShell.jsx';
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton.jsx';
import { resendVerificationEmail } from '../api/profile.js';
import { useAuth } from '../context/AuthContext.jsx';

export function VerifyEmailPage() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.email_verified) {
            navigate('/dashboard', { replace: true });
        }
    }, [user?.email_verified, navigate]);

    async function handleResend() {
        setSending(true);
        setMessage('');
        setError('');
        try {
            const res = await resendVerificationEmail();
            if (res.already_verified) {
                await refreshUser();
                navigate('/dashboard', { replace: true });
                return;
            }
            setMessage(res.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not resend verification email.');
        } finally {
            setSending(false);
        }
    }

    function handleVerifyLater() {
        navigate('/dashboard', { replace: true });
    }

    return (
        <AuthPageShell>
            <div className="w-full max-w-md space-y-8 tab:space-y-10">
                <div className="rt-auth-enter rt-auth-enter--1">
                    <AuthBrandHeader
                        eyebrow="Almost there"
                        tagline="Confirm your email so your matches, points, and tiers stay tied to you."
                    />
                </div>

                <div className="rt-auth-card rt-auth-enter rt-auth-enter--2 space-y-6 rounded-2xl p-6 tab:p-8">
                    <div className="space-y-3 text-center">
                        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c2c1ff]/20 bg-[#c2c1ff]/12 text-[#c2c1ff]">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.6}
                                stroke="currentColor"
                                className="h-7 w-7"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                                />
                            </svg>
                        </div>
                        <h2 className="rt-display text-balance text-xl font-extrabold tracking-tight text-[#e4e1e6]">
                            Verify your email
                        </h2>
                        <p className="text-sm leading-relaxed text-[#c8c5d2]">
                            We sent a verification link to{' '}
                            <span className="font-semibold text-[#e4e1e6]">{user?.email ?? 'your email'}</span>.
                            Click the link in the email to confirm your address.
                        </p>
                    </div>

                    {message ? (
                        <div className="rt-auth-alert rt-auth-alert--success rounded-xl px-3.5 py-2.5 text-sm" role="status">
                            {message}
                        </div>
                    ) : null}

                    {error ? (
                        <div className="rt-auth-alert rounded-xl px-3.5 py-2.5 text-sm text-[#ffb4ab]" role="alert">
                            {error}
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <AuthSubmitButton
                            type="button"
                            onClick={handleResend}
                            submitting={sending}
                            submittingLabel="Sending…"
                        >
                            Resend verification email
                        </AuthSubmitButton>
                        <AuthSubmitButton
                            type="button"
                            variant="ghost"
                            onClick={handleVerifyLater}
                            disabled={sending}
                        >
                            Verify later
                        </AuthSubmitButton>
                    </div>

                    <p className="text-center text-xs text-[#918f9c]">
                        Didn’t get the email? Check your spam folder, or use the resend button above.
                    </p>
                </div>
            </div>
        </AuthPageShell>
    );
}
