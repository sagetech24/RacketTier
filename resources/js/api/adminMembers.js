/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   email: string,
 *   age: number | null,
 *   pronoun: string | null,
 *   member_since: string | null,
 *   member_since_human: string | null,
 *   is_admin: boolean,
 *   email_verified: boolean,
 *   email_verified_at: string | null
 * }} AdminMemberRow
 */

/**
 * @typedef {{
 *   current_page: number,
 *   last_page: number,
 *   per_page: number,
 *   total: number,
 *   from: number | null,
 *   to: number | null
 * }} AdminMembersMeta
 */

/**
 * @typedef {{
 *   data: AdminMemberRow[],
 *   meta: AdminMembersMeta
 * }} AdminMembersPage
 */

export class AdminMembersForbiddenError extends Error {
    constructor() {
        super('Forbidden');
        this.name = 'AdminMembersForbiddenError';
        this.status = 403;
    }
}

/**
 * @param {number} [page]
 * @param {number} [perPage]
 * @param {string} [q]
 * @returns {Promise<AdminMembersPage>}
 */
export async function fetchAdminMembers(page = 1, perPage = 20, q = '') {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    if (q.trim()) {
        params.set('q', q.trim());
    }

    const res = await fetch(`/auth/admin/members?${params}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (res.status === 403) {
        throw new AdminMembersForbiddenError();
    }
    if (!res.ok) {
        throw new Error('Failed to load members');
    }

    const json = await res.json();
    return {
        data: json.data ?? [],
        meta: json.meta ?? {
            current_page: page,
            last_page: 1,
            per_page: perPage,
            total: 0,
            from: null,
            to: null,
        },
    };
}
