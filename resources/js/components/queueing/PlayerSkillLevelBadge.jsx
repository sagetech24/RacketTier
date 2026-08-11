import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { skillLevelLabel } from './skillLevelUtils.js';

/**
 * Compact skill level pill for leaderboard cards.
 * @param {{ skillLevel?: number | null; className?: string; truncateOnMobile?: boolean }} props
 */
export function PlayerSkillLevelBadge({ skillLevel, className = '', truncateOnMobile = false }) {
    const label = skillLevelLabel(skillLevel);
    if (!label) return null;

    return (
        <span
            className={[
                'inline-flex max-w-full items-center gap-0.5 rounded-full border border-[#c2c1ff]/25 bg-[#c2c1ff]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff] md:text-md! text-xs!',
                truncateOnMobile ? 'max-w-[7rem] tab:max-w-none' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            title={label}
        >
            <MaterialIcon name="star" className="shrink-0 text-[12px]!" />
            <span
                className={[
                    'normal-case tracking-normal',
                    truncateOnMobile ? 'min-w-0 truncate tab:overflow-visible tab:whitespace-normal' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {label}
            </span>
        </span>
    );
}
