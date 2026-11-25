<?php

namespace App\Actions;

use App\Data\AutoMatchCriteria;
use App\Models\GameSession;
use App\Models\User;
use App\Services\LossPointMode;
use App\Services\QueueingSessionDraftHydrator;
use App\Support\ExpectedDraftVersion;

/**
 * Batch-apply ordered offline mutations in one request (fewer round-trips on flaky networks).
 *
 * @phpstan-type OutboxMutation array{type: string, payload?: array<string, mixed>}
 */
class SyncQueueingSessionOutbox
{
    public function __construct(
        private QueueingSessionDraftHydrator $hydrator,
        private AddQueueingSessionPlayer $addPlayer,
        private UpdateQueueingSessionPlayer $updatePlayer,
        private RemoveQueueingSessionPlayer $removePlayer,
        private RestoreQueueingSessionPlayer $restorePlayer,
        private ReorderQueueingSessionCheckIn $reorderCheckIn,
        private CreateQueueingSessionMatch $createMatch,
        private CreateQueueingSessionReserveMatch $createReserveMatch,
        private PromoteQueueingSessionReserveMatch $promoteReserveMatch,
        private StartQueueingSessionMatch $startMatch,
        private DeleteQueueingSessionMatch $deleteMatch,
        private UpdateQueueingSessionMatch $updateMatch,
        private FinishGameSessionMatch $finishMatch,
        private SwitchQueueingSessionMatchResult $switchResult,
        private UpdateQueueingGameSession $updateSession,
        private DismissQueueingSessionAutoSuggestMatch $dismissSuggest,
    ) {}

