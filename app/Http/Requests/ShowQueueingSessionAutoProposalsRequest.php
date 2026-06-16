<?php

namespace App\Http\Requests;

use App\Data\AutoMatchCriteria;
use App\Models\GameSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShowQueueingSessionAutoProposalsRequest extends FormRequest
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
            'skill_level' => ['sometimes', 'boolean'],
            'skill_match_mode' => ['sometimes', 'string', Rule::in([
                AutoMatchCriteria::SKILL_MODE_BALANCED,
                AutoMatchCriteria::SKILL_MODE_SAME_LEVEL,
            ])],
            'wl_statistics' => ['sometimes', 'boolean'],
            'sequence' => ['sometimes', 'boolean'],
            'genderless_mixed' => ['sometimes', 'boolean'],
            'refresh_seed' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function criteria(): AutoMatchCriteria
    {
        return AutoMatchCriteria::fromRequest($this->validated());
    }
}
