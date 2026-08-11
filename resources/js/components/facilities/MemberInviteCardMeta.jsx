import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { SportIcon } from '../dashboard/SportIcon.jsx';
import { formatRating } from '../ranking/rankingUtils.js';

/**
 * Compact dashboard-style Points / ELO / Win rate for facility invite cards.
 *
 * @param {{
 *   rating?: number | null,
 *   points?: number | null,
 *   stats?: { wins?: number, losses?: number, total_matches?: number } | null,
 *   primarySport?: { name: string, icon?: string } | null,
 * }} props
 */
export function MemberInviteCardMeta({ rating = null, points = 0, stats = null, primarySport = null }) {
    const played = stats?.total_matches ?? 0;
    const won = stats?.wins ?? 0;
    const winRate = played > 0 ? Math.round((won / played) * 100) : null;
    const sportLabel = primarySport?.name?.trim() || '—';

    return (
        <div className="mt-1.5 min-w-0">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0">
                <div className="">
                    <dt className="text-[9px] font-bold uppercase tracking-widest text-[#918f9c]">Points</dt>
                    <dd className="mt-0.5 flex items-center gap-1 text-xs font-extrabold tabular-nums text-[#e4e1e6]">
                        <MaterialIcon name="database" className="text-sm! text-[#4ce081]" />
                        <span className="truncate">{(points ?? 0).toLocaleString()}</span>
                    </dd>
                </div>
                <div className="">
                    <dt className="text-[9px] font-bold uppercase tracking-widest text-[#918f9c] ml-1">Rating</dt>
                    <dd className="mt-0.5 flex items-center gap-1 text-xs font-extrabold tabular-nums text-[#e4e1e6]">
                        <MaterialIcon name="trending_up" className="text-sm! text-[#a6a5ed]" />
                        <span className="truncate">{rating != null ? formatRating(rating) : '—'}</span>
                    </dd>
                </div>
                <div className="">
                    <dt className="text-[9px] font-bold uppercase tracking-widest text-[#918f9c] ml-1">Win %</dt>
                    <dd className="mt-0.5 flex items-center gap-1 text-xs font-extrabold tabular-nums text-[#e4e1e6]">
                        <MaterialIcon name="military_tech" className="text-sm! text-[#c2c1ff]" />
                        <span className="truncate">{winRate != null ? `${winRate}%` : '—'}</span>
                    </dd>
                </div>
                <div className="">
                    <dt className="text-[9px] font-bold uppercase tracking-widest text-[#918f9c] ml-1">Sport</dt>
                    <dd className="mt-0.5 flex items-center gap-1 text-xs font-extrabold tabular-nums text-[#e4e1e6]">
                        {/* sport icon */}
                        {primarySport?.icon ? (
                            <SportIcon
                                icon={primarySport?.icon}
                                imgClassName="h-3.5 w-3.5 object-contain"
                                materialClassName="text-[14px]! text-[#4ce081]"
                                className="shrink-0"
                            />
                        ) : 
                            <MaterialIcon name="sports_score" className="text-sm! text-[#c2c1ff]" filled />
                        }
                        <span className="truncate">{sportLabel}</span>
                    </dd>
                </div>
            </dl>
        </div>
    );
}
