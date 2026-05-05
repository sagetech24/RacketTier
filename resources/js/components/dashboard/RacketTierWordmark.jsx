import { Link } from 'react-router-dom';

/**
 * @param {{ textSize?: string; className?: string }} props
 */
export function RacketTierWordmark({ textSize = 'text-3xl', className = '' }) {
    return (
        <Link to="/">
            <span
                className={[
                    'font-sans flex items-center gap-2 font-extrabold tracking-tighter text-[#c2c1ff]',
                    textSize,
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <img src="/images/rt-logo.png" alt="RacketTier" className="w-6 h-6" />
                Racket<span className="italic text-[#c2c1ff]">Tier</span>
            </span>
        </Link>
    );
}
