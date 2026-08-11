import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { dismissToast, getToasts, subscribeToasts } from '../../lib/toast.js';

const SUCCESS_MS = 3500;
const ERROR_MS = 5200;
const EXIT_MS = 180;

/**
 * @param {{ type: 'success' | 'error' | 'info' }} props
 */
function ToastIcon({ type }) {
    if (type === 'error') {
        return (
            <svg className="rt-toast-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                    d="M10 6.25v4.5M10 13.75h.008M17.5 10a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            </svg>
        );
    }
    if (type === 'info') {
        return (
            <svg className="rt-toast-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                    d="M10 9v4.25M10 6.25h.008M17.5 10a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            </svg>
        );
    }
    return (
        <svg className="rt-toast-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
                d="M7.5 10.25 9.25 12l3.5-4.25M17.5 10a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * @param {{
 *   item: { id: number, type: 'success' | 'error' | 'info', message: string },
 * }} props
 */
function ToastCard({ item }) {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const hold = item.type === 'error' ? ERROR_MS : SUCCESS_MS;
        const timer = window.setTimeout(() => setLeaving(true), hold);
        return () => window.clearTimeout(timer);
    }, [item.id, item.type]);

    useEffect(() => {
        if (!leaving) {
            return undefined;
        }
        const timer = window.setTimeout(() => dismissToast(item.id), EXIT_MS);
        return () => window.clearTimeout(timer);
    }, [leaving, item.id]);

    return (
        <div
            className={['rt-toast', `rt-toast--${item.type}`, leaving ? 'rt-toast--out' : ''].filter(Boolean).join(' ')}
            role={item.type === 'error' ? 'alert' : 'status'}
        >
            <ToastIcon type={item.type} />
            <p className="rt-toast-message">{item.message}</p>
            <button
                type="button"
                className="rt-toast-dismiss"
                aria-label="Dismiss notification"
                onClick={() => setLeaving(true)}
            >
                <svg viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
            </button>
        </div>
    );
}

export function ToastHost() {
    const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

    if (typeof document === 'undefined' || items.length === 0) {
        return null;
    }

    return createPortal(
        <div className="rt-toast-region" aria-live="polite" aria-relevant="additions">
            {items.map((item) => (
                <ToastCard key={item.id} item={item} />
            ))}
        </div>,
        document.body,
    );
}
