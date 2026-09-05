import { useEffect } from 'react';

const HTML_LOCK_CLASS = 'rt-lineup-dnd-locked';
const PARENT_LOCK_CLASS = 'rt-lineup-dnd-scroll-parent';

/**
 * While a lineup drag is active, block native touch scrolling so the sheet
 * does not chase the pointer. dnd-kit auto-scroll still updates scrollTop.
 *
 * @param {boolean} locked
 * @param {import('react').RefObject<HTMLElement | null>} rootRef
 */
export function useDragScrollLock(locked, rootRef) {
    useEffect(() => {
        if (!locked || typeof document === 'undefined') {
            return undefined;
        }

        const html = document.documentElement;
        const parents = [];
        let node = rootRef.current;

        while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            const overflowY = style.overflowY;
            const overflowX = style.overflowX;
            if (
                overflowY === 'auto' ||
                overflowY === 'scroll' ||
                overflowX === 'auto' ||
                overflowX === 'scroll'
            ) {
                node.classList.add(PARENT_LOCK_CLASS);
                parents.push(node);
            }
            node = node.parentElement;
        }

        html.classList.add(HTML_LOCK_CLASS);

        const preventTouchMove = (event) => {
            event.preventDefault();
        };

        document.addEventListener('touchmove', preventTouchMove, { passive: false });

        return () => {
            document.removeEventListener('touchmove', preventTouchMove);
            html.classList.remove(HTML_LOCK_CLASS);
            for (const parent of parents) {
                parent.classList.remove(PARENT_LOCK_CLASS);
            }
        };
    }, [locked, rootRef]);
}