    /**
     * @param  list<OutboxMutation>  $mutations
     */
    public function execute(GameSession $session, User $actor, array $mutations, ?int $expectedVersion = null): GameSession
    {
        if (! $session->isQueueing() || ! $session->isDraft()) {
            abort(422, 'Batch sync only applies to active draft queueing sessions.');
        }

        if (! $session->userCanManage($actor)) {
            abort(403, 'Only the queue master can sync this session.');
        }

        $expectedVersion ??= ExpectedDraftVersion::fromRequest();

        if ($expectedVersion !== null) {
            request()->merge(['draft_version' => $expectedVersion]);
        }

        /** @var array<string|int, int> $matchIdMap */
        $matchIdMap = [];

        foreach ($mutations as $index => $mutation) {
            $type = (string) ($mutation['type'] ?? '');
            $payload = is_array($mutation['payload'] ?? null) ? $mutation['payload'] : [];

            if ($index > 0) {
                request()->request->remove('draft_version');
                request()->headers->remove('X-Draft-Version');
                request()->headers->remove('If-Match');
            }

            $session = $session->fresh() ?? $session;
            $this->applyOne($session, $actor, $type, $payload, $matchIdMap);
        }

        return $session->fresh() ?? $session;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string|int, int>  $matchIdMap
     */
    private function applyOne(
        GameSession $session,
        User $actor,
        string $type,
        array $payload,
        array &$matchIdMap,
    ): void {
        $resolveMatchId = function (mixed $id) use (&$matchIdMap): int {
            if (isset($matchIdMap[$id])) {
                return (int) $matchIdMap[$id];
            }
            if (isset($matchIdMap[(string) $id])) {
                return (int) $matchIdMap[(string) $id];
            }

            return (int) $id;
        };

        match ($type) {
            'add_guest' => $this->addPlayer->executeGuest(
                $session,
                (string) ($payload['guest_name'] ?? 'Guest'),
                isset($payload['pronoun']) ? (string) $payload['pronoun'] : null,
                array_key_exists('skill_level', $payload) && $payload['skill_level'] !== null
                    ? (int) $payload['skill_level']
                    : null,
            ),
            'add_member' => $this->addPlayer->executeMember(
                $session,
                (int) $payload['user_id'],
                array_key_exists('skill_level', $payload) && $payload['skill_level'] !== null
                    ? (int) $payload['skill_level']
                    : null,
                isset($payload['pronoun']) ? (string) $payload['pronoun'] : null,
            ),
            'update_player' => $this->updatePlayerField($session, $payload),
            'remove_player' => $this->removePlayer->execute(
                $session,
                $this->hydrator->hydratePlayer($session, (int) $payload['player_id']),
            ),
            'restore_player' => $this->restorePlayer->execute(
                $session,
                $this->hydrator->hydratePlayer($session, (int) $payload['player_id']),
            ),
            'reorder_check_in' => $this->reorderCheckIn->execute(
                $session,
                array_map('intval', $payload['player_ids'] ?? []),
            ),
            'create_match', 'approve_auto_suggest' => (function () use ($session, $payload, &$matchIdMap): void {
                $lineup = is_array($payload['lineup'] ?? null) ? $payload['lineup'] : [];
                $match = $this->createMatch->execute($session, $lineup);
                if (isset($payload['local_match_id'])) {
                    $matchIdMap[$payload['local_match_id']] = (int) $match->id;
                }
                if (isset($payload['_local_match_numeric_id'])) {
                    $matchIdMap[$payload['_local_match_numeric_id']] = (int) $match->id;
                }
            })(),
            'create_reserve_match' => (function () use ($session, $payload, &$matchIdMap): void {
                $lineup = is_array($payload['lineup'] ?? null) ? $payload['lineup'] : [];
                $match = $this->createReserveMatch->execute($session, $lineup);
                if (isset($payload['local_match_id'])) {
                    $matchIdMap[$payload['local_match_id']] = (int) $match->id;
                }
                if (isset($payload['_local_match_numeric_id'])) {
                    $matchIdMap[$payload['_local_match_numeric_id']] = (int) $match->id;
                }
            })(),
            'promote_reserve_match' => $this->promoteReserveMatch->execute(
                $session,
                $this->hydrator->hydrateMatch($session, $resolveMatchId($payload['match_id'] ?? 0)),
            ),
            'start_match' => $this->startMatch->execute(
                $session,
                $this->hydrator->hydrateMatch($session, $resolveMatchId($payload['match_id'] ?? 0)),
            ),
            'delete_match' => $this->deleteMatch->execute(
                $session,
                $this->hydrator->hydrateMatch($session, $resolveMatchId($payload['match_id'] ?? 0)),
            ),
            'update_match_lineup' => $this->updateMatch->execute(
                $session,
                $this->hydrator->hydrateMatch($session, $resolveMatchId($payload['match_id'] ?? 0)),
                is_array($payload['lineup'] ?? null) ? $payload['lineup'] : [],
            ),
            'finish_match' => $this->finishMatch->execute(
                $session,
                array_key_exists('team1_score', $payload) && $payload['team1_score'] !== null
                    ? (int) $payload['team1_score']
                    : null,
                array_key_exists('team2_score', $payload) && $payload['team2_score'] !== null
                    ? (int) $payload['team2_score']
                    : null,
                $resolveMatchId($payload['match_id'] ?? 0),
                array_key_exists('winning_team', $payload) && $payload['winning_team'] !== null
                    ? (int) $payload['winning_team']
                    : null,
            ),
            'switch_result' => $this->switchResult->execute(
                $session,
                $this->hydrator->hydrateMatch($session, $resolveMatchId($payload['match_id'] ?? 0)),
            ),
            'update_settings' => $this->updateSession->execute(
                $actor,
                $session,
                (string) ($payload['queue_name'] ?? $session->queue_name ?? 'Queue'),
                (bool) ($payload['skip_scores'] ?? $session->skip_scores),
                LossPointMode::normalize($payload['loss_point_mode'] ?? $session->loss_point_mode),
                (bool) ($payload['optional_guest_skill'] ?? $session->optional_guest_skill ?? true),
                (bool) ($payload['optional_guest_gender'] ?? $session->optional_guest_gender ?? true),
                isset($payload['auto_match_criteria']) && is_array($payload['auto_match_criteria'])
                    ? AutoMatchCriteria::fromStored($payload['auto_match_criteria'])
                    : null,
                isset($payload['match_type']) ? (string) $payload['match_type'] : null,
            ),
            'dismiss_auto_suggest' => $this->dismissSuggest->execute(
                $session,
                (string) ($payload['suggestion_id'] ?? ''),
            ),
            default => abort(422, 'Unknown sync mutation type: '.$type),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function updatePlayerField(GameSession $session, array $payload): void
    {
        $player = $this->hydrator->hydratePlayer($session, (int) $payload['player_id']);
        if ($player->isGuest()) {
            $this->updatePlayer->executeGuest(
                $session,
                $player,
                (string) ($payload['guest_name'] ?? $player->guest_name ?? 'Guest'),
                array_key_exists('pronoun', $payload) ? (string) $payload['pronoun'] : $player->pronoun,
                array_key_exists('skill_level', $payload) && $payload['skill_level'] !== null
                    ? (int) $payload['skill_level']
                    : ($player->skill_level !== null ? (int) $player->skill_level : null),
            );

            return;
        }

        $this->updatePlayer->executeMember(
            $session,
            $player,
            (int) ($payload['skill_level'] ?? $player->skill_level ?? 3),
        );
    }
}
