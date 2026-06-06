<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use Illuminate\Foundation\Http\FormRequest;

class DestroyQueueingGameSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');

        if (! $user || ! $session instanceof GameSession) {
            return false;
        }

        return $session->isQueueing() && $session->userCanDelete($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
