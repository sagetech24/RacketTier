import { useEffect, useState } from 'react';

/**
 * @param {string} value
 * @param {number} [delayMs=300]
 */
export function useDebouncedValue(value, delayMs = 300) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
