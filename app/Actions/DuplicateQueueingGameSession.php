<?php

namespace App\Actions;

use App\Data\QueueingSessionDraft;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\User;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DuplicateQueueingGameSession
{
    public function __construct(
        private CreateQueueingGameSession $createQueueingGameSession,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionDraftHydrator $hydrator,
    ) {}

    public function execute(User $actor, GameSession $source): GameSession
    {
        if (! $source->userCanManage($actor)) {
            abort(403);
        }

        if (! $source->isQueueing()) {
            abort(422, 'Only queueing sessions can be duplicated.');
        }

        if ($source->is_active || $source->ended_at === null) {
            abort(422, 'Only finished queueing sessions can be duplicated.');
        }

        $source->loadMissing('sport');

        $sportSlug = $source->sport?->slug;
        if ($sportSlug === null || $sportSlug === '') {
            abort(422, 'Source session sport is missing.');
        }

        $sourcePlayers = GameSessionPlayer::query()
            ->where('game_session_id', $source->id)
            ->orderBy('queue_position')
            ->get();

        $existingUserIds = User::query()
            ->whereIn(
                'id',
                $sourcePlayers->pluck('user_id')->filter()->unique()->values()->all(),
            )
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
        $existingUserIdSet = array_fill_keys($existingUserIds, true);

        return DB::transaction(function () use ($actor, $source, $sportSlug, $sourcePlayers, $existingUserIdSet): GameSession {
            $created = $this->createQueueingGameSession->execute(
                $actor,
                (string) ($source->queue_name ?? ''),
                $sportSlug,
                (string) $source->match_type,
                (int) ($source->win_points ?? 0),
                (int) ($source->loss_points ?? 0),
                (bool) ($source->skip_scores ?? false),
                (bool) ($source->optional_guest_skill ?? true),
                (bool) ($source->optional_guest_gender ?? true),
                $source->resolveAutoMatchCriteria(),
            );

            $session = $created['session'];

            $this->draftStore->mutate($session, function ($draft) use ($sourcePlayers, $existingUserIdSet) {
                return $this->seedDraftPlayers($draft, $sourcePlayers, $existingUserIdSet);
            });

            return $this->hydrator->hydrate($session->fresh());
        });
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $sourcePlayers
     * @param  array<int, true>  $existingUserIdSet
     */
    public function seedDraftPlayers(
        QueueingSessionDraft $draft,
        Collection $sourcePlayers,
        array $existingUserIdSet,
    ): QueueingSessionDraft {
        $position = 0;

        foreach ($sourcePlayers as $player) {
            if ($player->user_id !== null) {
                $userId = (int) $player->user_id;
                if (! isset($existingUserIdSet[$userId])) {
                    continue;
                }
                if ($this->draftLineup->memberExists($draft, $userId)) {
                    continue;
                }

                $position++;
                $draft->players[] = [
                    'id' => $draft->allocatePlayerId(),
                    'user_id' => $userId,
                    'guest_name' => null,
                    'pronoun' => $player->pronoun,
                    'skill_level' => $player->skill_level !== null ? (int) $player->skill_level : null,
                    'queue_position' => $position,
                    'is_waiting' => true,
                    'is_playing' => false,
                    'team' => null,
                    'wins_count' => 0,
                    'losses_count' => 0,
                    'session_points' => 0,
                    'checked_in_at' => now()->toIso8601String(),
                ];

                continue;
            }

            $guestName = trim((string) ($player->guest_name ?? ''));
            if ($guestName === '') {
                continue;
            }
            if ($this->draftLineup->guestNameExists($draft, $guestName)) {
                continue;
            }

            $position++;
            $draft->players[] = [
                'id' => $draft->allocatePlayerId(),
                'user_id' => null,
                'guest_name' => $guestName,
                'pronoun' => $player->pronoun !== null && trim((string) $player->pronoun) !== ''
                    ? trim((string) $player->pronoun)
                    : null,
                'skill_level' => $player->skill_level !== null ? (int) $player->skill_level : null,
                'queue_position' => $position,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
                'wins_count' => 0,
                'losses_count' => 0,
                'session_points' => 0,
                'checked_in_at' => now()->toIso8601String(),
            ];
        }

        return $draft;
    }
}
