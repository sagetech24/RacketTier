import { Link } from 'react-router-dom';
import '../../../css/auth.css';

/**
 * Full-viewport shell for unauthenticated auth flows.
 */
export function AuthPageShell({ children, showNav = false }) {
    return (
        <div className="rt-auth-shell font-sans selection:bg-[#c2c1ff] selection:text-[#211e6a]">
            <div className="rt-auth-grid" aria-hidden="true" />
            <div className="rt-auth-orb rt-auth-orb--lavender" aria-hidden="true" />
            <div className="rt-auth-orb rt-auth-orb--green" aria-hidden="true" />
            <div className="rt-auth-orb rt-auth-orb--violet" aria-hidden="true" />

            {showNav ? (
                <header className="relative z-10 px-6 pt-6 tab:pt-8">
                    <nav className="mx-auto flex w-full max-w-md items-center justify-between">
                        <Link
                            to="/"
                            className="group inline-flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-sm text-[#c8c5d2] transition-colors hover:text-[#e4e1e6]"
                        >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-[#1b1b1e]/80 transition-colors group-hover:border-[#c2c1ff]/25 group-hover:bg-[#1f1f22]">
                                <svg
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </span>
                            Home
                        </Link>
                        <Link
                            to="/register"
                            className="text-xs font-semibold uppercase tracking-[0.14em] text-[#918f9c] transition-colors hover:text-[#c2c1ff]"
                        >
                            Join
                        </Link>
                    </nav>
                </header>
            ) : null}

            <main className="relative z-10 flex grow items-center justify-center px-6 py-8 tab:py-12">
                {children}
            </main>
        </div>
    );
}
