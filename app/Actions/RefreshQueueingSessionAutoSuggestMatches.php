<?php

namespace App\Actions;

use App\Models\GameSession;

class RefreshQueueingSessionAutoSuggestMatches
{
    public function __construct(
        private GenerateQueueingSessionAutoSuggestMatches $generate,
    ) {}

    public function execute(GameSession $session): GameSession
    {
        $sessionId = (int) $session->id;
        $session = GameSession::query()->find($sessionId) ?? $session;

        if (! $session->is_active || ! $session->isQueueing()) {
            if ($session->auto_suggest_matches !== null) {
                // Query update avoids persisting hydrated virtual attributes (e.g. players_count).
                GameSession::query()->whereKey($sessionId)->update([
                    'auto_suggest_matches' => null,
                ]);
            }

            return GameSession::query()->findOrFail($sessionId);
        }

        $payload = $this->generate->execute($session);

        GameSession::query()->whereKey($sessionId)->update([
            'auto_suggest_matches' => $payload,
        ]);

        return GameSession::query()->findOrFail($sessionId);
    }
}
