import { useEffect, useRef, useState } from 'react';

/**
 * Keeps loading UI visible for at least `minimumMs` once loading starts.
 *
 * @param {boolean} isLoading
 * @param {number} [minimumMs=2000]
 */
export function useMinimumLoadingDuration(isLoading, minimumMs = 2000) {
    const [visible, setVisible] = useState(isLoading);
    const loadingStartedAt = useRef(Date.now());
    const wasLoading = useRef(isLoading);

    useEffect(() => {
        if (isLoading) {
            if (!wasLoading.current) {
                loadingStartedAt.current = Date.now();
            }
            wasLoading.current = true;
            setVisible(true);
            return undefined;
        }

        wasLoading.current = false;
        const elapsed = Date.now() - loadingStartedAt.current;
        const remaining = Math.max(0, minimumMs - elapsed);
        const timer = window.setTimeout(() => setVisible(false), remaining);
        return () => window.clearTimeout(timer);
    }, [isLoading, minimumMs]);

    return visible;
}
