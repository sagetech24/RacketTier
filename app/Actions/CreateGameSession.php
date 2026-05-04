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
     * @param  array<int, array{user_id: int, team: int}>  $teamAssignments
     * @return array{session: GameSession, players: array<int, array{id: int, user_id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null}>}
     */
    public function execute(
        User $creator,
        int $facilityId,
        string $sportSlug,
        string $matchType,
        string $gameType,
        ?string $courtPreference,
        array $teamAssignments,
    ): array {
        $sport = Sport::query()->where('slug', $sportSlug)->firstOrFail();

        $byTeamThenUser = collect($teamAssignments)
            ->map(fn (array $row): array => [
                'user_id' => (int) $row['user_id'],
                'team' => (int) $row['team'],
            ])
            ->sortBy([
                ['team', 'asc'],
                ['user_id', 'asc'],
            ])
            ->values()
            ->all();

        return DB::transaction(function () use ($creator, $facilityId, $sport, $matchType, $gameType, $courtPreference, $byTeamThenUser): array {
            $session = GameSession::query()->create([
                'facility_id' => $facilityId,
                'sport_id' => $sport->id,
                'match_type' => $matchType,
                'created_by' => $creator->id,
                'is_active' => true,
                'status' => 'queueing',
                'game_type' => $gameType,
                'court_preference' => $courtPreference,
                'started_at' => now(),
            ]);

            $rows = [];
            $position = 1;

            foreach ($byTeamThenUser as $row) {
                $player = GameSessionPlayer::query()->create([
                    'game_session_id' => $session->id,
                    'user_id' => $row['user_id'],
                    'queue_position' => $position++,
                    'is_waiting' => true,
                    'is_playing' => false,
                    'team' => $row['team'],
                ]);
                $rows[] = $this->playerPayload($player);
            }

            $session->load(['sport', 'creator', 'facility']);

            return [
                'session' => $session,
                'players' => $rows,
            ];
        });
    }

    /**
     * @return array{id: int, user_id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null}
     */
    private function playerPayload(GameSessionPlayer $player): array
    {
        return [
            'id' => $player->id,
            'user_id' => $player->user_id,
            'queue_position' => $player->queue_position,
            'is_waiting' => $player->is_waiting,
            'is_playing' => $player->is_playing,
            'team' => $player->team,
        ];
    }
}
