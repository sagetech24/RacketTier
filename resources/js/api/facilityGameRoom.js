/**
 * @typedef {{ id: number, name: string, address: string | null }} FacilitySummary
 * @typedef {import('./gameSession.js').GameSessionDetail} GameSessionSummary
 * @typedef {{ id: number, name: string, email: string }} FacilityRosterPlayer
 * @typedef {{ facility: FacilitySummary, sessions: GameSessionSummary[], players: FacilityRosterPlayer[] }} FacilityGameRoomPayload
 */

/**
 * @param {number | string} facilityId
 * @returns {Promise<FacilityGameRoomPayload>}
 */
export async function fetchFacilityGameRoom(facilityId) {
    const res = await fetch(`/auth/facilities/${encodeURIComponent(String(facilityId))}/game-room`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (res.status === 404) {
        throw new Error('Facility not found');
    }
    if (!res.ok) {
        throw new Error('Failed to load game room');
    }
    const json = await res.json();
    if (!json.data) {
        throw new Error('Invalid response');
    }
    return json.data;
}
