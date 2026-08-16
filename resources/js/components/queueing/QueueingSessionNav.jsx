import { Link, useLocation } from 'react-router-dom';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { normalizedAppPath, queueingSessionNavPaths } from '../../lib/queueingSessionNav.js';

/** @typedef {'dash' | 'players' | 'matches'} QueueingSessionNavId */

/** @type {ReadonlyArray<{ id: QueueingSessionNavId, label: string, icon: string, suffix?: boolean }>} */
const NAV_ITEMS = [
    { id: 'dash', label: 'Dashboard', icon: 'space_dashboard' },
    { id: 'players', label: 'Players', icon: 'groups', suffix: true },
    { id: 'matches', label: 'Matches', icon: 'sports_score', suffix: true },
];

/**
 * @param {{
 *   sessionId: number,
 *   tabSuffix?: string,
 * }} props
 */
export function QueueingSessionNav({ sessionId, tabSuffix = '' }) {
    const location = useLocation();
    const navPath = normalizedAppPath(location.pathname);
    const paths = queueingSessionNavPaths(sessionId);

    /** @type {Record<QueueingSessionNavId, string | undefined>} */
    const tourIds = {
        dash: 'session-nav-dashboard',
        players: 'session-nav-players',
        matches: 'session-nav-matches',
    };

    return (
        <nav className="rt-qs-session-nav" aria-label="Session sections">
            <div className="rt-qs-session-nav__tabs" role="tablist">
                {NAV_ITEMS.map((item) => {
                    const to = paths[item.id];
                    const active = navPath === to;

                    return (
                        <Link
                            key={item.id}
                            to={to}
                            role="tab"
                            aria-selected={active}
                            aria-current={active ? 'page' : undefined}
                            data-tour={tourIds[item.id]}
                            className={[
                                'rt-qs-session-nav__tab',
                                active ? 'rt-qs-session-nav__tab--active' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            <MaterialIcon name={item.icon} className="rt-qs-session-nav__icon" />
                            <span className="rt-qs-session-nav__label">
                                {item.label}
                                {item.suffix ? tabSuffix : ''}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
