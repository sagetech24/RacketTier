<?php

namespace App\Actions;

use App\Models\MemberPointWallet;
use App\Models\PointWalletTransaction;

class CreditMemberPointWallet
{
    /**
     * Apply a signed point delta to a member's sport wallet and record the ledger row.
     * Must run inside an outer transaction when tied to match processing.
     */
    public function execute(int $userId, int $sportId, int $delta, ?int $gameSessionId = null): void
    {
        if ($delta === 0) {
            return;
        }

        $created = MemberPointWallet::query()->firstOrCreate(
            [
                'user_id' => $userId,
                'sport_id' => $sportId,
            ],
            ['balance' => 0],
        );

        /** @var MemberPointWallet $wallet */
        $wallet = MemberPointWallet::query()
            ->whereKey($created->id)
            ->lockForUpdate()
            ->firstOrFail();

        $wallet->increment('balance', $delta);
        $wallet->refresh();

        PointWalletTransaction::query()->create([
            'member_point_wallet_id' => $wallet->id,
            'game_session_id' => $gameSessionId,
            'amount' => $delta,
            'balance_after' => (int) $wallet->balance,
        ]);
    }
}
