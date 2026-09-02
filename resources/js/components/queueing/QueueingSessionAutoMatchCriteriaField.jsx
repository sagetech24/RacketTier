/** @typedef {import('../../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria */

import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { ToggleSwitch } from '../app/ToggleSwitch.jsx';

export const DEFAULT_AUTO_MATCH_CRITERIA = /** @type {AutoMatchCriteria} */ ({
    skill_level: true,
    skill_match_mode: 'balanced',
    wl_statistics: true,
    sequence: true,
    genderless_mixed: true,
});

/** @type {Array<{ id: string, label: string, hint: string, criteria: AutoMatchCriteria }>} */
export const AUTO_MATCH_PRESETS = [
    {
        id: 'balanced',
        label: 'Balanced',
        hint: 'Skill + form + queue',
        criteria: {
            skill_level: true,
            skill_match_mode: 'balanced',
            wl_statistics: true,
            sequence: true,
            genderless_mixed: true,
        },
    },
    {
        id: 'queue',
        label: 'Queue-first',
        hint: 'FIFO fairness',
        criteria: {
            skill_level: false,
            skill_match_mode: 'balanced',
            wl_statistics: false,
            sequence: true,
            genderless_mixed: true,
        },
    },
    {
        id: 'skill',
        label: 'Skill focus',
        hint: 'Same level matches',
        criteria: {
            skill_level: true,
            skill_match_mode: 'same_level',
            wl_statistics: false,
            sequence: true,
            genderless_mixed: true,
        },
    },
];

const SKILL_MATCH_MODE_OPTIONS = [
    {
        value: 'balanced',
        label: 'Balanced',
        description: 'Mix higher and lower skill for even games',
    },
    {
        value: 'same_level',
        label: 'Same level',
        description: 'Keep players of similar skill together',
    },
];

/** @type {Array<{ key: keyof AutoMatchCriteria, icon: string, label: string, description: string, priority?: number }>} */
const CRITERION_CARDS = [
    {
        key: 'skill_level',
        icon: 'military_tech',
        label: 'Skill level',
        description: 'Use tier / skill to shape fair lineups',
        priority: 1,
    },
    {
        key: 'wl_statistics',
        icon: 'monitoring',
        label: 'Win / loss form',
        description: 'Balance recent session W/L so streaks don’t dominate',
        priority: 2,
    },
    {
        key: 'sequence',
        icon: 'format_list_numbered',
        label: 'Queue sequence',
        description: 'Prefer players waiting longest (FIFO)',
        priority: 3,
    },
    {
        key: 'genderless_mixed',
        icon: 'groups',
        label: 'Mixed pairing',
        description: 'Allow mixed gender lineups when needed',
    },
];

/**
 * @param {unknown} value
 * @returns {AutoMatchCriteria}
 */
export function parseAutoMatchCriteria(value) {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_AUTO_MATCH_CRITERIA };
    }

    const raw = /** @type {Record<string, unknown>} */ (value);

    return {
        skill_level: raw.skill_level !== false,
        skill_match_mode: raw.skill_match_mode === 'same_level' ? 'same_level' : 'balanced',
        wl_statistics: raw.wl_statistics !== false,
        sequence: raw.sequence !== false,
        genderless_mixed: raw.genderless_mixed !== false,
    };
}

/**
 * @param {{ auto_match_criteria?: unknown } | null | undefined} session
 */
export function sessionUsesSkillLevel(session) {
    return parseAutoMatchCriteria(session?.auto_match_criteria).skill_level;
}

/**
 * @param {AutoMatchCriteria} criteria
 */
export function autoMatchCriteriaHasAny(criteria) {
    return Boolean(
        criteria.skill_level || criteria.wl_statistics || criteria.sequence || criteria.genderless_mixed,
    );
}

/**
 * @param {AutoMatchCriteria} criteria
 * @returns {AutoMatchCriteria}
 */
export function normalizeAutoMatchCriteria(criteria) {
    return {
        skill_level: Boolean(criteria.skill_level),
        skill_match_mode:
            criteria.skill_level && criteria.skill_match_mode === 'same_level' ? 'same_level' : 'balanced',
        wl_statistics: Boolean(criteria.wl_statistics),
        sequence: Boolean(criteria.sequence),
        genderless_mixed: Boolean(criteria.genderless_mixed),
    };
}

/**
 * @param {AutoMatchCriteria} criteria
 */
export function autoMatchPrioritySummary(criteria) {
    /** @type {string[]} */
    const parts = [];
    if (criteria.skill_level) {
        parts.push(
            criteria.skill_match_mode === 'same_level' ? 'Skill (same level)' : 'Skill (balanced)',
        );
    }
    if (criteria.wl_statistics) parts.push('W/L');
    if (criteria.sequence) parts.push('Sequence');
    if (parts.length === 0) {
        return criteria.genderless_mixed ? 'Mixed pairing only' : 'None selected';
    }
    const base = parts.join(' → ');
    return criteria.genderless_mixed ? `${base} · Mixed on` : base;
}

/**
 * @param {AutoMatchCriteria} criteria
 * @param {AutoMatchCriteria} preset
 */
function criteriaMatchesPreset(criteria, preset) {
    return (
        criteria.skill_level === preset.skill_level &&
        criteria.wl_statistics === preset.wl_statistics &&
        criteria.sequence === preset.sequence &&
        criteria.genderless_mixed === preset.genderless_mixed &&
        (!preset.skill_level || criteria.skill_match_mode === preset.skill_match_mode)
    );
}

