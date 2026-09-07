<?php

namespace Tests\Unit;

use App\Models\GameSessionPlayer;
use App\Services\MatchPointFormula;
use App\Services\MatchResultProcessor;
use Tests\TestCase;

class MatchPointFormulaTest extends TestCase
{
    public function test_win_includes_capped_margin(): void
    {
        $this->assertSame(25, MatchPointFormula::earned(true, 0));
        $this->assertSame(31, MatchPointFormula::earned(true, 6));
        $this->assertSame(35, MatchPointFormula::earned(true, 10));
        $this->assertSame(35, MatchPointFormula::earned(true, 21));
    }

    public function test_loss_is_flat(): void
    {
        $this->assertSame(8, MatchPointFormula::earned(false, 0));
        $this->assertSame(8, MatchPointFormula::earned(false, 15));
    }

    public function test_match_counts_when_members_are_on_both_sides(): void
    {
        $processor = app(MatchResultProcessor::class);
        $a = new GameSessionPlayer(['user_id' => 1]);
        $a->id = 1;
        $b = new GameSessionPlayer(['user_id' => 2]);
        $b->id = 2;

        $this->assertTrue($processor->matchCountsForGlobalEffects(collect([$a, $b]), [1 => 1, 2 => 2]));
    }

    public function test_match_does_not_count_when_opponent_is_guest(): void
    {
        $processor = app(MatchResultProcessor::class);
        $member = new GameSessionPlayer(['user_id' => 1]);
        $member->id = 1;
        $guest = new GameSessionPlayer(['user_id' => null, 'guest_name' => 'Walk-in']);
        $guest->id = 2;

        $this->assertFalse($processor->matchCountsForGlobalEffects(collect([$member, $guest]), [1 => 1, 2 => 2]));
    }
}
