import { useEffect, useId, useRef } from 'react';
import { MODAL_OVERLAY_CLASS, ModalPortal } from '../app/ModalPortal.jsx';
import { FacilityMatchWinnerPicker } from './FacilityMatchWinnerPicker.jsx';

/**
 * @param {{
 *   open: boolean;
 *   busy: boolean;
 *   error: string;
 *   team1Names: string[];
 *   team2Names: string[];
 *   team1Score: string;
 *   team2Score: string;
 *   finishByWinner: boolean;
 *   winningTeam: 1 | 2 | null;
 *   onTeam1Score: (value: string) => void;
 *   onTeam2Score: (value: string) => void;
 *   onFinishByWinner: (value: boolean) => void;
 *   onWinningTeam: (team: 1 | 2) => void;
 *   onCancel: () => void;
 *   onSubmit: () => void;
 * }} props
 */
export function FacilityFinishMatchModal({
    open,
    busy,
    error,
    team1Names,
    team2Names,
    team1Score,
    team2Score,
    finishByWinner,
    winningTeam,
    onTeam1Score,
    onTeam2Score,
    onFinishByWinner,
    onWinningTeam,
    onCancel,
    onSubmit,
}) {
    const titleId = useId();
    const modeLabelId = useId();
    const firstInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
    const firstWinnerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
    const team1Label = team1Names.length > 0 ? team1Names.join(' & ') : 'Team 1';
    const team2Label = team2Names.length > 0 ? team2Names.join(' & ') : 'Team 2';

    useEffect(() => {
        if (!open) return undefined;
        const timer = window.setTimeout(() => {
            if (finishByWinner) {
                firstWinnerRef.current?.focus();
            } else {
                firstInputRef.current?.focus();
            }
        }, 40);
        return () => window.clearTimeout(timer);
    }, [open, finishByWinner]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !busy) {
                onCancel();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, busy, onCancel]);

    return (
        <ModalPortal open={open}>
            <div
                className={MODAL_OVERLAY_CLASS}
                role="presentation"
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget && !busy) onCancel();
                }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    className="rt-end-match-modal-sheet w-full max-w-md rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl sm:rounded-2xl md:max-w-lg"
                >
                    <h2 id={titleId} className="text-lg font-bold text-[#e4e1e6]">
                        Finish match
                    </h2>
                    <p className="mt-2 text-sm text-[#918f9c]">
                        Saving credits session points, updates ratings, and ends this session.
                    </p>

                    <section className="mt-5" aria-labelledby={modeLabelId}>
                        <h3 id={modeLabelId} className="rt-facility-field-label mb-2">
                            How to finish
                        </h3>
                        <div
                            className="rt-finish-mode-seg"
                            role="radiogroup"
                            aria-labelledby={modeLabelId}
                        >
                            <button
                                type="button"
                                role="radio"
                                aria-checked={!finishByWinner}
                                disabled={busy}
                                onClick={() => onFinishByWinner(false)}
                                className="rt-finish-mode-seg__btn"
                            >
                                Enter score
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={finishByWinner}
                                disabled={busy}
                                onClick={() => onFinishByWinner(true)}
                                className="rt-finish-mode-seg__btn"
                            >
                                Pick winner
                            </button>
                        </div>
                    </section>

                    {finishByWinner ? (
                        <div className="mt-5">
                            <p className="mb-2 text-sm text-[#918f9c]">
                                Select the winning team. The other side is recorded as the loser. No score is saved.
                            </p>
                            <FacilityMatchWinnerPicker
                                team1Names={team1Names}
                                team2Names={team2Names}
                                selectedWinningTeam={winningTeam}
                                onSelect={onWinningTeam}
                                disabled={busy}
                                firstButtonRef={firstWinnerRef}
                            />
                        </div>
                    ) : (
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="rt-facility-field-label mb-1.5 line-clamp-2 capitalize">{team1Label}</span>
                                <input
                                    ref={firstInputRef}
                                    id="finish-team1-score"
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={team1Score}
                                    onChange={(e) => onTeam1Score(e.target.value)}
                                    className="rt-facility-field"
                                    autoComplete="off"
                                    aria-label={`Team 1 score, ${team1Label}`}
                                />
                            </label>
                            <label className="block">
                                <span className="rt-facility-field-label mb-1.5 line-clamp-2 capitalize">{team2Label}</span>
                                <input
                                    id="finish-team2-score"
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={team2Score}
                                    onChange={(e) => onTeam2Score(e.target.value)}
                                    className="rt-facility-field"
                                    autoComplete="off"
                                    aria-label={`Team 2 score, ${team2Label}`}
                                />
                            </label>
                        </div>
                    )}
                    {error ? (
                        <p className="mt-3 text-sm text-[#ffb4ab]" role="alert">
                            {error}
                        </p>
                    ) : null}
                    <div className="mt-6 flex flex-wrap justify-end gap-3">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onCancel}
                            className="rt-facility-btn rt-facility-btn-ghost min-h-11 cursor-pointer px-4"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            aria-busy={busy}
                            onClick={onSubmit}
                            className="rt-facility-btn rt-facility-btn-lavender min-h-11 cursor-pointer px-5"
                        >
                            {busy ? 'Saving…' : finishByWinner ? 'Confirm winner' : 'Save & update'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
