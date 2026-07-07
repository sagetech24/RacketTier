import { formatRating, playerInitials, tierAccentClass } from './rankingUtils.js';

/**
 * @param {{
 *   row: import('../../api/ranking.js').RankingRow;
 *   isYou?: boolean;
 *   style?: import('react').CSSProperties;
 *   variant?: 'list' | 'viewer';
 * }} props
 */
export function RankingListRow({ row, isYou = false, style, variant = 'list' }) {
    const tierNo = row.tier?.tier_no ?? 0;

    return (
        <article
            className={[
                'rt-ranking-row',
                isYou ? 'rt-ranking-row--you' : '',
                variant === 'viewer' ? 'rt-ranking-row--viewer' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            style={style}
        >
            <div className="rt-ranking-rank" aria-hidden>
                <span className="text-2xl font-extrabold italic tabular-nums">{row.rank}</span>
            </div>

            <div className="rt-ranking-avatar size-8 sm:size-10 text-xs sm:text-lg" aria-hidden>
                {playerInitials(row.user.name)}
            </div>

            <div className="min-w-0 flex-1 py-1">
                <h4 className="truncate md:text-lg text-sm font-semibold text-[#e4e1e6]">
                    {row.user.name}
                    {isYou ? (
                        <span className="ml-1.5 md:text-xs text-[10px] font-bold uppercase tracking-wider text-[#c2c1ff]">
                            You
                        </span>
                    ) : null}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={['rt-ranking-tier-badge px-2 border border-white/10 text-[8px] md:text-[12px] tracking-wider', tierAccentClass(tierNo)].join(' ')}>
                        Tier {tierNo || '—'} · {row.tier?.name ?? 'Unranked'}
                    </span>
                    {variant === 'viewer' && row.sport?.name ? (
                        <span className="text-[10px] font-medium text-[#918f9c]">{row.sport.name}</span>
                    ) : null}
                </div>
            </div>

            <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#918f9c]">Rating</p>
                <p className="text-xl font-extrabold tabular-nums text-[#c2c1ff] italic">
                    {formatRating(row.rating)}
                </p>
                {/* <p className="text-xs font-semibold tabular-nums text-[#4ce081]">
                    {(row.wallet_balance ?? 0).toLocaleString()} pts
                </p> */}
            </div>
        </article>
    );
}
