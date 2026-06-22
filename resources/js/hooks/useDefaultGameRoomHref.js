import { useMemo } from 'react';
import { useFacilitiesQuery } from './queries/useFacilitiesQuery.js';

/**
 * First facility's game room URL, or `/facilities` when none / error.
 * @returns {string}
 */
export function useDefaultGameRoomHref() {
    const { data: list } = useFacilitiesQuery('');

    return useMemo(() => {
        if (list?.length) {
            return `/facility/${list[0].id}/game-room`;
        }
        return '/facilities';
    }, [list]);
}
