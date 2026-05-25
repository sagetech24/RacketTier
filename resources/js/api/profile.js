import { patchJson } from '../lib/http.js';

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   email: string,
 *   age: number | null,
 *   pronoun: string | null,
 *   member_since: string | null,
 *   member_since_human: string | null,
 *   is_admin: boolean
 * }} ProfileUser
 */

/**
 * @param {{ name: string, email: string, age: number | string | null, pronoun: string | null }} payload
 * @returns {Promise<ProfileUser>}
 */
export async function updateUserProfile(payload) {
    const res = await patchJson('/auth/user', payload);
    const data = await res.json().catch(() => ({}));

    if (res.status === 422) {
        const err = new Error(data.message ?? 'Check the form and try again.');
        /** @type {Record<string, string[]>} */
        const errors = data.errors ?? {};
        Object.assign(err, { errors, status: 422 });
        throw err;
    }

    if (!res.ok) {
        throw new Error(data.message ?? 'Could not update profile');
    }

    if (!data.user) {
        throw new Error('Invalid response');
    }

    return data.user;
}

/**
 * @param {{ current_password: string, password: string, password_confirmation: string }} payload
 * @returns {Promise<void>}
 */
export async function updateUserPassword(payload) {
    const res = await patchJson('/auth/user/password', payload);
    const data = await res.json().catch(() => ({}));

    if (res.status === 422) {
        const err = new Error(data.message ?? 'Check the form and try again.');
        /** @type {Record<string, string[]>} */
        const errors = data.errors ?? {};
        Object.assign(err, { errors, status: 422 });
        throw err;
    }

    if (!res.ok) {
        throw new Error(data.message ?? 'Could not update password');
    }
}
