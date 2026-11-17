<?php

namespace App\Actions;

use App\Models\AdminAdjustmentAudit;
use App\Models\MemberPointWallet;
use App\Models\PointWalletTransaction;
use App\Models\RatingHistory;
use App\Models\User;

class GetAdminMemberAudit
{
    /**
     * @return array{
     *   rating_histories: list<array<string, mixed>>,
     *   wallet_transactions: list<array<string, mixed>>,
     *   admin_adjustments: list<array<string, mixed>>
     * }
     */
    public function execute(User $member, ?int $sportId = null, int $limit = 50): array
    {
        $limit = max(1, min(100, $limit));

        $ratingQuery = RatingHistory::query()
            ->where('user_id', $member->id)
            ->with(['sport:id,name'])
            ->orderByDesc('id')
            ->limit($limit);

        if ($sportId !== null) {
            $ratingQuery->where('sport_id', $sportId);
        }

        $ratingHistories = $ratingQuery->get()->map(fn (RatingHistory $row): array => [
            'id' => (int) $row->id,
            'sport_id' => (int) $row->sport_id,
            'sport_name' => $row->sport?->name,
            'game_session_id' => $row->game_session_id !== null ? (int) $row->game_session_id : null,
            'rating_before' => (int) $row->rating_before,
            'rating_after' => (int) $row->rating_after,
            'rating_change' => (int) $row->rating_change,
            'created_at' => $row->created_at?->toIso8601String(),
        ])->all();

        $walletIds = MemberPointWallet::query()
            ->where('user_id', $member->id)
            ->when($sportId !== null, fn ($q) => $q->where('sport_id', $sportId))
            ->pluck('id');

        $walletTransactions = [];
        if ($walletIds->isNotEmpty()) {
            $wallets = MemberPointWallet::query()
                ->whereIn('id', $walletIds)
                ->with('sport:id,name')
                ->get()
                ->keyBy('id');

            $walletTransactions = PointWalletTransaction::query()
                ->whereIn('member_point_wallet_id', $walletIds)
                ->orderByDesc('id')
                ->limit($limit)
                ->get()
                ->map(function (PointWalletTransaction $row) use ($wallets): array {
                    $wallet = $wallets->get($row->member_point_wallet_id);

                    return [
                        'id' => (int) $row->id,
                        'sport_id' => $wallet ? (int) $wallet->sport_id : null,
                        'sport_name' => $wallet?->sport?->name,
                        'game_session_id' => $row->game_session_id !== null ? (int) $row->game_session_id : null,
                        'amount' => (int) $row->amount,
                        'balance_after' => (int) $row->balance_after,
                        'created_at' => $row->created_at?->toIso8601String(),
                    ];
                })
                ->all();
        }

        $adjustments = AdminAdjustmentAudit::query()
            ->where('target_user_id', $member->id)
            ->when($sportId !== null, fn ($q) => $q->where('sport_id', $sportId))
            ->with(['sport:id,name', 'admin:id,name'])
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (AdminAdjustmentAudit $row): array => [
                'id' => (int) $row->id,
                'adjustment_type' => (string) $row->adjustment_type,
                'sport_id' => (int) $row->sport_id,
                'sport_name' => $row->sport?->name,
                'amount' => (int) $row->amount,
                'value_before' => (int) $row->value_before,
                'value_after' => (int) $row->value_after,
                'reason' => (string) $row->reason,
                'admin_name' => $row->admin?->name,
                'created_at' => $row->created_at?->toIso8601String(),
            ])
            ->all();

        return [
            'rating_histories' => $ratingHistories,
            'wallet_transactions' => $walletTransactions,
            'admin_adjustments' => $adjustments,
        ];
    }
}
