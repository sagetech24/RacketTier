import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
    clearRunSessionTourDismissed,
    clearRunSessionTourPending,
    clearTourDismissed,
    clearTourPending,
    isLiveQueueingSessionPath,
    isRunSessionTourDismissed,
    isRunSessionTourPending,
    isTourDismissed,
    isTourPending,
    markRunSessionTourDismissed,
    markRunSessionTourPending,
    markTourDismissed,
} from '../../lib/productTourStorage.js';
import { ProductTourContext } from './ProductTourContext.jsx';
import {
    PRODUCT_TOUR_RUN_SESSION_STEPS,
    PRODUCT_TOUR_STEPS,
    resolveTourStepRoute,
} from './productTourSteps.js';
import { ProductTourOverlay } from './ProductTourOverlay.jsx';

export { useProductTour } from './ProductTourContext.jsx';

const HIGHLIGHT_PAD = 8;
const SELECTOR_WAIT_MS = 8000;
const SELECTOR_POLL_MS = 50;

/**
 * @param {string} tourId
 * @returns {Element | null}
 */
function findTourTarget(tourId) {
    const nodes = Array.from(document.querySelectorAll(`[data-tour="${tourId}"]`));
    if (nodes.length === 0) return null;

    const visible = nodes.filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    });

    return visible[0] ?? nodes[0];
}

/**
 * @param {string} tourId
 * @param {AbortSignal} signal
 * @returns {Promise<Element | null>}
 */
