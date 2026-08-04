import { Link } from 'react-router-dom';
import '../../css/auth.css';

/**
 * Brand lockup for auth screens — matches landing wordmark treatment.
 *
 * @param {{ className?: string, eyebrow?: string, tagline?: string }} props
 */
export function AuthBrandHeader({ className = '', eyebrow, tagline }) {
    return (
        <div className={['space-y-4 text-center', className].filter(Boolean).join(' ')}>
            {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4ce081]">{eyebrow}</p>
            ) : null}
            <Link
                to="/"
                className="rt-auth-nav-link group inline-flex items-center justify-center gap-3.5 rounded-xl focus-visible:outline-none"
            >
                <img src="/images/rt-logo.png" alt="" className="h-11 w-11" />
                <h1 className="rt-display text-4xl font-extrabold tracking-tighter text-[#c2c1ff] tab:text-5xl">
                    Racket<span className="ml-[0.12rem] italic">Tier</span>
                </h1>
                
            </Link>
            <p className="mx-auto max-w-xs text-pretty text-sm font-medium leading-relaxed tracking-tight text-[#c8c5d2] tab:max-w-sm tab:text-[0.95rem]">
                {tagline ?? 'Welcome to the kinetic world of racket sports where every smash counts.'}
            </p>
        </div>
    );
}
