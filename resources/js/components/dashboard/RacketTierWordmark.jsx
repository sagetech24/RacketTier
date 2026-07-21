/**
 * @param {{ textSize?: string; className?: string }} props
 */
export function RacketTierWordmark({ textSize = 'text-3xl', className = '' }) {
    return (
        <span className="flex items-center gap-2">
            <img src="/images/rt-logo.png" alt="RacketTier" className="w-6 h-6" />
            <span
                className={[
                    'font-sans flex items-center font-extrabold tracking-tighter text-[#c2c1ff]',
                    textSize,
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                Racket<span className="italic text-[#c2c1ff]">Tier</span>
            </span>
        </span>
    );
}
