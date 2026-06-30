<?php

namespace App\Http\Requests\Concerns;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Validation\Validator;

trait ValidatesQueueingSessionLineup
{
    protected function validateLineupBelongsToSession(Validator $validator, GameSession $session, mixed $lineup): void
    {
        if (! is_array($lineup)) {
            return;
        }

        foreach ($lineup as $row) {
            $pid = (int) ($row['id'] ?? 0);
            if ($pid <= 0) {
                continue;
            }

            $exists = $session->isDraft()
                ? app(QueueingSessionDraftStore::class)->load((int) $session->id)->findPlayer($pid) !== null
                : GameSessionPlayer::query()
                    ->whereKey($pid)
                    ->where('game_session_id', $session->id)
                    ->exists();

            if (! $exists) {
                $validator->errors()->add('lineup', 'Each lineup player must belong to this session.');
                break;
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function lineupIdRules(GameSession $session): array
    {
        if ($session->isDraft()) {
            return ['required', 'integer', 'min:1'];
        }

        return ['required', 'integer', 'exists:game_session_players,id'];
    }
}
