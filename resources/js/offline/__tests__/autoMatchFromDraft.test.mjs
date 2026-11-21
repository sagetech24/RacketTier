import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    generateAutoMatchProposals,
    generateAutoSuggestMatches,
} from '../autoMatchFromDraft.js';

describe('autoMatchFromDraft', () => {
    it('singles with 2 rotation players produces one proposal', () => {
        const session = {
            match_type: 'singles',
            auto_match_criteria: {
                skill_level: true,
                skill_match_mode: 'balanced',
                wl_statistics: true,
                sequence: true,
                genderless_mixed: true,
                include_lobby: true,
            },
        };
        const players = [
            {
                id: 1,
                is_waiting: true,
                is_playing: false,
                is_removed: false,
                queue_position: 1,
                skill_level: 3,
                wins_count: 2,
                losses_count: 1,
                last_match_result: 'win',
            },
            {
                id: 2,
                is_waiting: true,
                is_playing: false,
                is_removed: false,
                queue_position: 2,
                skill_level: 4,
                wins_count: 1,
                losses_count: 2,
                last_match_result: 'loss',
            },
        ];

        const result = generateAutoMatchProposals({
            session,
            players,
            matches: [],
            limit: 1,
        });

        assert.equal(result.match_type, 'singles');
        assert.equal(result.proposals.length, 1);
        assert.equal(result.proposals[0].lineup.length, 2);
        assert.equal(result.proposals[0].players.length, 2);
        assert.deepEqual(
            result.proposals[0].lineup.map((r) => r.team).sort(),
            [1, 2],
        );
    });

    it('doubles with 4 lobby players produces check-in proposal', () => {
        const session = {
            match_type: 'doubles',
            auto_match_criteria: {
                skill_level: true,
                skill_match_mode: 'balanced',
                include_lobby: true,
            },
        };
        const players = [
            { id: 10, is_waiting: true, is_playing: false, is_removed: false, queue_position: 0, skill_level: 2, wins_count: 0, losses_count: 0, checked_in_at: '2026-01-01T10:00:00Z' },
            { id: 11, is_waiting: true, is_playing: false, is_removed: false, queue_position: 0, skill_level: 4, wins_count: 0, losses_count: 0, checked_in_at: '2026-01-01T10:01:00Z' },
            { id: 12, is_waiting: true, is_playing: false, is_removed: false, queue_position: 0, skill_level: 3, wins_count: 0, losses_count: 0, checked_in_at: '2026-01-01T10:02:00Z' },
            { id: 13, is_waiting: true, is_playing: false, is_removed: false, queue_position: 0, skill_level: 5, wins_count: 0, losses_count: 0, checked_in_at: '2026-01-01T10:03:00Z' },
        ];

        const result = generateAutoMatchProposals({
            session,
            players,
            matches: [],
            limit: 1,
        });

        assert.equal(result.proposals.length, 1);
        assert.equal(result.proposals[0].from_lobby, true);
        assert.equal(result.proposals[0].bracket_label, 'Check-in');
        assert.equal(result.proposals[0].lineup.length, 4);
        const teams = result.proposals[0].lineup.reduce(
            (acc, row) => {
                if (row.team === 1) acc.team1 += 1;
                else if (row.team === 2) acc.team2 += 1;
                return acc;
            },
            { team1: 0, team2: 0 },
        );
        assert.equal(teams.team1, 2);
        assert.equal(teams.team2, 2);
    });

    it('skill_level null defaults to 3 without throwing', () => {
        const session = { match_type: 'singles', auto_match_criteria: {} };
        const players = [
            {
                id: 20,
                is_waiting: true,
                is_playing: false,
                is_removed: false,
                queue_position: 1,
                skill_level: null,
                wins_count: 1,
                losses_count: 0,
            },
            {
                id: 21,
                is_waiting: true,
                is_playing: false,
                is_removed: false,
                queue_position: 2,
                skill_level: null,
                wins_count: 1,
                losses_count: 1,
            },
        ];

        assert.doesNotThrow(() => {
            const result = generateAutoMatchProposals({ session, players, matches: [] });
            assert.equal(result.proposals.length, 1);
        });

        const suggest = generateAutoSuggestMatches({ session, players, matches: [] });
        assert.equal(suggest.draft_version, 0);
        assert.ok(Array.isArray(suggest.proposals));
        assert.ok(Array.isArray(suggest.suggestions));
    });
});