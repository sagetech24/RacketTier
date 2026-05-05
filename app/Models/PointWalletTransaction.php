<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointWalletTransaction extends Model
{
    protected $fillable = [
        'member_point_wallet_id',
        'game_session_id',
        'amount',
        'balance_after',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'balance_after' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<MemberPointWallet, $this>
     */
    public function wallet(): BelongsTo
    {
        return $this->belongsTo(MemberPointWallet::class, 'member_point_wallet_id');
    }

    /**
     * @return BelongsTo<GameSession, $this>
     */
    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }
}
