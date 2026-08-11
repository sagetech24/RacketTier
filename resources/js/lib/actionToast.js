/**
 * @param {unknown} data
 * @param {string} fallback
 * @returns {string}
 */
export function messageFromJson(data, fallback) {
    if (data && typeof data === 'object') {
        const record = /** @type {Record<string, unknown>} */ (data);
        const errors = record.errors;
        if (errors && typeof errors === 'object') {
            const first = Object.values(/** @type {Record<string, unknown>} */ (errors))[0];
            if (Array.isArray(first) && first[0]) {
                return String(first[0]);
            }
            if (typeof first === 'string' && first.trim()) {
                return first.trim();
            }
        }
        if (typeof record.message === 'string' && record.message.trim()) {
            return record.message.trim();
        }
    }
    return fallback;
}

/**
 * @param {string} method
 * @param {string} url
 * @param {boolean} ok
 * @returns {string}
 */
export function fallbackActionMessage(method, url, ok) {
    const path = url.split('?')[0];
    const verb = method.toUpperCase();

    /** @type {Array<{ m: string, re: RegExp, s: string, e: string }>} */
    const rules = [
        { m: 'POST', re: /^\/login\/?$/, s: 'Signed in.', e: 'Could not sign in.' },
        { m: 'POST', re: /^\/register\/?$/, s: 'Account created.', e: 'Could not create account.' },
        { m: 'POST', re: /^\/logout\/?$/, s: 'Signed out.', e: 'Could not sign out.' },
        {
            m: 'POST',
            re: /^\/auth\/password\/forgot\/?$/,
            s: 'If that email exists, we sent a reset link.',
            e: 'Could not send reset link.',
        },
        {
            m: 'POST',
            re: /^\/auth\/password\/reset\/?$/,
            s: 'Password reset. You can sign in now.',
            e: 'Could not reset password.',
        },
        {
            m: 'POST',
            re: /^\/email\/verification-notification\/?$/,
            s: 'Verification email sent.',
            e: 'Could not send verification email.',
        },
        { m: 'PATCH', re: /^\/auth\/user\/password\/?$/, s: 'Password updated.', e: 'Could not update password.' },
        { m: 'PATCH', re: /^\/auth\/user\/?$/, s: 'Profile updated.', e: 'Could not update profile.' },
        { m: 'POST', re: /^\/auth\/facilities\/?$/, s: 'Facility added.', e: 'Could not add facility.' },
        { m: 'PATCH', re: /^\/auth\/facilities\/\d+\/?$/, s: 'Facility updated.', e: 'Could not update facility.' },
        {
            m: 'POST',
            re: /^\/auth\/queueing-sessions\/\d+\/duplicate\/?$/,
            s: 'Session duplicated.',
            e: 'Could not duplicate session.',
        },
        {
            m: 'POST',
            re: /^\/auth\/queueing-sessions\/\d+\/end\/?$/,
            s: 'Session ended.',
            e: 'Could not end session.',
        },
        {
            m: 'POST',
            re: /^\/auth\/queueing-sessions\/\d+\/matches\/\d+\/start\/?$/,
            s: 'Match started.',
            e: 'Could not start match.',
        },
        {
            m: 'POST',
            re: /^\/auth\/queueing-sessions\/\d+\/matches\/?$/,
            s: 'Match created.',
            e: 'Could not create match.',
        },
        {
            m: 'PATCH',
            re: /^\/auth\/queueing-sessions\/\d+\/matches\/\d+\/?$/,
            s: 'Match updated.',
            e: 'Could not update match.',
        },
        {
            m: 'DELETE',
            re: /^\/auth\/queueing-sessions\/\d+\/matches\/\d+\/?$/,
            s: 'Match deleted.',
            e: 'Could not delete match.',
        },
        {
            m: 'POST',
            re: /^\/auth\/queueing-sessions\/\d+\/players\/?$/,
            s: 'Player added.',
            e: 'Could not add player.',
        },
        {
            m: 'PATCH',
            re: /^\/auth\/queueing-sessions\/\d+\/players\/\d+\/?$/,
            s: 'Player updated.',
            e: 'Could not update player.',
        },
        {
            m: 'DELETE',
            re: /^\/auth\/queueing-sessions\/\d+\/players\/\d+\/?$/,
            s: 'Player removed.',
            e: 'Could not remove player.',
        },
        {
            m: 'POST',
            re: /^\/auth\/queueing-sessions\/?$/,
            s: 'Queueing session created.',
            e: 'Could not create queueing session.',
        },
        {
            m: 'PATCH',
            re: /^\/auth\/queueing-sessions\/\d+\/?$/,
            s: 'Session updated.',
            e: 'Could not update session.',
        },
        {
            m: 'DELETE',
            re: /^\/auth\/queueing-sessions\/\d+\/?$/,
            s: 'Session deleted.',
            e: 'Could not delete session.',
        },
        {
            m: 'POST',
            re: /^\/auth\/game-sessions\/\d+\/start-match\/?$/,
            s: 'Match started.',
            e: 'Could not start match.',
        },
        {
            m: 'POST',
            re: /^\/auth\/game-sessions\/\d+\/finish-match\/?$/,
            s: 'Match finished.',
            e: 'Could not finish match.',
        },
        { m: 'POST', re: /^\/auth\/game-sessions\/?$/, s: 'Match created.', e: 'Could not create match.' },
    ];

    for (const rule of rules) {
        if (rule.m === verb && rule.re.test(path)) {
            return ok ? rule.s : rule.e;
        }
    }

    if (ok) {
        if (verb === 'DELETE') {
            return 'Deleted.';
        }
        if (verb === 'PATCH') {
            return 'Updated.';
        }
        return 'Saved.';
    }

    return 'Something went wrong. Try again.';
}
