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
        'session_context',
        'queue_name',
        'win_points',
        'loss_points',
        'skip_scores',
        'completed_matches_count',
        'sport_id',
        'match_type',
        'created_by',
        'is_active',
        'status',
        'last_team1_score',
        'last_team2_score',
        'last_winning_team',
        'last_finished_at',
        'last_result_breakdown',
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
            'skip_scores' => 'boolean',
            'win_points' => 'integer',
            'loss_points' => 'integer',
            'completed_matches_count' => 'integer',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'last_finished_at' => 'datetime',
            'last_result_breakdown' => 'array',
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
     * @return HasMany<QueueingSessionMatch, $this>
     */
    public function queueingMatches(): HasMany
    {
        return $this->hasMany(QueueingSessionMatch::class)->orderBy('match_no');
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

    public function isQueueing(): bool
    {
        return $this->session_context === 'queueing';
    }

    public function userCanView(User $user): bool
    {
        if ($this->userCanManage($user)) {
            return true;
        }

        return $this->players()
            ->where('user_id', $user->id)
            ->exists();
    }

    public function userCanManage(User $user): bool
    {
        if ((int) $this->created_by === (int) $user->id) {
            return true;
        }

        return $this->isQueueing() && $user->isAdmin();
    }

    public function userCanDelete(User $user): bool
    {
        if (! $this->isQueueing()) {
            return false;
        }

        if (! $this->is_active) {
            return $user->isAdmin();
        }

        return $this->userCanManage($user);
    }
}
