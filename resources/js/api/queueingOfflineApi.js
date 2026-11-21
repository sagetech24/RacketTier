/**
 * Thin wrappers used by offline outbox sync — pass draft_version on every mutation.
 */
import { deleteJson, patchJson, postJson, withDraftVersion } from '../lib/http.js';
import { parseMutationResponse } from '../offline/parseMutationResponse.js';

export async function postAddQueueingSessionPlayer(sessionId, body) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players`,
        withDraftVersion(body, body.draft_version),
        { silent: true, draftVersion: body.draft_version },
    );
    return parseMutationResponse(res);
}

export async function patchUpdateQueueingSessionPlayer(sessionId, playerId, body) {
    const res = await patchJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players/${encodeURIComponent(String(playerId))}`,
        withDraftVersion(body, body.draft_version),
        { silent: true, draftVersion: body.draft_version },
    );
    return parseMutationResponse(res);
}

export async function deleteQueueingSessionPlayer(sessionId, playerId, draftVersion) {
    const res = await deleteJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players/${encodeURIComponent(String(playerId))}`,
        { silent: true, draftVersion, body: {} },
    );
    return parseMutationResponse(res);
}

export async function postRestoreQueueingSessionPlayer(sessionId, playerId, draftVersion) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players/${encodeURIComponent(String(playerId))}/restore`,
        withDraftVersion({}, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}

export async function patchReorderQueueingCheckIn(sessionId, playerIds, draftVersion) {
    const res = await patchJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/players/check-in-order`,
        withDraftVersion({ player_ids: playerIds }, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}

export async function postCreateQueueingSessionMatch(sessionId, lineup, draftVersion) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches`,
        withDraftVersion({ lineup }, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}

export async function postStartQueueingSessionMatch(sessionId, matchId, draftVersion) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/${encodeURIComponent(String(matchId))}/start`,
        withDraftVersion({}, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}

export async function deleteQueueingSessionMatch(sessionId, matchId, draftVersion) {
    const res = await deleteJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/${encodeURIComponent(String(matchId))}`,
        { silent: true, draftVersion, body: {} },
    );
    return parseMutationResponse(res);
}

export async function patchQueueingSessionMatch(sessionId, matchId, lineup, draftVersion) {
    const res = await patchJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/${encodeURIComponent(String(matchId))}`,
        withDraftVersion({ lineup }, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}

export async function postFinishQueueingMatch(sessionId, body) {
    const res = await postJson(
        `/auth/game-sessions/${encodeURIComponent(String(sessionId))}/finish-match`,
        withDraftVersion(body, body.draft_version),
        { silent: true, draftVersion: body.draft_version },
    );
    return parseMutationResponse(res);
}

export async function postEndQueueingSession(sessionId, draftVersion) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/end`,
        withDraftVersion({}, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}

export async function patchUpdateQueueingSession(sessionId, payload) {
    const res = await patchJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}`,
        withDraftVersion(payload, payload.draft_version),
        { silent: true, draftVersion: payload.draft_version },
    );
    return parseMutationResponse(res);
}

export async function postDismissAutoSuggest(sessionId, suggestionId, draftVersion) {
    const res = await deleteJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/auto-suggest/${encodeURIComponent(String(suggestionId))}`,
        { silent: true, draftVersion, body: {} },
    );
    return parseMutationResponse(res);
}

export async function postApproveAutoSuggest(sessionId, suggestionId, draftVersion) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/matches/auto-suggest/${encodeURIComponent(String(suggestionId))}/approve`,
        withDraftVersion({}, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}

export async function postClaimQueueingDevice(sessionId, deviceId) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/claim-device`,
        { device_id: deviceId },
        { silent: true },
    );
    return parseMutationResponse(res);
}

export async function postBatchSyncQueueingSession(sessionId, mutations, draftVersion) {
    const res = await postJson(
        `/auth/queueing-sessions/${encodeURIComponent(String(sessionId))}/sync`,
        withDraftVersion({ mutations }, draftVersion),
        { silent: true, draftVersion },
    );
    return parseMutationResponse(res);
}
