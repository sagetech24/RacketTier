<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\User;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AddQueueingSessionPlayer
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
    ) {}

    /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null, pronoun: string|null, skill_level: int|null}
     */
    public function executeMember(GameSession $session, int $userId, int $skillLevel, ?string $pronoun = null): array
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ($session->isDraft()) {
            return $this->executeMemberDraft($session, $userId, $skillLevel, $pronoun);
        }

        return DB::transaction(function () use ($session, $userId, $skillLevel, $pronoun): array {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active) {
                abort(422, 'Cannot modify the roster after the session has ended.');
            }

            $user = User::query()->whereKey($userId)->firstOrFail();
            $resolvedPronoun = $pronoun !== null && trim($pronoun) !== ''
                ? trim($pronoun)
                : ($user->pronoun !== null && trim((string) $user->pronoun) !== '' ? (string) $user->pronoun : null);

            $exists = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->where('user_id', $userId)
                ->exists();
            if ($exists) {
                abort(422, 'That player is already on the roster.');
            }

            $next = (int) (GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->max('queue_position') ?? 0) + 1;

            $row = GameSessionPlayer::query()->create([
                'game_session_id' => $locked->id,
                'user_id' => $userId,
                'guest_name' => null,
                'pronoun' => $resolvedPronoun,
                'skill_level' => $skillLevel,
                'queue_position' => $next,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
            ]);

            return $this->payload($row);
        });
    }

    /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null, pronoun: string|null, skill_level: int|null}
     */
    public function executeGuest(GameSession $session, string $guestName, ?string $pronoun, int $skillLevel): array
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        $guestName = trim($guestName);
        if ($guestName === '') {
            abort(422, 'Guest name is required.');
        }

        $resolvedPronoun = $pronoun !== null && trim($pronoun) !== '' ? trim($pronoun) : null;

        if ($session->isDraft()) {
            return $this->executeGuestDraft($session, $guestName, $resolvedPronoun, $skillLevel);
        }

        return DB::transaction(function () use ($session, $guestName, $resolvedPronoun, $skillLevel): array {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active) {
                abort(422, 'Cannot modify the roster after the session has ended.');
            }

            $dup = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->whereNull('user_id')
                ->whereRaw('LOWER(guest_name) = ?', [Str::lower($guestName)])
                ->exists();
            if ($dup) {
                abort(422, 'A guest with that name is already on the roster.');
            }

            $next = (int) (GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->max('queue_position') ?? 0) + 1;

            $row = GameSessionPlayer::query()->create([
                'game_session_id' => $locked->id,
                'user_id' => null,
                'guest_name' => $guestName,
                'pronoun' => $resolvedPronoun,
                'skill_level' => $skillLevel,
                'queue_position' => $next,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
            ]);

            return $this->payload($row);
        });
    }

  /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null, pronoun: string|null, skill_level: int|null}
     */
    private function executeMemberDraft(GameSession $session, int $userId, int $skillLevel, ?string $pronoun): array
    {
        $user = User::query()->whereKey($userId)->firstOrFail();
        $resolvedPronoun = $pronoun !== null && trim($pronoun) !== ''
            ? trim($pronoun)
            : ($user->pronoun !== null && trim((string) $user->pronoun) !== '' ? (string) $user->pronoun : null);

        $created = null;
        $this->draftStore->mutate($session, function ($draft) use ($userId, $skillLevel, $resolvedPronoun, &$created) {
            if ($this->draftLineup->memberExists($draft, $userId)) {
                abort(422, 'That player is already on the roster.');
            }

            $next = collect($draft->players)->max('queue_position') ?? 0;
            $playerId = $draft->allocatePlayerId();
            $created = [
                'id' => $playerId,
                'user_id' => $userId,
                'guest_name' => null,
                'pronoun' => $resolvedPronoun,
                'skill_level' => $skillLevel,
                'queue_position' => (int) $next + 1,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
                'wins_count' => 0,
                'losses_count' => 0,
                'session_points' => 0,
            ];
            $draft->players[] = $created;

            return $draft;
        });

        return $this->payloadFromArray($created ?? []);
    }

    /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null, pronoun: string|null, skill_level: int|null}
     */
    private function executeGuestDraft(GameSession $session, string $guestName, ?string $pronoun, int $skillLevel): array
    {
        $created = null;
        $this->draftStore->mutate($session, function ($draft) use ($guestName, $pronoun, $skillLevel, &$created) {
            if ($this->draftLineup->guestNameExists($draft, $guestName)) {
                abort(422, 'A guest with that name is already on the roster.');
            }

            $next = collect($draft->players)->max('queue_position') ?? 0;
            $playerId = $draft->allocatePlayerId();
            $created = [
                'id' => $playerId,
                'user_id' => null,
                'guest_name' => $guestName,
                'pronoun' => $pronoun,
                'skill_level' => $skillLevel,
                'queue_position' => (int) $next + 1,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
                'wins_count' => 0,
                'losses_count' => 0,
                'session_points' => 0,
            ];
            $draft->players[] = $created;

            return $draft;
        });

        return $this->payloadFromArray($created ?? []);
    }

    /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null, pronoun: string|null, skill_level: int|null}
     */
    private function payload(GameSessionPlayer $row): array
    {
        return [
            'id' => $row->id,
            'queue_position' => $row->queue_position,
            'is_waiting' => (bool) $row->is_waiting,
            'is_playing' => (bool) $row->is_playing,
            'team' => $row->team,
            'user_id' => $row->user_id !== null ? (int) $row->user_id : null,
            'guest_name' => $row->guest_name,
            'pronoun' => $row->pronoun,
            'skill_level' => $row->skill_level !== null ? (int) $row->skill_level : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null, pronoun: string|null, skill_level: int|null}
     */
    private function payloadFromArray(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'queue_position' => (int) $row['queue_position'],
            'is_waiting' => (bool) $row['is_waiting'],
            'is_playing' => (bool) $row['is_playing'],
            'team' => $row['team'],
            'user_id' => $row['user_id'] !== null ? (int) $row['user_id'] : null,
            'guest_name' => $row['guest_name'],
            'pronoun' => $row['pronoun'],
            'skill_level' => $row['skill_level'] !== null ? (int) $row['skill_level'] : null,
        ];
    }
}
