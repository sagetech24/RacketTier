import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProductTour } from './ProductTourContext.jsx';

/**
 * Spotlight overlay + tooltip for the product tour.
 * Welcome (no target) is centered; later steps anchor near the highlight only.
 */
export function ProductTourOverlay() {
    const {
        run,
        tourKind,
        step,
        stepIndex,
        stepCount,
        targetRect,
        targetReady,
        next,
        back,
        skip,
        finish,
    } = useProductTour();
    const titleId = useId();
    const descId = useId();
    const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));
    const primaryRef = useRef(/** @type {HTMLButtonElement | null} */ (null));

    const isLast = stepIndex >= stepCount - 1;
    const isFirst = stepIndex <= 0;
    const hasTarget = Boolean(step?.target && targetRect);

    useEffect(() => {
        if (!run || !targetReady) return;
        primaryRef.current?.focus();
    }, [run, targetReady, stepIndex]);

    useEffect(() => {
        if (!run) return undefined;
        function onKeyDown(e) {
            if (e.key !== 'Tab' || !panelRef.current) return;
            const focusable = panelRef.current.querySelectorAll(
                'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            const list = Array.from(focusable).filter(
                (el) => el instanceof HTMLElement && !el.hasAttribute('disabled'),
            );
            if (list.length === 0) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [run]);

    if (!run || !step || typeof document === 'undefined') {
        return null;
    }

    if (!targetReady) {
        return createPortal(
            <div className="rt-product-tour-root" data-tour-active="true" aria-busy="true">
                <div className="rt-product-tour-backdrop" aria-hidden />
            </div>,
            document.body,
        );
    }

    const hole = hasTarget
        ? {
              top: Math.max(0, targetRect.top),
              left: Math.max(0, targetRect.left),
              width: Math.min(targetRect.width, window.innerWidth - Math.max(0, targetRect.left)),
              height: Math.min(targetRect.height, window.innerHeight - Math.max(0, targetRect.top)),
          }
        : null;

    const accentClass = step.accent ? 'rt-product-tour-hole--accent' : '';

    const panel = (
        <div
            ref={panelRef}
            className="rt-product-tour-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
        >
            <div className="rt-product-tour-panel-meta" aria-live="polite">
                <span className="rt-product-tour-progress">
                    {tourKind === 'run-session' ? 'Session · ' : ''}
                    {stepIndex + 1} / {stepCount}
                </span>
                <button type="button" className="rt-product-tour-skip" onClick={skip}>
                    Skip
                </button>
            </div>
            <h2 id={titleId} className="rt-product-tour-title">
                {step.title}
            </h2>
            <p id={descId} className="rt-product-tour-body">
                {step.body}
            </p>
            <div className="rt-product-tour-actions">
                <button
                    type="button"
                    className="rt-product-tour-btn-secondary"
                    onClick={back}
                    disabled={isFirst}
                >
                    Back
                </button>
                <button
                    ref={primaryRef}
                    type="button"
                    className="rt-product-tour-btn-primary"
                    onClick={() => {
                        if (isLast) finish();
                        else void next();
                    }}
                >
                    {isLast ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    );

    return createPortal(
        <div className="rt-product-tour-root" data-tour-active="true">
            {hole ? (
                <>
                    {/* Four blockers leave the highlight clickable (optional). */}
                    <div
                        className="rt-product-tour-shade"
                        style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }}
                        aria-hidden
                    />
                    <div
                        className="rt-product-tour-shade"
                        style={{
                            top: hole.top + hole.height,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                        aria-hidden
                    />
                    <div
                        className="rt-product-tour-shade"
                        style={{
                            top: hole.top,
                            left: 0,
                            width: Math.max(0, hole.left),
                            height: hole.height,
                        }}
                        aria-hidden
                    />
                    <div
                        className="rt-product-tour-shade"
                        style={{
                            top: hole.top,
                            left: hole.left + hole.width,
                            right: 0,
                            height: hole.height,
                        }}
                        aria-hidden
                    />
                    <div
                        className={['rt-product-tour-hole', accentClass].filter(Boolean).join(' ')}
                        style={{
                            top: hole.top,
                            left: hole.left,
                            width: hole.width,
                            height: hole.height,
                        }}
                        aria-hidden
                    />
                </>
            ) : (
                <div className="rt-product-tour-backdrop" aria-hidden />
            )}

            {hasTarget ? (
                <div
                    className="rt-product-tour-anchor"
                    style={(() => {
                        const panelH = 220;
                        const gap = 12;
                        const below = (hole?.top ?? 0) + (hole?.height ?? 0) + gap;
                        const placeAbove = below + panelH > window.innerHeight - 16;
                        const top = placeAbove
                            ? Math.max(16, (hole?.top ?? 0) - panelH - gap)
                            : Math.min(below, window.innerHeight - panelH - 16);
                        return {
                            top,
                            left: Math.min(
                                Math.max(16, hole?.left ?? 16),
                                window.innerWidth - 336,
                            ),
                        };
                    })()}
                >
                    {panel}
                </div>
            ) : (
                <div className="rt-product-tour-center">{panel}</div>
            )}
        </div>,
        document.body,
    );
}
