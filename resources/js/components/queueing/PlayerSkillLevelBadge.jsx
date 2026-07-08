import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { skillLevelLabel } from './skillLevelUtils.js';

/**
 * Compact skill level pill for leaderboard cards.
 * @param {{ skillLevel?: number | null; className?: string }} props
 */
export function PlayerSkillLevelBadge({ skillLevel, className = '' }) {
    const label = skillLevelLabel(skillLevel);
    if (!label) return null;

    return (
        <span
            className={[
                'inline-flex items-center gap-0.5 rounded-full border border-[#c2c1ff]/25 bg-[#c2c1ff]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff] md:text-md! text-xs!',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            title="Assigned skill level"
        >
            <MaterialIcon name="star" className="text-[12px]!" />
            <span className="normal-case tracking-normal">{label}</span>
        </span>
    );
}
