/**
 * Normalize auth user payloads (handles accidental JsonResource `data` wrapping).
 * @param {unknown} raw
 * @returns {import('../context/AuthContext.jsx').User | null}
 */
export function normalizeAuthUser(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const candidate = /** @type {{ data?: unknown } & Record<string, unknown>} */ (raw);
    if (candidate.data && typeof candidate.data === 'object' && candidate.data !== null) {
        return /** @type {import('../context/AuthContext.jsx').User} */ (candidate.data);
    }
    return /** @type {import('../context/AuthContext.jsx').User} */ (candidate);
}

/**
 * @param {import('../context/AuthContext.jsx').User | null | undefined} user
 */
export function userIsAdmin(user) {
    if (!user) {
        return false;
    }
    const flag = user.is_admin;
    return flag === true || flag === 1 || flag === '1';
}
