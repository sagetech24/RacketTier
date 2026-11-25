import { useMemo, useState } from 'react';
import { postPromoteQueueingSessionReserveMatch } from '../../api/queueingSession.js';
import { isOfflineStatus } from '../../lib/connection.js';
import { lineupPlayerIds } from '../../lib/queueingMatchLineup.js';
import { toast } from '../../lib/toast.js';
import { applyLocalMutation } from '../../offline/queueingMutationRouter.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { QueueingSessionMatchCard } from './QueueingSessionMatchCard.jsx';

/**
 * @param {Record<string, unknown>} row
 * @param {Array<Record<string, unknown>>} players
 */
function reservePlayersReady(row, players) {
    const ids = lineupPlayerIds(row.lineup);
    if (ids.length === 0) return false;
    const byId = new Map(players.map((p) => [Number(p.id), p]));
    return ids.every((id) => {
        const p = byId.get(Number(id));
        if (!p || p.is_removed) return false;
        return Boolean(p.is_waiting) && !p.is_playing;
    });
}

/**
 * @param {{
 *   sessionId: number,
 *   rows: Array<Record<string, unknown>>,
 *   players?: Array<Record<string, unknown>>,
 *   canManage: boolean,
 *   busy?: boolean,
 *   onPromoted: () => Promise<void> | void,
 *   onEditMatch?: (row: Record<string, unknown>) => void,
 *   onRemoveMatch?: (row: Record<string, unknown>) => void,
 *   onActionError?: (message: string) => void,
 * }} props
 */
export function QueueingSessionReserveMatchesSection({
    sessionId,
    rows,
    players = [],
    canManage,
    busy = false,
    onPromoted,
    onEditMatch,
    onRemoveMatch,
    onActionError,
}) {
    const [promotingId, setPromotingId] = useState(/** @type {number | null} */ (null));

    const sortedRows = useMemo(
        () =>
            [...rows].sort(
                (a, b) => (Number(a.match_no) || 0) - (Number(b.match_no) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0),
            ),
        [rows],
    );

    if (!canManage || sortedRows.length === 0) {
        return null;
    }

    /**
     * @param {Record<string, unknown>} row
     */
    async function handlePromote(row) {
        const matchId = Number(row.id);
        if (!Number.isFinite(matchId) || matchId <= 0) return;
        setPromotingId(matchId);
        try {
            if (isOfflineStatus() || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
                await applyLocalMutation(sessionId, 'promote_reserve_match', { match_id: matchId });
            } else {
                await postPromoteQueueingSessionReserveMatch(sessionId, matchId);
            }
            toast.success('Reserve match added to the queue.');
            await onPromoted();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Could not add reserve match to the queue.';
            onActionError?.(message);
            toast.error(message);
        } finally {
            setPromotingId(null);
        }
    }

    return (
        <section className="mt-6 space-y-3" aria-label="Reserve matches">
            <div className="flex items-center gap-2 px-0.5">
                <MaterialIcon name="event_available" className="text-[18px]! text-sky-300" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-sky-300 md:text-sm">
                    Reserve matches
                </h3>
                <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-sky-200">
                    {sortedRows.length}/4
                </span>
            </div>
            <p className="px-0.5 text-[11px] text-[#918f9c] md:text-xs">
                Pre-booked lineups (max 4). Add to queue when every player is waiting and free.
            </p>
            <ul className="grid grid-cols-2 gap-3">
                {sortedRows.map((row, index) => {
                    const ready = reservePlayersReady(row, players);
                    return (
                        <li key={String(row.id)} className="min-w-0 h-full">
                            <QueueingSessionMatchCard
                                row={row}
                                index={index}
                                variant="reserve"
                                canManageMatches={canManage}
                                busy={busy || promotingId === Number(row.id)}
                                reserveReady={ready}
                                onPromoteReserve={() => void handlePromote(row)}
                                onEditMatch={onEditMatch}
                                onRemoveMatch={onRemoveMatch}
                            />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
