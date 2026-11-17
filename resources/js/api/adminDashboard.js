import { AdminMembersForbiddenError } from './adminMembers.js';
import { deleteJson, patchJson, postJson } from '../lib/http.js';

/**
 * @returns {Promise<{
 *   total_members: number,
 *   unverified_members: number,
 *   total_facilities: number,
 *   active_queueing_sessions: number,
 *   matches_finished_today: number,
 *   queueing_sessions_ended_today: number
 * }>}
 */
export async function fetchAdminSummary() {
    const res = await fetch('/auth/admin/summary', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 403) {
        throw new AdminMembersForbiddenError();
    }
    if (!res.ok) {
        throw new Error('Failed to load admin summary');
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number} userId
 */
export async function fetchAdminMemberDetail(userId) {
    const res = await fetch(`/auth/admin/members/${userId}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 403) {
        throw new AdminMembersForbiddenError();
    }
    if (res.status === 404) {
        throw new Error('Member not found');
    }
    if (!res.ok) {
        throw new Error('Failed to load member');
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number} userId
 * @param {{ sport_id?: number, limit?: number }} [params]
 */
export async function fetchAdminMemberAudit(userId, params = {}) {
    const qs = new URLSearchParams();
    if (params.sport_id) {
        qs.set('sport_id', String(params.sport_id));
    }
    if (params.limit) {
        qs.set('limit', String(params.limit));
    }
    const suffix = qs.toString() ? `?${qs}` : '';
    const res = await fetch(`/auth/admin/members/${userId}/audit${suffix}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 403) {
        throw new AdminMembersForbiddenError();
    }
    if (!res.ok) {
        throw new Error('Failed to load audit');
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number} userId
 * @param {{ sport_id: number, amount: number, reason: string }} payload
 */
export async function postAdjustMemberRating(userId, payload) {
    const res = await postJson(`/auth/admin/members/${userId}/adjust-rating`, payload);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message ?? 'Could not adjust rating');
    }
    return data.data;
}

/**
 * @param {number} userId
 * @param {{ sport_id: number, amount: number, reason: string }} payload
 */
export async function postAdjustMemberWallet(userId, payload) {
    const res = await postJson(`/auth/admin/members/${userId}/adjust-wallet`, payload);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message ?? 'Could not adjust wallet');
    }
    return data.data;
}

/**
 * @param {{
 *   page?: number,
 *   per_page?: number,
 *   status?: string,
 *   sport_id?: number,
 *   q?: string
 * }} [params]
 */
export async function fetchAdminSessions(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.per_page) qs.set('per_page', String(params.per_page));
    if (params.status) qs.set('status', params.status);
    if (params.sport_id) qs.set('sport_id', String(params.sport_id));
    if (params.q?.trim()) qs.set('q', params.q.trim());

    const res = await fetch(`/auth/admin/sessions?${qs}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 403) {
        throw new AdminMembersForbiddenError();
    }
    if (!res.ok) {
        throw new Error('Failed to load sessions');
    }
    const json = await res.json();
    return {
        data: json.data ?? [],
        meta: json.meta ?? { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    };
}

/**
 * @param {{ q?: string, include_archived?: boolean }} [params]
 */
export async function fetchAdminFacilities(params = {}) {
    const qs = new URLSearchParams();
    if (params.q?.trim()) qs.set('q', params.q.trim());
    if (params.include_archived) qs.set('include_archived', '1');

    const res = await fetch(`/auth/admin/facilities?${qs}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 403) {
        throw new AdminMembersForbiddenError();
    }
    if (!res.ok) {
        throw new Error('Failed to load facilities');
    }
    const json = await res.json();
    return json.data ?? [];
}

/**
 * @param {number} facilityId
 */
export async function deleteFacility(facilityId) {
    const res = await deleteJson(`/auth/facilities/${facilityId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message ?? 'Could not archive facility');
    }
}

/**
 * @param {number} facilityId
 */
export async function restoreFacility(facilityId) {
    const res = await postJson(`/auth/facilities/${facilityId}/restore`, {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message ?? 'Could not restore facility');
    }
    return data.data;
}

/**
 * @param {number} [sportId]
 */
export async function fetchAdminTierRanks(sportId) {
    const qs = new URLSearchParams();
    if (sportId) qs.set('sport_id', String(sportId));
    const res = await fetch(`/auth/admin/tier-ranks?${qs}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 403) {
        throw new AdminMembersForbiddenError();
    }
    if (!res.ok) {
        throw new Error('Failed to load tier ranks');
    }
    const json = await res.json();
    return json.data;
}

/**
 * @param {number} tierId
 * @param {Record<string, unknown>} payload
 */
export async function patchAdminTierRank(tierId, payload) {
    const res = await patchJson(`/auth/admin/tier-ranks/${tierId}`, payload);
    const data = await res.json().catch(() => ({}));
    if (res.status === 422) {
        const err = new Error(data.message ?? 'Check the form and try again.');
        Object.assign(err, { errors: data.errors ?? {} });
        throw err;
    }
    if (!res.ok) {
        throw new Error(data.message ?? 'Could not update tier');
    }
    return data.data;
}
