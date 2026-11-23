/**
 * Inline match SVG (scoreboard) — works offline without network image assets.
 *
 * @param {{ className?: string }} props
 */
export function MatchIcon({ className = 'h-6 w-6' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            focusable="false"
        >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16z" />
            <path d="M9.5 11.5 8.1 10.1 6.5 11.7 5.1 10.3 6.5 8.9 5.1 7.5 6.5 6.1 8.1 7.7 9.5 6.3 10.9 7.7 9.5 9.1 10.9 10.5z" />
            <path d="M13 7h5v2h-5zm0 4h5v2h-5zm0 4h5v2h-5z" />
        </svg>
    );
}
