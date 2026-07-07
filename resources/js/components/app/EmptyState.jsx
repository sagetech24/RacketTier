import { Link } from 'react-router-dom';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/**
 * @param {{
 *   icon?: string;
 *   title: string;
 *   description: string;
 *   actionLabel?: string;
 *   actionTo?: string;
 * }} props
 */
export function EmptyState({ icon = 'sports_tennis', title, description, actionLabel, actionTo }) {
    return (
        <div className="rt-empty-state">
            <div className="rt-empty-state-icon" aria-hidden>
                <MaterialIcon name={icon} className="text-3xl text-[#c2c1ff]" />
            </div>
            <h3 className="text-base font-bold text-[#e4e1e6]">{title}</h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#c8c5d2]">{description}</p>
            {actionLabel && actionTo ? (
                <Link to={actionTo} className="rt-btn-secondary mt-4 inline-flex">
                    {actionLabel}
                </Link>
            ) : null}
        </div>
    );
}