/**
 * @param {{
 *   value: AutoMatchCriteria,
 *   onChange: (criteria: AutoMatchCriteria) => void,
 *   disabled?: boolean,
 *   showHeading?: boolean,
 *   showPresets?: boolean,
 * }} props
 */
export function QueueingSessionAutoMatchCriteriaField({
    value,
    onChange,
    disabled = false,
    showHeading = true,
    showPresets = true,
}) {
    const hasAnyCriterion = autoMatchCriteriaHasAny(value);

    function patch(partial) {
        onChange(normalizeAutoMatchCriteria({ ...value, ...partial }));
    }

    return (
        <div className={showHeading ? 'space-y-4 border-t-2 border-[#2a2a2d] pt-4' : 'space-y-4'}>
            {showHeading ? (
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-[#dddddd]">Auto-Match Setup</p>
                    <p className="mt-1 text-xs text-[#918f9c] md:text-base!">
                        Choose how auto-generated matches pick players. Priority: Skill Level → W/L Statistics →
                        Sequence.
                    </p>
                </div>
            ) : null}

            {showPresets ? (
                <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#918f9c]">
                        Quick presets
                    </p>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Matching presets">
                        {AUTO_MATCH_PRESETS.map((preset) => {
                            const selected = criteriaMatchesPreset(value, preset.criteria);
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChange(normalizeAutoMatchCriteria(preset.criteria))}
                                    className={[
                                        'min-h-11 cursor-pointer rounded-xl border px-2 py-2 text-center transition-colors duration-200',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60',
                                        'disabled:cursor-not-allowed disabled:opacity-50',
                                        'active:scale-[0.98]',
                                        selected
                                            ? 'border-[#c2c1ff]/50 bg-[#c2c1ff]/15 text-[#c2c1ff]'
                                            : 'border-[#2a2a2d] bg-[#131316] text-[#c8c5d2] hover:border-white/15',
                                    ].join(' ')}
                                    aria-pressed={selected}
                                >
                                    <span className="block text-xs font-bold leading-tight">{preset.label}</span>
                                    <span className="mt-0.5 block text-[10px] leading-tight opacity-75">
                                        {preset.hint}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <div className="space-y-2" role="group" aria-label="Matching criteria">
                {CRITERION_CARDS.map((card) => {
                    const checked = Boolean(value[card.key]);
                    const inputId = `rt-auto-match-${card.key}`;

                    return (
                        <div key={card.key} className="space-y-2">
                            <label
                                htmlFor={inputId}
                                className={[
                                    'flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors duration-200',
                                    'focus-within:ring-2 focus-within:ring-[#c2c1ff]/50',
                                    checked
                                        ? 'border-[#c2c1ff]/35 bg-[#c2c1ff]/10'
                                        : 'border-[#2a2a2d] bg-[#131316] hover:border-white/12',
                                    disabled ? 'cursor-not-allowed opacity-65' : '',
                                ].join(' ')}
                            >
                                <span
                                    className={[
                                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                                        checked ? 'bg-[#c2c1ff]/20 text-[#c2c1ff]' : 'bg-[#2a2a2d] text-[#918f9c]',
                                    ].join(' ')}
                                    aria-hidden
                                >
                                    <MaterialIcon name={card.icon} className="text-xl!" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-[#e4e1e6] md:text-base!">
                                            {card.label}
                                        </span>
                                        {card.priority != null ? (
                                            <span className="rounded-full border border-white/10 bg-[#1b1b1e] px-1.5 py-0.5 text-[10px] font-bold text-[#918f9c]">
                                                P{card.priority}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-[#918f9c]">
                                        {card.description}
                                    </span>
                                </span>
                                <ToggleSwitch
                                    id={inputId}
                                    checked={checked}
                                    disabled={disabled}
                                    size="sm"
                                    onChange={(next) => patch({ [card.key]: next })}
                                    aria-label={card.label}
                                />
                            </label>

                            {card.key === 'skill_level' && value.skill_level ? (
                                <div
                                    className="ml-1 grid grid-cols-2 gap-2 rounded-xl border border-[#2a2a2d] bg-[#1b1b1e]/80 p-2"
                                    role="radiogroup"
                                    aria-label="Skill matching mode"
                                >
                                    {SKILL_MATCH_MODE_OPTIONS.map((option) => {
                                        const selected = value.skill_match_mode === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                disabled={disabled}
                                                onClick={() =>
                                                    patch({
                                                        skill_match_mode:
                                                            option.value === 'same_level'
                                                                ? 'same_level'
                                                                : 'balanced',
                                                    })
                                                }
                                                className={[
                                                    'min-h-11 cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-colors duration-200',
                                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60',
                                                    'disabled:cursor-not-allowed disabled:opacity-50',
                                                    'active:scale-[0.98]',
                                                    selected
                                                        ? 'border-[#4ce081]/45 bg-[#4ce081]/12 text-[#4ce081]'
                                                        : 'border-transparent bg-[#131316] text-[#c8c5d2] hover:border-white/10',
                                                ].join(' ')}
                                            >
                                                <span className="block text-xs font-bold">{option.label}</span>
                                                <span className="mt-0.5 block text-[10px] leading-snug opacity-80">
                                                    {option.description}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <div
                className="rounded-xl border border-[#2a2a2d] bg-[#131316] px-3 py-2.5"
                aria-live="polite"
            >
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#918f9c]">
                    Priority order
                </p>
                <p className="mt-1 text-sm font-semibold text-[#e4e1e6]">
                    {autoMatchPrioritySummary(value)}
                </p>
            </div>

            {!hasAnyCriterion ? (
                <p className="text-xs text-[#ffb4ab]" role="alert">
                    Select at least one matching criterion.
                </p>
            ) : null}
        </div>
    );
}
