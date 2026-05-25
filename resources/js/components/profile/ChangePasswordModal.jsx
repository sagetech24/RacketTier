import { useEffect, useState } from 'react';
import { updateUserPassword } from '../../api/profile.js';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSaved?: () => void,
 * }} props
 */
export function ChangePasswordModal({ open, onClose, onSaved }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setCurrentPassword('');
        setPassword('');
        setPasswordConfirmation('');
        setError('');
        setFieldErrors({});
        setSubmitting(false);
    }, [open]);

    if (!open) return null;

    function handleClose() {
        if (submitting) return;
        onClose();
    }

    /** @param {import('react').FormEvent<HTMLFormElement>} e */
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setSubmitting(true);

        try {
            await updateUserPassword({
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            });
            onSaved?.();
        } catch (err) {
            if (err && typeof err === 'object' && 'errors' in err && err.errors) {
                setFieldErrors(/** @type {Record<string, string[]>} */ (err.errors));
            } else {
                setError(err instanceof Error ? err.message : 'Could not update password.');
            }
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rt-profile-password-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-[#474651]/40 bg-[#1b1b1e] p-6 shadow-2xl">
                <h2 id="rt-profile-password-title" className="mb-1 text-lg font-bold text-[#e4e1e6]">
                    Change password
                </h2>
                <p className="mb-6 text-xs text-[#918f9c]">
                    Enter your current password, then choose a new one. You will stay signed in on this device.
                </p>

                {error ? (
                    <p className="mb-4 rounded-lg bg-[#ffb4ab]/10 px-3 py-2 text-sm text-[#ffb4ab]" role="alert">
                        {error}
                    </p>
                ) : null}

                <form className="space-y-4" onSubmit={handleSubmit} aria-busy={submitting}>
                    <div className="space-y-2">
                        <label
                            htmlFor="rt-profile-current-password"
                            className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]"
                        >
                            Current password
                        </label>
                        <input
                            id="rt-profile-current-password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={submitting}
                            placeholder="••••••••"
                            className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                        />
                        {fieldErrors.current_password?.[0] ? (
                            <p className="text-xs text-[#ffb4ab]">{fieldErrors.current_password[0]}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="rt-profile-new-password"
                            className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]"
                        >
                            New password
                        </label>
                        <input
                            id="rt-profile-new-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={submitting}
                            placeholder="••••••••"
                            className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                        />
                        {fieldErrors.password?.[0] ? (
                            <p className="text-xs text-[#ffb4ab]">{fieldErrors.password[0]}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="rt-profile-new-password-confirmation"
                            className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]"
                        >
                            Confirm new password
                        </label>
                        <input
                            id="rt-profile-new-password-confirmation"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            disabled={submitting}
                            placeholder="••••••••"
                            className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                        />
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#c8c5d2] hover:bg-[#353438] disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-[#4ce081] px-5 py-2 text-sm font-bold text-[#003919] disabled:opacity-50"
                        >
                            {submitting ? 'Saving…' : 'Update password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
