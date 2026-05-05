<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TierRank extends Model
{
    protected $fillable = [
        'sport_id',
        'tier_no',
        'name',
        'start_point',
        'end_point',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tier_no' => 'integer',
            'start_point' => 'integer',
            'end_point' => 'integer',
            'status' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Sport, $this>
     */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /**
     * Active tier row whose point bracket contains the wallet/session total.
     */
    public static function tierForPoints(int $sportId, int $points): ?self
    {
        return static::query()
            ->where('sport_id', $sportId)
            ->where('status', true)
            ->where('start_point', '<=', $points)
            ->where('end_point', '>=', $points)
            ->orderBy('tier_no')
            ->first();
    }
}
