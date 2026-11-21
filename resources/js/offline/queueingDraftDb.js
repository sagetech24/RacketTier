import { getDeviceId } from '../lib/deviceId.js';

const DB_NAME = 'rackettier-queueing-offline';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_MEMBERS = 'memberCache';

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB is not available'));
    }
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
                    db.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' });
                }
                if (!db.objectStoreNames.contains(STORE_MEMBERS)) {
                    db.createObjectStore(STORE_MEMBERS, { keyPath: 'cacheKey' });
                }
            };
        });
    }
    return dbPromise;
}

/**
 * @template T
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} run
 * @returns {Promise<T>}
 */
async function withStore(storeName, mode, run) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = run(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
}

/**
 * @typedef {{
 *   sessionId: number,
 *   session: Record<string, unknown>,
 *   matches: unknown[],
 *   draft_version: number,
 *   outbox: Array<{
 *     id: string,
 *     type: string,
 *     payload: Record<string, unknown>,
 *     baseVersion: number,
 *     createdAt: string,
 *   }>,
 *   offlineOwnerDeviceId: string | null,
 *   pendingEnd: boolean,
 *   auto_suggest_matches: unknown[] | null,
 *   conflict: boolean,
 *   updatedAt: string,
 * }} QueueingOfflineRecord
 */

/**
 * @param {number|string} sessionId
 * @returns {Promise<QueueingOfflineRecord | null>}
 */
export async function getOfflineSession(sessionId) {
    try {
        const row = await withStore(STORE_SESSIONS, 'readonly', (store) =>
            store.get(Number(sessionId)),
        );
        return row ?? null;
    } catch {
        return null;
    }
}

/**
 * @param {QueueingOfflineRecord} record
 */
export async function putOfflineSession(record) {
    const payload = {
        ...record,
        sessionId: Number(record.sessionId),
        updatedAt: new Date().toISOString(),
    };
    await withStore(STORE_SESSIONS, 'readwrite', (store) => store.put(payload));
    return payload;
}

/**
 * Seed or refresh local replica from an online API hydrate.
 * Preserves outbox / pendingEnd / conflict unless replaceOutbox is true.
 *
 * @param {number|string} sessionId
 * @param {{
 *   session: Record<string, unknown>,
 *   matches?: unknown[],
 *   replaceOutbox?: boolean,
 * }} data
 */
export async function seedOfflineSession(sessionId, data) {
    const existing = await getOfflineSession(sessionId);
    const draftVersion = Number(data.session?.draft_version ?? 0);
    const record = {
        sessionId: Number(sessionId),
        session: data.session,
        matches: Array.isArray(data.matches) ? data.matches : (existing?.matches ?? []),
        draft_version: draftVersion,
        outbox: data.replaceOutbox ? [] : (existing?.outbox ?? []),
        offlineOwnerDeviceId: existing?.offlineOwnerDeviceId ?? getDeviceId(),
        pendingEnd: data.replaceOutbox ? false : Boolean(existing?.pendingEnd),
        auto_suggest_matches: Array.isArray(data.session?.auto_suggest_matches)
            ? data.session.auto_suggest_matches
            : (existing?.auto_suggest_matches ?? null),
        conflict: data.replaceOutbox ? false : Boolean(existing?.conflict),
        updatedAt: new Date().toISOString(),
    };
    return putOfflineSession(record);
}

/**
 * @param {number|string} sessionId
 * @param {{
 *   id: string,
 *   type: string,
 *   payload: Record<string, unknown>,
 *   baseVersion: number,
 * }} entry
 */
export async function appendOutbox(sessionId, entry) {
    const row = await getOfflineSession(sessionId);
    if (!row) {
        throw new Error('No offline session to append outbox entry');
    }
    row.outbox = [
        ...(row.outbox ?? []),
        {
            ...entry,
            createdAt: new Date().toISOString(),
        },
    ];
    return putOfflineSession(row);
}

/**
 * @param {number|string} sessionId
 * @param {string} outboxId
 */
export async function removeOutboxEntry(sessionId, outboxId) {
    const row = await getOfflineSession(sessionId);
    if (!row) return null;
    row.outbox = (row.outbox ?? []).filter((e) => e.id !== outboxId);
    return putOfflineSession(row);
}

/**
 * @param {number|string} sessionId
 * @param {boolean} pendingEnd
 */
export async function setPendingEnd(sessionId, pendingEnd) {
    const row = await getOfflineSession(sessionId);
    if (!row) return null;
    row.pendingEnd = pendingEnd;
    return putOfflineSession(row);
}

/**
 * @param {number|string} sessionId
 * @param {boolean} conflict
 */
export async function setConflict(sessionId, conflict) {
    const row = await getOfflineSession(sessionId);
    if (!row) return null;
    row.conflict = conflict;
    return putOfflineSession(row);
}

/**
 * Discard local outbox and replace with server hydrate (Take over / refresh).
 *
 * @param {number|string} sessionId
 * @param {{ session: Record<string, unknown>, matches?: unknown[] }} data
 */
export async function takeOverOfflineSession(sessionId, data) {
    return seedOfflineSession(sessionId, {
        ...data,
        replaceOutbox: true,
    }).then(async (record) => {
        record.offlineOwnerDeviceId = getDeviceId();
        record.conflict = false;
        record.pendingEnd = false;
        return putOfflineSession(record);
    });
}

/**
 * @param {string} cacheKey
 * @param {unknown[]} members
 */
export async function putMemberCache(cacheKey, members) {
    await withStore(STORE_MEMBERS, 'readwrite', (store) =>
        store.put({
            cacheKey,
            members,
            updatedAt: new Date().toISOString(),
        }),
    );
}

/**
 * @param {string} cacheKey
 * @returns {Promise<unknown[]>}
 */
export async function getMemberCache(cacheKey) {
    try {
        const row = await withStore(STORE_MEMBERS, 'readonly', (store) => store.get(cacheKey));
        return Array.isArray(row?.members) ? row.members : [];
    } catch {
        return [];
    }
}

export function memberCacheKey(sportId) {
    return `sport:${sportId ?? 'all'}`;
}
