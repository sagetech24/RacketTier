<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;

class ShowPublicQueueingSessionSummary
{
    public function __construct(
        private BuildQueueingSessionSummary $buildQueueingSessionSummary,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function execute(string $publicKey): array
    {
        $session = GameSession::findFinishedByPublicSummaryKey($publicKey);
        if (! $session instanceof GameSession) {
            abort(404);
        }

        $session->load(['sport:id,slug,name,code,icon', 'creator:id,name']);

        $matches = $session->queueingMatches()
            ->where('status', 'finished')
            ->orderBy('match_no')
            ->get()
            ->map(fn (QueueingSessionMatch $match): array => $this->publicMatch($match))
            ->all();

        $summary = $this->buildQueueingSessionSummary->execute($session);
        $summary['players'] = array_map(function (array $player): array {
            if (! ($player['is_guest'] ?? false)) {
                $player['name'] = $this->maskMemberName((string) ($player['name'] ?? ''));
            }

            return $player;
        }, $summary['players'] ?? []);

        return [
            'session' => [
                'id' => (int) $session->id,
                'queue_name' => $session->queue_name,
                'sport' => [
                    'name' => $session->sport?->name,
                    'icon' => $session->sport?->icon,
                ],
                'match_type' => $session->match_type,
                'optional_guest_skill' => (bool) ($session->optional_guest_skill ?? true),
                'queue_master_name' => $session->creator?->name,
                'started_at' => $session->started_at?->toIso8601String(),
                'ended_at' => $session->ended_at?->toIso8601String(),
            ],
            'summary' => $summary,
            'matches' => $matches,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function publicMatch(QueueingSessionMatch $match): array
    {
        $lineup = is_array($match->lineup) ? $match->lineup : [];

        return [
            'id' => (int) $match->id,
            'match_no' => (int) $match->match_no,
            'status' => 'finished',
            'lineup' => collect($lineup)
                ->map(function (mixed $row): array {
                    $player = is_array($row) ? $row : [];
                    $isGuest = ($player['user_id'] ?? null) === null
                        && trim((string) ($player['guest_name'] ?? '')) !== '';
                    $name = (string) ($player['name'] ?? $player['guest_name'] ?? 'Player');

                    return [
                        'name' => $isGuest ? $name : $this->maskMemberName($name),
                        'team' => isset($player['team']) ? (int) $player['team'] : null,
                    ];
                })
                ->values()
                ->all(),
            'team1_score' => $match->team1_score !== null ? (int) $match->team1_score : null,
            'team2_score' => $match->team2_score !== null ? (int) $match->team2_score : null,
            'winning_team' => $match->winning_team !== null ? (int) $match->winning_team : null,
            'started_at' => $match->started_at?->toIso8601String(),
            'finished_at' => $match->finished_at?->toIso8601String(),
        ];
    }

    /**
     * Members with more than one name word keep the first word. The rest is replaced with ****.
     */
    private function maskMemberName(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name), -1, PREG_SPLIT_NO_EMPTY);
        if ($parts === false || $parts === []) {
            return 'Player';
        }

        if (count($parts) === 1) {
            return $parts[0];
        }

        return $parts[0].' ****';
    }
}
