import { useState } from 'react';
import { resendVerificationEmail } from '../../api/profile.js';

/**
 * @param {{
 *   user: { email?: string, email_verified?: boolean } | null,
 *   initialToast?: string,
 *   onVerifiedToastDismissed?: () => void,
 *   onVerified?: () => void,
 * }} props
 */
export function EmailVerificationCard({ user, initialToast = '', onVerifiedToastDismissed, onVerified, className = '' }) {
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState(initialToast);
    const [error, setError] = useState('');

    const verified = Boolean(user?.email_verified);

    async function handleResend() {
        setSending(true);
        setMessage('');
        setError('');
        try {
            const res = await resendVerificationEmail();
            setMessage(res.message);
            if (res.already_verified && onVerified) {
                onVerified();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not resend verification email.');
        } finally {
            setSending(false);
        }
    }

    function handleDismiss() {
        setMessage('');
        onVerifiedToastDismissed?.();
    }

    return (
        <div className={`rounded-xl border border-zinc-700 bg-[#1b1b1e] p-5 md:p-6 ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]">
                        Account Security
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <div className="text-base font-bold text-[#e4e1e6]">Email verification</div>
                        {verified ? (
                            <span className="rounded-full border border-[#4ce081]/40 bg-[#4ce081]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#4ce081]">
                                Verified
                            </span>
                        ) : (
                            <span className="rounded-full border border-[#f5b955]/40 bg-[#f5b955]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#f5b955]">
                                Unverified
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-[#c8c5d2]/70">
                        {verified
                            ? `Your email ${user?.email ?? ''} is verified.`
                            : `We sent a verification link to ${user?.email ?? 'your email'}. Click the link to confirm your address.`}
                    </p>

                    {message ? (
                        <p
                            className="mt-3 inline-block rounded-lg bg-[#4ce081]/10 px-3 py-1.5 text-xs font-semibold text-[#4ce081]"
                            role="status"
                            onClick={handleDismiss}
                        >
                            {message}
                        </p>
                    ) : null}

                    {error ? (
                        <p className="mt-3 inline-block rounded-lg bg-[#ffb4ab]/10 px-3 py-1.5 text-xs font-semibold text-[#ffb4ab]" role="alert">
                            {error}
                        </p>
                    ) : null}
                </div>

                {!verified ? (
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={sending}
                        className="shrink-0 rounded-full border border-[#c2c1ff]/40 bg-[#c2c1ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c2c1ff] transition-colors hover:bg-[#c2c1ff]/20 disabled:opacity-60"
                    >
                        {sending ? 'Sending…' : 'Resend'}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
