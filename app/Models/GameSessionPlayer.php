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
        'pronoun',
        'skill_level',
        'queue_position',
        'is_waiting',
        'is_playing',
        'team',
        'wins_count',
        'losses_count',
        'last_match_result',
        'last_match_id',
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
            'last_match_id' => 'integer',
            'session_points' => 'integer',
            'skill_level' => 'integer',
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

    public function matchesPlayed(): int
    {
        return (int) ($this->wins_count ?? 0) + (int) ($this->losses_count ?? 0);
    }

    /**
     * Never-played waiting players sit in the check-in lobby until their first
     * finished match graduates them into the rotation queue.
     */
    public function isInLobby(): bool
    {
        if ((bool) ($this->getAttribute('is_removed') ?? false)) {
            return false;
        }

        return (bool) $this->is_waiting
            && ! (bool) $this->is_playing
            && $this->matchesPlayed() === 0;
    }

    public function displayName(): string
    {
        if ($this->isGuest()) {
            return (string) ($this->guest_name ?? 'Guest');
        }

        return (string) ($this->user?->name ?? 'Player');
    }
}
