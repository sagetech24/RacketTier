import { useEffect, useState } from 'react';
import { updateUserProfile } from '../../api/profile.js';

const PRONOUN_OPTIONS = [
    { value: '', label: 'Prefer not to say' },
    { value: 'He/Him', label: 'He/Him' },
    { value: 'She/Her', label: 'She/Her' },
    { value: 'They/Them', label: 'They/Them' },
    { value: 'Other', label: 'Other' },
];

/**
 * @param {{
 *   open: boolean,
 *   user: { name?: string, email?: string, age?: number | null, pronoun?: string | null } | null,
 *   onClose: () => void,
 *   onSaved: (user: import('../../api/profile.js').ProfileUser) => void,
 * }} props
 */
export function EditProfileModal({ open, user, onClose, onSaved }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [pronoun, setPronoun] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(user?.name ?? '');
        setEmail(user?.email ?? '');
        setAge(user?.age != null ? String(user.age) : '');
        setPronoun(user?.pronoun ?? '');
        setError('');
        setFieldErrors({});
        setSubmitting(false);
    }, [open, user]);

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
            const payload = {
                name: name.trim(),
                email: email.trim(),
                age: age === '' ? null : Number(age),
                pronoun: pronoun === '' ? null : pronoun,
            };
            const next = await updateUserProfile(payload);
            onSaved(next);
        } catch (err) {
            if (err && typeof err === 'object' && 'errors' in err && err.errors) {
                setFieldErrors(/** @type {Record<string, string[]>} */ (err.errors));
            } else {
                setError(err instanceof Error ? err.message : 'Could not update profile.');
            }
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rt-profile-edit-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-[#474651]/40 bg-[#1b1b1e] p-6 shadow-2xl">
                <h2 id="rt-profile-edit-title" className="mb-1 text-lg font-bold text-[#e4e1e6]">
                    Edit profile
                </h2>
                <p className="mb-6 text-xs text-[#918f9c]">
                    Update your account information. Changes apply immediately across RacketTier.
                </p>

                {error ? (
                    <p className="mb-4 rounded-lg bg-[#ffb4ab]/10 px-3 py-2 text-sm text-[#ffb4ab]" role="alert">
                        {error}
                    </p>
                ) : null}

                <form className="space-y-4" onSubmit={handleSubmit} aria-busy={submitting}>
                    <div className="space-y-2">
                        <label
                            htmlFor="rt-profile-edit-name"
                            className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]"
                        >
                            Name
                        </label>
                        <input
                            id="rt-profile-edit-name"
                            type="text"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={submitting}
                            placeholder="Your name"
                            className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                        />
                        {fieldErrors.name?.[0] ? (
                            <p className="text-xs text-[#ffb4ab]">{fieldErrors.name[0]}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="rt-profile-edit-email"
                            className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]"
                        >
                            Email Address
                        </label>
                        <input
                            id="rt-profile-edit-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={submitting}
                            placeholder="name@example.com"
                            className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                        />
                        {fieldErrors.email?.[0] ? (
                            <p className="text-xs text-[#ffb4ab]">{fieldErrors.email[0]}</p>
                        ) : null}
                        {email && user?.email && email.trim().toLowerCase() !== user.email.toLowerCase() ? (
                            <p className="text-xs text-[#f5b955]">
                                We’ll send a verification link to your new email.
                            </p>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="rt-profile-edit-age"
                                className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]"
                            >
                                Age
                            </label>
                            <input
                                id="rt-profile-edit-age"
                                type="number"
                                min={1}
                                max={150}
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                disabled={submitting}
                                placeholder="Age"
                                className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                            />
                            {fieldErrors.age?.[0] ? (
                                <p className="text-xs text-[#ffb4ab]">{fieldErrors.age[0]}</p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="rt-profile-edit-pronoun"
                                className="text-[10px] font-black uppercase tracking-widest text-[#c8c5d2]"
                            >
                                Pronoun
                            </label>
                            <select
                                id="rt-profile-edit-pronoun"
                                value={pronoun}
                                onChange={(e) => setPronoun(e.target.value)}
                                disabled={submitting}
                                className="w-full rounded-lg border-none bg-[#0e0e11] py-3 px-4 text-sm text-[#e4e1e6] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                            >
                                {PRONOUN_OPTIONS.map((option) => (
                                    <option key={option.value || 'empty'} value={option.value} className="bg-[#0e0e11] text-[#e4e1e6]">
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.pronoun?.[0] ? (
                                <p className="text-xs text-[#ffb4ab]">{fieldErrors.pronoun[0]}</p>
                            ) : null}
                        </div>
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
                            {submitting ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
