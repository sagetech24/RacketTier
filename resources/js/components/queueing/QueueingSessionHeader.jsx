import { Link, useLocation } from 'react-router-dom';
import { SportIcon } from '../dashboard/SportIcon.jsx';
import { normalizedAppPath, queueingSessionNavPaths, queueingSessionTabClass } from '../../lib/queueingSessionNav.js';

/**
 * @param {{
 *   session: import('../../api/gameSession.js').GameSessionDetail,
 *   className?: string,
 *   tabSuffix?: string,
 *   canStopSession?: boolean,
 *   endSessionBusy?: boolean,
 *   onEndSessionClick?: () => void,
 * }} props
 */
export function QueueingSessionHeader({
    session,
    className = 'mb-8',
    tabSuffix = '',
    canStopSession = false,
    endSessionBusy = false,
    onEndSessionClick,
}) {
    const location = useLocation();
    const navPath = normalizedAppPath(location.pathname);
    const queueingNav = queueingSessionNavPaths(session.id);

    return (
        <article className={className}>
            <div className="mb-4 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                    <SportIcon icon={session.sport?.icon} className="text-[#4ce081]" />
                    <h1 className="mr-2 text-3xl font-extrabold leading-none tracking-tighter md:text-3xl">
                        {session.queue_name?.trim() ? (
                            session.queue_name.trim()
                        ) : (
                            <>
                                {session.sport?.name}{' '}
                                <span className="text-[#c2c1ff]">Queue</span>
                            </>
                        )}
                    </h1>
                    {session.is_active ? (
                        <span className={ session.is_active
                                ? 'capitalize rounded-full border border-[#4ce081] bg-[#4ce081]/20 px-2 py-0.5 text-xs font-bold text-[#4ce081]'
                                : 'capitalize rounded-full border border-[#4ce081] bg-[#353438] px-2 py-0.5 text-xs font-bold text-[#c8c5d2]'
                            }
                        >
                            {session.status}
                        </span>
                    ) : (
                        <span className="capitalize rounded-full bg-[#4ce081] px-2 py-0.5 text-sm font-bold text-[#1f753d]">
                            Finished
                        </span>
                    )}
                </div>
            </div>
            <p className="text-sm text-[#c8c5d2]/90 capitalize">Game Type: {session.match_type}</p>
            <p className="text-sm text-[#c8c5d2]/90 capitalize">
                Queue Master: {session.created_by?.name ?? 'Unknown'}
            </p>
            {session.win_points != null || session.loss_points != null ? (
                <p className="text-sm text-[#c8c5d2]/90">
                    Points: +{session.win_points ?? 0} win / +{session.loss_points ?? 0} loss
                </p>
            ) : null}
            <div className="mt-1 space-y-0.5 text-xs text-[#918f9c] md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-1">
                <span>Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}</span>
                <span>Ended: {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}</span>
                <span>Total Players: {session.participant_count ?? 0}</span>
                <span>Matches Played: {session.completed_matches_count ?? 0}</span>
            </div>

            <div className="mb-6 mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex w-full flex-wrap gap-2 md:gap-4">
                    <Link
                        to={queueingNav.dash}
                        className={`${queueingSessionTabClass(navPath === queueingNav.dash)} text-center text-white/70 border-white/70 md:flex-1`}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to={queueingNav.players}
                        className={`${queueingSessionTabClass(navPath === queueingNav.players)} text-center text-white/70 border-white/70 md:flex-1`}
                    >
                        Players{tabSuffix}
                    </Link>
                    <Link
                        to={queueingNav.matches}
                        className={`${queueingSessionTabClass(navPath === queueingNav.matches)} text-center text-white/70 border-white/70 md:flex-1`}
                    >
                        Matches{tabSuffix}
                    </Link>
                    {canStopSession && onEndSessionClick ? (
                        <button
                            type="button"
                            disabled={endSessionBusy}
                            onClick={onEndSessionClick}
                            className="rounded-lg border border-red-200 bg-red-400/70 px-3 py-1 text-xs font-bold text-red-200 transition-transform enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            End Session
                        </button>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
