<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QueueingSessionMatch extends Model
{
    protected $fillable = [
        'game_session_id',
        'match_no',
        'status',
        'lineup',
        'team1_score',
        'team2_score',
        'winning_team',
        'started_at',
        'finished_at',
        'result_breakdown',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lineup' => 'array',
            'result_breakdown' => 'array',
            'team1_score' => 'integer',
            'team2_score' => 'integer',
            'winning_team' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<GameSession, $this>
     */
    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }
}
