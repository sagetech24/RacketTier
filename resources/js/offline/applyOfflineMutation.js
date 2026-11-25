import { MATCH_POINT_FORMULA, lossPointsForMode } from '../lib/matchPointFormula.js';
import { lineupPlayerIds, reservedQueueingPlayerIds } from '../lib/queueingMatchLineup.js';

/**
 * @param {Record<string, unknown>} player
 */
function gamesPlayed(player) {
    return (Number(player.wins_count) || 0) + (Number(player.losses_count) || 0);
}

/**
 * @param {Record<string, unknown>} session
 * @param {unknown[]} matches
 */
function cloneState(session, matches) {
    return {
        session: structuredClone(session),
        matches: structuredClone(matches ?? []),
    };
}

/**
 * @param {Record<string, unknown>} session
 * @returns {Record<string, unknown>[]}
 */
function playersOf(session) {
    return Array.isArray(session.players) ? session.players : [];
}

/**
 * @param {Record<string, unknown>} session
 */
function recompactQueuePositions(session) {
    const players = playersOf(session);
    for (const p of players) {
        if (p.is_removed || !p.is_waiting || p.is_playing) continue;
        if (gamesPlayed(p) === 0) p.queue_position = 0;
    }
    const waiting = players
        .filter((p) => p.is_waiting && !p.is_playing && !p.is_removed && gamesPlayed(p) > 0)
        .sort((a, b) => Number(a.queue_position) - Number(b.queue_position));
    let pos = 1;
    for (const row of waiting) {
        const target = players.find((p) => Number(p.id) === Number(row.id));
        if (target) target.queue_position = pos++;
    }
}

/**
 * @param {Record<string, unknown>} session
 * @param {unknown[]} matches
 */
function syncStatus(session, matches) {
    const hasOngoing = (matches ?? []).some((m) => m?.status === 'ongoing');
    session.status = hasOngoing ? 'ongoing' : 'queueing';
}

/**
 * @param {number} margin
 * @param {boolean} won
 * @param {string} lossMode
 */
function pointsFor(margin, won, lossMode) {
    if (won) {
        return MATCH_POINT_FORMULA.winBase + Math.min(MATCH_POINT_FORMULA.winMarginCap, Math.max(0, margin));
    }
    return lossPointsForMode(lossMode);
}

/**
 * Apply a mutation to API-shaped session + matches (local draft replica).
 *
 * @param {{ session: Record<string, unknown>, matches: unknown[] }} state
 * @param {{ type: string, payload: Record<string, unknown> }} mutation
 * @returns {{ session: Record<string, unknown>, matches: unknown[], draft_version: number }}
 */
