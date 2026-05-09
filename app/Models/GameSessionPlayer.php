<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameSessionPlayer extends Model
{
    protected $fillable = [
        'game_session_id',
        'user_id',
        'guest_name',
        'queue_position',
        'is_waiting',
        'is_playing',
        'team',
        'wins_count',
        'losses_count',
        'session_points',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_waiting' => 'boolean',
            'is_playing' => 'boolean',
            'team' => 'integer',
            'wins_count' => 'integer',
            'losses_count' => 'integer',
            'session_points' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<GameSession, $this>
     */
    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isGuest(): bool
    {
        return $this->user_id === null;
    }

    public function displayName(): string
    {
        if ($this->isGuest()) {
            return (string) ($this->guest_name ?? 'Guest');
        }

        return (string) ($this->user?->name ?? 'Player');
    }
}
