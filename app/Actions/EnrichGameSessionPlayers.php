<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\MemberPointWallet;
use App\Models\Ranking;
use App\Services\ReferenceDataCache;

class EnrichGameSessionPlayers
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function apply(GameSession $session): void
    {
        if (! $session->relationLoaded('players') || ! $session->sport_id) {
            return;
        }

        $uids = $session->players->pluck('user_id')->unique()->filter()->values()->all();
        if ($uids === []) {
            return;
        }

        $sportId = (int) $session->sport_id;

        $session->setAttribute('player_enrichment', [
            'eloByUser' => Ranking::query()
                ->where('sport_id', $sportId)
                ->whereIn('user_id', $uids)
                ->pluck('rating', 'user_id')
                ->all(),
            'walletBalanceByUser' => MemberPointWallet::query()
                ->where('sport_id', $sportId)
                ->whereIn('user_id', $uids)
                ->pluck('balance', 'user_id')
                ->all(),
            'tierRowsForSport' => $this->referenceDataCache->tierRanksForSport($sportId),
        ]);
    }
}
