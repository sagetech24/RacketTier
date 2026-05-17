<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class GetUserActivity
{
    private const DEFAULT_LIMIT = 15;

    private const MAX_LIMIT = 50;

    /**
     * @return array{
     *   items: array<int, array<string, mixed>>,
     *   next_cursor: string|null,
     *   has_more: bool
     * }
     */
    public function execute(User $user, ?string $cursor = null, int $limit = self::DEFAULT_LIMIT): array
    {
        $limit = max(1, min($limit, self::MAX_LIMIT));
        $since = now()->subDays(7);
        $cursorData = $this->parseCursor($cursor);

        $facilityItems = $this->facilityItems($user, $since);
        $queueingMatchItems = $this->queueingMatchItems($user, $since);

        $merged = collect()
            ->concat($facilityItems)
            ->concat($queueingMatchItems)
            ->sortByDesc(fn (array $row): array => [
                $row['finished_at_ts'],
                $row['sort_rank'],
                $row['entity_id'],
            ])
            ->values();

        if ($cursorData !== null) {
            $merged = $merged->filter(fn (array $row): bool => $this->isBeforeCursor($row, $cursorData))->values();
        }

        $slice = $merged->take($limit + 1);
        $hasMore = $slice->count() > $limit;
        $page = $slice->take($limit)->values();

        $nextCursor = null;
        if ($hasMore && $page->isNotEmpty()) {
            $last = $page->last();
            $nextCursor = $this->encodeCursor($last['finished_at'], $last['kind'], $last['entity_id']);
        }

        return [
            'items' => $page->map(fn (array $row): array => $row['payload'])->all(),
            'next_cursor' => $nextCursor,
            'has_more' => $hasMore,
        ];
    }

    /**
     * @return Collection<int, array{finished_at: string, finished_at_ts: int, kind: string, entity_id: int, sort_rank: int, payload: array<string, mixed>}>
     */
    private function facilityItems(User $user, CarbonInterface $since): Collection
    {
        return GameSession::query()
            ->where('session_context', 'facility')
            ->where('status', 'finished')
            ->whereNotNull('last_finished_at')
            ->where('last_finished_at', '>=', $since)
            ->whereUserIsParticipant($user)
            ->with(['sport:id,name,slug,code', 'facility:id,name'])
            ->orderByDesc('last_finished_at')
            ->get()
            ->map(function (GameSession $session) use ($user): array {
                $finishedAt = $session->last_finished_at;
                $stats = $this->userStatsFromBreakdown($session->last_result_breakdown, $user);
                $sportName = $session->sport?->name ?? 'Sport';
                $facilityName = $session->facility?->name ?? 'Facility';
                $score = $this->formatScore($session->last_team1_score, $session->last_team2_score);

                return $this->row(
                    kind: 'facility_match',
                    entityId: (int) $session->id,
                    sortRank: 2,
                    finishedAt: $finishedAt,
                    payload: [
                        'id' => 'facility_match:'.$session->id,
                        'kind' => 'facility_match',
                        'finished_at' => $finishedAt?->toIso8601String(),
                        'sport' => $this->sportPayload($session),
                        'facility' => $session->facility_id !== null ? [
                            'id' => (int) $session->facility->id,
                            'name' => (string) $session->facility->name,
                        ] : null,
                        'session' => [
                            'id' => (int) $session->id,
                            'session_context' => 'facility',
                            'queue_name' => null,
                        ],
                        'match_no' => null,
                        'team1_score' => $session->last_team1_score !== null ? (int) $session->last_team1_score : null,
                        'team2_score' => $session->last_team2_score !== null ? (int) $session->last_team2_score : null,
                        'won' => $stats['won'],
                        'session_points_earned' => $stats['session_points_earned'],
                        'rating_change' => $stats['rating_change'],
                        'title' => $this->matchTitle($stats['won'], $sportName, $facilityName, false),
                        'subtitle' => $this->matchSubtitle($score, $stats),
                        'href' => $session->facility_id !== null
                          ? '/facility/'.$session->facility_id.'/game-room'
                          : '/facilities',
                    ],
                );
            });
    }

    /**
     * @return Collection<int, array{finished_at: string, finished_at_ts: int, kind: string, entity_id: int, sort_rank: int, payload: array<string, mixed>}>
     */
    private function queueingMatchItems(User $user, CarbonInterface $since): Collection
    {
        return QueueingSessionMatch::query()
            ->where('status', 'finished')
            ->whereNotNull('finished_at')
            ->where('finished_at', '>=', $since)
            ->whereHas('gameSession', fn ($q) => $q->whereUserIsParticipant($user))
            ->with(['gameSession.sport:id,name,slug,code', 'gameSession.facility:id,name'])
            ->orderByDesc('finished_at')
            ->get()
            ->filter(fn (QueueingSessionMatch $match): bool => $this->userParticipatedInBreakdown($match->result_breakdown, $user))
            ->map(function (QueueingSessionMatch $match) use ($user): array {
                $session = $match->gameSession;
                $finishedAt = $match->finished_at;
                $stats = $this->userStatsFromBreakdown($match->result_breakdown, $user);
                $sportName = $session?->sport?->name ?? 'Sport';
                $queueName = $session?->queue_name ?: 'Queue session';
                $score = $this->formatScore($match->team1_score, $match->team2_score);

                return $this->row(
                    kind: 'queueing_match',
                    entityId: (int) $match->id,
                    sortRank: 2,
                    finishedAt: $finishedAt,
                    payload: [
                        'id' => 'queueing_match:'.$match->id,
                        'kind' => 'queueing_match',
                        'finished_at' => $finishedAt?->toIso8601String(),
                        'sport' => $this->sportPayload($session),
                        'facility' => null,
                        'session' => [
                            'id' => (int) $session->id,
                            'session_context' => 'queueing',
                            'queue_name' => $session->queue_name,
                        ],
                        'match_no' => (int) $match->match_no,
                        'team1_score' => $match->team1_score !== null ? (int) $match->team1_score : null,
                        'team2_score' => $match->team2_score !== null ? (int) $match->team2_score : null,
                        'won' => $stats['won'],
                        'session_points_earned' => $stats['session_points_earned'],
                        'rating_change' => $stats['rating_change'],
                        'title' => $this->matchTitle($stats['won'], $sportName, $queueName, true),
                        'subtitle' => $this->matchSubtitle($score, $stats, (int) $match->match_no),
                        'href' => '/queueing-session/'.$session->id.'/matches',
                    ],
                );
            });
    }

    /**
     * @return array{finished_at: string, finished_at_ts: int, kind: string, entity_id: int, sort_rank: int, payload: array<string, mixed>}
     */
    private function row(
        string $kind,
        int $entityId,
        int $sortRank,
        ?CarbonInterface $finishedAt,
        array $payload,
    ): array {
        $at = $finishedAt ?? now();

        return [
            'finished_at' => $at->toIso8601String(),
            'finished_at_ts' => $at->getTimestamp(),
            'kind' => $kind,
            'entity_id' => $entityId,
            'sort_rank' => $sortRank,
            'payload' => $payload,
        ];
    }

    /**
     * @return array{finished_at: CarbonInterface, kind: string, entity_id: int}|null
     */
    private function parseCursor(?string $cursor): ?array
    {
        if ($cursor === null || trim($cursor) === '') {
            return null;
        }

        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);
        if ($decoded === false) {
            return null;
        }

        $data = json_decode($decoded, true);
        if (! is_array($data) || empty($data['finished_at']) || empty($data['kind']) || ! isset($data['entity_id'])) {
            return null;
        }

        try {
            return [
                'finished_at' => Carbon::parse((string) $data['finished_at']),
                'kind' => (string) $data['kind'],
                'entity_id' => (int) $data['entity_id'],
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    private function encodeCursor(string $finishedAt, string $kind, int $entityId): string
    {
        $json = json_encode([
            'finished_at' => $finishedAt,
            'kind' => $kind,
            'entity_id' => $entityId,
        ], JSON_THROW_ON_ERROR);

        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }

    /**
     * @param  array{finished_at: string, finished_at_ts: int, kind: string, entity_id: int, sort_rank: int}  $row
     * @param  array{finished_at: CarbonInterface, kind: string, entity_id: int}  $cursor
     */
    private function isBeforeCursor(array $row, array $cursor): bool
    {
        $rowAt = Carbon::parse($row['finished_at']);
        $cursorAt = $cursor['finished_at'];

        if ($rowAt->lt($cursorAt)) {
            return true;
        }

        if ($rowAt->gt($cursorAt)) {
            return false;
        }

        if ($row['kind'] !== $cursor['kind']) {
            return $row['kind'] < $cursor['kind'];
        }

        return $row['entity_id'] < $cursor['entity_id'];
    }

    /**
     * @param  array<string, mixed>|null  $breakdown
     */
    private function userParticipatedInBreakdown(?array $breakdown, User $user): bool
    {
        if (! is_array($breakdown) || ! isset($breakdown['players']) || ! is_array($breakdown['players'])) {
            return false;
        }

        foreach ($breakdown['players'] as $player) {
            if (! is_array($player)) {
                continue;
            }
            if ((int) ($player['user_id'] ?? 0) === (int) $user->id) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>|null  $breakdown
     * @return array{won: bool|null, session_points_earned: int|null, rating_change: int|null}
     */
    private function userStatsFromBreakdown(?array $breakdown, User $user): array
    {
        $won = null;
        $sessionPoints = null;
        $ratingChange = null;

        if (! is_array($breakdown) || ! isset($breakdown['players']) || ! is_array($breakdown['players'])) {
            return [
                'won' => $won,
                'session_points_earned' => $sessionPoints,
                'rating_change' => $ratingChange,
            ];
        }

        foreach ($breakdown['players'] as $player) {
            if (! is_array($player)) {
                continue;
            }
            if ((int) ($player['user_id'] ?? 0) !== (int) $user->id) {
                continue;
            }
            $won = isset($player['won']) ? (bool) $player['won'] : null;
            $sessionPoints = isset($player['session_points_earned']) ? (int) $player['session_points_earned'] : null;
            $ratingChange = isset($player['rating_change']) ? (int) $player['rating_change'] : null;
            break;
        }

        return [
            'won' => $won,
            'session_points_earned' => $sessionPoints,
            'rating_change' => $ratingChange,
        ];
    }

    private function matchTitle(?bool $won, string $sportName, string $placeName, bool $isQueueing): string
    {
        $verb = $won === true ? 'Won' : ($won === false ? 'Lost' : 'Played');
        $at = $isQueueing ? 'in' : 'at';

        return $verb.' '.$sportName.' match '.$at.' '.$placeName;
    }

    /**
     * @param  array{won: bool|null, session_points_earned: int|null, rating_change: int|null}  $stats
     */
    private function matchSubtitle(string $score, array $stats, ?int $matchNo = null): string
    {
        $parts = [];
        if ($matchNo !== null) {
            $parts[] = 'Match #'.$matchNo;
        }
        $parts[] = 'Score '.$score;
        if ($stats['session_points_earned'] !== null) {
            $parts[] = '+'.$stats['session_points_earned'].' pts';
        }
        if ($stats['rating_change'] !== null) {
            $parts[] = 'ELO '.($stats['rating_change'] >= 0 ? '+' : '').$stats['rating_change'];
        }

        return implode(' • ', $parts);
    }

    private function formatScore(?int $team1, ?int $team2): string
    {
        if ($team1 === null || $team2 === null) {
            return '—';
        }

        return $team1.'-'.$team2;
    }

    /**
     * @return array{id: int|null, name: string|null, slug: string|null, code: string|null}|null
     */
    private function sportPayload(?GameSession $session): ?array
    {
        if ($session === null || $session->sport === null) {
            return null;
        }

        return [
            'id' => (int) $session->sport->id,
            'name' => (string) $session->sport->name,
            'slug' => (string) $session->sport->slug,
            'code' => (string) $session->sport->code,
        ];
    }
}
