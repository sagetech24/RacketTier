<?php

namespace App\Actions;

use App\Data\AutoMatchCriteria;
use App\Models\GameSession;

class GenerateQueueingSessionAutoSuggestMatches
{
    private const SUGGESTION_LIMIT = 3;

    public function __construct(
        private AutoGenerateQueueingSessionMatches $autoGenerate,
    ) {}

    /**
     * @return array{
     *   generated_at: string,
     *   draft_version: int,
     *   criteria: array<string, bool|string>,
     *   suggestions: list<array<string, mixed>>,
     * }|null
     */
    public function execute(GameSession $session, ?AutoMatchCriteria $criteria = null): ?array
    {
        if (! $session->is_active || ! $session->isQueueing()) {
            return null;
        }

        $criteria ??= $session->resolveAutoMatchCriteria();

        $result = $this->autoGenerate->execute($session, $criteria, [
            'limit' => self::SUGGESTION_LIMIT,
            'lookahead' => true,
            'proposal_id_prefix' => 'suggest',
        ]);

        $suggestions = [];
        foreach ($result['proposals'] as $index => $proposal) {
            $suggestions[] = [
                'suggestion_id' => (string) ($proposal['proposal_id'] ?? ('suggest-0-'.($index + 1))),
                'match_type' => $proposal['match_type'],
                'bracket_label' => $proposal['bracket_label'] ?? null,
                'from_lobby' => (bool) ($proposal['from_lobby'] ?? false),
                'wave' => (int) ($proposal['wave'] ?? ($index + 1)),
                'players_ready' => (bool) ($proposal['players_ready'] ?? false),
                'lineup' => $proposal['lineup'] ?? [],
                'players' => $proposal['players'] ?? [],
            ];
        }

        if ($suggestions === []) {
            return null;
        }

        return [
            'generated_at' => now()->toIso8601String(),
            'draft_version' => (int) ($session->draft_version ?? 0),
            'criteria' => $result['criteria'],
            'suggestions' => $suggestions,
        ];
    }
}
