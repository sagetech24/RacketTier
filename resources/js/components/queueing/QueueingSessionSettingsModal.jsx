import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { patchUpdateQueueingSession } from '../../api/queueingSession.js';
import { queryKeys } from '../../lib/queryClient.js';
import { MODAL_OVERLAY_SHEET_CLASS, ModalPortal } from '../app/ModalPortal.jsx';
import { QueueingSessionGuestOptionalFields } from './QueueingSessionGuestOptionalFields.jsx';
import {
    QueueingSessionAutoMatchCriteriaField,
    autoMatchCriteriaHasAny,
    normalizeAutoMatchCriteria,
    parseAutoMatchCriteria,
} from './QueueingSessionAutoMatchCriteriaField.jsx';
import { QueueingSessionSkipScoresField } from './QueueingSessionSkipScoresField.jsx';

/**
 * @param {{
 *   open: boolean,
 *   session: import('../../api/gameSession.js').GameSessionDetail | null,
 *   onClose: () => void,
 *   onSaved?: (updated: import('../../api/gameSession.js').GameSessionDetail) => void,
 * }} props
 */
export function QueueingSessionSettingsModal({ open, session, onClose, onSaved }) {
    const queryClient = useQueryClient();
    const [queueName, setQueueName] = useState('');
    const [winPoints, setWinPoints] = useState('30');
    const [lossPoints, setLossPoints] = useState('8');
    const [skipScores, setSkipScores] = useState(false);
    const [optionalGuestSkill, setOptionalGuestSkill] = useState(true);
    const [optionalGuestGender, setOptionalGuestGender] = useState(true);
    const [autoMatchCriteria, setAutoMatchCriteria] = useState(
        parseAutoMatchCriteria(null),
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !session) return;

        setQueueName(session.queue_name?.trim() ?? '');
        setWinPoints(String(session.win_points ?? 30));
        setLossPoints(String(session.loss_points ?? 8));
        setSkipScores(Boolean(session.skip_scores));
        setOptionalGuestSkill(session.optional_guest_skill !== false);
        setOptionalGuestGender(session.optional_guest_gender !== false);
        setAutoMatchCriteria(parseAutoMatchCriteria(session.auto_match_criteria));
        setError('');
    }, [open, session]);

    async function handleSave() {
        if (!session) return;

        const w = Number.parseInt(winPoints, 10);
        const l = Number.parseInt(lossPoints, 10);
        const name = queueName.trim();

        if (!name) {
            setError('Enter a name for this queue.');
            return;
        }
        if (!Number.isFinite(w) || w < 0 || !Number.isFinite(l) || l < 0) {
            setError('Enter valid point numbers.');
            return;
        }
        if (!autoMatchCriteriaHasAny(autoMatchCriteria)) {
            setError('Select at least one auto-match criterion.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const normalizedCriteria = normalizeAutoMatchCriteria(autoMatchCriteria);
            const updated = await patchUpdateQueueingSession(session.id, {
                queue_name: name,
                win_points: w,
                loss_points: l,
                skip_scores: skipScores,
                optional_guest_skill: optionalGuestSkill,
                optional_guest_gender: optionalGuestGender,
                ...normalizedCriteria,
            });

            queryClient.setQueryData(queryKeys.queueingSession(updated.id), updated);
            queryClient.invalidateQueries({ queryKey: queryKeys.queueingSession(updated.id) });
            onSaved?.(updated);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not update session.');
        } finally {
            setSubmitting(false);
        }
    }

    if (!open || !session) return null;

    return (
        <ModalPortal open={open}>
            <div className={MODAL_OVERLAY_SHEET_CLASS} role="presentation">
                <div
                    className="rt-end-match-modal-sheet relative flex max-h-[min(90dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:rounded-2xl md:max-w-lg"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-queue-title"
                >
                    <div className="shrink-0 border-b border-white/5 px-5 pb-3 pt-5">
                        <h2 id="edit-queue-title" className="text-lg font-bold tracking-tight text-[#e4e1e6]">
                            Queue settings
                        </h2>
                        <p className="mt-1 text-xs text-[#918f9c]">
                            Update settings for {session.queue_name?.trim() || `session #${session.id}`}.
                        </p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="edit-queue-name"
                                    className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]"
                                >
                                    Name of the queue
                                </label>
                                <input
                                    id="edit-queue-name"
                                    type="text"
                                    value={queueName}
                                    onChange={(e) => setQueueName(e.target.value)}
                                    maxLength={120}
                                    autoComplete="off"
                                    disabled={submitting}
                                    className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm text-[#e4e1e6] disabled:opacity-60"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                        Win points
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={9999}
                                        value={winPoints}
                                        onChange={(e) => setWinPoints(e.target.value)}
                                        disabled={submitting}
                                        className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm text-[#e4e1e6] disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                                        Loss points
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={9999}
                                        value={lossPoints}
                                        onChange={(e) => setLossPoints(e.target.value)}
                                        disabled={submitting}
                                        className="w-full rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-2.5 text-sm text-[#e4e1e6] disabled:opacity-60"
                                    />
                                </div>
                            </div>
                            <QueueingSessionSkipScoresField
                                checked={skipScores}
                                onChange={setSkipScores}
                                disabled={submitting}
                            />
                            <QueueingSessionGuestOptionalFields
                                optionalGuestSkill={optionalGuestSkill}
                                optionalGuestGender={optionalGuestGender}
                                onOptionalGuestSkillChange={setOptionalGuestSkill}
                                onOptionalGuestGenderChange={setOptionalGuestGender}
                                disabled={submitting}
                            />
                            <QueueingSessionAutoMatchCriteriaField
                                value={autoMatchCriteria}
                                onChange={setAutoMatchCriteria}
                                disabled={submitting}
                            />
                            {error ? (
                                <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                                    {error}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2 border-t border-[#2a2a2d] p-5 pt-4">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="min-h-11 flex-1 rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleSave()}
                            className="min-h-11 flex-1 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] disabled:opacity-50"
                        >
                            {submitting ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
