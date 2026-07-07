import { formatRating, playerInitials, tierAccentClass } from './rankingUtils.js';

const PODIUM_FRAME = [
    'rt-ranking-podium-frame--gold',
    'rt-ranking-podium-frame--silver',
    'rt-ranking-podium-frame--bronze',
];

/** Desktop grid order: 2nd · 1st · 3rd via order-1 / order-0 / order-2 classes */
const PODIUM_ORDER = [0, 1, 2];

const MEDAL_SRC = ['/images/first-icon.svg', '/images/second-icon.svg', '/images/third-icon.svg'];
const MEDAL_ALT = ['First place', 'Second place', 'Third place'];

/**
 * @param {{
 *   row: import('../../api/ranking.js').RankingRow;
 *   place: number;
 *   isYou?: boolean;
 *   style?: import('react').CSSProperties;
 * }} props
 */
export function RankingPodiumCard({ row, place, isYou = false, style }) {
    const tierNo = row.tier?.tier_no ?? 0;
    const frameClass = PODIUM_FRAME[place] ?? PODIUM_FRAME[2];
    const orderClass = `rt-ranking-podium-order-${PODIUM_ORDER[place] ?? place}`;

    return (
        <article
            className={[
                'rt-ranking-podium-card ',
                frameClass,
                orderClass,
                place === 0 ? 'rt-ranking-podium-card--first' : '',
                isYou ? 'rt-ranking-podium-card--you' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            style={style}
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
                                {playerInitials(row.user.name)}
                            </div>
                            <div className="flex min-w-0 flex-col items-start md:items-center">
                                <h3 className="truncate font-bold text-[#e4e1e6] md:max-w-[9rem] md:text-center md:text-lg">
                                    {row.user.name}
                                </h3>
                                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                                    <span
                                        className={[
                                            'rt-ranking-tier-badge border border-white/10 px-2 text-[8px] tracking-wider md:text-[11px]',
                                            tierAccentClass(tierNo),
                                        ].join(' ')}
                                    >
                                        Tier {tierNo || '—'} · {row.tier?.name ?? 'Unranked'}
                                    </span>
                                    {isYou ? (
                                        <span className="rounded-full bg-[#c2c1ff]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                                            You
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="block text-right md:hidden">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Rating</p>
                        <p className="text-xl font-extrabold tabular-nums italic text-[#c2c1ff]">
                            {formatRating(row.rating)}
                        </p>
                    </div>
                </div>

                <div className="mt-3 hidden border-t border-white/5 pt-3 md:flex md:flex-col md:items-center md:text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Rating</p>
                    <p className="text-2xl font-extrabold tabular-nums italic text-[#c2c1ff]">
                        {formatRating(row.rating)}
                    </p>
                </div>
            </div>
        </article>
    );
}
