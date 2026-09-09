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
 */
export function playerIsInLobby(p) {
    if (p.in_lobby != null) {
        return Boolean(p.in_lobby);
    }
    if (p.is_removed || p.is_playing || !p.is_waiting) {
        return false;
    }
    return ((p.wins_count ?? 0) + (p.losses_count ?? 0)) === 0;
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
    if (playerIsInLobby(p)) {
        return { key: 'check_in', label: 'Check-in', className: 'rt-roster-status--check-in' };
    }
    return { key: 'waiting', label: 'Waiting', className: 'rt-roster-status--waiting' };
}

/**
 * Guests can be removed whenever they are not on court.
 * Members can be removed only from the check-in lobby (waiting for first match).
 *
 * @param {NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number]} p
 * @param {Set<number>} reservedPlayerIds
 * @param {boolean} sessionActive
 * @param {boolean} canManage
 */
export function playerCanBeRemovedFromRoster(p, reservedPlayerIds, sessionActive, canManage) {
    if (!canManage || !sessionActive || p.is_playing) {
        return false;
    }
    if (p.is_guest) {
        return true;
    }
    return playerRosterStatus(p, reservedPlayerIds, sessionActive)?.key === 'check_in';
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
 *   canRemove?: boolean;
 *   busy?: boolean;
 *   showSkillLevel?: boolean;
 *   sortable?: boolean;
 *   isDragging?: boolean;
 *   dragRef?: ((node: HTMLElement | null) => void) | null;
 *   dragProps?: Record<string, unknown>;
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
    canRemove = false,
    busy = false,
    showSkillLevel = true,
    sortable = false,
    isDragging = false,
    dragRef = null,
    dragProps = {},
    style,
    onEdit,
    onRemove,
}) {
    const name = rosterPlayerName(p);
    const wins = p.wins_count ?? 0;
    const losses = p.losses_count ?? 0;
    const points = p.session_points ?? 0;
    const isPlaying = Boolean(sessionActive && p.is_playing);
    const showActions = canEdit || canRemove;
    const canDrag = sortable && Object.keys(dragProps).length > 0;
    // Avoid card click-to-edit fighting drag; use the pencil while sortable.
    const cardClickEdit = canEdit && !sortable && !busy;

    const cardClass = [
        'rt-roster-player-card',
        isPlaying ? 'rt-roster-player-card--playing' : '',
        status?.key === 'queueing' ? 'rt-roster-player-card--queueing' : '',
        status?.key === 'check_in' ? 'rt-roster-player-card--check-in' : '',
        isYou ? 'rt-roster-player-card--you' : '',
        canEdit && !sortable ? 'rt-roster-player-card--editable' : '',
        canRemove && !canEdit ? 'rt-roster-player-card--removable' : '',
        canDrag ? 'rt-roster-player-card--sortable' : '',
        isDragging ? 'rt-roster-player-card--dragging' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const handleCardActivate = () => {
        if (cardClickEdit && onEdit) onEdit();
    };

    return (
        <article
            ref={canDrag ? dragRef : undefined}
            className={cardClass}
            style={style}
            role={cardClickEdit ? 'button' : undefined}
            tabIndex={cardClickEdit ? 0 : undefined}
            onClick={cardClickEdit ? handleCardActivate : undefined}
            onKeyDown={(e) => {
                if (!cardClickEdit) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardActivate();
                }
            }}
            onContextMenu={canDrag ? (e) => e.preventDefault() : undefined}
            aria-label={
                canDrag
                    ? `Drag to reorder ${name}`
                    : canEdit
                      ? `Edit ${name}`
                      : position != null
                        ? `${position}. ${name}`
                        : undefined
            }
            {...(canDrag ? dragProps : {})}
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

                    {showActions ? (
                        <div className="rt-roster-player-actions">
                            {canEdit ? (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.();
                                    }}
                                    className="rt-roster-player-action rt-roster-player-action--edit"
                                    aria-label={`Edit ${name}`}
                                >
                                    <MaterialIcon name="edit" className="text-[17px]!" />
                                </button>
                            ) : null}
                            {canRemove ? (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove?.();
                                    }}
                                    className="rt-roster-player-action rt-roster-player-action--remove"
                                    aria-label={`Remove ${name}`}
                                >
                                    <MaterialIcon name="person_remove" className="text-[17px]!" />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
