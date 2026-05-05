const HAS_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

/**
 * Safe URL under `/public/images/` from the sports.icon database value (filename).
 * Appends `.png` when no extension is present.
 *
 * @param {string | null | undefined} icon
 * @returns {string | null}
 */
export function publicSportImageSrc(icon) {
    if (icon == null || typeof icon !== 'string') {
        return null;
    }
    const t = icon.trim();
    if (t === '') {
        return null;
    }
    // Filename only — no paths
    if (!/^[a-zA-Z0-9._-]+$/.test(t)) {
        return null;
    }
    const file = HAS_EXT.test(t) ? t : `${t}.png`;
    return `/images/${file}`;
}
