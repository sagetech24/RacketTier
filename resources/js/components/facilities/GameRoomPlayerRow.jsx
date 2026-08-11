import { PlayerSkillLevelBadge } from '../queueing/PlayerSkillLevelBadge.jsx';
import { formatRating } from '../ranking/rankingUtils.js';

/**
 * @param {{
 *   player: {
 *     key: string;
 *     initials: string;
 *     name: string;
 *     isSelf?: boolean;
 *     isHost?: boolean;
 *     queuePosition?: number;
 *     skillLevel?: number | null;
 *     sessionPoints?: number;
 *     eloRating?: number | null;
 *     statusKey?: string;
 *     status: string;
 *     _playing?: boolean;
 *   };
 * }} props
 */
export function GameRoomPlayerRow({ player }) {
    const statusClass =
        player.statusKey === 'playing' || player._playing
            ? 'rt-roster-status--playing'
            : player.statusKey === 'waiting' || player.statusKey === 'queue'
              ? 'rt-roster-status--queueing'
              : 'rt-roster-status--waiting';

    return (
        <article
            className={[
                'rt-game-room-player',
                player.isSelf ? 'rt-game-room-player--you' : '',
                player._playing ? 'rt-playing-player-card' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div className="rt-player-avatar shrink-0" aria-hidden>
                {player.initials}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-sm font-bold capitalize text-[#e4e1e6]">{player.name}</h3>
                    {player.isSelf ? (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                            You
                        </span>
                    ) : null}
                    {player.isHost ? (
                        <span className="shrink-0 rounded-full border border-[#c2c1ff]/25 bg-[#c2c1ff]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                            Host
                        </span>
                    ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {player.queuePosition != null ? (
                        <span className="text-xs font-semibold text-[#c8c5d2]">Queue #{player.queuePosition}</span>
                    ) : null}
                    <PlayerSkillLevelBadge skillLevel={player.skillLevel} />
                    {typeof player.sessionPoints === 'number' ? (
                        <span className="text-xs tabular-nums text-[#c8c5d2]">{player.sessionPoints} pts</span>
                    ) : null}
                    {typeof player.eloRating === 'number' ? (
                        <span className="text-xs tabular-nums text-[#918f9c]">
                            Rating {formatRating(player.eloRating)}
                        </span>
                    ) : null}
                </div>
            </div>
            <span className={['rt-roster-status-pill shrink-0', statusClass].join(' ')}>
                <span className="rt-roster-status-dot" aria-hidden />
                {player.status}
            </span>
        </article>
    );
}
