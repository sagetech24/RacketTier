/**
 * Resolve a facility cover image URL from the stored path (absolute, relative, or full URL).
 *
 * @param {string | null | undefined} coverPhoto
 * @returns {string | null}
 */
export function facilityCoverSrc(coverPhoto) {
    if (coverPhoto == null || typeof coverPhoto !== 'string') {
        return null;
    }
    const t = coverPhoto.trim();
    if (t === '') {
        return null;
    }
    if (/^https?:\/\//i.test(t)) {
        return t;
    }
    if (t.startsWith('/')) {
        return t;
    }
    return `/${t.replace(/^\/+/, '')}`;
}
