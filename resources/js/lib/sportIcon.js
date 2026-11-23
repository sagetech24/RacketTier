const HAS_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

/** @type {Record<string, string>} */
const MATERIAL_BY_BASENAME = {
    badminton: 'sports_tennis',
    pickleball: 'sports_tennis',
    tennis: 'sports_tennis',
    'table-tennis': 'sports_tennis',
    ms: 'sports_tennis',
};

/**
 * Strip image extension from a sports.icon DB value.
 *
 * @param {string} icon
 * @returns {string}
 */
function iconBasename(icon) {
    return icon.trim().replace(HAS_EXT, '');
}

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
    // Legacy Material Symbols names (e.g. sports_tennis) — not image files.
    if (/^sports_/i.test(t)) {
        return null;
    }
    // Filename only — no paths
    if (!/^[a-zA-Z0-9._-]+$/.test(t)) {
        return null;
    }
    const file = HAS_EXT.test(t) ? t : `${t}.png`;
    return `/images/${file}`;
}

/**
 * Material Symbols name for fallback when the PNG is missing/broken.
 * Never returns a filename with an extension (avoids leftover ".png" text from ligatures).
 *
 * @param {string | null | undefined} icon
 * @returns {string}
 */
export function sportMaterialIconName(icon) {
    if (icon == null || typeof icon !== 'string') {
        return 'sports_tennis';
    }
    const t = icon.trim();
    if (t === '') {
        return 'sports_tennis';
    }
    if (/^sports_/i.test(t) && !HAS_EXT.test(t)) {
        return t;
    }
    const base = iconBasename(t).toLowerCase();
    if (MATERIAL_BY_BASENAME[base]) {
        return MATERIAL_BY_BASENAME[base];
    }
    if (/^sports_/i.test(base)) {
        return base;
    }
    return 'sports_tennis';
}
