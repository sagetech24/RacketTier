<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateGameSession
{
    /**
     * @param  array<int>  $invitedUserIds
     * @return array{session: GameSession, players: array<int, array{id: int, user_id: int, queue_position: int, is_waiting: bool, is_playing: bool}>}
     */
    public function execute(
        User $creator,
        string $sportSlug,
        string $matchType,
        string $gameType,
        ?string $courtPreference,
        array $invitedUserIds,
    ): array {
        $sport = Sport::query()->where('slug', $sportSlug)->firstOrFail();

        $orderedInvitees = collect($invitedUserIds)->unique()->values()->all();

        return DB::transaction(function () use ($creator, $sport, $matchType, $gameType, $courtPreference, $orderedInvitees): array {
            $session = GameSession::query()->create([
                'sport_id' => $sport->id,
                'match_type' => $matchType,
                'created_by' => $creator->id,
                'is_active' => true,
                'game_type' => $gameType,
                'court_preference' => $courtPreference,
                'started_at' => now(),
            ]);

            $rows = [];
            $position = 1;

            $host = GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $creator->id,
                'queue_position' => $position++,
                'is_waiting' => true,
                'is_playing' => false,
            ]);
            $rows[] = $this->playerPayload($host);

            foreach ($orderedInvitees as $userId) {
                $row = GameSessionPlayer::query()->create([
                    'game_session_id' => $session->id,
                    'user_id' => $userId,
                    'queue_position' => $position++,
                    'is_waiting' => true,
                    'is_playing' => false,
                ]);
                $rows[] = $this->playerPayload($row);
            }

            $session->load(['sport', 'creator']);

            return [
                'session' => $session,
                'players' => $rows,
            ];
        });
    }

    /**
     * @return array{id: int, user_id: int, queue_position: int, is_waiting: bool, is_playing: bool}
     */
    private function playerPayload(GameSessionPlayer $player): array
    {
        return [
            'id' => $player->id,
            'user_id' => $player->user_id,
            'queue_position' => $player->queue_position,
            'is_waiting' => $player->is_waiting,
            'is_playing' => $player->is_playing,
        ];
    }
}
