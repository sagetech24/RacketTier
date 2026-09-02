export const SKILL_LEVEL_NAMES = {
    1: 'Starter',
    2: 'Beginner',
    3: 'Intermediate',
    4: 'Advance',
    5: 'Pro Elite',
};

/** @param {{ optional_guest_skill?: boolean } | null | undefined} session */
export function sessionRequiresSkillLevel(session) {
    return session?.optional_guest_skill === false;
}

/** @param {number | null | undefined} skillLevel */
export function skillLevelLabel(skillLevel) {
    if (skillLevel == null) return null;
    const level = Math.min(5, Math.max(1, skillLevel));
    return `Lvl ${level} — ${SKILL_LEVEL_NAMES[level] ?? 'Skill'}`;
}

/** @param {number} level */
export function skillLevelBackgroundOpacity(level) {
    const clamped = Math.min(5, Math.max(1, level));
    return 0.15 + ((clamped - 1) / 4) * 0.65;
}

/** @param {number} level */
export function skillLevelTextClass(level) {
    const clamped = Math.min(5, Math.max(1, level));
    const classes = {
        1: 'text-[#e4e1e6]',
        2: 'text-[#c8c5d2]',
        3: 'text-[#c9c8d0]',
        4: 'text-[#353438]',
        5: 'text-[#131316]',
    };
    return classes[clamped] ?? classes[1];
}
