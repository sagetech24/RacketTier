import { useEffect, useState } from 'react';

/** @typedef {import('../../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria */

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
        label: 'Balance the matches (High + low level)',
    },
    {
        value: 'same_level',
        label: 'Do not balance the matches (High vs high, Intermediate vs Intermediate, Starter vs Starter, etc.)',
    },
];

const CHECKBOX_CLASS =
    'h-4 w-4 shrink-0 rounded border-[#45454a] bg-[#131316] text-[#4ce081] focus:ring-[#4ce081]/40';

/**
 * @param {{
 *   open: boolean,
 *   initialCriteria?: AutoMatchCriteria,
 *   onClose: () => void,
 *   onConfirm: (criteria: AutoMatchCriteria) => void,
 * }} props
 */
export function AutoMatchCriteriaModal({ open, initialCriteria, onClose, onConfirm }) {
    const [skillLevel, setSkillLevel] = useState(true);
    const [skillMatchMode, setSkillMatchMode] = useState('balanced');
    const [wlStatistics, setWlStatistics] = useState(true);
    const [sequence, setSequence] = useState(true);
    const [genderlessMixed, setGenderlessMixed] = useState(true);

    useEffect(() => {
        if (!open) return;
        const c = initialCriteria ?? DEFAULT_AUTO_MATCH_CRITERIA;
        setSkillLevel(Boolean(c.skill_level));
        setSkillMatchMode(c.skill_match_mode === 'same_level' ? 'same_level' : 'balanced');
        setWlStatistics(Boolean(c.wl_statistics));
        setSequence(Boolean(c.sequence));
        setGenderlessMixed(Boolean(c.genderless_mixed));
    }, [open, initialCriteria]);

    if (!open) return null;

    const hasAnyCriterion = skillLevel || wlStatistics || sequence || genderlessMixed;

    function handleConfirm() {
        onConfirm({
            skill_level: skillLevel,
            skill_match_mode: skillLevel && skillMatchMode === 'same_level' ? 'same_level' : 'balanced',
            wl_statistics: wlStatistics,
            sequence,
            genderless_mixed: genderlessMixed,
        });
    }

    return (
        <div className="rt-end-match-modal-overlay fixed inset-0 z-[100] flex items-end justify-center pt-10 sm:items-center">
            <div className="rt-end-match-modal-sheet w-full max-w-md rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl sm:rounded-2xl">
                <h3 className="text-lg font-bold text-[#e4e1e6]">Auto-Match Setup</h3>
                <p className="mt-1 text-xs text-[#918f9c]">
                    Choose matching criteria. Priority order: Skill Level → W/L Statistics → Sequence.
                </p>

                <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-[#2a2a2d] bg-[#131316] p-3">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                className={CHECKBOX_CLASS}
                                checked={skillLevel}
                                onChange={(e) => setSkillLevel(e.target.checked)}
                            />
                            <span>
                                <span className="block text-sm font-semibold text-[#e4e1e6]">Skill Level</span>
                            </span>
                        </label>

                        {skillLevel ? (
                            <div className="mt-3 pl-7">
                                <label htmlFor="rt-auto-match-skill-mode" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#918f9c]">
                                    Skill matching
                                </label>
                                <select
                                    id="rt-auto-match-skill-mode"
                                    value={skillMatchMode}
                                    onChange={(e) => setSkillMatchMode(e.target.value)}
                                    className="w-full rounded-lg border border-[#45454a] bg-[#1b1b1e] px-3 py-2 text-xs text-[#e4e1e6] focus:border-[#c2c1ff]/50 focus:outline-none"
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
                            className={CHECKBOX_CLASS}
                            checked={sequence}
                            onChange={(e) => setSequence(e.target.checked)}
                        />
                        <span className="text-sm font-semibold text-[#e4e1e6]">Sequence (First list, first play)</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#2a2a2d] bg-[#131316] p-3">
                        <input
                            type="checkbox"
                            className={CHECKBOX_CLASS}
                            checked={wlStatistics}
                            onChange={(e) => setWlStatistics(e.target.checked)}
                        />
                        <span className="text-sm font-semibold text-[#e4e1e6]">W/L Statistics</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#2a2a2d] bg-[#131316] p-3">
                        <input
                            type="checkbox"
                            className={CHECKBOX_CLASS}
                            checked={genderlessMixed}
                            onChange={(e) => setGenderlessMixed(e.target.checked)}
                        />
                        <span className="text-sm font-semibold text-[#e4e1e6]">Genderless (mixed)</span>
                    </label>
                </div>

                {!hasAnyCriterion ? (
                    <p className="mt-3 text-xs text-[#ffb4ab]">Select at least one matching criterion.</p>
                ) : null}

                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!hasAnyCriterion}
                        onClick={handleConfirm}
                        className="flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}

export function autoMatchCriteriaStorageKey(sessionId) {
    return `rt-auto-match-criteria:${sessionId}`;
}

/**
 * @param {number|string} sessionId
 * @returns {AutoMatchCriteria}
 */
export function loadAutoMatchCriteria(sessionId) {
    try {
        const raw = sessionStorage.getItem(autoMatchCriteriaStorageKey(sessionId));
        if (!raw) return { ...DEFAULT_AUTO_MATCH_CRITERIA };
        const parsed = JSON.parse(raw);
        return {
            skill_level: parsed.skill_level !== false,
            skill_match_mode: parsed.skill_match_mode === 'same_level' ? 'same_level' : 'balanced',
            wl_statistics: parsed.wl_statistics !== false,
            sequence: parsed.sequence !== false,
            genderless_mixed: parsed.genderless_mixed !== false,
        };
    } catch {
        return { ...DEFAULT_AUTO_MATCH_CRITERIA };
    }
}

/**
 * @param {number|string} sessionId
 * @param {AutoMatchCriteria} criteria
 */
export function saveAutoMatchCriteria(sessionId, criteria) {
    sessionStorage.setItem(autoMatchCriteriaStorageKey(sessionId), JSON.stringify(criteria));
}
