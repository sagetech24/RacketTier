import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children on document.body so overlays escape AppShell stacking
 * (main z-1 vs mobile nav z-50).
 *
 * @param {{
 *   open: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export function ModalPortal({ open, children }) {
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

    return createPortal(children, document.body);
}

/** Shared overlay classes for bottom sheets / centered dialogs above mobile nav. */
export const MODAL_OVERLAY_CLASS =
    'rt-end-match-modal-overlay fixed inset-0 z-200 flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4 md:p-6';

/** Tall sheets that need top breathing room on mobile. */
export const MODAL_OVERLAY_SHEET_CLASS =
    'rt-end-match-modal-overlay fixed inset-0 z-200 flex items-end justify-center p-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6';
