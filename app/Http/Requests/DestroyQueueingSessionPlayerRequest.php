<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Foundation\Http\FormRequest;

class DestroyQueueingSessionPlayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');
        $player = $this->route('gameSessionPlayer');

        if (! $user || ! $session instanceof GameSession || ! $player instanceof GameSessionPlayer) {
            return false;
        }

        if ((int) $player->game_session_id !== (int) $session->id) {
            return false;
        }

        return $session->isQueueing() && (int) $session->created_by === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
