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
            'match_type' => ['sometimes', 'string', 'in:singles,doubles'],
            'win_points' => ['required', 'integer', 'min:0', 'max:9999'],
            'loss_points' => ['required', 'integer', 'min:0', 'max:9999'],
            'skip_scores' => ['sometimes', 'boolean'],
            'optional_guest_skill' => ['sometimes', 'boolean'],
            'optional_guest_gender' => ['sometimes', 'boolean'],
            ...$this->autoMatchCriteriaRules(),
        ];
    }

    public function withValidator($validator): void
    {
        $this->withAutoMatchCriteriaValidator($validator);

        $validator->after(function ($validator): void {
            $session = $this->route('gameSession');
            if (! $session instanceof GameSession) {
                return;
            }

            if (! $this->filled('match_type')) {
                return;
            }

            $nextType = (string) $this->input('match_type');
            if ($nextType === (string) $session->match_type) {
                return;
            }

            if (! $session->canEditMatchType()) {
                $validator->errors()->add(
                    'match_type',
                    'Game type can only be changed before the first match is created.',
                );
            }
        });
    }
}
