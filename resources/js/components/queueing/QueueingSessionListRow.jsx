import { playerInitials } from '../ranking/rankingUtils.js';
import { QueueingSessionLeaderboardStats } from './QueueingSessionLeaderboardStats.jsx';

/**
 * @param {{
 *   player: {
 *     rank?: number;
 *     name?: string;
 *     user_id?: number | null;
 *     wins?: number;
 *     losses?: number;
 *     total_matches?: number;
 *     earned_points?: number;
 *     is_guest?: boolean;
 *   };
 *   isYou?: boolean;
 * }} props
 */
export function QueueingSessionListRow({ player, isYou = false }) {
    const points = player.earned_points ?? 0;

    return (
        <article className={['rt-ranking-row', isYou ? 'rt-ranking-row--you' : ''].filter(Boolean).join(' ')}>
            <div className="rt-ranking-rank" aria-hidden>
                <span className="text-2xl font-extrabold italic tabular-nums">{player.rank ?? '—'}</span>
            </div>

            <div className="rt-ranking-avatar size-8 sm:size-10 text-xs sm:text-lg" aria-hidden>
                {playerInitials(player.name ?? 'Player')}
            </div>

            <div className="min-w-0 flex-1 py-1">
                <h4 className="truncate text-sm font-semibold capitalize text-[#e4e1e6] md:text-lg">
                    {player.name ?? 'Player'}
                    {isYou ? (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff] md:text-xs">
                            You
                        </span>
                    ) : null}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    {player.is_guest ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c8c5d2]">
                            Guest
                        </span>
                    ) : null}
                    <QueueingSessionLeaderboardStats
                        wins={player.wins}
                        losses={player.losses}
                        total_matches={player.total_matches}
                        earned_points={player.earned_points}
                        omitPoints
                        compact
                    />
                </div>
            </div>

            <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Points</p>
                <p className="text-xl font-extrabold tabular-nums italic text-[#c2c1ff]">
                    {points}
                </p>
            </div>
        </article>
    );
}
