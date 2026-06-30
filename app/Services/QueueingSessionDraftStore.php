<?php

namespace App\Services;

use App\Data\QueueingSessionDraft;
use App\Models\GameSession;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class QueueingSessionDraftStore
{
    private const REDIS_KEY_PREFIX = 'queueing:draft:';

    public function __construct(
        private QueueingSessionDraftHydrator $hydrator,
    ) {}

    public function initialize(GameSession $session): void
    {
        $draft = QueueingSessionDraft::empty();
        $this->persist($session, $draft, checkpoint: true);
    }

    public function load(int $sessionId): QueueingSessionDraft
    {
        $driver = (string) config('queueing.draft_storage', 'db');

        if ($driver === 'redis') {
            $raw = Cache::store('redis')->get($this->redisKey($sessionId));
            if (is_array($raw)) {
                return QueueingSessionDraft::fromArray($raw);
            }
        }

        $session = GameSession::query()->find($sessionId);
        $snapshot = $session?->draft_snapshot;
        if (is_array($snapshot) && $snapshot !== []) {
            return QueueingSessionDraft::fromArray($snapshot);
        }

        return QueueingSessionDraft::empty();
    }

    /**
     * @param  callable(QueueingSessionDraft): QueueingSessionDraft  $mutator
     */
    public function mutate(
        GameSession $session,
        callable $mutator,
        ?int $expectedVersion = null,
    ): GameSession {
        if (! $session->isDraft()) {
            abort(422, 'This session is not in draft mode.');
        }

        return DB::transaction(function () use ($session, $mutator, $expectedVersion): GameSession {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $locked->is_active) {
                abort(422, 'This session is not active.');
            }

            $draft = $this->load((int) $locked->id);

            if ($expectedVersion !== null && $draft->version !== $expectedVersion) {
                abort(409, 'Session was updated elsewhere. Please refresh and try again.');
            }

            $draft = $mutator($draft);
            $draft->version++;
            $draft->updatedAt = now()->toIso8601String();

            $checkpoint = $draft->version === 1
                || $draft->version % max(1, (int) config('queueing.checkpoint_every_mutations', 5)) === 0;

            $this->persist($locked, $draft, $checkpoint);

            return $this->hydrator->hydrate($locked->fresh());
        });
    }

    public function delete(int $sessionId): void
    {
        if ((string) config('queueing.draft_storage', 'db') === 'redis') {
            Cache::store('redis')->forget($this->redisKey($sessionId));
        }

        GameSession::query()->whereKey($sessionId)->update([
            'draft_snapshot' => null,
        ]);
    }

    private function persist(GameSession $session, QueueingSessionDraft $draft, bool $checkpoint): void
    {
        $payload = $draft->toArray();
        $ttlHours = max(1, (int) config('queueing.draft_ttl_hours', 48));

        if ((string) config('queueing.draft_storage', 'db') === 'redis') {
            Cache::store('redis')->put(
                $this->redisKey((int) $session->id),
                $payload,
                now()->addHours($ttlHours),
            );
        }

        $meta = $draft->sessionMeta;
        $useDbSnapshot = (string) config('queueing.draft_storage', 'db') === 'db';

        $session->update([
            'draft_version' => $draft->version,
            'draft_participant_user_ids' => $draft->participantUserIds(),
            'status' => (string) ($meta['status'] ?? 'queueing'),
            'completed_matches_count' => (int) ($meta['completed_matches_count'] ?? 0),
            'last_team1_score' => $meta['last_team1_score'] ?? null,
            'last_team2_score' => $meta['last_team2_score'] ?? null,
            'last_winning_team' => $meta['last_winning_team'] ?? null,
            'last_finished_at' => $meta['last_finished_at'] ?? null,
            'last_result_breakdown' => $meta['last_result_breakdown'] ?? null,
            'draft_snapshot' => $useDbSnapshot || $checkpoint ? $payload : $session->draft_snapshot,
        ]);
    }

    private function redisKey(int $sessionId): string
    {
        return self::REDIS_KEY_PREFIX.$sessionId;
    }
}
