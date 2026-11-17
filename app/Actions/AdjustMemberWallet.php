<?php

namespace App\Actions;

use App\Models\AdminAdjustmentAudit;
use App\Models\MemberPointWallet;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AdjustMemberWallet
{
    public function __construct(
        private CreditMemberPointWallet $creditMemberPointWallet,
    ) {}

    /**
     * @return array{balance_before: int, balance_after: int, amount: int}
     */
    public function execute(User $admin, User $target, int $sportId, int $delta, string $reason): array
    {
        if ($delta === 0) {
            throw new InvalidArgumentException('Wallet adjustment amount cannot be zero.');
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw new InvalidArgumentException('A reason is required.');
        }

        return DB::transaction(function () use ($admin, $target, $sportId, $delta, $reason): array {
            $wallet = MemberPointWallet::query()->firstOrCreate(
                [
                    'user_id' => $target->id,
                    'sport_id' => $sportId,
                ],
                ['balance' => 0],
            );

            $before = (int) $wallet->balance;
            $after = $before + $delta;
            if ($after < 0) {
                throw new InvalidArgumentException('Wallet balance cannot go below zero.');
            }

            $this->creditMemberPointWallet->execute($target->id, $sportId, $delta, null);

            AdminAdjustmentAudit::query()->create([
                'admin_user_id' => $admin->id,
                'target_user_id' => $target->id,
                'sport_id' => $sportId,
                'adjustment_type' => AdminAdjustmentAudit::TYPE_WALLET,
                'amount' => $delta,
                'value_before' => $before,
                'value_after' => $after,
                'reason' => $reason,
            ]);

            return [
                'balance_before' => $before,
                'balance_after' => $after,
                'amount' => $delta,
            ];
        });
    }
}
