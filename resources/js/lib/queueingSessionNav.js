/** @param {boolean} active @param {string} [textSize] */
export function queueingSessionTabClass(active, textSize = 'text-xs') {
    return active
        ? `rounded-lg border border-white/40 bg-[#c2c1ff]/50 px-3 py-1.5 ${textSize} font-semibold text-white`
        : `rounded-lg border border-[#818184] bg-[#353438] px-3 py-1.5 ${textSize} font-semibold text-[#818184] hover:border-[#4ce081]/60`;
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
