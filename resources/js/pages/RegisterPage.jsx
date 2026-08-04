import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
import { AuthField } from '../components/auth/AuthField.jsx';
import { AuthPageShell } from '../components/auth/AuthPageShell.jsx';
import { AuthPasswordField } from '../components/auth/AuthPasswordField.jsx';
import { AuthSelect } from '../components/auth/AuthSelect.jsx';
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton.jsx';
import { LegalDocumentModal } from '../components/auth/LegalDocumentModal.jsx';
import { PRIVACY_POLICY_TEXT } from '../components/auth/privacyPolicyContent.js';
import { TERMS_OF_SERVICE_TEXT } from '../components/auth/termsOfServiceContent.js';
import { useAuth } from '../context/AuthContext.jsx';
import { postForm } from '../lib/http.js';

/** @typedef {'terms' | 'privacy'} LegalModalKind */

const PRONOUN_OPTIONS = [
    { value: '', label: 'Prefer not to say' },
    { value: 'He/Him', label: 'He/Him' },
    { value: 'She/Her', label: 'She/Her' },
    { value: 'They/Them', label: 'They/Them' },
    { value: 'Other', label: 'Other' },
];

export function RegisterPage() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [pronoun, setPronoun] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string[]>} */ ({}));
    const [submitting, setSubmitting] = useState(false);
    const [legalModal, setLegalModal] = useState(/** @type {LegalModalKind | null} */ (null));

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setSubmitting(true);

        try {
            const res = await postForm('/register', {
                name,
                email,
                age,
                pronoun,
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
            navigate('/verify-email', { replace: true });
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
                        eyebrow=""
                        tagline="Create an account to earn points, climb tiers, and own every smash."
                    />
                </div>

                <div className="rt-auth-card rt-auth-enter rt-auth-enter--2 space-y-6 rounded-2xl p-6 tab:p-8">
                    <div className="space-y-1 border-b border-white/6 pb-5">
                        <h2 className="rt-display text-balance text-lg font-bold tracking-tight text-[#e4e1e6]">
                            Create account
                        </h2>
                        <p className="text-sm text-[#918f9c]">
                            Takes a minute. Age and pronouns are optional.
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
                        <AuthField
                            id="v2-register-name"
                            name="name"
                            label="Name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            error={fieldErrors.name?.[0]}
                            disabled={submitting}
                            autoComplete="name"
                            autoFocus
                            placeholder="Your name"
                        />

                        <AuthField
                            id="v2-register-email"
                            name="email"
                            label="Email address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={fieldErrors.email?.[0]}
                            disabled={submitting}
                            autoComplete="email"
                            placeholder="name@example.com"
                            inputMode="email"
                        />

                        <div className="grid grid-cols-2 gap-3 tab:gap-4">
                            <AuthField
                                id="v2-register-age"
                                label="Age"
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                error={fieldErrors.age?.[0]}
                                disabled={submitting}
                                autoComplete="off"
                                placeholder="Optional"
                                required={false}
                                inputMode="numeric"
                                min={1}
                                max={150}
                            />

                            <AuthSelect
                                id="v2-register-pronoun"
                                label="Pronoun"
                                value={pronoun}
                                onChange={(e) => setPronoun(e.target.value)}
                                options={PRONOUN_OPTIONS}
                                error={fieldErrors.pronoun?.[0]}
                                disabled={submitting}
                            />
                        </div>

                        <AuthPasswordField
                            id="v2-register-password"
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={fieldErrors.password?.[0]}
                            disabled={submitting}
                            autoComplete="new-password"
                        />

                        <AuthPasswordField
                            id="v2-register-password-confirmation"
                            label="Confirm password"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            error={fieldErrors.password_confirmation?.[0]}
                            disabled={submitting}
                            autoComplete="new-password"
                        />

                        {error ? (
                            <div className="rt-auth-alert rounded-xl px-3.5 py-2.5 text-sm text-[#ffb4ab]" role="alert">
                                {error}
                            </div>
                        ) : null}

                        <AuthSubmitButton submitting={submitting} submittingLabel="Creating account…">
                            Create account
                        </AuthSubmitButton>

                        <p className="text-center text-[11px] leading-relaxed text-[#918f9c]">
                            By continuing, you agree to our{' '}
                            <button
                                type="button"
                                onClick={() => setLegalModal('terms')}
                                className="cursor-pointer font-medium text-[#c2c1ff] underline-offset-2 transition-colors hover:text-[#e4e1e6] hover:underline focus-visible:outline-none focus-visible:underline"
                            >
                                Terms
                            </button>{' '}
                            and{' '}
                            <button
                                type="button"
                                onClick={() => setLegalModal('privacy')}
                                className="cursor-pointer font-medium text-[#c2c1ff] underline-offset-2 transition-colors hover:text-[#e4e1e6] hover:underline focus-visible:outline-none focus-visible:underline"
                            >
                                Privacy Policy
                            </button>
                            .
                        </p>
                    </form>
                </div>

                <p className="rt-auth-enter rt-auth-enter--3 text-center text-sm text-[#c8c5d2]">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="cursor-pointer font-bold text-[#4ce081] underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </div>

            <LegalDocumentModal
                open={legalModal === 'terms'}
                title="Terms of Service"
                content={TERMS_OF_SERVICE_TEXT}
                onClose={() => setLegalModal(null)}
            />
            <LegalDocumentModal
                open={legalModal === 'privacy'}
                title="Privacy Policy"
                content={PRIVACY_POLICY_TEXT}
                onClose={() => setLegalModal(null)}
            />
        </AuthPageShell>
    );
}
