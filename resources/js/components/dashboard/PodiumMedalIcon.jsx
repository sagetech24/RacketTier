import firstIconSvg from '../../assets/podium/first-icon.svg?raw';
import secondIconSvg from '../../assets/podium/second-icon.svg?raw';
import thirdIconSvg from '../../assets/podium/third-icon.svg?raw';

const MEDAL_SVG = [firstIconSvg, secondIconSvg, thirdIconSvg];
const MEDAL_ALT = ['First place', 'Second place', 'Third place'];

/**
 * Inline podium ribbon medal SVG — bundled so it renders offline without `/images/*` fetches.
 *
 * @param {{
 *   place?: number;
 *   className?: string;
 * }} props
 */
export function PodiumMedalIcon({ place = 0, className = '' }) {
    const index = place >= 0 && place <= 2 ? place : 2;
    const alt = MEDAL_ALT[index];

    return (
        <span
            className={['rt-podium-medal-icon', className].filter(Boolean).join(' ')}
            role="img"
            aria-label={alt}
            dangerouslySetInnerHTML={{ __html: MEDAL_SVG[index] }}
        />
    );
}
