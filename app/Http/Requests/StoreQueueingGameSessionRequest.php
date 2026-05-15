<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQueueingGameSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
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
            'sport_slug' => ['required', 'string', 'max:64', 'exists:sports,slug'],
            'match_type' => ['required', 'string', 'in:singles,doubles'],
            'win_points' => ['required', 'integer', 'min:0', 'max:9999'],
            'loss_points' => ['required', 'integer', 'min:0', 'max:9999'],
        ];
    }
}
