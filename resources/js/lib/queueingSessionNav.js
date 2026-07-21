/** @param {boolean} active @param {string} [textSize] */
export function queueingSessionTabClass(active, textSize = 'text-xs') {
    return active
        ? `${textSize} font-semibold text-white`
        : `${textSize} font-semibold text-[#818184] hover:text-[#4ce081]/60`;
}

/** @typedef {'nav' | 'edit' | 'danger'} QueueSessionCardActionVariant */

/**
 * @param {QueueSessionCardActionVariant} variant
 * @param {{ active?: boolean, iconOnly?: boolean }} [options]
 */
export function queueSessionCardActionClass(variant, { active = false, iconOnly = false } = {}) {
    const variantClass =
        variant === 'edit'
            ? 'rt-queue-card-btn--edit'
            : variant === 'danger'
              ? 'rt-queue-card-btn--danger'
              : active
                ? 'rt-queue-card-btn--nav-active'
                : 'rt-queue-card-btn--nav';

    return ['rt-queue-card-btn', variantClass, iconOnly ? 'rt-queue-card-btn--icon-only' : '']
        .filter(Boolean)
        .join(' ');
}

/** @param {string} pathname */
export function normalizedAppPath(pathname) {
    return (pathname || '/').replace(/\/$/, '') || '/';
}

/** @param {number} sessionId */
export function queueingSessionNavPaths(sessionId) {
    const dash = `/queueing-session/${sessionId}`;
    return { dash, players: `${dash}/players`, matches: `${dash}/matches` };
}
