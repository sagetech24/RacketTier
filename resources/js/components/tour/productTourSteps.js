/**
 * @typedef {{
 *   id: string;
 *   route: string | ((sessionId: number) => string);
 *   target: string | null;
 *   title: string;
 *   body: string;
 *   accent?: boolean;
 *   fabMenu?: boolean;
 * }} ProductTourStep
 */

/** @type {ProductTourStep[]} */
export const PRODUCT_TOUR_STEPS = [
    {
        id: 'welcome',
        route: '/dashboard',
        target: null,
        title: 'Welcome to RacketTier',
        body: 'You are in. Next up: start a queueing session as Queue Master so matches stay fair and ranked.',
    },
    {
        id: 'nav-queue',
        route: '/dashboard',
        target: 'nav-queue',
        title: 'Queue lives here',
        body: 'Open Queue anytime from the header on desktop, or the bottom nav on mobile.',
    },
    {
        id: 'new-queue',
        route: '/queueing-session',
        target: 'new-queue',
        title: 'Create a new queue',
        body: 'New queue opens the create form. As soon as you create it, you are the Queue Master and the session is live.',
    },
    {
        id: 'create-intro',
        route: '/queueing-session/new',
        target: 'create-queue-intro',
        title: 'You are the Queue Master',
        body: 'This form configures the session. After you create it, add players and start matches when everyone is ready.',
    },
    {
        id: 'create-sport',
        route: '/queueing-session/new',
        target: 'create-queue-sport',
        title: 'Set up the session',
        body: 'Pick the sport for this queue. Tiers, points, and rankings stay scoped to that sport.',
    },
    {
        id: 'create-name',
        route: '/queueing-session/new',
        target: 'create-queue-name',
        title: 'Enter the name of the queue session',
        body: 'Give the queue a clear name so players recognize it — for example Friday night doubles.',
    },
    {
        id: 'create-settings',
        route: '/queueing-session/new',
        target: 'create-queue-settings',
        title: 'Basic Queue settings',
        body: 'Choose singles or doubles, then set win and loss points credited to members when matches finish.',
    },
    {
        id: 'create-auto-match',
        route: '/queueing-session/new',
        target: 'create-queue-auto-match',
        title: 'Setup the auto-matching criteria',
        body: 'Select at least one criterion so auto-match can build fair lineups from players waiting in queue.',
    },
    {
        id: 'create-submit',
        route: '/queueing-session/new',
        target: 'create-queue-submit',
        title: 'Create Queue',
        body: 'Create Queue starts the session. Then open the session to add players and run matches — a second short tour covers that when you are inside.',
    },
];

/**
 * Part 2 — run an active queueing session (needs a real session id).
 * @type {ProductTourStep[]}
 */
export const PRODUCT_TOUR_RUN_SESSION_STEPS = [
    {
        id: 'run-players-tab',
        route: (sessionId) => `/queueing-session/${sessionId}/players`,
        target: 'session-nav-players',
        title: 'Players tab',
        body: 'Your roster lives here. Add members and guests before you create matches.',
    },
    {
        id: 'run-fab',
        route: (sessionId) => `/queueing-session/${sessionId}/players`,
        target: 'session-fab',
        title: 'Match panel',
        body: 'This button opens the Queue Master tools: add people, auto-match, manual match, and end session.',
        accent: true,
    },
    {
        id: 'run-add-players',
        route: (sessionId) => `/queueing-session/${sessionId}/players`,
        target: 'session-fab-add-players',
        title: 'Add members',
        body: 'Search registered members and add them to the queue. They earn ELO and session points.',
        fabMenu: true,
    },
    {
        id: 'run-add-guest',
        route: (sessionId) => `/queueing-session/${sessionId}/players`,
        target: 'session-fab-add-guest',
        title: 'Add guests',
        body: 'Quick-add drop-in players by name. Guests stay in-session only — no ELO or wallet updates.',
        fabMenu: true,
    },
    {
        id: 'run-auto-match',
        route: (sessionId) => `/queueing-session/${sessionId}/players`,
        target: 'session-fab-auto-match',
        title: 'Auto-match',
        body: 'When enough players are waiting (2 singles / 4 doubles), Auto-match suggests fair lineups from your criteria. You can queue or start each proposal.',
        fabMenu: true,
        accent: true,
    },
    {
        id: 'run-matches-tab',
        route: (sessionId) => `/queueing-session/${sessionId}/matches`,
        target: 'session-nav-matches',
        title: 'Matches tab',
        body: 'Queued, playing, and finished matches show up here. Start a queued match when courts are ready.',
    },
    {
        id: 'run-start-match',
        route: (sessionId) => `/queueing-session/${sessionId}/matches`,
        target: 'session-matches-hint',
        title: 'Start a match',
        body: 'Use Auto-match or Manual match from the panel to queue a lineup, then tap Start on a queued card — or Start inside the match flow. You need enough waiting players first.',
    },
];

export const PRODUCT_TOUR_STEP_COUNT = PRODUCT_TOUR_STEPS.length;
export const PRODUCT_TOUR_RUN_SESSION_STEP_COUNT = PRODUCT_TOUR_RUN_SESSION_STEPS.length;

/**
 * @param {ProductTourStep} step
 * @param {number | null} sessionId
 */
export function resolveTourStepRoute(step, sessionId) {
    if (typeof step.route === 'function') {
        if (sessionId == null) return null;
        return step.route(sessionId);
    }
    return step.route;
}
