import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyOfflineMutation } from '../applyOfflineMutation.js';

function baseSession() {
    return {
        id: 1,
        match_type: 'singles',
        skip_scores: true,
        loss_point_mode: 'effort',
        draft_version: 1,
        completed_matches_count: 0,
        players: [
            {
                id: 1,
                guest_name: 'A',
                name: 'A',
                skill_level: 2,
                wins_count: 0,
                losses_count: 0,
                session_points: 0,
                is_waiting: true,
                is_playing: false,
                queue_position: 0,
            },
            {
                id: 2,
                guest_name: 'B',
                name: 'B',
                skill_level: 3,
                wins_count: 0,
                losses_count: 0,
                session_points: 0,
                is_waiting: true,
                is_playing: false,
                queue_position: 0,
            },
        ],
    };
}

describe('applyOfflineMutation', () => {
    it('adds a guest into check-in lobby', () => {
        const next = applyOfflineMutation(
            { session: baseSession(), matches: [] },
            { type: 'add_guest', payload: { guest_name: 'C', skill_level: 1 } },
        );
        assert.equal(next.session.players.length, 3);
        assert.equal(next.session.players[2].guest_name, 'C');
        assert.equal(next.session.players[2].queue_position, 0);
        assert.equal(next.draft_version, 2);
    });

    it('creates starts and finishes a skip-scores match', () => {
        let state = applyOfflineMutation(
            { session: baseSession(), matches: [] },
            {
                type: 'create_match',
                payload: {
                    lineup: [
                        { id: 1, team: 1 },
                        { id: 2, team: 2 },
                    ],
                },
            },
        );
        const matchId = state.matches[0].id;
        state = applyOfflineMutation(
            { session: state.session, matches: state.matches },
            { type: 'start_match', payload: { match_id: matchId } },
        );
        assert.equal(state.matches[0].status, 'ongoing');
        state = applyOfflineMutation(
            { session: state.session, matches: state.matches },
            { type: 'finish_match', payload: { match_id: matchId, winning_team: 1 } },
        );
        assert.equal(state.matches[0].status, 'finished');
        const a = state.session.players.find((p) => p.id === 1);
        const b = state.session.players.find((p) => p.id === 2);
        assert.equal(a.wins_count, 1);
        assert.equal(b.losses_count, 1);
        assert.ok(a.session_points > 0);
        assert.equal(b.session_points, 8);
    });
});