function waitForTourTarget(tourId, signal) {
    return new Promise((resolve) => {
        const started = Date.now();

        const tick = () => {
            if (signal.aborted) {
                resolve(null);
                return;
            }
            const el = findTourTarget(tourId);
            if (el) {
                resolve(el);
                return;
            }
            if (Date.now() - started >= SELECTOR_WAIT_MS) {
                resolve(null);
                return;
            }
            window.setTimeout(tick, SELECTOR_POLL_MS);
        };

        tick();
    });
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function ProductTourProvider({ children }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    /** @type {[import('./ProductTourContext.jsx').ProductTourKind, Function]} */
    const [tourKind, setTourKind] = useState(/** @type {import('./ProductTourContext.jsx').ProductTourKind} */ (null));
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [sessionId, setSessionId] = useState(/** @type {number | null} */ (null));
    const [targetRect, setTargetRect] = useState(/** @type {DOMRect | null} */ (null));
    const [targetReady, setTargetReady] = useState(false);
    const [forceFabMenu, setForceFabMenu] = useState(false);
    const abortRef = useRef(/** @type {AbortController | null} */ (null));
    const startingRef = useRef(false);

    const steps = tourKind === 'run-session' ? PRODUCT_TOUR_RUN_SESSION_STEPS : PRODUCT_TOUR_STEPS;
    const step = run ? steps[stepIndex] ?? null : null;
    const fabMenuOpen = Boolean(run && tourKind === 'run-session' && forceFabMenu);

    const dismiss = useCallback(() => {
        abortRef.current?.abort();
        if (tourKind === 'run-session') {
            markRunSessionTourDismissed();
            clearRunSessionTourPending();
        } else {
            markTourDismissed();
            clearTourPending();
        }
        setRun(false);
        setTourKind(null);
        setStepIndex(0);
        setSessionId(null);
        setTargetRect(null);
        setTargetReady(false);
        setForceFabMenu(false);
        startingRef.current = false;
    }, [tourKind]);

    const measureTarget = useCallback((el) => {
        if (!el || !(el instanceof HTMLElement)) {
            setTargetRect(null);
            return;
        }
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
        const rect = el.getBoundingClientRect();
        setTargetRect(
            new DOMRect(
                rect.x - HIGHLIGHT_PAD,
                rect.y - HIGHLIGHT_PAD,
                rect.width + HIGHLIGHT_PAD * 2,
                rect.height + HIGHLIGHT_PAD * 2,
            ),
        );
    }, []);

    const prepareStep = useCallback(
        async (kind, index, activeSessionId) => {
            const list = kind === 'run-session' ? PRODUCT_TOUR_RUN_SESSION_STEPS : PRODUCT_TOUR_STEPS;
            const nextStep = list[index];
            if (!nextStep) return;

            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setTargetReady(false);
            setTargetRect(null);

            const route = resolveTourStepRoute(nextStep, activeSessionId);
            if (route && window.location.pathname !== route) {
                navigate(route, { replace: false });
            }

            setForceFabMenu(Boolean(nextStep.fabMenu));

            // Let FAB menu open / close before measuring targets.
            await new Promise((r) => window.setTimeout(r, nextStep.fabMenu ? 120 : 40));

            if (!nextStep.target) {
                if (!controller.signal.aborted) {
                    setTargetRect(null);
                    setTargetReady(true);
                }
                return;
            }

            const el = await waitForTourTarget(nextStep.target, controller.signal);
            if (controller.signal.aborted) return;

            if (el) {
                measureTarget(el);
                setTargetReady(true);
            } else {
                setTargetRect(null);
                setTargetReady(true);
            }
        },
        [measureTarget, navigate],
    );

    const startTour = useCallback(
        async (fromIndex = 0) => {
            if (startingRef.current) return;
            startingRef.current = true;
            clearTourPending();
            setTourKind('create');
            setSessionId(null);
            setStepIndex(fromIndex);
            setRun(true);
            await prepareStep('create', fromIndex, null);
            startingRef.current = false;
        },
        [prepareStep],
    );

    const startRunSessionTour = useCallback(
        async (id, fromIndex = 0) => {
            if (startingRef.current || id == null) return;
            startingRef.current = true;
            clearRunSessionTourPending();
            setTourKind('run-session');
            setSessionId(id);
            setStepIndex(fromIndex);
            setRun(true);
            await prepareStep('run-session', fromIndex, id);
            startingRef.current = false;
        },
        [prepareStep],
    );

    const goToStep = useCallback(
        async (index) => {
            if (!tourKind || index < 0 || index >= steps.length) return;
            setStepIndex(index);
            await prepareStep(tourKind, index, sessionId);
        },
        [prepareStep, sessionId, steps.length, tourKind],
    );

    const next = useCallback(async () => {
        if (stepIndex >= steps.length - 1) {
            dismiss();
            return;
        }
        await goToStep(stepIndex + 1);
    }, [dismiss, goToStep, stepIndex, steps.length]);

    const back = useCallback(async () => {
        if (stepIndex <= 0) return;
        await goToStep(stepIndex - 1);
    }, [goToStep, stepIndex]);

    const replayTour = useCallback(() => {
        clearTourDismissed();
        clearTourPending();
        void startTour(0);
    }, [startTour]);

    const replayRunSessionTour = useCallback(() => {
        clearRunSessionTourDismissed();
        markRunSessionTourPending();
        navigate('/queueing-session');
    }, [navigate]);

    const maybeStartRunSessionTour = useCallback(
        (id) => {
            if (!user || id == null) return;
            if (run || startingRef.current) return;
            if (isRunSessionTourDismissed() && !isRunSessionTourPending()) return;
            void startRunSessionTour(id, 0);
        },
        [user, run, startRunSessionTour],
    );

    // Auto-start create tour after login on dashboard.
    useEffect(() => {
        if (!user || run || startingRef.current) return;
        if (isTourDismissed()) {
            clearTourPending();
            return;
        }
        if (!isTourPending()) return;
        if (isLiveQueueingSessionPath(location.pathname)) return;
        if (location.pathname !== '/dashboard' && location.pathname !== '/dashboard/v2') return;

        void startTour(0);
    }, [user, run, location.pathname, startTour]);

    // Re-measure on resize / scroll while running.
    useEffect(() => {
        if (!run || !step?.target) return undefined;

        const refresh = () => {
            const el = findTourTarget(step.target);
            if (el) measureTarget(el);
        };

        window.addEventListener('resize', refresh);
        window.addEventListener('scroll', refresh, true);
        return () => {
            window.removeEventListener('resize', refresh);
            window.removeEventListener('scroll', refresh, true);
        };
    }, [run, step?.target, measureTarget]);

    // Escape to skip.
    useEffect(() => {
        if (!run) return undefined;
        function onKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                dismiss();
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [run, dismiss]);

    const value = useMemo(
        () => ({
            run,
            tourKind,
            stepIndex,
            step,
            stepCount: steps.length,
            sessionId,
            targetRect,
            targetReady,
            fabMenuOpen,
            next,
            back,
            skip: dismiss,
            finish: dismiss,
            startTour,
            replayTour,
            maybeStartRunSessionTour,
            replayRunSessionTour,
        }),
        [
            run,
            tourKind,
            stepIndex,
            step,
            steps.length,
            sessionId,
            targetRect,
            targetReady,
            fabMenuOpen,
            next,
            back,
            dismiss,
            startTour,
            replayTour,
            maybeStartRunSessionTour,
            replayRunSessionTour,
        ],
    );

    return (
        <ProductTourContext.Provider value={value}>
            {children}
            <ProductTourOverlay />
        </ProductTourContext.Provider>
    );
}
