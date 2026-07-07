/** @typedef {import('../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria */

import { ToggleField } from '../app/ToggleSwitch.jsx';

export const DEFAULT_AUTO_MATCH_CRITERIA = /** @type {AutoMatchCriteria} */ ({
    skill_level: true,
    skill_match_mode: 'balanced',
    wl_statistics: true,
    sequence: true,
    genderless_mixed: true,
});

const SKILL_MATCH_MODE_OPTIONS = [
    {
        value: 'balanced',
        label: 'Mixed Skill Levels (High + low level)',
    },
    {
        value: 'same_level',
        label: 'Same Skill Level (High vs High, Starter vs Starter, etc.)',
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
 * @param {{
 *   value: AutoMatchCriteria,
 *   onChange: (criteria: AutoMatchCriteria) => void,
 *   disabled?: boolean,
 *   showHeading?: boolean,
 * }} props
 */
export function QueueingSessionAutoMatchCriteriaField({
    value,
    onChange,
    disabled = false,
    showHeading = true,
}) {
    const hasAnyCriterion = autoMatchCriteriaHasAny(value);

    function patch(partial) {
        onChange(normalizeAutoMatchCriteria({ ...value, ...partial }));
    }

    return (
        <div className="space-y-1 border-t-2 border-[#2a2a2d] pt-4">
            {showHeading ? (
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-[#918f9c]">Auto-Match Setup</p>
                    <p className="mt-1 text-xs text-[#918f9c]">
                        Choose how auto-generated matches pick players. Priority: Skill Level → W/L Statistics →
                        Sequence.
                    </p>
                </div>
            ) : null}

            <div className="space-y-1">
                <ToggleField
                    checked={value.skill_level}
                    onChange={(checked) => patch({ skill_level: checked })}
                    disabled={disabled}
                    layout="card"
                    size="xs"
                    label="Skill Level"
                />

                {value.skill_level ? (
                    <div className="pt-0">
                        <label
                            htmlFor="rt-auto-match-skill-mode"
                            className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#918f9c] sm:text-[12px]"
                        >
                            Skill matching
                        </label>
                        <select
                            id="rt-auto-match-skill-mode"
                            value={value.skill_match_mode}
                            disabled={disabled}
                            onChange={(e) =>
                                patch({
                                    skill_match_mode:
                                        e.target.value === 'same_level' ? 'same_level' : 'balanced',
                                })
                            }
                            className="w-full rounded-lg border border-[#45454a] bg-[#1b1b1e] px-3 py-2 text-xs text-[#e4e1e6] focus:border-[#c2c1ff]/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {SKILL_MATCH_MODE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}
            </div>

            <ToggleField
                checked={value.sequence}
                onChange={(checked) => patch({ sequence: checked })}
                disabled={disabled}
                layout="card"
                label="Sequence (First list, first play)"
            />

            <ToggleField
                checked={value.wl_statistics}
                onChange={(checked) => patch({ wl_statistics: checked })}
                disabled={disabled}
                layout="card"
                label="Win/Loss Statistics"
            />

            <ToggleField
                checked={value.genderless_mixed}
                onChange={(checked) => patch({ genderless_mixed: checked })}
                disabled={disabled}
                layout="card"
                label="Genderless (mixed)"
            />

            {!hasAnyCriterion ? (
                <p className="text-xs text-[#ffb4ab]">Select at least one matching criterion.</p>
            ) : null}
        </div>
    );
}
