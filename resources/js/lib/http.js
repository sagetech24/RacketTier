import { fallbackActionMessage, messageFromJson } from './actionToast.js';
import { markNetworkFailure, markNetworkSuccess } from './connection.js';
import { isToastSilent, toast } from './toast.js';

/**
 * @typedef {{ silent?: boolean }} HttpNotifyOptions
 */

/**
 * @returns {string}
 */
export function csrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (!meta?.getAttribute('content')) {
        throw new Error('Missing CSRF meta tag');
    }
    return meta.getAttribute('content');
}

/**
 * @param {Response} res
 * @param {string} method
 * @param {string} url
 * @param {HttpNotifyOptions} [options]
 */
function notifyMutationResponse(res, method, url, options) {
    if (options?.silent || isToastSilent()) {
        return;
    }
    const clone = res.clone();
    void clone
        .json()
        .catch(() => ({}))
        .then((data) => {
            const fallback = fallbackActionMessage(method, url, res.ok);
            const message = messageFromJson(data, fallback);
            if (res.ok) {
                toast.success(message);
            } else {
                toast.error(message);
            }
        });
}

/**
 * @param {HttpNotifyOptions} [options]
 * @param {unknown} [err]
 */
function notifyNetworkFailure(options, err) {
    if (options?.silent || isToastSilent()) {
        return;
    }
    const text =
        err instanceof Error && err.message === 'Missing CSRF meta tag'
            ? err.message
            : 'Network error. Check your connection.';
    toast.error(text);
}

/**
 * @param {Promise<Response>} request
 * @param {string} method
 * @param {string} url
 * @param {HttpNotifyOptions} [options]
 * @returns {Promise<Response>}
 */
function wrapMutation(request, method, url, options) {
    return request.then(
        (res) => {
            markNetworkSuccess();
            notifyMutationResponse(res, method, url, options);
            return res;
        },
        (err) => {
            markNetworkFailure();
            notifyNetworkFailure(options, err);
            throw err;
        },
    );
}

/**
 * @param {Record<string, unknown>} [body]
 * @param {number|null|undefined} draftVersion
 * @returns {Record<string, unknown>}
 */
export function withDraftVersion(body = {}, draftVersion) {
    if (draftVersion === null || draftVersion === undefined || Number.isNaN(Number(draftVersion))) {
        return body;
    }
    return { ...body, draft_version: Number(draftVersion) };
}

/**
 * @param {number|null|undefined} draftVersion
 * @returns {Record<string, string>}
 */
export function draftVersionHeaders(draftVersion) {
    if (draftVersion === null || draftVersion === undefined || Number.isNaN(Number(draftVersion))) {
        return {};
    }
    return { 'X-Draft-Version': String(Number(draftVersion)) };
}

/**
 * @param {string} url
 * @param {Record<string, unknown>} body
 * @param {HttpNotifyOptions} [options]
 * @returns {Promise<Response>}
 */
export function postJson(url, body, options) {
    try {
        const draftVersion = options?.draftVersion ?? body?.draft_version;
        return wrapMutation(
            fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    ...draftVersionHeaders(draftVersion),
                },
                credentials: 'same-origin',
                body: JSON.stringify(withDraftVersion(body ?? {}, draftVersion)),
            }),
            'POST',
            url,
            options,
        );
    } catch (err) {
        notifyNetworkFailure(options, err);
        return Promise.reject(err);
    }
}

/**
 * @param {string} url
 * @param {Record<string, unknown>} body
 * @param {HttpNotifyOptions} [options]
 * @returns {Promise<Response>}
 */
export function patchJson(url, body, options) {
    try {
        const draftVersion = options?.draftVersion ?? body?.draft_version;
        return wrapMutation(
            fetch(url, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    ...draftVersionHeaders(draftVersion),
                },
                credentials: 'same-origin',
                body: JSON.stringify(withDraftVersion(body ?? {}, draftVersion)),
            }),
            'PATCH',
            url,
            options,
        );
    } catch (err) {
        notifyNetworkFailure(options, err);
        return Promise.reject(err);
    }
}

/**
 * @param {string} url
 * @param {HttpNotifyOptions & { draftVersion?: number|null, body?: Record<string, unknown> }} [options]
 * @returns {Promise<Response>}
 */
export function deleteJson(url, options) {
    try {
        const headers = {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            ...draftVersionHeaders(options?.draftVersion),
        };
        const hasBody = options?.body != null;
        if (hasBody) {
            headers['Content-Type'] = 'application/json';
        }
        return wrapMutation(
            fetch(url, {
                method: 'DELETE',
                headers,
                credentials: 'same-origin',
                body: hasBody
                    ? JSON.stringify(withDraftVersion(options.body, options?.draftVersion))
                    : undefined,
            }),
            'DELETE',
            url,
            options,
        );
    } catch (err) {
        notifyNetworkFailure(options, err);
        return Promise.reject(err);
    }
}

/**
 * @param {string} url
 * @param {Record<string, string>} fields
 * @param {HttpNotifyOptions} [options]
 * @returns {Promise<Response>}
 */
export function postForm(url, fields, options) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value);
    }

    try {
        return wrapMutation(
            fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: body.toString(),
            }),
            'POST',
            url,
            options,
        );
    } catch (err) {
        notifyNetworkFailure(options, err);
        return Promise.reject(err);
    }
}
