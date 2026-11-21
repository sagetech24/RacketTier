import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { generateAutoMatchProposals } from '../autoMatchFromDraft.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../tests/fixtures/auto_match');

describe('autoMatch parity fixtures', () => {
    it('singles_two_waiters proposes both waiters', () => {
        const fixture = JSON.parse(readFileSync(join(root, 'singles_two_waiters.json'), 'utf8'));
        const result = generateAutoMatchProposals({
            session: fixture.session,
            players: fixture.players,
            matches: fixture.matches,
        });
        assert.ok(result.proposals.length >= 1);
        const ids = result.proposals[0].lineup.map((row) => Number(row.id)).sort((a, b) => a - b);
        assert.deepEqual(ids, [...fixture.expected_lineup_ids].sort((a, b) => a - b));
    });
});
