import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/** @param {number} [wins] @param {number} [losses] */
export function winRateLabel(wins, losses) {
    const w = wins ?? 0;
    const l = losses ?? 0;
    const total = w + l;
    if (total === 0) return '—';
    return `${Math.round((w / total) * 100)}%`;
}

/**
 * @param {{
 *   wins?: number;
 *   losses?: number;
 *   total_matches?: number;
 *   earned_points?: number;
 *   omitPoints?: boolean;
 *   compact?: boolean;
 * }} props
 */
export function QueueingSessionLeaderboardStats({
    wins: winsProp,
    losses: lossesProp,
    total_matches,
    earned_points,
    omitPoints = false,
    compact = false,
}) {
    const wins = winsProp ?? 0;
    const losses = lossesProp ?? 0;
    const total = total_matches ?? wins + losses;
    const points = earned_points ?? 0;
    const winPct = winRateLabel(wins, losses);

    return (
        <div
            className={[
                'flex flex-wrap items-center gap-x-3 gap-y-0.5 uppercase tracking-wider text-[#c8c5d2] md:justify-start md:items-center justify-start',
                compact ? 'text-[11px]' : 'text-[13px] md:gap-x-4',
            ].join(' ')}
        >
            <span className="inline-flex items-center normal-case">
                <span className="inline-flex items-center gap-0.5">
                    <MaterialIcon name="arrow_upward" className="text-xs! sm:text-sm! md:text-lg! text-[#4ce081]" />
                    <span className="font-bold tabular-nums text-xs! sm:text-sm! md:text-lg! text-[#4ce081]">{wins}</span>
                </span>
                <span className="text-[#918f9c]">-</span>
                <span className="inline-flex items-center gap-0.5">
                    <MaterialIcon name="arrow_downward" className="text-xs! sm:text-sm! md:text-lg! text-red-300/90" />
                    <span className="font-bold tabular-nums text-xs! sm:text-sm! md:text-lg! text-red-300/90">{losses}</span>
                </span>
            </span>
            {!omitPoints ? (
                <span>
                    <span className="font-bold text-[#c2c1ff] text-xs! sm:text-sm! md:text-md!">{points}</span> PTS
                </span>
            ) : null}
            <span>
                <span className="font-bold text-[#e4e1e6] text-xs! sm:text-sm! md:text-md!">{winPct} Win%</span>
            </span>
            {!compact ? (
                <span className="hidden sm:inline">
                    <span className="font-bold text-[#e4e1e6] text-xs! sm:text-sm! md:text-md!">{total}</span> Played
                </span>
            ) : null}
        </div>
    );
}
