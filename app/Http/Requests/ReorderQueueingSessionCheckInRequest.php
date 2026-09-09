<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use Illuminate\Foundation\Http\FormRequest;

class ReorderQueueingSessionCheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');

        if (! $user || ! $session instanceof GameSession) {
            return false;
        }

        return $session->isQueueing()
            && $session->is_active
            && $session->userCanManage($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'player_ids' => ['required', 'array', 'min:1'],
            'player_ids.*' => ['required', 'integer', 'min:1'],
        ];
    }
}
