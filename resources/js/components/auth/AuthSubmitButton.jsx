/**
 * Primary auth submit button with loading spinner.
 *
 * @param {{
 *   children: import('react').ReactNode,
 *   submitting?: boolean,
 *   submittingLabel?: string,
 *   disabled?: boolean,
 *   type?: 'submit' | 'button',
 *   onClick?: () => void,
 *   variant?: 'primary' | 'ghost',
 *   className?: string,
 * }} props
 */
export function AuthSubmitButton({
    children,
    submitting = false,
    submittingLabel,
    disabled = false,
    type = 'submit',
    onClick,
    variant = 'primary',
    className = '',
}) {
    const isGhost = variant === 'ghost';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || submitting}
            className={[
                'flex w-full min-h-12 items-center justify-center gap-2.5 rounded-xl py-4 font-bold touch-manipulation',
                isGhost ? 'rt-auth-btn--ghost' : 'rt-auth-btn text-[#211e6a]',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {submitting ? (
                <>
                    <svg
                        className="rt-auth-btn__spinner"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path
                            className="opacity-90"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                        />
                    </svg>
                    <span>{submittingLabel ?? children}</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}
