<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Foundation\Http\FormRequest;

class UpdateQueueingSessionPlayerRequest extends FormRequest
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

        return $session->isQueueing() && $session->userCanManage($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $player = $this->route('gameSessionPlayer');
        $isGuest = $player instanceof GameSessionPlayer && $player->isGuest();

        return [
            'guest_name' => $isGuest ? ['required', 'string', 'max:191'] : ['prohibited'],
            'pronoun' => $isGuest ? ['nullable', 'string', 'in:He/Him,She/Her,They/Them,Other'] : ['prohibited'],
            'skill_level' => ['required', 'integer', 'min:1', 'max:5'],
        ];
    }
}
