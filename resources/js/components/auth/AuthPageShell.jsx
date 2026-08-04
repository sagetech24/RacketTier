import { Link } from 'react-router-dom';
import '../../../css/auth.css';

/**
 * Full-viewport shell for unauthenticated auth flows.
 * Visual language mirrors landing v3 court grid + kinetic orbs.
 *
 * @param {{ children: import('react').ReactNode, navAction?: { to: string, label: string } | null }} props
 */
export function AuthPageShell({ children, navAction = null }) {
    return (
        <div className="rt-auth-shell selection:bg-[#c2c1ff] selection:text-[#211e6a]">
            <div className="rt-auth-court-line hidden tab:block" aria-hidden="true" />
            <div className="rt-auth-orb rt-auth-orb--lavender" aria-hidden="true" />
            <div className="rt-auth-orb rt-auth-orb--green" aria-hidden="true" />
            <div className="rt-auth-orb rt-auth-orb--violet" aria-hidden="true" />

            <a
                href="#auth-main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-xl focus:bg-[#c2c1ff] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#211e6a]"
            >
                Skip to content
            </a>

            <header className="relative z-10 px-4 pt-4 tab:px-6 tab:pt-6">
                <nav
                    className="mx-auto flex w-full max-w-md items-center justify-between gap-3"
                    aria-label="Auth"
                >
                    {navAction ? (
                        <Link
                            to={navAction.to}
                            className="rt-auth-nav-link inline-flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#918f9c] hover:text-[#c2c1ff]"
                        >
                            {navAction.label}
                        </Link>
                    ) : null}
                </nav>
            </header>

            <main id="auth-main" className="relative z-10 flex grow items-center justify-center px-5 py-8 tab:px-6 tab:py-12">
                {children}
            </main>
        </div>
    );
}
