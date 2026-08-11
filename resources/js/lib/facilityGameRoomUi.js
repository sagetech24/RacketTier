import { matchStatusLabel, matchStatusPillClass } from './queueingMatchDisplay.js';

const GAME_TYPE_LABELS = {
    '1st-set': '1st set',
    '2nd-set': '2nd set',
    '3rd-set': '3rd set',
    '4th-set': '4th set',
    rematch: 'Rematch',
    'final-set': 'Final set',
};

/**
 * @param {string | null | undefined} raw
 */
export function formatGameTypeLabel(raw) {
    if (!raw) return '';
    return GAME_TYPE_LABELS[raw] ?? String(raw).replace(/-/g, ' ');
}

/**
 * Display label, sort order (lower first), and pill styles for facility session list rows.
 * Sort: ongoing → queueing/pending → finished → ended.
 *
 * @param {{ is_active?: boolean, status?: string }} session
 */
export function facilitySessionListStatus(session) {
    if (!session.is_active) {
        if (session.status === 'finished') {
            return {
                label: matchStatusLabel('finished'),
                sortRank: 2,
                pillClass: matchStatusPillClass('finished'),
            };
        }
        return {
            label: 'Ended',
            sortRank: 4,
            pillClass: 'rt-match-status-pill',
        };
    }
    const raw = session.status ?? 'queueing';
    if (raw === 'ongoing') {
        return {
            label: matchStatusLabel('ongoing'),
            sortRank: 0,
            pillClass: matchStatusPillClass('ongoing'),
        };
    }
    if (raw === 'finished') {
        return {
            label: matchStatusLabel('finished'),
            sortRank: 2,
            pillClass: matchStatusPillClass('finished'),
        };
    }
    if (raw === 'queueing' || raw === 'pending') {
        return {
            label: 'Queueing',
            sortRank: 1,
            pillClass: matchStatusPillClass('queueing'),
        };
    }
    return {
        label: raw ? String(raw) : 'Queueing',
        sortRank: 3,
        pillClass: 'rt-match-status-pill',
    };
}

/**
 * @param {string | null | undefined} matchType
 */
export function matchTypeLabel(matchType) {
    if (matchType === 'doubles') return 'Doubles';
    if (matchType === 'singles') return 'Singles';
    return matchType ?? '';
}
