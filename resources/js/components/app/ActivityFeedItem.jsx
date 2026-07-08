import { Link } from 'react-router-dom';
import { formatRatingChange } from '../ranking/rankingUtils.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

function activityIcon(kind) {
    if (kind === 'queueing_match') {
        return { name: 'groups', wrap: 'bg-[#c2c1ff]/12', color: 'text-[#c2c1ff]' };
    }
    return { name: 'sports_tennis', wrap: 'bg-[#4ce081]/12', color: 'text-[#4ce081]' };
}

/** @param {import('../../api/activity.js').UserActivityItem} row */
function ActivityItemMeta({ row, showMatchNo = false, compact = false }) {
    const score = row.team1_score != null && row.team2_score != null ? `${row.team1_score}-${row.team2_score}` : null;

    const details = [
        showMatchNo && row.match_no != null ? { label: 'Match', value: `#${row.match_no}` } : null,
        score ? { label: 'Score', value: score } : null,
        row.session_points_earned != null
            ? { label: 'Points', value: `+${row.session_points_earned}`, accent: 'points' }
            : null,
        row.rating_change != null
            ? {
                  label: 'Rating',
                  value: formatRatingChange(row.rating_change),
                  accent: row.rating_change >= 0 ? 'elo-up' : 'elo-down',
              }
            : null,
    ].filter(Boolean);

    if (details.length === 0 && row.won == null) {
        return null;
    }

    return (
        <dl className={['mt-1.5 flex flex-wrap gap-x-3 gap-y-1', compact ? '' : 'grid grid-cols-2'].join(' ')}>
            {details.map((item) => (
                <div key={item.label} className="flex min-w-0 items-baseline gap-1">
                    <dt className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[#918f9c]">
                        {item.label}
                    </dt>
                    <dd
                        className={[
                            'truncate text-xs font-semibold leading-tight',
                            item.accent === 'points'
                                ? 'text-[#4ce081]'
                                : item.accent === 'elo-up'
                                  ? 'text-[#c2c1ff]'
                                  : item.accent === 'elo-down'
                                    ? 'text-[#ffb4ab]'
                                    : 'text-[#e4e1e6]',
                        ].join(' ')}
                    >
                        {item.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * @param {{
 *   row: import('../../api/activity.js').UserActivityItem;
 *   relativeTime?: string;
 *   showMatchNo?: boolean;
 *   compact?: boolean;
 * }} props
 */
export function ActivityFeedItem({ row, relativeTime, showMatchNo = false, compact = false }) {
    const icon = activityIcon(row.kind);

    return (
        <Link to={row.href} className="rt-interactive-card rt-activity-feed-item">
            <div className={`rt-activity-feed-icon ${icon.wrap}`}>
                <MaterialIcon name={icon.name} className={icon.color} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h4
                            className={[
                                'font-semibold leading-snug text-[#e4e1e6]',
                                compact ? 'text-sm' : 'text-base md:text-lg',
                            ].join(' ')}
                        >
                            {row.title}
                        </h4>
                        {row.subtitle ? (
                            <p className="mt-0.5 truncate text-xs text-[#918f9c]">{row.subtitle}</p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                        {row.won != null ? (
                            <span
                                className={[
                                    'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none',
                                    row.won ? 'bg-[#4ce081]/15 text-[#4ce081]' : 'bg-[#ffb4ab]/15 text-[#ffb4ab]',
                                ].join(' ')}
                            >
                                {row.won ? 'Win' : 'Loss'}
                            </span>
                        ) : null}
                        {relativeTime ? (
                            <p className="text-[10px] font-medium text-[#918f9c]">{relativeTime}</p>
                        ) : null}
                    </div>
                </div>
                <ActivityItemMeta row={row} showMatchNo={showMatchNo} compact={compact} />
            </div>
        </Link>
    );
}
