/** @param {number} rating */
export function formatRating(rating) {
    return (rating / 100)?.toLocaleString?.(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) ?? '0.00';
}

/** @param {string} name */
export function playerInitials(name) {
    const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

/** @param {number | null | undefined} tierNo */
export function tierAccentClass(tierNo) {
    if (tierNo == null || tierNo <= 1) return 'rt-ranking-tier--starter';
    if (tierNo === 2) return 'rt-ranking-tier--beginner';
    if (tierNo === 3) return 'rt-ranking-tier--intermediate';
    if (tierNo === 4) return 'rt-ranking-tier--advanced';
    return 'rt-ranking-tier--elite';
}
