<?php

namespace App\Actions;

use App\Data\AutoMatchCriteria;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateQueueingGameSession
{
    public function execute(
        User $host,
        GameSession $session,
        string $queueName,
        bool $skipScores,
        bool $optionalGuestSkill = true,
        bool $optionalGuestGender = true,
        ?AutoMatchCriteria $autoMatchCriteria = null,
        ?string $matchType = null,
    ): GameSession {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if (! $session->userCanManage($host)) {
            abort(403, 'Only the queue master or an admin can update this session.');
        }

        if (! $session->is_active && ! $host->isAdmin()) {
            abort(422, 'This session is no longer active.');
        }

        if ($matchType !== null && $matchType !== (string) $session->match_type && ! $session->canEditMatchType()) {
            abort(422, 'Game type can only be changed before the first match is created.');
        }

        return DB::transaction(function () use ($session, $queueName, $skipScores, $optionalGuestSkill, $optionalGuestGender, $autoMatchCriteria, $matchType): GameSession {
            $updates = [
                'queue_name' => $queueName,
                'skip_scores' => $skipScores,
                'optional_guest_skill' => $optionalGuestSkill,
                'optional_guest_gender' => $optionalGuestGender,
            ];

            if ($matchType !== null && $session->canEditMatchType()) {
                $updates['match_type'] = $matchType;
            }

            if ($autoMatchCriteria !== null) {
                $updates['auto_match_criteria'] = $autoMatchCriteria->toStoredArray();
            }

            $session->update($updates);

            return $session->fresh();
        });
    }
}
