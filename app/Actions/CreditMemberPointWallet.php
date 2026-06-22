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

        $wallet = MemberPointWallet::query()->firstOrCreate(
            [
                'user_id' => $userId,
                'sport_id' => $sportId,
            ],
            ['balance' => 0],
        );

        /** @var MemberPointWallet $locked */
        $locked = MemberPointWallet::query()
            ->whereKey($wallet->id)
            ->lockForUpdate()
            ->firstOrFail();

        $balanceAfter = (int) $locked->balance + $delta;
        $locked->increment('balance', $delta);

        PointWalletTransaction::query()->create([
            'member_point_wallet_id' => $locked->id,
            'game_session_id' => $gameSessionId,
            'amount' => $delta,
            'balance_after' => $balanceAfter,
        ]);
    }
}
