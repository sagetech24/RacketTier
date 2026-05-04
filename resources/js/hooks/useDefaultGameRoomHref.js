import { useEffect, useState } from 'react';
import { fetchFacilities } from '../api/facilities.js';

/**
 * First facility's game room URL, or `/facilities` when none / error.
 * @returns {string}
 */
export function useDefaultGameRoomHref() {
    const [href, setHref] = useState('/facilities');

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const list = await fetchFacilities();
                if (!cancelled && list.length > 0) {
                    setHref(`/facility/${list[0].id}/game-room`);
                }
            } catch {
                /* keep /facilities */
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    return href;
}
