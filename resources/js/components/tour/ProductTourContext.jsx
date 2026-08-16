import { createContext, useContext } from 'react';

/**
 * @typedef {'create' | 'run-session' | null} ProductTourKind
 *
 * @typedef {{
 *   run: boolean;
 *   tourKind: ProductTourKind;
 *   stepIndex: number;
 *   step: import('./productTourSteps.js').ProductTourStep | null;
 *   stepCount: number;
 *   sessionId: number | null;
 *   targetRect: DOMRect | null;
 *   targetReady: boolean;
 *   fabMenuOpen: boolean;
 *   next: () => Promise<void>;
 *   back: () => Promise<void>;
 *   skip: () => void;
 *   finish: () => void;
 *   startTour: (fromIndex?: number) => Promise<void>;
 *   replayTour: () => void;
 *   maybeStartRunSessionTour: (sessionId: number) => void;
 *   replayRunSessionTour: () => void;
 * }} ProductTourContextValue
 */

/** @type {import('react').Context<ProductTourContextValue | null>} */
export const ProductTourContext = createContext(null);

export function useProductTour() {
    const ctx = useContext(ProductTourContext);
    if (!ctx) {
        throw new Error('useProductTour must be used within ProductTourProvider');
    }
    return ctx;
}
