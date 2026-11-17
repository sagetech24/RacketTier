<?php

namespace App\Actions;

use App\Models\AdminAdjustmentAudit;
use App\Models\Ranking;
use App\Models\RatingHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AdjustMemberRating
{
    /**
     * @return array{rating_before: int, rating_after: int, rating_change: int}
     */
    public function execute(User $admin, User $target, int $sportId, int $delta, string $reason): array
    {
        if ($delta === 0) {
            throw new InvalidArgumentException('Rating adjustment amount cannot be zero.');
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw new InvalidArgumentException('A reason is required.');
        }

        return DB::transaction(function () use ($admin, $target, $sportId, $delta, $reason): array {
            $ranking = Ranking::query()->firstOrCreate(
                [
                    'user_id' => $target->id,
                    'sport_id' => $sportId,
                ],
                ['rating' => 1000],
            );

            /** @var Ranking $locked */
            $locked = Ranking::query()
                ->whereKey($ranking->id)
                ->lockForUpdate()
                ->firstOrFail();

            $before = (int) $locked->rating;
            $after = max(0, $before + $delta);
            $change = $after - $before;

            if ($change === 0) {
                throw new InvalidArgumentException('Rating cannot go below zero.');
            }

            $locked->update(['rating' => $after]);

            RatingHistory::query()->create([
                'user_id' => $target->id,
                'sport_id' => $sportId,
                'game_session_id' => null,
                'rating_before' => $before,
                'rating_after' => $after,
                'rating_change' => $change,
            ]);

            AdminAdjustmentAudit::query()->create([
                'admin_user_id' => $admin->id,
                'target_user_id' => $target->id,
                'sport_id' => $sportId,
                'adjustment_type' => AdminAdjustmentAudit::TYPE_RATING,
                'amount' => $change,
                'value_before' => $before,
                'value_after' => $after,
                'reason' => $reason,
            ]);

            return [
                'rating_before' => $before,
                'rating_after' => $after,
                'rating_change' => $change,
            ];
        });
    }
}
