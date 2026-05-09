<?php

namespace App\Http\Resources;

use App\Models\QueueingSessionMatch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin QueueingSessionMatch
 */
class QueueingSessionMatchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'match_no' => (int) $this->match_no,
            'status' => (string) $this->status,
            'lineup' => is_array($this->lineup) ? $this->lineup : [],
            'team1_score' => $this->team1_score !== null ? (int) $this->team1_score : null,
            'team2_score' => $this->team2_score !== null ? (int) $this->team2_score : null,
            'winning_team' => $this->winning_team !== null ? (int) $this->winning_team : null,
            'started_at' => $this->started_at?->toIso8601String(),
            'finished_at' => $this->finished_at?->toIso8601String(),
            'result_breakdown' => is_array($this->result_breakdown) ? $this->result_breakdown : null,
        ];
    }
}
