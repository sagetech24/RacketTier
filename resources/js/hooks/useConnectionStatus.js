import { useEffect, useState } from 'react';
import {
    getConnectionStatus,
    getOutboxCount,
    subscribeConnection,
    wireConnectionListeners,
} from '../lib/connection.js';

/**
 * @returns {{
 *   status: 'online' | 'offline' | 'syncing',
 *   isOffline: boolean,
 *   isSyncing: boolean,
 *   outboxCount: number,
 * }}
 */
export function useConnectionStatus() {
    const [status, setStatus] = useState(getConnectionStatus);
    const [outboxCount, setOutboxCount] = useState(getOutboxCount);

    useEffect(() => {
        wireConnectionListeners();
        return subscribeConnection((next, meta) => {
            setStatus(next);
            if (typeof meta?.outboxCount === 'number') {
                setOutboxCount(meta.outboxCount);
            }
        });
    }, []);

    return {
        status,
        isOffline: status === 'offline',
        isSyncing: status === 'syncing',
        outboxCount,
    };
}
