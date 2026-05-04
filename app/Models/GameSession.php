<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameSession extends Model
{
    protected $fillable = [
        'facility_id',
        'sport_id',
        'match_type',
        'created_by',
        'is_active',
        'game_type',
        'court_preference',
        'started_at',
        'ended_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Facility, $this>
     */
    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    /**
     * @return BelongsTo<Sport, $this>
     */
    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<GameSessionPlayer, $this>
     */
    public function players(): HasMany
    {
        return $this->hasMany(GameSessionPlayer::class);
    }

    /**
     * @param  Builder<GameSession>  $query
     * @return Builder<GameSession>
     */
    public function scopeWhereUserIsParticipant(Builder $query, User $user): Builder
    {
        return $query->where(function (Builder $q) use ($user): void {
            $q->where('created_by', $user->id)
                ->orWhereHas('players', function (Builder $p) use ($user): void {
                    $p->where('user_id', $user->id);
                });
        });
    }
}
