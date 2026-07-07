import { RankingCrownIcon } from './RankingCrownIcon.jsx';
import { formatRating, playerInitials, tierAccentClass } from './rankingUtils.js';

const PODIUM_FRAME = [
    'rt-ranking-podium-frame--gold',
    'rt-ranking-podium-frame--silver',
    'rt-ranking-podium-frame--bronze',
];

const PODIUM_ORDER = [1, 0, 2];

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
                {place === 0 ? (
                    <img src="/images/first-icon.svg" alt="First Place" className="size-12 sm:size-14 absolute -top-3 -left-4" />
                ) : null}
                {place === 1 ? (
                    <img src="/images/second-icon.svg" alt="Second Place" className="size-12 sm:size-14 absolute -top-3 -left-4" />
                ) : null}
                {place === 2 ? (
                    <img src="/images/third-icon.svg" alt="Third Place" className="size-12 sm:size-14 absolute -top-3 -left-4" />
                ) : null}
                <div className="flex justify-between items-center gap-3 md:flex-col md:items-center md:gap-2 px-4">
                    <div className="flex min-w-0 flex-col md:items-center md:text-center">
                        <div className="flex md:flex-col flex-row md:items-center md:justify-center gap-2 items-center">
                            <div className="rt-ranking-avatar size-10 sm:size-12 text-xs sm:text-lg" aria-hidden>
                                {playerInitials(row.user.name)}
                            </div>
                            <div className="flex flex-col justify-center items-center">
                                <h3 className="truncate font-bold text-[#e4e1e6] md:text-lg">
                                    {row.user.name}
                                </h3>
                                <div className="flex justify-center items-center mt-1">
                                    <span className={['rt-ranking-tier-badge px-2 border border-white/10 text-[8px] md:text-[12px] tracking-wider', tierAccentClass(tierNo)].join(' ')}>
                                        Tier {tierNo || '—'} · {row.tier?.name ?? 'Unranked'}
                                    </span>
                                    {isYou ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 bg-[#c2c1ff]/30 px-1.5 py-0.5 rounded-full">
                                            You
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right md:hidden block">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Rating</p>
                        <p className="text-xl font-extrabold tabular-nums text-[#c2c1ff] italic">
                            {formatRating(row.rating)}
                        </p>
                    </div>
                </div>

                <div className="hidden mt-3 md:flex items-end justify-between gap-3 border-t border-white/5 pt-3 md:flex-col md:items-center md:text-center">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Rating</p>
                        <p className="text-xl font-extrabold tabular-nums text-[#c2c1ff] italic">
                            {formatRating(row.rating)}
                        </p>
                    </div>
                </div>
            </div>
        </article>
    );
}
