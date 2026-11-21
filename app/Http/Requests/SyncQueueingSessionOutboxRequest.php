<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use Illuminate\Foundation\Http\FormRequest;

class SyncQueueingSessionOutboxRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');

        if (! $user || ! $session instanceof GameSession) {
            return false;
        }

        return $session->isQueueing() && $session->userCanManage($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'draft_version' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'mutations' => ['required', 'array', 'max:200'],
            'mutations.*.type' => ['required', 'string', 'max:64'],
            'mutations.*.payload' => ['sometimes', 'array'],
        ];
    }
}
