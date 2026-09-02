import { playerInitials } from '../ranking/rankingUtils.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { QueueingSessionLeaderboardStats } from './QueueingSessionLeaderboardStats.jsx';
import { PlayerSkillLevelBadge } from './PlayerSkillLevelBadge.jsx';

/**
 * @param {string} name
 */
export function rosterDisplayName(name) {
    return name?.trim() || 'Player';
}

/**
 * @param {NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number]} p
 */
export function rosterPlayerName(p) {
    if (p.is_guest) return rosterDisplayName(p.guest_name || 'Guest');
    return rosterDisplayName(p.user?.name || 'Player');
}

/**
 * @param {NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number]} p
 * @param {Set<number>} reservedPlayerIds
 * @param {boolean} sessionActive
 */
export function playerRosterStatus(p, reservedPlayerIds, sessionActive) {
    if (!sessionActive) {
        return null;
    }
    if (p.is_playing) {
        return { key: 'playing', label: 'Playing', className: 'rt-roster-status--playing' };
    }
    if (reservedPlayerIds.has(p.id)) {
        return { key: 'queueing', label: 'Queueing', className: 'rt-roster-status--queueing' };
    }
    return { key: 'waiting', label: 'Waiting', className: 'rt-roster-status--waiting' };
}

/** @param {{ status: { key: string, label: string, className: string } | null }} props */
function PlayerStatusBadge({ status }) {
    if (!status) return null;
    return (
        <span className={['rt-roster-status-pill', status.className].join(' ')}>
            <span className="rt-roster-status-dot" aria-hidden />
            {status.label}
        </span>
    );
}

/**
 * @param {{
 *   player: NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number];
 *   status: ReturnType<typeof playerRosterStatus>;
 *   position?: number | null;
 *   sessionActive?: boolean;
 *   isYou?: boolean;
 *   canEdit?: boolean;
 *   busy?: boolean;
 *   showSkillLevel?: boolean;
 *   style?: import('react').CSSProperties;
 *   onEdit?: () => void;
 *   onRemove?: () => void;
 * }} props
 */
export function QueueingSessionPlayerCard({
    player: p,
    status,
    position = null,
    sessionActive = false,
    isYou = false,
    canEdit = false,
    busy = false,
    showSkillLevel = true,
    style,
    onEdit,
    onRemove,
}) {
    const name = rosterPlayerName(p);
    const wins = p.wins_count ?? 0;
    const losses = p.losses_count ?? 0;
    const points = p.session_points ?? 0;
    const isPlaying = Boolean(sessionActive && p.is_playing);

    const cardClass = [
        'rt-roster-player-card',
        isPlaying ? 'rt-roster-player-card--playing' : '',
        status?.key === 'queueing' ? 'rt-roster-player-card--queueing' : '',
        isYou ? 'rt-roster-player-card--you' : '',
        canEdit ? 'rt-roster-player-card--editable' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const handleCardActivate = () => {
        if (canEdit && !busy && onEdit) onEdit();
    };

    return (
        <article
            className={cardClass}
            style={style}
            role={canEdit ? 'button' : undefined}
            tabIndex={canEdit && !busy ? 0 : undefined}
            onClick={canEdit && !busy ? handleCardActivate : undefined}
            onKeyDown={(e) => {
                if (!canEdit || busy) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardActivate();
                }
            }}
            aria-label={canEdit ? `Edit ${name}` : position != null ? `${position}. ${name}` : undefined}
        >
            <div className="rt-roster-player-card-inner">
                {position != null ? (
                    <div className="rt-roster-player-position" aria-hidden>
                        <span className="text-xl font-extrabold italic tabular-nums sm:text-2xl">
                            {position}
                        </span>
                    </div>
                ) : null}

                <div className="rt-roster-player-main">
                    <div
                        className={[
                            'rt-ranking-avatar rt-roster-player-avatar size-11 text-sm sm:size-12 sm:text-base',
                            isPlaying ? 'rt-roster-player-avatar--playing' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        aria-hidden
                    >
                        {playerInitials(name)}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-base font-bold capitalize leading-tight text-[#e4e1e6] md:text-lg">
                                    {name}
                                    {p.pronoun ? (
                                        <span className="ml-1.5 text-xs font-medium normal-case text-[#c2c1ff]/80">
                                            {p.pronoun}
                                        </span>
                                    ) : null}
                                </h3>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    {showSkillLevel ? (
                                        <PlayerSkillLevelBadge skillLevel={p.skill_level} />
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 border-t border-white/5 pt-2.5">
                            <QueueingSessionLeaderboardStats
                                wins={wins}
                                losses={losses}
                                total_matches={wins + losses}
                                earned_points={points}
                                omitPoints
                                compact
                            />
                        </div>
                    </div>
                </div>

                <div className="rt-roster-player-aside">
                    <div className="rt-roster-player-points hidden sm:block">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Points</span>
                        <span className="text-2xl font-extrabold tabular-nums italic leading-none text-[#c2c1ff]">
                            {points}
                        </span>
                    </div>

                    {canEdit ? (
                        <div className="rt-roster-player-actions">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit?.();
                                }}
                                className="rt-roster-player-action rt-roster-player-action--edit"
                                aria-label={`Edit ${name}`}
                            >
                                <MaterialIcon name="edit" className="text-[17px]!" />
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove?.();
                                }}
                                className="rt-roster-player-action rt-roster-player-action--remove"
                                aria-label={`Remove ${name}`}
                            >
                                <MaterialIcon name="person_remove" className="text-[17px]!" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
