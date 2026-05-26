import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
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
        <div className="relative flex min-h-[max(884px,100dvh)] flex-col overflow-hidden text-[#e4e1e6]">
            <main className="flex grow items-center justify-center px-6 pb-8 tab:pb-12">
                <div className="w-full max-w-md space-y-12">
                    <AuthBrandHeader />

                    <div className="space-y-6 rounded-xl bg-[#1b1b1e] p-8">
                        <div className="space-y-3 text-center">
                            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#c2c1ff]/15 text-[#c2c1ff]">
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
                            <h2 className="text-2xl font-extrabold tracking-tight text-[#e4e1e6]">
                                Verify your email
                            </h2>
                            <p className="text-sm text-[#c8c5d2]">
                                We sent a verification link to{' '}
                                <span className="font-semibold text-[#e4e1e6]">{user?.email ?? 'your email'}</span>.
                                Click the link in the email to confirm your address.
                            </p>
                        </div>

                        {message ? (
                            <div className="rounded-lg bg-[#4ce081]/15 px-3 py-2 text-sm text-[#4ce081]" role="status">
                                {message}
                            </div>
                        ) : null}

                        {error ? (
                            <div className="rounded-lg bg-[#93000a]/35 px-3 py-2 text-sm text-[#ffdad6]" role="alert">
                                {error}
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={sending}
                                className="w-full cursor-pointer rounded-xl bg-primary py-4 font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.2)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                            >
                                {sending ? 'Sending…' : 'Resend verification email'}
                            </button>
                            <button
                                type="button"
                                onClick={handleVerifyLater}
                                disabled={sending}
                                className="w-full cursor-pointer rounded-xl border border-[#3a3a40] bg-transparent py-4 font-semibold text-[#c8c5d2] transition-all hover:bg-[#26262a] active:scale-[0.98] disabled:opacity-60"
                            >
                                Verify later
                            </button>
                        </div>

                        <p className="text-center text-xs text-[#918f9c]">
                            Didn’t get the email? Check your spam folder, or use the resend button above.
                        </p>
                    </div>
                </div>
            </main>

            <div className="pointer-events-none fixed -left-20 top-[10%] h-64 w-64 rounded-full bg-[#c2c1ff]/5 blur-[100px]" />
            <div className="pointer-events-none fixed -right-20 bottom-[10%] h-80 w-80 rounded-full bg-[#4ce081]/5 blur-[120px]" />
        </div>
    );
}
