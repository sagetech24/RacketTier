import { useEffect, useState } from 'react';
import { MODAL_OVERLAY_SHEET_CLASS, ModalPortal } from '../app/ModalPortal.jsx';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { AutoMatchWizardSteps } from './AutoMatchWizardSteps.jsx';
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
 *   confirmLabel?: string,
 * }} props
 */
export function AutoMatchCriteriaModal({
    open,
    initialCriteria,
    onClose,
    onConfirm,
    confirmLabel = 'Generate suggestions',
}) {
    const [criteria, setCriteria] = useState(DEFAULT_AUTO_MATCH_CRITERIA);

    useEffect(() => {
        if (!open) return;
        setCriteria(parseAutoMatchCriteria(initialCriteria));
    }, [open, initialCriteria]);

    useEffect(() => {
        if (!open) return undefined;

        function onKeyDown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                const next = normalizeAutoMatchCriteria(criteria);
                if (!autoMatchCriteriaHasAny(next)) return;
                event.preventDefault();
                onConfirm(next);
            }
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose, onConfirm, criteria]);

    if (!open) return null;

    const hasAnyCriterion = autoMatchCriteriaHasAny(criteria);

    function handleConfirm() {
        if (!hasAnyCriterion) return;
        onConfirm(normalizeAutoMatchCriteria(criteria));
    }

    return (
        <ModalPortal open={open}>
            <div className={MODAL_OVERLAY_SHEET_CLASS} role="presentation">
                <button
                    type="button"
                    className="absolute inset-0 cursor-pointer"
                    aria-label="Close auto-match setup"
                    onClick={onClose}
                />
                <div
                    className="rt-end-match-modal-sheet relative flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:rounded-2xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-auto-match-criteria-title"
                >
                    <div className="shrink-0 border-b border-white/5 px-5 pb-4 pt-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[#4ce081]">
                                    Auto-generate matches
                                </p>
                                <h3
                                    id="rt-auto-match-criteria-title"
                                    className="mt-1 text-lg font-bold tracking-tight text-[#e4e1e6]"
                                >
                                    Choose matching criteria
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 text-[#c8c5d2] transition-colors duration-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                                aria-label="Close"
                            >
                                <MaterialIcon name="close" className="text-xl!" />
                            </button>
                        </div>

                        <div className="mt-4">
                            <AutoMatchWizardSteps active="criteria" />
                        </div>

                        <p className="mt-1 text-sm text-[#918f9c]">
                            Tap criteria to include them. Presets are a fast starting point — tweak anytime.
                        </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                        <QueueingSessionAutoMatchCriteriaField
                            value={criteria}
                            onChange={setCriteria}
                            showHeading={false}
                            showPresets
                        />
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 border-t border-[#2a2a2d] p-5 pt-4">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="min-h-11 flex-1 cursor-pointer rounded-lg border border-white/20 py-2.5 text-sm font-bold text-white/70 transition-colors duration-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!hasAnyCriterion}
                                onClick={handleConfirm}
                                className="inline-flex min-h-11 flex-[1.4] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] transition-opacity duration-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ce081]/70"
                            >
                                <span>{confirmLabel}</span>
                                <MaterialIcon name="arrow_forward" className="text-lg!" />
                            </button>
                        </div>
                        <p className="text-center text-[11px] text-[#918f9c]">
                            Tip: press ⌘ Enter / Ctrl Enter to continue
                        </p>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
