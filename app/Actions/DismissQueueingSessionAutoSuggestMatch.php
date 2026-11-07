<?php

namespace App\Actions;

use App\Models\GameSession;

class DismissQueueingSessionAutoSuggestMatch
{
    /**
     * Remove one unapproved suggestion from the stored auto-suggest payload.
     * Does not regenerate — the next roster/match refresh will refill.
     */
    public function execute(GameSession $session, string $suggestionId): GameSession
    {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        $sessionId = (int) $session->id;
        $session = GameSession::query()->findOrFail($sessionId);

        $payload = $session->auto_suggest_matches;
        if (! is_array($payload)) {
            abort(422, 'No auto-suggest matches are available.');
        }

        /** @var list<array<string, mixed>> $suggestions */
        $suggestions = is_array($payload['suggestions'] ?? null) ? $payload['suggestions'] : [];
        $kept = [];
        $found = false;

        foreach ($suggestions as $row) {
            if (! is_array($row)) {
                continue;
            }
            if ((string) ($row['suggestion_id'] ?? '') === $suggestionId) {
                $found = true;

                continue;
            }
            $kept[] = $row;
        }

        if (! $found) {
            abort(422, 'That auto-suggest match is no longer available.');
        }

        $next = $kept === []
            ? null
            : array_merge($payload, ['suggestions' => array_values($kept)]);

        GameSession::query()->whereKey($sessionId)->update([
            'auto_suggest_matches' => $next,
        ]);

        return GameSession::query()->findOrFail($sessionId);
    }
}
