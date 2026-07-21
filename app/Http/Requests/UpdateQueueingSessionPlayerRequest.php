<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
        $session = $this->route('gameSession');
        $player = $this->route('gameSessionPlayer');
        $isGuest = $player instanceof GameSessionPlayer && $player->isGuest();
        $requireGuestSkill = $isGuest && $session instanceof GameSession && $session->requiresGuestSkillLevel();
        $requireGuestGender = $isGuest && $session instanceof GameSession && $session->requiresGuestGender();
        $requireSkill = ! $isGuest || $requireGuestSkill;

        return [
            'guest_name' => $isGuest ? ['required', 'string', 'max:191'] : ['prohibited'],
            'pronoun' => $isGuest
                ? [
                    Rule::requiredIf($requireGuestGender),
                    'nullable',
                    'string',
                    'in:He/Him,She/Her,They/Them,Other',
                ]
                : ['prohibited'],
            'skill_level' => [
                Rule::requiredIf($requireSkill),
                'nullable',
                'integer',
                'min:1',
                'max:5',
            ],
        ];
    }
}
