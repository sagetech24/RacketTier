const ratingNumberFormat = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
};

/** @param {number | null | undefined} rating Stored ELO (e.g. 1050 → "10.50"). */
export function formatRating(rating) {
    if (rating == null || Number.isNaN(rating)) {
        return '0.00';
    }

    return (rating / 100).toLocaleString(undefined, ratingNumberFormat);
}

/** @param {number | null | undefined} change Stored ELO delta (e.g. 16 → "+0.16"). */
export function formatRatingChange(change) {
    if (change == null || Number.isNaN(change)) {
        return '0.00';
    }

    const scaled = change / 100;
    const formatted = Math.abs(scaled).toLocaleString(undefined, ratingNumberFormat);
    if (scaled > 0) {
        return `+${formatted}`;
    }
    if (scaled < 0) {
        return `-${formatted}`;
    }

    return formatted;
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
