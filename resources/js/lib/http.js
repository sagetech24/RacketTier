import { fallbackActionMessage, messageFromJson } from './actionToast.js';
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
            notifyMutationResponse(res, method, url, options);
            return res;
        },
        (err) => {
            notifyNetworkFailure(options, err);
            throw err;
        },
    );
}

/**
 * @param {string} url
 * @param {Record<string, unknown>} body
 * @param {HttpNotifyOptions} [options]
 * @returns {Promise<Response>}
 */
export function postJson(url, body, options) {
    try {
        return wrapMutation(
            fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify(body),
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
        return wrapMutation(
            fetch(url, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify(body),
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
 * @param {HttpNotifyOptions} [options]
 * @returns {Promise<Response>}
 */
export function deleteJson(url, options) {
    try {
        return wrapMutation(
            fetch(url, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
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
