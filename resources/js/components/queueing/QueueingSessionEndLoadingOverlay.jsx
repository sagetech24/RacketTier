import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/**
 * Full-screen overlay while queueing session data is persisted on end.
 *
 * @param {{ open: boolean, queueName?: string | null }} props
 */
export function QueueingSessionEndLoadingOverlay({ open, queueName = null }) {
    useEffect(() => {
        if (!open || typeof document === 'undefined') {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    const label = queueName?.trim() ? queueName.trim() : 'Queue session';

    return createPortal(
        <div
            className="rt-session-end-overlay fixed inset-0 z-[200] flex items-center justify-center bg-[#131316]/55 px-4 backdrop-blur-xl"
            role="presentation"
            aria-hidden={false}
        >
            <div
                className="rt-session-end-panel w-full max-w-sm rounded-2xl border border-[#c2c1ff]/25 bg-[#1b1b1e]/95 p-8 text-center shadow-2xl shadow-black/40"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label="Ending queue session and saving data"
            >
                <div className="relative mx-auto mb-6 h-16 w-16">
                    <div
                        className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#c2c1ff]/20 border-t-[#c2c1ff]"
                        aria-hidden
                    />
                    <div className="absolute inset-2 flex items-center justify-center rounded-full bg-[#c2c1ff]/10">
                        <MaterialIcon name="save" className="text-[28px]! text-[#c2c1ff]" />
                    </div>
                </div>

                <h2 className="text-lg font-bold tracking-tight text-[#e4e1e6]">Ending session</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#918f9c]">
                    Saving <span className="font-medium text-[#c8c5d2]">{label}</span> to the database —
                    players, matches, rankings, and points.
                </p>
                <p className="rt-session-end-dots mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#c2c1ff]/80">
                    Please wait
                </p>
            </div>
        </div>,
        document.body,
    );
}
