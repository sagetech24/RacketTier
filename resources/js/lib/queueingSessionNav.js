/** @param {boolean} active @param {string} [textSize] */
export function queueingSessionTabClass(active, textSize = 'text-xs') {
    return active
        ? `rounded-lg border border-white/40 bg-yellow-500/50 px-3 py-1.5 ${textSize} font-semibold text-white`
        : `rounded-lg border border-[#818184] bg-[#353438] px-3 py-1.5 ${textSize} font-semibold text-[#818184] hover:border-[#4ce081]/60`;
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
