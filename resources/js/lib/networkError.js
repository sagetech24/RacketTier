/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isNetworkError(err) {
    if (err == null) return false;
    if (typeof TypeError !== 'undefined' && err instanceof TypeError) return true;
    const message = String(err?.message ?? err ?? '');
    return /failed to fetch|fetch failed|networkerror|network request failed|load failed|the internet connection appears to be offline|network error/i.test(
        message,
    );
}
