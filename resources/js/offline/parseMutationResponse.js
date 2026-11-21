/**
 * @param {Response} res
 */
export async function parseMutationResponse(res) {
    let json = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }
    if (res.status === 409) {
        throw Object.assign(new Error(json.message || 'Conflict'), {
            status: 409,
            draft_version: json.draft_version,
        });
    }
    if (res.status === 401 || res.status === 419) {
        throw Object.assign(new Error(json.message || 'Unauthorized'), { status: res.status });
    }
    if (!res.ok) {
        throw Object.assign(new Error(json.message || 'Request failed'), { status: res.status });
    }
    const data = json.data ?? json;
    return {
        ...data,
        draft_version: data?.draft_version ?? json.draft_version,
    };
}
