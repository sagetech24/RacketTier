import { Link } from 'react-router-dom';
import { facilityCoverSrc } from '../../lib/facilityCover.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/**
 * @param {string} name
 */
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * @param {{
 *   facility: import('../../api/facilities.js').FacilityRow;
 *   canManage: boolean;
 *   onEdit: (facility: import('../../api/facilities.js').FacilityRow) => void;
 * }} props
 */
export function FacilityCard({ facility, canManage, onEdit }) {
    const coverSrc = facilityCoverSrc(facility.cover_photo);
    const checkedIn = facility.today_checked_in_players_count ?? 0;
    const matchesToday = facility.today_matches_count ?? 0;
    const sessions = facility.game_sessions_count ?? 0;
    const hasActivityToday = checkedIn > 0 || matchesToday > 0;

    return (
        <article className="rt-facility-card">
            <div className="rt-facility-card-media" aria-hidden={coverSrc ? undefined : true}>
                {coverSrc ? (
                    <img src={coverSrc} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                    <div className="rt-facility-card-placeholder">
                        <span className="rt-facility-card-initials">{initialsFromName(facility.name)}</span>
                        <MaterialIcon name="stadium" className="rt-facility-card-placeholder-icon" />
                    </div>
                )}
                {hasActivityToday ? (
                    <span className="rt-facility-card-live">
                        <span className="rt-facility-card-live-dot" aria-hidden />
                        Active today
                    </span>
                ) : null}
            </div>

            <div className="rt-facility-card-body">
                <div className="min-w-0">
                    <div className="mb-1 flex items-start justify-between gap-3">
                        <h2 className="min-w-0 text-xl font-bold tracking-tight text-balance text-[#e4e1e6] md:text-2xl">
                            {facility.name}
                        </h2>
                        {canManage ? (
                            <button
                                type="button"
                                onClick={() => onEdit(facility)}
                                className="rt-facility-card-edit"
                                aria-label={`Edit ${facility.name}`}
                            >
                                <MaterialIcon name="edit" className="text-lg" />
                            </button>
                        ) : null}
                    </div>

                    <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-[#c8c5d2]">
                        <MaterialIcon name="location_on" className="mt-0.5 shrink-0 text-base text-[#918f9c]" />
                        <span className="min-w-0 wrap-break-word">{facility.address?.trim() || 'Address not set'}</span>
                    </p>

                    <dl className="rt-facility-card-stats">
                        <div>
                            <dt>Checked in</dt>
                            <dd>
                                <span className="tabular-nums">{checkedIn}</span>
                                <span className="sr-only"> players today</span>
                            </dd>
                        </div>
                        <div>
                            <dt>Matches</dt>
                            <dd>
                                <span className="tabular-nums">{matchesToday}</span>
                                <span className="sr-only"> today</span>
                            </dd>
                        </div>
                        <div>
                            <dt>Sessions</dt>
                            <dd className="tabular-nums">{sessions}</dd>
                        </div>
                    </dl>
                </div>

                <div className="rt-facility-card-actions">
                    <Link to={`/facility/${facility.id}/create-match`} className="rt-facility-btn rt-facility-btn-secondary">
                        <MaterialIcon name="add" className="text-lg" />
                        New match
                    </Link>
                    <Link to={`/facility/${facility.id}/game-room`} className="rt-facility-btn rt-facility-btn-primary">
                        <MaterialIcon name="sports_tennis" className="text-lg" />
                        Game room
                    </Link>
                </div>
            </div>
        </article>
    );
}
