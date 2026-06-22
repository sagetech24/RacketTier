import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 10_000;
const MAX_BACKOFF_MS = 60_000;

/**
 * Polls a callback on an interval while the document tab is visible.
 * Backs off on consecutive errors.
 *
 * @param {() => Promise<void>} callback
 * @param {{ enabled?: boolean, intervalMs?: number }} [options]
 */
export function useVisibilityPolling(callback, options = {}) {
    const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = options;
    const callbackRef = useRef(callback);
    const errorCountRef = useRef(0);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        let timerId = null;
        let cancelled = false;

        const schedule = (delay) => {
            if (cancelled) {
                return;
            }
            timerId = window.setTimeout(tick, delay);
        };

        const tick = async () => {
            if (cancelled || document.hidden) {
                schedule(intervalMs);
                return;
            }

            try {
                await callbackRef.current();
                errorCountRef.current = 0;
            } catch {
                errorCountRef.current += 1;
            }

            const backoff = Math.min(
                intervalMs * 2 ** errorCountRef.current,
                MAX_BACKOFF_MS,
            );
            schedule(backoff);
        };

        const onVisibility = () => {
            if (!document.hidden && !cancelled) {
                window.clearTimeout(timerId);
                tick();
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        schedule(intervalMs);

        return () => {
            cancelled = true;
            window.clearTimeout(timerId);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, intervalMs]);
}
