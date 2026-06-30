/** @typedef {import('../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria */

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

export const AUTO_MATCH_CHECKBOX_CLASS =
    'h-4 w-4 shrink-0 rounded border-[#45454a] bg-[#131316] text-[#4ce081] focus:ring-[#4ce081]/40';

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
        <div className="space-y-3">
            {showHeading ? (
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#918f9c]">Auto-Match Setup</p>
                    <p className="mt-1 text-xs text-[#918f9c]">
                        Choose how auto-generated matches pick players. Priority: Skill Level → W/L Statistics →
                        Sequence.
                    </p>
                </div>
            ) : null}

            <div className="rounded-xl border border-[#2a2a2d] bg-[#131316] p-3">
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        className={AUTO_MATCH_CHECKBOX_CLASS}
                        checked={value.skill_level}
                        disabled={disabled}
                        onChange={(e) => patch({ skill_level: e.target.checked })}
                    />
                    <span>
                        <span className="block text-sm font-semibold text-[#e4e1e6]">Skill Level</span>
                    </span>
                </label>

                {value.skill_level ? (
                    <div className="mt-3 pl-7">
                        <label
                            htmlFor="rt-auto-match-skill-mode"
                            className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#918f9c]"
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

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#2a2a2d] bg-[#131316] p-3">
                <input
                    type="checkbox"
                    className={AUTO_MATCH_CHECKBOX_CLASS}
                    checked={value.sequence}
                    disabled={disabled}
                    onChange={(e) => patch({ sequence: e.target.checked })}
                />
                <span className="text-sm font-semibold text-[#e4e1e6]">Sequence (First list, first play)</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#2a2a2d] bg-[#131316] p-3">
                <input
                    type="checkbox"
                    className={AUTO_MATCH_CHECKBOX_CLASS}
                    checked={value.wl_statistics}
                    disabled={disabled}
                    onChange={(e) => patch({ wl_statistics: e.target.checked })}
                />
                <span className="text-sm font-semibold text-[#e4e1e6]">W/L Statistics</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#2a2a2d] bg-[#131316] p-3">
                <input
                    type="checkbox"
                    className={AUTO_MATCH_CHECKBOX_CLASS}
                    checked={value.genderless_mixed}
                    disabled={disabled}
                    onChange={(e) => patch({ genderless_mixed: e.target.checked })}
                />
                <span className="text-sm font-semibold text-[#e4e1e6]">Genderless (mixed)</span>
            </label>

            {!hasAnyCriterion ? (
                <p className="text-xs text-[#ffb4ab]">Select at least one matching criterion.</p>
            ) : null}
        </div>
    );
}
