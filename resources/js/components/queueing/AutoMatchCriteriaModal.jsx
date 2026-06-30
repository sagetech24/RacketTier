import { useEffect, useState } from 'react';
import {
    DEFAULT_AUTO_MATCH_CRITERIA,
    QueueingSessionAutoMatchCriteriaField,
    autoMatchCriteriaHasAny,
    normalizeAutoMatchCriteria,
    parseAutoMatchCriteria,
} from './QueueingSessionAutoMatchCriteriaField.jsx';

/** @typedef {import('../../api/queueingSession.js').AutoMatchCriteria} AutoMatchCriteria */

export { DEFAULT_AUTO_MATCH_CRITERIA, parseAutoMatchCriteria };

/**
 * @param {{
 *   open: boolean,
 *   initialCriteria?: AutoMatchCriteria,
 *   onClose: () => void,
 *   onConfirm: (criteria: AutoMatchCriteria) => void,
 * }} props
 */
export function AutoMatchCriteriaModal({ open, initialCriteria, onClose, onConfirm }) {
    const [criteria, setCriteria] = useState(DEFAULT_AUTO_MATCH_CRITERIA);

    useEffect(() => {
        if (!open) return;
        setCriteria(parseAutoMatchCriteria(initialCriteria));
    }, [open, initialCriteria]);

    if (!open) return null;

    const hasAnyCriterion = autoMatchCriteriaHasAny(criteria);

    function handleConfirm() {
        onConfirm(normalizeAutoMatchCriteria(criteria));
    }

    return (
        <div className="rt-end-match-modal-overlay fixed inset-0 z-[100] flex items-end justify-center pt-10 sm:items-center">
            <div className="rt-end-match-modal-sheet w-full max-w-md rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl sm:rounded-2xl">
                <h3 className="text-lg font-bold text-[#e4e1e6]">Auto-Match Setup</h3>
                <p className="mt-1 text-xs text-[#918f9c]">
                    Choose matching criteria. Priority order: Skill Level → W/L Statistics → Sequence.
                </p>

                <div className="mt-4">
                    <QueueingSessionAutoMatchCriteriaField
                        value={criteria}
                        onChange={setCriteria}
                        showHeading={false}
                    />
                </div>

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
