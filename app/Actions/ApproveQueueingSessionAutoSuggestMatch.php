<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;

class ApproveQueueingSessionAutoSuggestMatch
{
    public function __construct(
        private CreateQueueingSessionMatch $createMatch,
    ) {}

    public function execute(GameSession $session, string $suggestionId): QueueingSessionMatch
    {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        $payload = $session->auto_suggest_matches;
        if (! is_array($payload)) {
            abort(422, 'No auto-suggest matches are available.');
        }

        /** @var list<array<string, mixed>> $suggestions */
        $suggestions = is_array($payload['suggestions'] ?? null) ? $payload['suggestions'] : [];
        $suggestion = null;
        foreach ($suggestions as $row) {
            if (! is_array($row)) {
                continue;
            }
            if ((string) ($row['suggestion_id'] ?? '') === $suggestionId) {
                $suggestion = $row;
                break;
            }
        }

        if ($suggestion === null) {
            abort(422, 'That auto-suggest match is no longer available.');
        }

        if (! (bool) ($suggestion['players_ready'] ?? false)) {
            abort(422, 'That auto-suggest match is not ready yet. Wait until all players are free.');
        }

        /** @var list<array{id: int, team?: int|null}> $lineup */
        $lineup = [];
        foreach (is_array($suggestion['lineup'] ?? null) ? $suggestion['lineup'] : [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (int) ($row['id'] ?? 0);
            if ($id <= 0) {
                continue;
            }
            $entry = ['id' => $id];
            if (isset($row['team'])) {
                $entry['team'] = (int) $row['team'];
            }
            $lineup[] = $entry;
        }

        if ($lineup === []) {
            abort(422, 'That auto-suggest match has an invalid lineup.');
        }

        // CreateQueueingSessionMatch mutates draft (or persisted) and triggers auto-suggest refresh.
        return $this->createMatch->execute($session, $lineup);
    }
}
