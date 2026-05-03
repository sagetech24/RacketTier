import { Link } from 'react-router-dom';

/**
 * @param {{ textSize?: string; className?: string }} props
 */
export function RacketTierWordmark({ textSize = 'text-3xl', className = '' }) {
    return (
        <Link to="/">
            <span
                className={[
                    'font-sans font-extrabold tracking-tighter text-[#c2c1ff]',
                    textSize,
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                Racket<span className="italic text-[#c2c1ff]">Tier</span>
            </span>
        </Link>
    );
}
