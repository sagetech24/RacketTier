<?php

namespace Tests\Unit;

use App\Actions\DuplicateQueueingGameSession;
use App\Data\QueueingSessionDraft;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionDraftLineup;
use Illuminate\Support\Collection;
use Tests\TestCase;

class DuplicateQueueingGameSessionRosterTest extends TestCase
{
    public function test_seed_draft_players_skips_missing_members_and_keeps_guests(): void
    {
        $action = new DuplicateQueueingGameSession(
            createQueueingGameSession: $this->createMock(\App\Actions\CreateQueueingGameSession::class),
            draftStore: $this->createMock(\App\Services\QueueingSessionDraftStore::class),
            draftLineup: new QueueingSessionDraftLineup,
            hydrator: $this->createMock(\App\Services\QueueingSessionDraftHydrator::class),
        );

        $sourcePlayers = new Collection([
            new GameSessionPlayer([
                'user_id' => 999_999,
                'guest_name' => null,
                'pronoun' => 'He/Him',
                'skill_level' => 4,
                'queue_position' => 1,
            ]),
            new GameSessionPlayer([
                'user_id' => null,
                'guest_name' => 'Keep Guest',
                'pronoun' => 'They/Them',
                'skill_level' => 2,
                'queue_position' => 2,
            ]),
            new GameSessionPlayer([
                'user_id' => 42,
                'guest_name' => null,
                'pronoun' => 'She/Her',
                'skill_level' => 3,
                'queue_position' => 3,
            ]),
        ]);

        $draft = $action->seedDraftPlayers(
            QueueingSessionDraft::empty(),
            $sourcePlayers,
            [42 => true],
        );

        $this->assertCount(2, $draft->players);
        $this->assertSame('Keep Guest', $draft->players[0]['guest_name']);
        $this->assertSame(1, $draft->players[0]['queue_position']);
        $this->assertSame(42, $draft->players[1]['user_id']);
        $this->assertSame(2, $draft->players[1]['queue_position']);
        $this->assertTrue($draft->players[0]['is_waiting']);
        $this->assertSame(0, $draft->players[1]['wins_count']);
        $this->assertSame([], $draft->matches);
    }
}
