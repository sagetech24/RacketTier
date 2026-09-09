import { useEffect } from 'react';

const HTML_LOCK_CLASS = 'rt-lineup-dnd-locked';
const PARENT_LOCK_CLASS = 'rt-lineup-dnd-scroll-parent';

/**
 * While a lineup / check-in drag is active, freeze document and nested
 * scrollers so the page does not chase the pointer. dnd-kit auto-scroll
 * can still update scrollTop when enabled on DndContext.
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
        const body = document.body;
        const scrollY = window.scrollY || html.scrollTop || 0;
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

        const prev = {
            htmlOverflow: html.style.overflow,
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyWidth: body.style.width,
            bodyLeft: body.style.left,
            bodyRight: body.style.right,
        };

        html.classList.add(HTML_LOCK_CLASS);
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';

        const preventTouchMove = (event) => {
            event.preventDefault();
        };
        const preventWheel = (event) => {
            event.preventDefault();
        };

        document.addEventListener('touchmove', preventTouchMove, { passive: false });
        document.addEventListener('wheel', preventWheel, { passive: false });

        return () => {
            document.removeEventListener('touchmove', preventTouchMove);
            document.removeEventListener('wheel', preventWheel);
            html.classList.remove(HTML_LOCK_CLASS);
            for (const parent of parents) {
                parent.classList.remove(PARENT_LOCK_CLASS);
            }
            html.style.overflow = prev.htmlOverflow;
            body.style.overflow = prev.bodyOverflow;
            body.style.position = prev.bodyPosition;
            body.style.top = prev.bodyTop;
            body.style.left = prev.bodyLeft;
            body.style.right = prev.bodyRight;
            body.style.width = prev.bodyWidth;
            window.scrollTo(0, scrollY);
        };
    }, [locked, rootRef]);
}
