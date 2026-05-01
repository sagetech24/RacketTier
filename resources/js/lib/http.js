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
 * @param {string} url
 * @param {Record<string, string>} fields
 * @returns {Promise<Response>}
 */
export function postForm(url, fields) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
        body.set(key, value);
    }

    return fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
        body: body.toString(),
    });
}
