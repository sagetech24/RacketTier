import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthBrandHeader } from '../components/AuthBrandHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { postForm } from '../lib/http.js';

const GOOGLE_ICON =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAg6awCdOFM2mUf4iHGroiuA4v5FGVYEt8GEc92F4OoyT6bPN8TgPc9BXPwzIwu6l6DzC-ib67_TfDdsMJGski5FBONFL2OCZtkAXkPfW5fjp0Aa7CYj1xz8fPs3c94HvcxIBfE931i7mdW-d75OYOWJO6ZRrdOwdqPYcK6Pvw4rcFmItgXGZeVHiOOpAG3gm5ycAVVg-8KThXtrrHSXtZuG76rIEYQYEUAfkK7vvhPTG9lGDjsnVhTkjSYXSaozv_E4CchpD1d7xc';
const APPLE_ICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apple/apple-original.svg';

const PRONOUN_OPTIONS = [
    { value: '', label: 'Pronoun' },
    { value: 'He/Him', label: 'He' },
    { value: 'She/Her', label: 'She' },
    { value: 'They/Them', label: 'They' },
    { value: 'Other', label: 'Others' },
];

export function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();
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

    const from = location.state?.from ?? '/dashboard';

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
            navigate(from, { replace: true });
        } catch {
            setError('Network error. Check your connection.');
            setSubmitting(false);
        }
    }

    return (
        <div className="relative flex min-h-[max(884px,100dvh)] flex-col overflow-hidden bg-[#121216] text-[#e4e1e6]">
            <main className="flex grow items-center justify-center px-6 py-8 tab:py-12">
                <div className="w-full max-w-md space-y-12">
                    <AuthBrandHeader />

                    <div className="space-y-8 rounded-xl bg-[#1b1b1e] p-8">
                        <form className="space-y-6" onSubmit={handleSubmit} aria-busy={submitting}>
                            <div className="space-y-2">
                                <label
                                    htmlFor="v2-register-name"
                                    className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                >
                                    Name
                                </label>
                                <input
                                    id="v2-register-name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={submitting}
                                    placeholder="Your name"
                                    className="w-full rounded-lg border-none bg-[#0e0e11] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                />
                                {fieldErrors.name?.[0] ? <p className="text-sm text-[#ffdad6]">{fieldErrors.name[0]}</p> : null}
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="v2-register-email"
                                    className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                >
                                    Email Address
                                </label>
                                <input
                                    id="v2-register-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={submitting}
                                    placeholder="name@example.com"
                                    className="w-full rounded-lg border-none bg-[#0e0e11] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                />
                                {fieldErrors.email?.[0] ? <p className="text-sm text-[#ffdad6]">{fieldErrors.email[0]}</p> : null}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="v2-register-age"
                                        className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                    >
                                        Age
                                    </label>
                                    <input
                                        id="v2-register-age"
                                        type="number"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        autoComplete="off"
                                        disabled={submitting}
                                        placeholder="Age"
                                        min={1}
                                        max={150}
                                        className="w-full rounded-lg border-none bg-[#0e0e11] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="v2-register-pronoun"
                                        className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                    >
                                        Pronoun
                                    </label>
                                    <select
                                        id="v2-register-pronoun"
                                        value={pronoun}
                                        onChange={(e) => setPronoun(e.target.value)}
                                        disabled={submitting}
                                        className="w-full rounded-lg border-none bg-[#0e0e11] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                    >
                                        {PRONOUN_OPTIONS.map((option) => (
                                            <option
                                                key={option.value || 'empty'}
                                                value={option.value}
                                                className="bg-[#0e0e11] text-xs tracking-[0.15em] text-[#e4e1e6]"
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="v2-register-password"
                                    className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                >
                                    Password
                                </label>
                                <input
                                    id="v2-register-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={submitting}
                                    placeholder="••••••••"
                                    className="w-full rounded-lg border-none bg-[#0e0e11] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                />
                                {fieldErrors.password?.[0] ? <p className="text-sm text-[#ffdad6]">{fieldErrors.password[0]}</p> : null}
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="v2-register-password-confirmation"
                                    className="ml-1 block text-xs uppercase tracking-[0.15em] text-[#c8c5d2]"
                                >
                                    Confirm Password
                                </label>
                                <input
                                    id="v2-register-password-confirmation"
                                    name="password_confirmation"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    disabled={submitting}
                                    placeholder="••••••••"
                                    className="w-full rounded-lg border-none bg-[#0e0e11] px-4 py-3.5 text-[#e4e1e6] outline-none transition-all placeholder:text-[#918f9c]/50 focus:bg-[#2a2a2d] focus:ring-1 focus:ring-[#c2c1ff]/20 disabled:opacity-60"
                                />
                            </div>

                            {error ? (
                                <div className="rounded-lg bg-[#93000a]/35 px-3 py-2 text-sm text-[#ffdad6]" role="alert">
                                    {error}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-8 w-full cursor-pointer rounded-xl bg-primary py-4 font-bold text-[#211e6a] shadow-[0_20px_40px_-10px_rgba(194,193,255,0.2)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                            >
                                {submitting ? 'Creating account…' : 'Create Account'}
                            </button>
                        </form>

                        {/* <div className="relative flex items-center justify-center py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#474651]/15" />
                            </div>
                            <span className="relative bg-[#1b1b1e] px-4 text-[10px] uppercase tracking-[0.2em] text-[#918f9c]">
                                Or continue with
                            </span>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-center text-xs text-[#918f9c]/70">coming soon...</div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    disabled
                                    className="flex cursor-not-allowed items-center justify-center gap-3 rounded-xl bg-[#5f5e60] py-3.5 opacity-50 transition-colors duration-200 hover:bg-[#39393c] active:scale-95"
                                >
                                    <img alt="Google" className="h-5 w-5" src={GOOGLE_ICON} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Google</span>
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="flex cursor-not-allowed items-center justify-center gap-3 rounded-xl bg-[#5f5e60] py-3.5 opacity-50 transition-colors duration-200 hover:bg-[#39393c] active:scale-95"
                                >
                                    <img src={APPLE_ICON} alt="Apple" className="h-5 w-5" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Apple</span>
                                </button>
                            </div>
                        </div> */}
                    </div>

                    <p className="text-center text-sm text-[#c8c5d2]">
                        Already have an account?{' '}
                        <Link to="/login" className="ml-1 font-bold text-[#4ce081] underline-offset-4 hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </main>

            <div className="pointer-events-none fixed -left-20 top-[10%] h-64 w-64 rounded-full bg-[#c2c1ff]/5 blur-[100px]" />
            <div className="pointer-events-none fixed -right-20 bottom-[10%] h-80 w-80 rounded-full bg-[#4ce081]/5 blur-[120px]" />

            <footer className="p-8 text-center">
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs uppercase tracking-[0.2em] text-[#918f9c]">
                    <a className="transition-colors hover:text-[#e4e1e6]" href="#">
                        Privacy Policy
                    </a>
                    <a className="transition-colors hover:text-[#e4e1e6]" href="#">
                        Terms of Service
                    </a>
                    <a className="transition-colors hover:text-[#e4e1e6]" href="#">
                        Help Center
                    </a>
                </div>
            </footer>
        </div>
    );
}
