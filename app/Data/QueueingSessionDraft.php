<?php

namespace App\Data;

class QueueingSessionDraft
{
    public function __construct(
        public int $version = 0,
        public string $updatedAt = '',
        /** @var list<array<string, mixed>> */
        public array $players = [],
        /** @var list<array<string, mixed>> */
        public array $matches = [],
        public int $nextPlayerId = 1,
        public int $nextMatchId = 1,
        /** @var array<string, mixed> */
        public array $sessionMeta = [],
    ) {}

    public static function empty(): self
    {
        return new self(
            version: 0,
            updatedAt: now()->toIso8601String(),
            sessionMeta: [
                'completed_matches_count' => 0,
                'status' => 'queueing',
                'last_team1_score' => null,
                'last_team2_score' => null,
                'last_winning_team' => null,
                'last_finished_at' => null,
                'last_result_breakdown' => null,
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'version' => $this->version,
            'updated_at' => $this->updatedAt,
            'players' => $this->players,
            'matches' => $this->matches,
            'next_player_id' => $this->nextPlayerId,
            'next_match_id' => $this->nextMatchId,
            'session_meta' => $this->sessionMeta,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            version: (int) ($data['version'] ?? 0),
            updatedAt: (string) ($data['updated_at'] ?? now()->toIso8601String()),
            players: is_array($data['players'] ?? null) ? array_values($data['players']) : [],
            matches: is_array($data['matches'] ?? null) ? array_values($data['matches']) : [],
            nextPlayerId: (int) ($data['next_player_id'] ?? 1),
            nextMatchId: (int) ($data['next_match_id'] ?? 1),
            sessionMeta: is_array($data['session_meta'] ?? null) ? $data['session_meta'] : [],
        );
    }

    public function allocatePlayerId(): int
    {
        return $this->nextPlayerId++;
    }

    public function allocateMatchId(): int
    {
        return $this->nextMatchId++;
    }

    public function nextMatchNo(): int
    {
        $max = 0;
        foreach ($this->matches as $match) {
            $max = max($max, (int) ($match['match_no'] ?? 0));
        }

        return $max + 1;
    }

  /**
     * @return array<string, mixed>|null
     */
    public function findPlayer(int $playerId): ?array
    {
        foreach ($this->players as $player) {
            if ((int) ($player['id'] ?? 0) === $playerId) {
                return $player;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findMatch(int $matchId): ?array
    {
        foreach ($this->matches as $match) {
            if ((int) ($match['id'] ?? 0) === $matchId) {
                return $match;
            }
        }

        return null;
    }

    /**
     * @return list<int>
     */
    public function participantUserIds(): array
    {
        $ids = [];
        foreach ($this->players as $player) {
            $uid = $player['user_id'] ?? null;
            if ($uid !== null) {
                $ids[] = (int) $uid;
            }
        }

        return array_values(array_unique($ids));
    }

    public function hasOngoingMatch(): bool
    {
        foreach ($this->matches as $match) {
            if (($match['status'] ?? '') === 'ongoing') {
                return true;
            }
        }

        return false;
    }
}
