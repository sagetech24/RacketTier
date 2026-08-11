import { Link } from 'react-router-dom';
import { SportIcon } from '../dashboard/SportIcon.jsx';
import { facilitySessionListStatus, formatGameTypeLabel, matchTypeLabel } from '../../lib/facilityGameRoomUi.js';

/**
 * @param {{
 *   session: import('../../api/gameSession.js').GameSessionDetail;
 *   href: string;
 *   variant?: 'active' | 'finished';
 * }} props
 */
export function FacilityGameRoomSessionCard({ session, href, variant = 'active' }) {
    const statusMeta = facilitySessionListStatus(session);
    const sportName = session.sport?.name ?? 'Session';
    const typeLabel = matchTypeLabel(session.match_type);
    const gameType = formatGameTypeLabel(session.game_type) || session.game_type;
    const participantNote =
        typeof session.participant_count === 'number'
            ? `${session.participant_count} player${session.participant_count === 1 ? '' : 's'}`
            : null;
    const isLive = session.is_active && session.status === 'ongoing';
    const last = session.last_match;
    const hasScore = last?.team1_score != null && last?.team2_score != null;
    const playerNames = (last?.players ?? [])
        .map((p) => p.name)
        .filter(Boolean)
        .slice(0, 4);
    const extraPlayers = (last?.players?.length ?? 0) > 4 ? ' · …' : '';
    const winnerNames =
        last?.winning_team != null
            ? (last.players ?? [])
                  .filter((p) => p.team === last.winning_team || p.won)
                  .map((p) => p.name)
                  .filter(Boolean)
            : [];

    const meta = [session.court_preference, gameType, participantNote].filter(Boolean).join(' · ');

    const cardClass = [
        'rt-game-room-session-card',
        isLive ? 'rt-game-room-session-card--live' : '',
        variant === 'finished' ? 'rt-game-room-session-card--finished' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <Link
            to={href}
            className={cardClass}
            aria-label={`${sportName} ${typeLabel} ${statusMeta.label}, open session`}
        >
            <div className="shrink-0">
                <SportIcon
                    icon={session.sport?.icon ?? 'tennis.png'}
                    imgClassName="h-9 w-9 object-contain"
                    materialClassName="text-3xl text-[#c2c1ff]"
                />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 text-sm font-bold text-[#e4e1e6]">
                        {[sportName, typeLabel].filter(Boolean).join(' · ')}
                    </p>
                    {session.is_host ? (
                        <span className="shrink-0 rounded-full border border-[#4ce081]/30 bg-[#4ce081]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4ce081]">
                            You host
                        </span>
                    ) : null}
                </div>
                {meta ? <p className="mt-1 text-xs leading-relaxed text-[#918f9c]">{meta}</p> : null}
                {variant === 'finished' && (hasScore || last?.winning_team != null) ? (
                    <p className="mt-1 text-sm font-extrabold tabular-nums text-[#e4e1e6]">
                        {hasScore ? (
                            <>
                                {last.team1_score}
                                <span className="mx-1 font-semibold text-[#918f9c]">–</span>
                                {last.team2_score}
                            </>
                        ) : null}
                        {winnerNames.length > 0 ? (
                            <span className={`${hasScore ? 'ml-2' : ''} text-xs font-semibold text-[#4ce081]`}>
                                {winnerNames.join(' & ')}
                            </span>
                        ) : last.winning_team != null ? (
                            <span className={`${hasScore ? 'ml-2' : ''} text-xs font-semibold text-[#4ce081]`}>
                                Team {last.winning_team}
                            </span>
                        ) : null}
                    </p>
                ) : null}
                {variant === 'finished' && playerNames.length > 0 ? (
                    <p className="mt-0.5 truncate text-xs text-[#c8c5d2]">
                        {playerNames.join(' · ')}
                        {extraPlayers}
                    </p>
                ) : null}
            </div>
            <span className={`${statusMeta.pillClass} shrink-0`}>
                <span className="rt-match-status-dot" aria-hidden />
                {statusMeta.label}
            </span>
        </Link>
    );
}
