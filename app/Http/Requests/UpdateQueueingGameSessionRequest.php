<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesAutoMatchCriteria;
use App\Models\GameSession;
use Illuminate\Foundation\Http\FormRequest;

class UpdateQueueingGameSessionRequest extends FormRequest
{
    use ValidatesAutoMatchCriteria;

    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');

        if (! $user || ! $session instanceof GameSession) {
            return false;
        }

        return $session->isQueueing() && $session->userCanManage($user);
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('queue_name') && is_string($this->input('queue_name'))) {
            $this->merge(['queue_name' => trim($this->input('queue_name'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'queue_name' => ['required', 'filled', 'string', 'max:120'],
            'win_points' => ['required', 'integer', 'min:0', 'max:9999'],
            'loss_points' => ['required', 'integer', 'min:0', 'max:9999'],
            'skip_scores' => ['sometimes', 'boolean'],
            ...$this->autoMatchCriteriaRules(),
        ];
    }

    public function withValidator($validator): void
    {
        $this->withAutoMatchCriteriaValidator($validator);
    }
}
