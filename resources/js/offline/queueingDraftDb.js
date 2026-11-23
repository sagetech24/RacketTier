import { getDeviceId } from '../lib/deviceId.js';

const DB_NAME = 'rackettier-queueing-offline';
const DB_VERSION = 2;
const STORE_SESSIONS = 'sessions';
const STORE_MEMBERS = 'memberCache';
const STORE_LIST = 'sessionList';
const LIST_CACHE_KEY = 'queueing-session-list';

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
                if (!db.objectStoreNames.contains(STORE_LIST)) {
                    db.createObjectStore(STORE_LIST, { keyPath: 'cacheKey' });
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
    const saved = await putOfflineSession(record);
    try {
        await upsertSessionListCacheEntry(data.session);
    } catch {
        /* list cache is best-effort */
    }
    return saved;
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

/**
 * @param {unknown[]} rows
 */
export async function putSessionListCache(rows) {
    await withStore(STORE_LIST, 'readwrite', (store) =>
        store.put({
            cacheKey: LIST_CACHE_KEY,
            rows: Array.isArray(rows) ? rows : [],
            updatedAt: new Date().toISOString(),
        }),
    );
}

/**
 * @returns {Promise<unknown[]>}
 */
export async function getSessionListCache() {
    try {
        const row = await withStore(STORE_LIST, 'readonly', (store) => store.get(LIST_CACHE_KEY));
        return Array.isArray(row?.rows) ? row.rows : [];
    } catch {
        return [];
    }
}

/**
 * Upsert one session summary into the cached list (after opening a session online/offline).
 *
 * @param {Record<string, unknown>} session
 */
export async function upsertSessionListCacheEntry(session) {
    if (!session || session.id == null) return;
    const rows = await getSessionListCache();
    const id = Number(session.id);
    const next = rows.filter((row) => Number(row?.id) !== id);
    next.unshift(session);
    await putSessionListCache(next);
}

/**
 * @returns {Promise<QueueingOfflineRecord[]>}
 */
export async function getAllOfflineSessions() {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_SESSIONS, 'readonly');
            const store = tx.objectStore(STORE_SESSIONS);
            const req = store.getAll();
            req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
            req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
        });
    } catch {
        return [];
    }
}

/**
 * Build a list of queueing sessions available offline:
 * last fetched list cache, merged with any locally drafted sessions.
 *
 * @returns {Promise<{ rows: Record<string, unknown>[], fromCache: boolean }>}
 */
export async function getOfflineQueueingSessionList() {
    const cached = /** @type {Record<string, unknown>[]} */ (await getSessionListCache());
    const drafts = await getAllOfflineSessions();
    const byId = new Map();

    for (const row of cached) {
        if (row?.id != null) byId.set(Number(row.id), row);
    }

    for (const draft of drafts) {
        const session = draft?.session;
        if (!session || session.id == null) continue;
        const id = Number(session.id);
        const existing = byId.get(id);
        // Prefer the richer local draft snapshot when present (includes offline edits).
        byId.set(id, {
            ...(existing ?? {}),
            ...session,
            id,
            is_active: session.is_active !== false,
            _offline_local: true,
            _outbox_count: Array.isArray(draft.outbox) ? draft.outbox.length : 0,
        });
    }

    const rows = [...byId.values()];
    return { rows, fromCache: rows.length > 0 };
}

/**
 * Client-side filters mirroring fetchQueueingSessions when serving cache offline.
 *
 * @param {Record<string, unknown>[]} rows
 * @param {{
 *   q?: string,
 *   sort?: string,
 *   mineOnly?: boolean,
 *   status?: string,
 *   currentUserId?: number | null,
 * }} [opts]
 */
export function filterCachedQueueingSessions(rows, opts = {}) {
    let next = [...rows];

    if (opts.mineOnly) {
        next = next.filter((row) => {
            if (row.is_host) return true;
            const uid = opts.currentUserId != null ? Number(opts.currentUserId) : null;
            if (uid == null) return false;
            const createdBy = row.created_by;
            if (createdBy && typeof createdBy === 'object' && createdBy.id != null) {
                return Number(createdBy.id) === uid;
            }
            return Number(row.created_by) === uid;
        });
    }

    if (opts.status === 'active') {
        next = next.filter((row) => row.is_active);
    } else if (opts.status === 'finished') {
        next = next.filter((row) => !row.is_active);
    }

    if (opts.q && opts.q.trim()) {
        const needle = opts.q.trim().toLowerCase();
        next = next.filter((row) => {
            const sport = String(row.sport?.name ?? '').toLowerCase();
            const creator =
                typeof row.created_by === 'object'
                    ? String(row.created_by?.name ?? '').toLowerCase()
                    : '';
            const qName = String(row.queue_name ?? '').toLowerCase();
            return (
                qName.includes(needle) ||
                sport.includes(needle) ||
                creator.includes(needle) ||
                String(row.id).includes(needle)
            );
        });
    }

    const byUpdated = (a, b) =>
        new Date(b.ended_at ?? b.started_at ?? b.updated_at ?? 0).getTime() -
        new Date(a.ended_at ?? a.started_at ?? a.updated_at ?? 0).getTime();
    const byCreated = (a, b) => Number(b.id) - Number(a.id);

    switch (opts.sort) {
        case 'updated_asc':
            next.sort((a, b) => byUpdated(b, a));
            break;
        case 'created_asc':
            next.sort((a, b) => byCreated(b, a));
            break;
        case 'created_desc':
            next.sort(byCreated);
            break;
        case 'updated_desc':
        default:
            next.sort(byUpdated);
            break;
    }

    return next;
}
