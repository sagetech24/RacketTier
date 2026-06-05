<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Foundation\Http\FormRequest;

class DestroyQueueingSessionMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');
        $match = $this->route('queueingSessionMatch');

        if (! $user || ! $session instanceof GameSession || ! $match instanceof QueueingSessionMatch) {
            return false;
        }

        return $session->isQueueing()
            && $session->userCanManage($user)
            && (int) $match->game_session_id === (int) $session->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