export function applyOfflineMutation(state, mutation) {
    const { session, matches } = cloneState(state.session, state.matches);
    const players = playersOf(session);
    session.players = players;
    const type = mutation.type;
    const payload = mutation.payload ?? {};

    switch (type) {
        case 'add_guest': {
            const nextId =
                Math.max(0, ...players.map((p) => Number(p.id) || 0), Number(session._next_player_id) || 0) + 1;
            session._next_player_id = nextId + 1;
            players.push({
                id: nextId,
                user_id: null,
                guest_name: String(payload.guest_name ?? 'Guest'),
                name: String(payload.guest_name ?? 'Guest'),
                pronoun: payload.pronoun ?? null,
                skill_level: payload.skill_level ?? null,
                queue_position: 0,
                is_waiting: true,
                is_playing: false,
                is_removed: false,
                team: null,
                wins_count: 0,
                losses_count: 0,
                session_points: 0,
                last_match_result: null,
                last_match_id: null,
                checked_in_at: new Date().toISOString(),
                in_lobby: true,
            });
            break;
        }
        case 'add_member': {
            const userId = Number(payload.user_id);
            if (
                players.some(
                    (p) =>
                        !p.is_removed &&
                        (Number(p.user_id) === userId || Number(p.user?.id) === userId),
                )
            ) {
                throw new Error('That player is already on the roster.');
            }
            const nextId =
                Math.max(0, ...players.map((p) => Number(p.id) || 0), Number(session._next_player_id) || 0) + 1;
            session._next_player_id = nextId + 1;
            const displayName = String(payload.name ?? `Member ${userId}`);
            players.push({
                id: nextId,
                user_id: userId,
                guest_name: null,
                name: displayName,
                is_guest: false,
                pronoun: payload.pronoun ?? null,
                skill_level: payload.skill_level ?? null,
                queue_position: 0,
                is_waiting: true,
                is_playing: false,
                is_removed: false,
                team: null,
                wins_count: 0,
                losses_count: 0,
                session_points: 0,
                last_match_result: null,
                last_match_id: null,
                checked_in_at: new Date().toISOString(),
                in_lobby: true,
                user: {
                    id: userId,
                    name: displayName,
                    email: payload.email ?? '',
                },
            });
            break;
        }
        case 'update_player': {
            const player = players.find((p) => Number(p.id) === Number(payload.player_id));
            if (!player) throw new Error('Player not found.');
            if (payload.guest_name != null) {
                player.guest_name = String(payload.guest_name);
                player.name = String(payload.guest_name);
            }
            if (payload.pronoun !== undefined) player.pronoun = payload.pronoun;
            if (payload.skill_level !== undefined) player.skill_level = payload.skill_level;
            break;
        }
        case 'remove_player': {
            const player = players.find((p) => Number(p.id) === Number(payload.player_id));
            if (!player) throw new Error('Player not found.');
            player.is_removed = true;
            player.is_waiting = false;
            player.is_playing = false;
            player.team = null;
            player.queue_position = 0;
            for (let i = matches.length - 1; i >= 0; i--) {
                const m = matches[i];
                if (m.status === 'queueing' || m.status === 'pending' || m.status === 'reserved') {
                    const lineup = m.lineup ?? m.players ?? [];
                    const ids = lineup.map((row) => Number(row.game_session_player_id ?? row.id));
                    if (ids.includes(Number(payload.player_id))) {
                        matches.splice(i, 1);
                    }
                }
            }
            recompactQueuePositions(session);
            break;
        }
        case 'restore_player': {
            const player = players.find((p) => Number(p.id) === Number(payload.player_id));
            if (!player) throw new Error('Player not found.');
            player.is_removed = false;
            player.is_waiting = true;
            player.is_playing = false;
            player.queue_position = gamesPlayed(player) > 0 ? 9999 : 0;
            recompactQueuePositions(session);
            break;
        }
        case 'reorder_check_in': {
            const ids = (payload.player_ids ?? []).map(Number);
            const base = Date.now();
            ids.forEach((id, index) => {
                const player = players.find((p) => Number(p.id) === id);
                if (player && gamesPlayed(player) === 0) {
                    player.checked_in_at = new Date(base + index).toISOString();
                }
            });
            break;
        }
        case 'create_match':
        case 'create_reserve_match': {
            const asReserve = type === 'create_reserve_match';
            const lineup = payload.lineup ?? [];
            if (asReserve) {
                const reservedCount = matches.filter((m) => m.status === 'reserved').length;
                if (reservedCount >= 4) {
                    throw new Error('You can reserve at most 4 matches at a time.');
                }
            }
            const held = reservedQueueingPlayerIds(matches);
            const ids = lineup.map((row) => Number(row.id));
            if (new Set(ids).size !== ids.length) {
                throw new Error('Lineup contains duplicate players.');
            }
            for (const id of ids) {
                const player = players.find((p) => Number(p.id) === id);
                if (!player || player.is_removed) {
                    throw new Error('Invalid player in lineup.');
                }
                if (held.has(id)) {
                    throw new Error('One or more players are already assigned to a queued or reserved match.');
                }
                if (!asReserve && (!player.is_waiting || player.is_playing)) {
                    throw new Error('Manual lineup players must be waiting and not already on court.');
                }
            }
            const nextMatchId =
                Math.max(0, ...matches.map((m) => Number(m.id) || 0), Number(session._next_match_id) || 0) + 1;
            session._next_match_id = nextMatchId + 1;
            const matchNo = Math.max(0, ...matches.map((m) => Number(m.match_no) || 0)) + 1;
            const snapshot = lineup.map((row) => {
                const player = players.find((p) => Number(p.id) === Number(row.id));
                return {
                    id: Number(row.id),
                    game_session_player_id: Number(row.id),
                    team: Number(row.team) || null,
                    user_id: player?.user_id ?? null,
                    guest_name: player?.guest_name ?? null,
                    name: player?.name ?? player?.guest_name ?? null,
                };
            });
            matches.push({
                id: nextMatchId,
                match_no: matchNo,
                status: asReserve ? 'reserved' : 'queueing',
                lineup: snapshot,
                players: snapshot,
                team1_score: null,
                team2_score: null,
                winning_team: null,
                started_at: null,
                finished_at: null,
                result_breakdown: null,
                _local_id: payload.local_match_id ?? `local-${nextMatchId}`,
            });
            break;
        }
        case 'promote_reserve_match': {
            const match = matches.find((m) => Number(m.id) === Number(payload.match_id));
            if (!match) throw new Error('Match not found.');
            if (match.status !== 'reserved') {
                throw new Error('Only reserved matches can be added to the queue.');
            }
            const lineup = match.lineup ?? match.players ?? [];
            const ids = lineupPlayerIds(lineup);
            for (const id of ids) {
                const player = players.find((p) => Number(p.id) === id);
                if (!player || player.is_removed) {
                    throw new Error('Some players in this match are no longer on the roster.');
                }
                if (!player.is_waiting || player.is_playing) {
                    throw new Error('Reserved match players are not all available yet.');
                }
            }
            match.status = 'queueing';
            break;
        }
        case 'start_match': {
            const match = matches.find((m) => Number(m.id) === Number(payload.match_id));
            if (!match) throw new Error('Match not found.');
            if (match.status !== 'queueing' && match.status !== 'pending') {
                throw new Error('Match cannot be started.');
            }
            match.status = 'ongoing';
            match.started_at = new Date().toISOString();
            const lineup = match.lineup ?? match.players ?? [];
            for (const row of lineup) {
                const player = players.find((p) => Number(p.id) === Number(row.game_session_player_id ?? row.id));
                if (!player) continue;
                player.is_playing = true;
                player.is_waiting = false;
                player.team = row.team ?? null;
            }
            recompactQueuePositions(session);
            syncStatus(session, matches);
            break;
        }
        case 'delete_match': {
            const idx = matches.findIndex((m) => Number(m.id) === Number(payload.match_id));
            if (idx < 0) throw new Error('Match not found.');
            const match = matches[idx];
            if (match.status === 'ongoing') {
                const lineup = match.lineup ?? match.players ?? [];
                for (const row of lineup) {
                    const player = players.find(
                        (p) => Number(p.id) === Number(row.game_session_player_id ?? row.id),
                    );
                    if (!player) continue;
                    player.is_playing = false;
                    player.team = null;
                    if (!player.is_removed) player.is_waiting = true;
                }
            }
            matches.splice(idx, 1);
            recompactQueuePositions(session);
            syncStatus(session, matches);
            break;
        }
        case 'update_match_lineup': {
            const match = matches.find((m) => Number(m.id) === Number(payload.match_id));
            if (!match) throw new Error('Match not found.');
            const lineup = payload.lineup ?? [];
            const snapshot = lineup.map((row) => {
                const player = players.find((p) => Number(p.id) === Number(row.id));
                return {
                    id: Number(row.id),
                    game_session_player_id: Number(row.id),
                    team: Number(row.team) || null,
                    user_id: player?.user_id ?? null,
                    guest_name: player?.guest_name ?? null,
                    name: player?.name ?? player?.guest_name ?? null,
                };
            });
            match.lineup = snapshot;
            match.players = snapshot;
            if (match.status === 'ongoing') {
                const previousIds = players.filter((p) => p.is_playing).map((p) => Number(p.id));
                const newIds = snapshot.map((r) => Number(r.id));
                for (const id of previousIds) {
                    if (!newIds.includes(id)) {
                        const player = players.find((p) => Number(p.id) === id);
                        if (player) {
                            player.is_playing = false;
                            player.team = null;
                            if (!player.is_removed) player.is_waiting = true;
                        }
                    }
                }
                for (const row of snapshot) {
                    const player = players.find((p) => Number(p.id) === Number(row.id));
                    if (!player) continue;
                    player.is_playing = true;
                    player.is_waiting = false;
                    player.team = row.team;
                }
                recompactQueuePositions(session);
            }
            break;
        }
        case 'finish_match': {
            const match = matches.find((m) => Number(m.id) === Number(payload.match_id));
            if (!match || match.status !== 'ongoing') throw new Error('No ongoing match to finish.');
            const skipScores = Boolean(session.skip_scores);
            let winningTeam = Number(payload.winning_team);
            let team1Score = payload.team1_score == null ? null : Number(payload.team1_score);
            let team2Score = payload.team2_score == null ? null : Number(payload.team2_score);
            let margin = 0;
            if (skipScores || (team1Score == null && team2Score == null)) {
                if (![1, 2].includes(winningTeam)) throw new Error('Select the winning team.');
                team1Score = null;
                team2Score = null;
                margin = 0;
            } else {
                if (team1Score === team2Score) throw new Error('Scores cannot be tied.');
                winningTeam = team1Score > team2Score ? 1 : 2;
                margin = Math.abs(team1Score - team2Score);
            }
            const lossMode = session.loss_point_mode ?? 'effort';
            const lineup = match.lineup ?? match.players ?? [];
            const breakdownPlayers = [];
            for (const row of lineup) {
                const player = players.find((p) => Number(p.id) === Number(row.game_session_player_id ?? row.id));
                if (!player) continue;
                const team = Number(row.team);
                const won = team === winningTeam;
                const earned = pointsFor(margin, won, lossMode);
                player.session_points = (Number(player.session_points) || 0) + earned;
                if (won) player.wins_count = (Number(player.wins_count) || 0) + 1;
                else player.losses_count = (Number(player.losses_count) || 0) + 1;
                player.last_match_result = won ? 'win' : 'loss';
                player.last_match_id = Number(match.id);
                player.is_playing = false;
                player.team = null;
                if (!player.is_removed) player.is_waiting = true;
                player.in_lobby = false;
                breakdownPlayers.push({
                    game_session_player_id: Number(player.id),
                    user_id: player.user_id,
                    won,
                    session_points_earned: earned,
                });
            }
            match.status = 'finished';
            match.team1_score = team1Score;
            match.team2_score = team2Score;
            match.winning_team = winningTeam;
            match.finished_at = new Date().toISOString();
            match.result_breakdown = { players: breakdownPlayers };
            session.completed_matches_count = (Number(session.completed_matches_count) || 0) + 1;
            session.last_team1_score = team1Score;
            session.last_team2_score = team2Score;
            session.last_winning_team = winningTeam;
            session.last_finished_at = match.finished_at;
            session.last_result_breakdown = match.result_breakdown;
            recompactQueuePositions(session);
            syncStatus(session, matches);
            break;
        }
        case 'switch_result': {
            const match = matches.find((m) => Number(m.id) === Number(payload.match_id));
            if (!match || match.status !== 'finished') throw new Error('Finished match not found.');
            const prevWinner = Number(match.winning_team);
            const newWinner = prevWinner === 1 ? 2 : 1;
            match.winning_team = newWinner;
            if (match.team1_score != null && match.team2_score != null) {
                const tmp = match.team1_score;
                match.team1_score = match.team2_score;
                match.team2_score = tmp;
            }
            const lineup = match.lineup ?? match.players ?? [];
            const lossMode = session.loss_point_mode ?? 'effort';
            const margin =
                match.team1_score != null && match.team2_score != null
                    ? Math.abs(Number(match.team1_score) - Number(match.team2_score))
                    : 0;
            for (const row of lineup) {
                const player = players.find((p) => Number(p.id) === Number(row.game_session_player_id ?? row.id));
                if (!player) continue;
                const team = Number(row.team);
                const wasWin = team === prevWinner;
                const nowWin = team === newWinner;
                if (wasWin === nowWin) continue;
                const oldPts = pointsFor(margin, wasWin, lossMode);
                const newPts = pointsFor(margin, nowWin, lossMode);
                player.session_points = (Number(player.session_points) || 0) - oldPts + newPts;
                if (wasWin) {
                    player.wins_count = Math.max(0, (Number(player.wins_count) || 0) - 1);
                    player.losses_count = (Number(player.losses_count) || 0) + 1;
                } else {
                    player.losses_count = Math.max(0, (Number(player.losses_count) || 0) - 1);
                    player.wins_count = (Number(player.wins_count) || 0) + 1;
                }
                player.last_match_result = nowWin ? 'win' : 'loss';
            }
            session.last_winning_team = newWinner;
            session.last_team1_score = match.team1_score;
            session.last_team2_score = match.team2_score;
            break;
        }
        case 'update_settings': {
            Object.assign(session, payload);
            if (payload.auto_match_criteria && typeof payload.auto_match_criteria === 'object') {
                session.auto_match_criteria = {
                    ...(session.auto_match_criteria ?? {}),
                    ...payload.auto_match_criteria,
                };
            }
            break;
        }
        case 'dismiss_auto_suggest': {
            const suggestions = Array.isArray(session.auto_suggest_matches)
                ? session.auto_suggest_matches
                : [];
            session.auto_suggest_matches = suggestions.filter(
                (s) => String(s.proposal_id ?? s.id) !== String(payload.suggestion_id),
            );
            break;
        }
        case 'approve_auto_suggest': {
            // Treated as create_match with lineup from payload
            return applyOfflineMutation(
                { session, matches },
                { type: 'create_match', payload: { lineup: payload.lineup, local_match_id: payload.suggestion_id } },
            );
        }
        default:
            throw new Error(`Unsupported offline mutation: ${type}`);
    }

    const draftVersion = (Number(session.draft_version) || 0) + 1;
    session.draft_version = draftVersion;
    return { session, matches, draft_version: draftVersion };
}
