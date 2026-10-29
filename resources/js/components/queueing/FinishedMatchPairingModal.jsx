import { useEffect, useMemo, useState } from 'react';
import { MODAL_OVERLAY_SHEET_CLASS, ModalPortal } from '../app/ModalPortal.jsx';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { lineupToTeams } from '../../lib/queueingMatchLineup.js';
import { DraggableMatchLineup } from './DraggableMatchLineup.jsx';

/**
 * @param {unknown} lineup
 * @returns {Map<number, { id: number, name: string, is_guest?: boolean }>}
 */
function playersFromFinishedLineup(lineup) {
    /** @type {Map<number, { id: number, name: string, is_guest?: boolean }>} */
    const map = new Map();
    const rows = Array.isArray(lineup) ? lineup : [];
    for (const row of rows) {
        const id = Number(row.game_session_player_id ?? row.id ?? 0);
        if (id <= 0) continue;
        const name = String(row.name || row.guest_name || 'Player');
        map.set(id, {
            id,
            name,
            is_guest: row.user_id == null && Boolean(row.guest_name),
        });
    }
    return map;
}

/**
 * @param {{
 *   open: boolean,
 *   match: Record<string, unknown> | null,
 *   matchType: 'singles' | 'doubles',
 *   busy?: boolean,
 *   onClose: () => void,
 *   onSave: (lineup: Array<{ id: number, team: number }>) => Promise<void>,
 * }} props
 */
export function FinishedMatchPairingModal({
    open,
    match,
    matchType,
    busy = false,
    onClose,
    onSave,
}) {
    const [teams, setTeams] = useState({ team1: /** @type {number[]} */ ([]), team2: /** @type {number[]} */ ([]) });
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (!open || !match) return;
        setTeams(lineupToTeams(match.lineup));
        setSaveError('');
    }, [open, match]);

    const playerMap = useMemo(() => playersFromFinishedLineup(match?.lineup), [match]);

    const team1Players = teams.team1.map((id) => playerMap.get(id)).filter(Boolean);
    const team2Players = teams.team2.map((id) => playerMap.get(id)).filter(Boolean);

    const required = matchType === 'doubles' ? 4 : 2;
    const assignedCount = teams.team1.length + teams.team2.length;
    const canSave =
        assignedCount === required
        && (matchType === 'doubles'
            ? teams.team1.length === 2 && teams.team2.length === 2
            : teams.team1.length === 1 && teams.team2.length === 1);

    if (!open || !match) return null;

    async function handleSave() {
        if (!canSave || busy) return;
        setSaveError('');
        /** @type {Array<{ id: number, team: number }>} */
        const lineup = [
            ...teams.team1.map((id) => ({ id, team: /** @type {1} */ (1) })),
            ...teams.team2.map((id) => ({ id, team: /** @type {2} */ (2) })),
        ];
        try {
            await onSave(lineup);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Could not save pairing.');
        }
    }

    return (
        <ModalPortal open={open}>
            <div className={MODAL_OVERLAY_SHEET_CLASS} role="presentation">
                <button
                    type="button"
                    className="absolute inset-0 cursor-pointer"
                    aria-label="Close pairing override"
                    onClick={onClose}
                    disabled={busy}
                />
                <div
                    className="rt-end-match-modal-sheet relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:rounded-2xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-finished-pairing-title"
                >
                    <div className="shrink-0 border-b border-white/5 px-5 pb-4 pt-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[#4ce081]">
                                    Override finished match
                                </p>
                                <h3
                                    id="rt-finished-pairing-title"
                                    className="mt-1 text-lg font-bold tracking-tight text-[#e4e1e6]"
                                >
                                    Update pairing
                                    {match.match_no != null ? ` #${match.match_no}` : ''}
                                </h3>
                                <p className="mt-1 text-sm text-[#918f9c]">
                                    Drag players between teams. Same players only — winner stays Team{' '}
                                    {match.winning_team === 1 || match.winning_team === 2
                                        ? match.winning_team
                                        : '—'}
                                    .
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={busy}
                                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 text-[#c8c5d2] transition-colors duration-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60 disabled:opacity-50"
                                aria-label="Close"
                            >
                                <MaterialIcon name="close" className="text-xl!" />
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                        <DraggableMatchLineup
                            matchType={matchType}
                            team1={team1Players}
                            team2={team2Players}
                            disabled={busy}
                            onRemove={null}
                            showSkillLevel={false}
                            onChange={setTeams}
                        />
                        {saveError ? (
                            <p className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                                {saveError}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2 border-t border-[#2a2a2d] p-5 pt-4">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onClose}
                            className="min-h-11 flex-1 cursor-pointer rounded-lg border border-white/20 py-2.5 text-sm font-bold text-white/70 transition-colors duration-200 hover:bg-white/5 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={busy || !canSave}
                            onClick={() => void handleSave()}
                            className="inline-flex min-h-11 flex-[1.4] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#4ce081] py-2.5 text-sm font-bold text-[#003919] transition-opacity duration-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy ? 'Saving…' : 'Save pairing'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
