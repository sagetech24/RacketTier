import { useState } from 'react';
import { SportIcon } from '../dashboard/SportIcon.jsx';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { queueSessionCardActionClass } from '../../lib/queueingSessionNav.js';
import { QueueingSessionNav } from './QueueingSessionNav.jsx';
import { QueueingSessionSettingsModal } from './QueueingSessionSettingsModal.jsx';
import { matchPointFormulaLabel } from '../../lib/matchPointFormula.js';

/**
 * @param {{
 *   session: import('../../api/gameSession.js').GameSessionDetail,
 *   className?: string,
 *   tabSuffix?: string,
 * }} props
 */
export function QueueingSessionHeader({
    session,
    className = 'mb-8',
    tabSuffix = '',
}) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const canEditQueue = Boolean(session.can_manage) && Boolean(session.is_active);
    const checkInWaitingCount = Array.isArray(session.players)
        ? session.players.filter((p) => {
              if (p.is_removed || p.is_playing || !p.is_waiting) return false;
              if (p.in_lobby != null) return Boolean(p.in_lobby);
              return ((p.wins_count ?? 0) + (p.losses_count ?? 0)) === 0;
          }).length
        : 0;

    return (
        <article className={className}>
            <div className="mb-4 flex flex-col gap-2">
                <div className="flex items-start gap-2 justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                        <SportIcon icon={session.sport?.icon} className="text-[#4ce081]" />
                        <h1 className="mr-2 text-3xl font-extrabold leading-none tracking-tighter md:text-4xl capitalize">
                            {session.queue_name?.trim() ? (
                                session.queue_name.trim()
                            ) : (
                                <>
                                    {session.sport?.name}{' '}
                                    <span className="text-[#c2c1ff]">Queue</span>
                                </>
                            )}
                        </h1>
                    </div>
                    <div className="flex sm:flex-row md:flex-row flex-col shrink-0 items-center gap-2">
                        {session.is_active ? (
                            <span className="rt-queue-status--active capitalize rounded-full bg-[#4ce081] text-green-800 border border-[#4ce081] px-2 py-0.5 text-sm font-bold">
                                {session.status}
                            </span>
                        ) : (
                            <span className="capitalize rounded-full bg-[#4ce081] px-2 py-0.5 text-sm font-bold text-[#1f753d]">
                                Finished
                            </span>
                        )}
                        {canEditQueue ? (
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(true)}
                                className={`${queueSessionCardActionClass('edit')} rt-qs-header-edit px-3 py-1 rounded-full`}
                                aria-haspopup="dialog"
                                aria-expanded={settingsOpen}
                            >
                                <MaterialIcon name="edit" className="rt-queue-card-btn__icon" />
                                <span>Edit</span>
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
            <div className="mt-4 mb-10 flex flex-col gap-2 md:gap-4 lg:gap-6 md:flex-row">
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm text-[#c8c5d2]/90 capitalize">
                        <span className="font-bold">Game Type:</span> {session.match_type}
                    </p>
                    <p className="text-sm text-[#c8c5d2]/90 capitalize">
                        <span className="font-bold">Queue Master:</span> {session.created_by?.name ?? 'Unknown'}
                    </p>
                    <p className="text-sm text-[#c8c5d2]/90">
                        <span className="font-bold">Points:</span> {matchPointFormulaLabel()}
                    </p>
                    {/* <p className="text-sm text-[#c8c5d2]/90">
                        <span className="font-bold">ELO &amp; rank:</span> members vs members only
                    </p> */}
                </div>
                <div className="space-y-1 flex-1">
                    <p className="text-sm text-[#c8c5d2]/90">
                        <span className="font-bold">Started:</span> {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}
                    </p>
                    {!session.is_active ? (
                        <p className="text-sm text-[#c8c5d2]/90">
                            <span className="font-bold">Ended:</span> {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}
                        </p>
                    ) : null}
                    <p className="text-sm text-[#c8c5d2]/90">
                        <span className="font-bold">Total Players:</span> {session.participant_count ?? 0}
                    </p>
                    {session.is_active && checkInWaitingCount > 0 ? (
                        <p className="text-sm text-[#38bdf8]">
                            <span className="font-bold">Check-in waiting:</span> {checkInWaitingCount}
                        </p>
                    ) : null}
                    <p className="text-sm text-[#c8c5d2]/90">
                        <span className="font-bold">Matches Played:</span> {session.completed_matches_count ?? 0}
                    </p>
                </div>
            </div>

            <QueueingSessionNav sessionId={session.id} tabSuffix={tabSuffix} />

            {canEditQueue ? (
                <QueueingSessionSettingsModal
                    open={settingsOpen}
                    session={session}
                    onClose={() => setSettingsOpen(false)}
                />
            ) : null}
        </article>
    );
}
