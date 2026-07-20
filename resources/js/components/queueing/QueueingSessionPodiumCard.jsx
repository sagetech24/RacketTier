import { playerInitials } from '../ranking/rankingUtils.js';
import { PlayerSkillLevelBadge } from './PlayerSkillLevelBadge.jsx';
import { QueueingSessionLeaderboardStats } from './QueueingSessionLeaderboardStats.jsx';

const PODIUM_FRAME = [
    'rt-ranking-podium-frame--gold',
    'rt-ranking-podium-frame--silver',
    'rt-ranking-podium-frame--bronze',
];

const PODIUM_ORDER = [0, 1, 2];

const MEDAL_SRC = ['/images/first-icon.svg', '/images/second-icon.svg', '/images/third-icon.svg'];
const MEDAL_ALT = ['First place', 'Second place', 'Third place'];

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
 *     skill_level?: number | null;
 *   };
 *   place: number;
 *   isYou?: boolean;
 * }} props
 */
export function QueueingSessionPodiumCard({ player, place, isYou = false }) {
    const frameClass = PODIUM_FRAME[place] ?? PODIUM_FRAME[2];
    const orderClass = `rt-ranking-podium-order-${PODIUM_ORDER[place] ?? place}`;
    const points = player.earned_points ?? 0;

    return (
        <article
            className={[
                'rt-ranking-podium-card',
                frameClass,
                orderClass,
                place === 0 ? 'rt-ranking-podium-card--first' : '',
                isYou ? 'rt-ranking-podium-card--you' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div className="rt-ranking-podium-card-inner relative">
                <img
                    src={MEDAL_SRC[place]}
                    alt={MEDAL_ALT[place]}
                    className={[
                        'rt-ranking-podium-medal',
                        'pointer-events-none absolute -left-3 -top-2 size-9 sm:size-14',
                        `rt-ranking-podium-medal--${place}`,
                    ].join(' ')}
                />
                <div className="flex items-center justify-between gap-3 px-1 md:flex-col md:items-center md:gap-2 md:px-0 md:pt-1">
                    <div className="flex min-w-0 flex-col md:items-center md:text-center">
                        <div className="flex items-center gap-2.5 md:flex-col md:items-center md:justify-center md:gap-2">
                            <div
                                className={[
                                    'rt-ranking-avatar size-10 text-xs sm:size-12 sm:text-lg',
                                    place === 0 ? 'rt-ranking-avatar--podium-lead' : '',
                                ].join(' ')}
                                aria-hidden
                            >
                                {playerInitials(player.name ?? 'Player')}
                            </div>
                            <div className="flex min-w-0 flex-col items-start md:items-center">
                                <div className="flex md:flex-col flex-row md:items-center md:justify-center md:gap-1.5 gap-2">
                                    <h3 className="truncate font-bold capitalize text-[#e4e1e6] md:max-w-36 md:text-center md:text-lg">
                                        {player.name ?? 'Player'}
                                    </h3>
                                    {isYou ? (
                                        <span className="flex items-center justify-center rounded-full bg-[#c2c1ff]/20 px-2 py-0.5 md:text-[12px] text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                            You
                                        </span>
                                    ) : null}
                                    {player.is_guest ? (
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c8c5d2]">
                                            Guest
                                        </span>
                                    ) : null}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                                    <PlayerSkillLevelBadge skillLevel={player.skill_level} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="block text-right md:hidden">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Points</p>
                        <p className="text-xl font-extrabold tabular-nums italic text-[#c2c1ff]">
                            {points}
                        </p>
                    </div>
                </div>

                <div className="ml-14 mt-3 md:hidden">
                    <QueueingSessionLeaderboardStats
                        wins={player.wins}
                        losses={player.losses}
                        total_matches={player.total_matches}
                        earned_points={player.earned_points}
                        omitPoints
                        compact
                    />
                </div>

                <div className="mt-3 hidden border-t border-white/5 pt-3 md:flex md:flex-col md:items-center md:text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Points</p>
                    <p className="text-2xl font-extrabold tabular-nums italic text-[#c2c1ff]">
                        {points}
                    </p>
                    <div className="mt-3 w-full flex justify-center">
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
            </div>
        </article>
    );
}
