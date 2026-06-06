/**
 * @param {import('../api/gameSession.js').GameSessionDetail | null | undefined} row
 */
export function isQueueingSessionRow(row) {
    return row?.session_context === 'queueing' || row?.game_type === 'queueing';
}

/**
 * @param {import('../api/gameSession.js').GameSessionDetail | null | undefined} row
 * @param {boolean} isAdmin
 */
export function canDeleteQueueingSession(row, isAdmin) {
    if (Boolean(row?.can_delete)) {
        return true;
    }

    return Boolean(isAdmin) && isQueueingSessionRow(row);
}
